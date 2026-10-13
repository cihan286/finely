// Checks plans and billing against an in-memory database and a pretend
// Stripe: what Stripe tells us decides the plan, late and repeated messages
// are harmless, only the owner can spend the company's money, and deleting
// a company ends its subscription first.

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { subscription } from "@/db/finance";
import { organization, user } from "@/db/schema";
import { actAs, addTestMember, createTestCompany, setUpTestDb, testDb } from "./testing";
import { listAuditLog } from "./audit";
import {
  applySubscriptionEvent,
  getBilling,
  memberLimitFor,
  openBillingPortal,
  startCheckout,
} from "./billing";
import { deleteCompany, transferOwnership } from "./company";

vi.mock("@/db", async () => ({ db: (await import("./testing")).testDb }));
// Emails aren't sent in tests: they're collected here to look at
const sentEmails: { to: string; subject: string }[] = [];
vi.mock("@/lib/email/send", () => ({
  sendEmail: async (email: { to: string; subject: string }) => {
    sentEmails.push(email);
    return true;
  },
}));
vi.mock("@/lib/session", async () => ({
  requireOrganization: (await import("./testing")).currentSession,
}));

// The pretend Stripe: what it was asked, the payment pages it opened, and
// whether it should refuse
const stripe = vi.hoisted(() => ({
  checkouts: [] as Record<string, unknown>[],
  sessions: new Map<string, Record<string, unknown>>(),
  expired: [] as string[],
  customerEmails: [] as [string, string][],
  portals: [] as string[],
  cancelled: [] as string[],
  failCancel: null as string | null,
}));
vi.mock("@/lib/billing/stripe", () => {
  class StripeError extends Error {
    constructor(
      message: string,
      public readonly code: string,
    ) {
      super(message);
    }
  }
  return {
    StripeError,
    isBillingEnabled: true,
    planForPrice: (id: string | null | undefined) =>
      ({ price_starter: "starter", price_growth: "growth" })[id ?? ""] ?? null,
    priceIdFor: (plan: string) => `price_${plan}`,
    createCheckoutSession: async (input: Record<string, unknown>) => {
      stripe.checkouts.push(input);
      const id = `cs_${stripe.sessions.size + 1}`;
      stripe.sessions.set(id, {
        id,
        status: "open",
        url: `https://stripe.test/checkout/${id}`,
        client_reference_id: input.organizationId,
        subscription: null,
        line_items: { data: [{ price: { id: `price_${input.plan}` } }] },
      });
      return { id, url: `https://stripe.test/checkout/${id}` };
    },
    getCheckoutSession: async (id: string) => {
      const session = stripe.sessions.get(id);
      if (!session) throw new StripeError("unknown", "resource_missing");
      return session;
    },
    updateCustomerEmail: async (customerId: string, email: string) => {
      stripe.customerEmails.push([customerId, email]);
    },
    expireCheckoutSession: async (id: string) => {
      stripe.expired.push(id);
      Object.assign(stripe.sessions.get(id)!, { status: "expired", url: null });
    },
    createPortalSession: async (customerId: string) => {
      stripe.portals.push(customerId);
      return "https://stripe.test/portal";
    },
    cancelSubscription: async (id: string) => {
      if (stripe.failCancel) throw new StripeError("refused", stripe.failCancel);
      stripe.cancelled.push(id);
    },
  };
});

// One of Stripe's messages about a company's subscription
let eventNumber = 0;
const event = (
  organizationId: string | null,
  overrides: {
    type?: string;
    status?: string;
    price?: string;
    created?: number;
    cancelAtPeriodEnd?: boolean;
  } = {},
) => ({
  id: `evt_${++eventNumber}`,
  type: overrides.type ?? "customer.subscription.updated",
  created: overrides.created ?? 1_800_000_000 + eventNumber,
  data: {
    object: {
      id: `sub_${organizationId}`,
      customer: `cus_${organizationId}`,
      status: overrides.status ?? "active",
      cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
      metadata: organizationId ? { organization_id: organizationId } : {},
      items: {
        data: [{ price: { id: overrides.price ?? "price_starter" }, current_period_end: 1_900_000_000 }],
      },
    },
  },
});

beforeAll(setUpTestDb);
beforeEach(() => {
  stripe.checkouts = [];
  stripe.expired = [];
  stripe.customerEmails = [];
  sentEmails.length = 0;
  stripe.portals = [];
  stripe.cancelled = [];
  stripe.failCancel = null;
});

describe("plans", () => {
  it("a company without a subscription is on Free, with room for two people", async () => {
    const company = await createTestCompany("free-co");
    actAs(company);
    expect(await getBilling()).toMatchObject({
      enabled: true,
      plan: "free",
      memberLimit: 2,
      memberCount: 1,
      hasCustomer: false,
    });
    expect(await memberLimitFor(company.organizationId)).toBe(2);
  });

  it("follows what Stripe says, for that company only", async () => {
    const company = await createTestCompany("paying-co");
    const other = await createTestCompany("other-co");

    expect(await applySubscriptionEvent(event(company.organizationId))).toBe(true);
    actAs(company);
    expect(await getBilling()).toMatchObject({ plan: "starter", memberLimit: 5, hasCustomer: true });
    expect((await getBilling()).currentPeriodEnd).toEqual(new Date(1_900_000_000 * 1000));
    expect(await memberLimitFor(company.organizationId)).toBe(5);
    expect(await memberLimitFor(other.organizationId)).toBe(2);

    // Upgraded
    await applySubscriptionEvent(event(company.organizationId, { price: "price_growth" }));
    expect(await memberLimitFor(company.organizationId)).toBe(25);

    // A payment failed: the plan stays while Stripe retries, with a note,
    // and the owner is told once, however often Stripe repeats it
    expect(sentEmails).toEqual([]);
    for (let i = 0; i < 2; i++) {
      await applySubscriptionEvent(
        event(company.organizationId, { price: "price_growth", status: "past_due" }),
      );
    }
    expect(await getBilling()).toMatchObject({ plan: "growth" });
    expect((await getBilling()).note).toContain("payment failed");
    expect(sentEmails).toMatchObject([
      {
        to: "paying-co@example.com",
        subject: "The payment for paying-co's Finely plan failed",
      },
    ]);

    // Cancelled for good: Free again
    await applySubscriptionEvent(
      event(company.organizationId, { type: "customer.subscription.deleted" }),
    );
    expect(await getBilling()).toMatchObject({ plan: "free", memberLimit: 2, currentPeriodEnd: null });

    expect((await listAuditLog({ area: "settings" })).entries.map((e) => [e.actor, e.summary])).toEqual([
      ["Finely", "The company's plan changed from Growth to Free"],
      ["Finely", "The company's plan changed from Starter to Growth"],
      ["Finely", "The company's plan changed from Free to Starter"],
    ]);
  });

  it("ignores messages that are late, repeated, not ours or about a company that's gone", async () => {
    const company = await createTestCompany("careful-co");
    const upgrade = event(company.organizationId, { price: "price_growth", created: 2_000_000_100 });
    const older = event(company.organizationId, { price: "price_starter", created: 2_000_000_000 });

    expect(await applySubscriptionEvent(upgrade)).toBe(true);
    // The older message arrives afterwards, and the newer one once more
    expect(await applySubscriptionEvent(older)).toBe(false);
    expect(await applySubscriptionEvent(upgrade)).toBe(false);
    expect(await memberLimitFor(company.organizationId)).toBe(25);

    // A price that isn't one of our plans unlocks nothing
    const unknown = await createTestCompany("unknown-price-co");
    await applySubscriptionEvent(event(unknown.organizationId, { price: "price_someone_elses" }));
    expect(await memberLimitFor(unknown.organizationId)).toBe(2);

    expect(await applySubscriptionEvent(event(null))).toBe(false);
    expect(await applySubscriptionEvent(event("org_that_never_existed"))).toBe(false);
    expect(
      await applySubscriptionEvent({ ...event(company.organizationId), type: "invoice.paid" }),
    ).toBe(false);
  });
});

describe("paying", () => {
  it("only the owner can start a subscription or open the billing page", async () => {
    const company = await createTestCompany("strict-co");
    await testDb.insert(user).values({ id: "user_admin", name: "Ada", email: "ada@example.com" });
    await addTestMember(company, "user_admin", "admin");

    actAs({ ...company, userId: "user_admin" }, "admin");
    const denied = "Only the company's owner can change its plan.";
    await expect(startCheckout("starter", "monthly")).rejects.toThrow(denied);
    await expect(openBillingPortal()).rejects.toThrow(denied);
    expect(stripe.checkouts).toEqual([]);

    actAs(company);
    await expect(openBillingPortal()).rejects.toThrow("This company has no subscription yet.");
    await expect(
      startCheckout("platinum" as "starter", "monthly"),
    ).rejects.toThrow("Choose a plan.");

    expect(await startCheckout("growth", "yearly")).toMatch(
      /^https:\/\/stripe\.test\/checkout\/cs_\d+$/,
    );
    expect(stripe.checkouts).toMatchObject([
      { organizationId: company.organizationId, plan: "growth", interval: "yearly", customerId: null },
    ]);
  });

  it("a company that already pays changes its plan in Stripe's portal, not with a second subscription", async () => {
    const company = await createTestCompany("loyal-co");
    await applySubscriptionEvent(event(company.organizationId));
    actAs(company);
    await expect(startCheckout("growth", "monthly")).rejects.toThrow(
      "This company already has a plan.",
    );
    expect(await openBillingPortal()).toBe("https://stripe.test/portal");
    expect(stripe.portals).toEqual([`cus_${company.organizationId}`]);

    // After cancelling, it can subscribe again as the same Stripe customer
    await applySubscriptionEvent(
      event(company.organizationId, { type: "customer.subscription.deleted" }),
    );
    await startCheckout("starter", "monthly");
    expect(stripe.checkouts[0]).toMatchObject({ customerId: `cus_${company.organizationId}` });
  });
});

describe("a payment page that was opened", () => {
  // What Stripe says about a page once it's paid
  const pay = (sessionUrl: string, organizationId: string, price = "price_starter") => {
    const session = stripe.sessions.get(sessionUrl.split("/").pop()!)!;
    Object.assign(session, {
      status: "complete",
      url: null,
      subscription: {
        ...event(organizationId, { price }).data.object,
        created: 1_800_000_000,
      },
    });
  };

  it("is used again instead of opening a second one, so nobody pays twice", async () => {
    const company = await createTestCompany("patient-co");
    actAs(company);
    const first = await startCheckout("starter", "monthly");
    // Clicked again, without having paid
    expect(await startCheckout("starter", "monthly")).toBe(first);
    expect(stripe.checkouts.length).toBe(1);
    expect(await getBilling()).toMatchObject({ plan: "free", hasCustomer: false });

    // Another plan after all: the first page is closed, so only one can be paid
    const second = await startCheckout("growth", "monthly");
    expect(second).not.toBe(first);
    expect(stripe.expired).toEqual([first.split("/").pop()]);
    expect(await startCheckout("growth", "monthly")).toBe(second);
    expect(stripe.checkouts.length).toBe(2);
  });

  it("gives the plan as soon as it's paid, without waiting for Stripe's message", async () => {
    const company = await createTestCompany("eager-co");
    actAs(company);
    const url = await startCheckout("starter", "monthly");
    pay(url, company.organizationId);

    // Back on the Settings page: Stripe's message hasn't arrived
    expect(await getBilling()).toMatchObject({ plan: "starter", memberLimit: 5, hasCustomer: true });
    expect(await memberLimitFor(company.organizationId)).toBe(5);
    // And there's nothing to buy a second time
    await expect(startCheckout("starter", "monthly")).rejects.toThrow(
      "This company already has a plan.",
    );
    expect(stripe.checkouts.length).toBe(1);

    // Stripe's message arrives after all, and later ones still count
    await applySubscriptionEvent(
      event(company.organizationId, { type: "customer.subscription.created" }),
    );
    await applySubscriptionEvent(event(company.organizationId, { price: "price_growth" }));
    expect(await getBilling()).toMatchObject({ plan: "growth" });
    expect((await listAuditLog({ area: "settings" })).entries.map((e) => e.summary)).toEqual([
      "The company's plan changed from Starter to Growth",
      "The company's plan changed from Free to Starter",
    ]);
  });

  it("paid in one tab while choosing again in another: no second page", async () => {
    const company = await createTestCompany("two-tabs-co");
    actAs(company);
    pay(await startCheckout("growth", "yearly"), company.organizationId, "price_growth");
    await expect(startCheckout("growth", "yearly")).rejects.toThrow(
      "This company already has a plan.",
    );
    expect(await getBilling()).toMatchObject({ plan: "growth" });
  });

  it("that expired, or was for another company, is forgotten", async () => {
    const company = await createTestCompany("slow-co");
    const other = await createTestCompany("sneaky-co");
    actAs(company);
    const first = await startCheckout("starter", "monthly");
    Object.assign(stripe.sessions.get(first.split("/").pop()!)!, { status: "expired", url: null });
    const second = await startCheckout("starter", "monthly");
    expect(second).not.toBe(first);

    // A paid page of another company never gives this one a plan
    actAs(other);
    const theirs = await startCheckout("growth", "monthly");
    pay(theirs, other.organizationId, "price_growth");
    await testDb
      .update(subscription)
      .set({ checkoutSessionId: theirs.split("/").pop()! })
      .where(eq(subscription.organizationId, company.organizationId));
    actAs(company);
    expect(await getBilling()).toMatchObject({ plan: "free" });
  });

  it("is closed when its company is deleted", async () => {
    const company = await createTestCompany("leaving-co");
    actAs(company);
    const url = await startCheckout("starter", "monthly");
    await deleteCompany("leaving-co");
    expect(stripe.expired).toEqual([url.split("/").pop()]);
    expect(stripe.cancelled).toEqual([]);
  });
});

describe("handing over a company that pays", () => {
  it("makes the new owner Stripe's contact", async () => {
    const company = await createTestCompany("handover-co");
    await testDb.insert(user).values({ id: "user_heir", name: "Heir", email: "heir@example.com" });
    const heir = await addTestMember(company, "user_heir", "member");
    await applySubscriptionEvent(event(company.organizationId));
    actAs(company);
    await transferOwnership(heir);
    expect(stripe.customerEmails).toEqual([
      [`cus_${company.organizationId}`, "heir@example.com"],
    ]);
  });

  it("asks Stripe nothing for a company that never paid", async () => {
    const company = await createTestCompany("free-handover-co");
    await testDb.insert(user).values({ id: "user_heir2", name: "Heir", email: "heir2@example.com" });
    const heir = await addTestMember(company, "user_heir2", "member");
    actAs(company);
    await transferOwnership(heir);
    expect(stripe.customerEmails).toEqual([]);
  });
});

describe("deleting a company that pays", () => {
  it("ends its subscription at Stripe first", async () => {
    const company = await createTestCompany("closing-co");
    await applySubscriptionEvent(event(company.organizationId));
    actAs(company);
    await deleteCompany("closing-co");
    expect(stripe.cancelled).toEqual([`sub_${company.organizationId}`]);
    expect(
      await testDb.$count(subscription, eq(subscription.organizationId, company.organizationId)),
    ).toBe(0);
  });

  it("keeps the company if Stripe can't be told, so nobody pays for nothing", async () => {
    const company = await createTestCompany("stuck-co");
    await applySubscriptionEvent(event(company.organizationId));
    actAs(company);
    stripe.failCancel = "api_error";
    await expect(deleteCompany("stuck-co")).rejects.toThrow(
      "We couldn't cancel this company's subscription.",
    );
    expect(
      await testDb.$count(organization, eq(organization.id, company.organizationId)),
    ).toBe(1);

    // Already gone at Stripe: nothing left to cancel, the deletion goes on
    stripe.failCancel = "resource_missing";
    await deleteCompany("stuck-co");
    expect(
      await testDb.$count(organization, eq(organization.id, company.organizationId)),
    ).toBe(0);
  });

  it("a company on Free is deleted without asking Stripe", async () => {
    const company = await createTestCompany("free-closing-co");
    actAs(company);
    await deleteCompany("free-closing-co");
    expect(stripe.cancelled).toEqual([]);
  });
});
