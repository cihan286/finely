// ─────────────────────────────────────────────────────────────────────────────
// Plans and billing: reading and saving
//
// In plain words: which plan a company is on and how many people that plan
// allows on its team; sending the owner to Stripe's pages to subscribe or to
// manage the subscription; and taking in what Stripe tells us about a
// subscription (started, changed, payment failed, cancelled).
//
// For developers: server-only. getBilling(), startCheckout() and
// openBillingPortal() find the company via requireOrganization(); only the
// owner may spend the company's money. applySubscriptionEvent() and
// memberLimitFor() have no login: the first is called by the webhook route
// after the signature was checked, the second by Better Auth when someone is
// invited. While billing isn't configured (no Stripe keys) nothing is
// limited, so setting Finely up without Stripe works as before.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { eq, or, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscription } from "@/db/finance";
import { member, organization } from "@/db/schema";
import { appUrl } from "@/lib/app-url";
import {
  cancelSubscription,
  createCheckoutSession,
  createPortalSession,
  isBillingEnabled,
  planForPrice,
  StripeError,
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

/** The current company's plan and how much of it is used */
export async function getBilling(): Promise<Billing> {
  const { organization: company } = await requireOrganization();
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
 * payment page to send the owner to.
 */
export async function startCheckout(
  plan: PaidPlan,
  interval: BillingInterval,
): Promise<string> {
  const { user, organization: company } = await requireBillingOwner();
  if (!["starter", "growth"].includes(plan) || !["monthly", "yearly"].includes(interval)) {
    throw new DataError("Choose a plan.");
  }
  const row = await selectSubscription(company.id);
  // Already subscribed: changing plan happens in Stripe's portal, so the
  // company never ends up with two subscriptions
  if (effectivePlan(row) !== "free") {
    throw new DataError("This company already has a plan. Use “Manage billing” to change it.");
  }
  try {
    return await createCheckoutSession({
      organizationId: company.id,
      plan,
      interval,
      customerId: row?.stripeCustomerId ?? null,
      email: user.email,
      successUrl: `${SETTINGS_URL}?billing=success#billing`,
      cancelUrl: `${SETTINGS_URL}#billing`,
    });
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
  const sub = event.data.object as StripeSubscription;
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
  const eventAt = new Date(event.created * 1000);
  const before = effectivePlan(await selectSubscription(organizationId));

  const values = {
    // A price that isn't one of ours can't unlock a plan
    plan: plan ?? "free",
    status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
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

  const after = effectivePlan(saved[0]);
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

/**
 * Ends a company's subscription at Stripe, before the company is deleted,
 * so nobody keeps paying for a company that no longer exists. Throws a
 * DataError if Stripe can't be told.
 */
export async function cancelSubscriptionFor(organizationId: string) {
  const row = await selectSubscription(organizationId);
  if (!row?.stripeSubscriptionId || effectivePlan(row) === "free") return;
  if (!isBillingEnabled) return;
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
