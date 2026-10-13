// ─────────────────────────────────────────────────────────────────────────────
// Plans and billing: reading and saving
//
// In plain words: which plan a company is on and how many people that plan
// allows on its team; sending the owner to Stripe's pages to subscribe or to
// manage the subscription; and taking in what Stripe tells us about a
// subscription (started, changed, payment failed, cancelled). After a
// payment we also ask Stripe ourselves how it went, so the plan is right
// even when Stripe's message is late, and a payment page that is still open
// is reused rather than a second one opened: nobody pays twice.
//
// For developers: server-only. getBilling(), startCheckout() and
// openBillingPortal() find the company via requireOrganization(); only the
// owner may spend the company's money. applySubscriptionEvent() and
// memberLimitFor() have no login: the first is called by the webhook route
// after the signature was checked, the second by Better Auth when someone is
// invited. While billing isn't configured (no Stripe keys) nothing is
// limited, so setting Finely up without Stripe works as before.
// subscription.checkoutSessionId remembers the payment page last opened;
// settleCheckout() asks Stripe how it ended, whenever the plan is looked at
// or another page is asked for.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, or, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscription } from "@/db/finance";
import { member, organization, user } from "@/db/schema";
import { appUrl } from "@/lib/app-url";
import {
  cancelSubscription,
  createCheckoutSession,
  createPortalSession,
  expireCheckoutSession,
  getCheckoutSession,
  isBillingEnabled,
  planForPrice,
  priceIdFor,
  StripeError,
  updateCustomerEmail,
  type StripeEvent,
  type StripeSubscription,
} from "@/lib/billing/stripe";
import {
  effectivePlan,
  PLANS,
  statusNote,
  type BillingInterval,
  type PaidPlan,
  type PlanKey,
} from "@/lib/finance/plans";
import { afterResponse } from "@/lib/after-response";
import { sendEmail } from "@/lib/email/send";
import { paymentFailedEmail, planEndedEmail } from "@/lib/email/templates";
import { requireOrganization } from "@/lib/session";
import { recordAudit } from "./audit";
import { DataError } from "./common";

/** The team size allowed while billing isn't set up (Better Auth's own default) */
const UNLIMITED_MEMBERS = 100;
/** What "no limit" (Enterprise) is in numbers */
const ENTERPRISE_MEMBERS = 10_000;

const SETTINGS_URL = `${appUrl}/dashboard/settings`;

/** What the Settings page shows about a company's plan */
export interface Billing {
  /** Whether paying for a plan is set up at all */
  enabled: boolean;
  plan: PlanKey;
  /** How many people the team may have; null = no limit */
  memberLimit: number | null;
  memberCount: number;
  /** A note about the subscription's state, e.g. a failed payment */
  note: string | null;
  /** When the paid period ends or renews; null without a subscription */
  currentPeriodEnd: Date | null;
  /** Whether Stripe knows this company (it can open "Manage billing") */
  hasCustomer: boolean;
}

// A company's subscription row, if it has one
async function selectSubscription(organizationId: string) {
  const [row] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.organizationId, organizationId));
  return row ?? null;
}

// How many people are in a company
async function countMembers(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  return row.count;
}

/**
 * Finds out how the payment page that was last opened for a company ended,
 * by asking Stripe: paid (the subscription is saved, as Stripe's own message
 * would), expired (forgotten), or still open (returned, to send the owner
 * back to). Null when nothing is open. If Stripe can't be asked, nothing
 * changes and the page counts as not open: the next look tries again.
 */
async function settleCheckout(
  organizationId: string,
): Promise<{ id: string; url: string; priceId: string | null } | null> {
  const row = await selectSubscription(organizationId);
  if (!row?.checkoutSessionId || !isBillingEnabled) return null;
  const forget = () =>
    db
      .update(subscription)
      .set({ checkoutSessionId: null })
      .where(
        and(
          eq(subscription.organizationId, organizationId),
          eq(subscription.checkoutSessionId, row.checkoutSessionId!),
        ),
      );

  let session;
  try {
    session = await getCheckoutSession(row.checkoutSessionId);
  } catch (error) {
    if (!(error instanceof StripeError)) throw error;
    // Stripe no longer knows it: nothing to wait for
    if (error.code === "resource_missing") await forget();
    return null;
  }
  // Never another company's payment
  if (session.client_reference_id !== organizationId) {
    await forget();
    return null;
  }
  if (session.status === "open" && session.url) {
    return {
      id: session.id,
      url: session.url,
      priceId: session.line_items?.data[0]?.price?.id ?? null,
    };
  }
  if (session.status === "complete" && session.subscription) {
    // From the moment it started, so Stripe's own messages (never older
    // than that) still count
    await saveSubscription(session.subscription, session.subscription.created, false);
  }
  await forget();
  return null;
}

/** The current company's plan and how much of it is used */
export async function getBilling(): Promise<Billing> {
  const { organization: company } = await requireOrganization();
  // Just paid, perhaps: don't wait for Stripe's message
  await settleCheckout(company.id);
  const row = await selectSubscription(company.id);
  const plan = effectivePlan(row);
  return {
    enabled: isBillingEnabled,
    plan,
    // Nothing is limited until billing is set up
    memberLimit: isBillingEnabled ? PLANS[plan].members : null,
    memberCount: await countMembers(company.id),
    note: row ? statusNote(row.status, row.cancelAtPeriodEnd) : null,
    currentPeriodEnd: row && plan !== "free" ? row.currentPeriodEnd : null,
    hasCustomer: Boolean(row?.stripeCustomerId),
  };
}

// The signed-in person and their company; stops anyone but the owner
async function requireBillingOwner() {
  const context = await requireOrganization();
  if (context.role !== "owner") {
    throw new DataError("Only the company's owner can change its plan.");
  }
  if (!isBillingEnabled) throw new DataError("Paying for a plan isn't set up yet.");
  return context;
}

/**
 * Starts subscribing to a plan (owner only): the address of Stripe's
 * payment page to send the owner to. A page that is still open for the same
 * plan is used again; one for another plan is closed first, so there's only
 * ever one page that can be paid.
 */
export async function startCheckout(
  plan: PaidPlan,
  interval: BillingInterval,
): Promise<string> {
  const { user, organization: company } = await requireBillingOwner();
  if (!["starter", "growth"].includes(plan) || !["monthly", "yearly"].includes(interval)) {
    throw new DataError("Choose a plan.");
  }
  try {
    // The page opened before, if any: paid in the meantime (the plan is
    // saved now), or still waiting
    const open = await settleCheckout(company.id);
    const row = await selectSubscription(company.id);
    // Already subscribed: changing plan happens in Stripe's portal, so the
    // company never ends up with two subscriptions
    if (effectivePlan(row) !== "free") {
      throw new DataError("This company already has a plan. Use “Manage billing” to change it.");
    }
    if (open) {
      if (open.priceId === priceIdFor(plan, interval)) return open.url;
      // Another plan this time: the old page must not be payable any more
      await expireCheckoutSession(open.id);
    }
    const session = await createCheckoutSession({
      organizationId: company.id,
      plan,
      interval,
      customerId: row?.stripeCustomerId ?? null,
      email: user.email,
      successUrl: `${SETTINGS_URL}?billing=success#billing`,
      cancelUrl: `${SETTINGS_URL}#billing`,
    });
    await db
      .insert(subscription)
      .values({
        organizationId: company.id,
        plan: "free",
        status: "none",
        checkoutSessionId: session.id,
      })
      .onConflictDoUpdate({
        target: subscription.organizationId,
        set: { checkoutSessionId: session.id },
      });
    return session.url;
  } catch (error) {
    if (error instanceof StripeError) {
      throw new DataError("We couldn't open the payment page. Please try again.");
    }
    throw error;
  }
}

/**
 * The address of Stripe's page to change plan or payment method, cancel, or
 * find invoices (owner only).
 */
export async function openBillingPortal(): Promise<string> {
  const { organization: company } = await requireBillingOwner();
  const row = await selectSubscription(company.id);
  if (!row?.stripeCustomerId) throw new DataError("This company has no subscription yet.");
  try {
    return await createPortalSession(row.stripeCustomerId, `${SETTINGS_URL}#billing`);
  } catch (error) {
    if (error instanceof StripeError) {
      throw new DataError("We couldn't open the billing page. Please try again.");
    }
    throw error;
  }
}

/**
 * How many people a company's team may have, for Better Auth to enforce
 * when someone is invited or joins.
 */
export async function memberLimitFor(organizationId: string): Promise<number> {
  if (!isBillingEnabled) return UNLIMITED_MEMBERS;
  const plan = effectivePlan(await selectSubscription(organizationId));
  return PLANS[plan].members ?? ENTERPRISE_MEMBERS;
}

/**
 * Takes in one of Stripe's messages about a subscription (already checked
 * to really come from Stripe). Returns whether it changed anything.
 * Messages can arrive late or twice: an older one never overwrites a newer.
 */
export async function applySubscriptionEvent(event: StripeEvent): Promise<boolean> {
  if (!event.type.startsWith("customer.subscription.")) return false;
  return saveSubscription(
    event.data.object as StripeSubscription,
    event.created,
    event.type === "customer.subscription.deleted",
  );
}

// Saves what Stripe says about a subscription, unless we already know
// something newer. `at` is when that was true (seconds since 1970).
async function saveSubscription(
  sub: StripeSubscription,
  at: number,
  deleted: boolean,
): Promise<boolean> {
  const organizationId = sub.metadata?.organization_id;
  // Not a subscription we started (no company attached to it)
  if (!organizationId || typeof organizationId !== "string") return false;

  const [company] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, organizationId));
  if (!company) return false; // the company was deleted since

  const item = sub.items?.data?.[0];
  const plan = planForPrice(item?.price?.id);
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;
  const eventAt = new Date(at * 1000);
  const previous = await selectSubscription(organizationId);
  const before = effectivePlan(previous);

  const values = {
    // A price that isn't one of ours can't unlock a plan
    plan: plan ?? "free",
    status: deleted ? "canceled" : sub.status,
    stripeCustomerId: sub.customer,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    eventAt,
  };
  const saved = await db
    .insert(subscription)
    .values({ organizationId, ...values })
    .onConflictDoUpdate({
      target: subscription.organizationId,
      set: { ...values, updatedAt: new Date() },
      // Only if this message is newer than what we have
      setWhere: or(isNull(subscription.eventAt), lt(subscription.eventAt, eventAt)),
    })
    .returning({ plan: subscription.plan, status: subscription.status });
  if (saved.length === 0) return false;

  // A payment just failed (Stripe keeps trying for a while): tell the owner,
  // once, so the plan isn't lost over an expired card
  if (saved[0].status === "past_due" && previous?.status !== "past_due") {
    await afterResponse(() => notifyOwner(organizationId, "payment-failed"));
  }

  const after = effectivePlan(saved[0]);
  // The paid plan is over (cancelled, or Stripe gave up on the payment):
  // the owner should hear it from us, not find out when an invitation fails
  if (after === "free" && before !== "free") {
    await afterResponse(() => notifyOwner(organizationId, PLANS[before].name));
  }
  if (after !== before) {
    await recordAudit(
      { organizationId, userId: null },
      {
        area: "settings",
        action: "plan-changed",
        summary: `The company's plan changed from ${PLANS[before].name} to ${PLANS[after].name}`,
      },
    );
  }
  return true;
}

// Emails a company's owner that the payment for its plan failed, or that
// the plan (given by name) has ended. Never throws: it runs after Stripe's
// message was answered.
async function notifyOwner(organizationId: string, about: "payment-failed" | string) {
  try {
    const [owner] = await db
      .select({ name: user.name, email: user.email, company: organization.name })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(and(eq(member.organizationId, organizationId), eq(member.role, "owner")));
    if (!owner) return;
    await sendEmail(
      about === "payment-failed"
        ? paymentFailedEmail(owner, owner.company)
        : planEndedEmail(owner, owner.company, about, PLANS.free.members ?? 0),
    );
  } catch (error) {
    console.error("[billing] Could not email the owner about their plan:", error);
  }
}

/**
 * Tells Stripe where a company's receipts and payment notices go from now
 * on: its new owner's address, after a handover. Never throws: the handover
 * stands even if Stripe can't be told (the owner can change it under
 * "Manage billing").
 */
export async function updateBillingContact(organizationId: string, email: string) {
  if (!isBillingEnabled) return;
  try {
    const row = await selectSubscription(organizationId);
    if (row?.stripeCustomerId) await updateCustomerEmail(row.stripeCustomerId, email);
  } catch (error) {
    console.error("[billing] Could not update the billing email at Stripe:", error);
  }
}

/**
 * Ends a company's subscription at Stripe (and closes a payment page that
 * is still open), before the company is deleted, so nobody keeps paying,
 * or starts paying, for a company that no longer exists. Throws a
 * DataError if Stripe can't be told.
 */
export async function cancelSubscriptionFor(organizationId: string) {
  if (!isBillingEnabled) return;
  // A payment page that is still open must not be paid for a company that
  // is about to be gone (and if it was paid a moment ago, we know now)
  try {
    const open = await settleCheckout(organizationId);
    if (open) await expireCheckoutSession(open.id);
  } catch (error) {
    if (!(error instanceof StripeError)) throw error;
    throw new DataError(
      "We couldn't close this company's open payment page. Please try again in a minute.",
    );
  }
  const row = await selectSubscription(organizationId);
  if (!row?.stripeSubscriptionId || effectivePlan(row) === "free") return;
  try {
    await cancelSubscription(row.stripeSubscriptionId);
  } catch (error) {
    // Already gone at Stripe: nothing left to cancel
    if (error instanceof StripeError && error.code === "resource_missing") return;
    throw new DataError(
      "We couldn't cancel this company's subscription. Cancel it under “Manage billing” first, then delete the company.",
    );
  }
}
