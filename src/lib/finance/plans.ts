// ─────────────────────────────────────────────────────────────────────────────
// Plans: what each one includes
//
// In plain words: the plans a company can be on, what they cost and how
// many people can be on the team with each. A company without a paid
// subscription is on the Free plan. This also decides which plan a company
// is really on, given its subscription: one that was cancelled or never
// paid counts as Free again.
//
// For developers: pure, unit-tested in plans.test.ts; safe to import from
// client components. The prices here are what the screens show; what is
// actually charged is set on the prices in Stripe (STRIPE_PRICE_* in
// .env.example), so keep the two, and the pricing section of the home page
// (components/home/pricing/Pricing.tsx), in step. The only limit that is
// enforced is the team's size.
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_KEYS = ["free", "starter", "growth", "enterprise"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** The plans that can be bought online, and how often they're billed */
export type PaidPlan = "starter" | "growth";
export type BillingInterval = "monthly" | "yearly";

export interface Plan {
  name: string;
  /** How many people can be on the team; null = no limit */
  members: number | null;
  /** US dollars per month, billed monthly / billed yearly; null = not sold online */
  monthlyPrice: number | null;
  yearlyPrice: number | null;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: { name: "Free", members: 2, monthlyPrice: 0, yearlyPrice: 0 },
  starter: { name: "Starter", members: 5, monthlyPrice: 29, yearlyPrice: 24 },
  growth: { name: "Growth", members: 25, monthlyPrice: 79, yearlyPrice: 65 },
  enterprise: { name: "Enterprise", members: null, monthlyPrice: null, yearlyPrice: null },
};

/**
 * Stripe's states of a subscription in which the plan counts. "past_due"
 * (a payment failed, Stripe is retrying) still counts, so a card that
 * expired doesn't lock a team out overnight.
 */
const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

/** The plan a company is really on, given its subscription (if any) */
export function effectivePlan(
  subscription: { plan: string; status: string } | null | undefined,
): PlanKey {
  if (!subscription || !ACTIVE_STATUSES.includes(subscription.status)) return "free";
  return (PLAN_KEYS as readonly string[]).includes(subscription.plan)
    ? (subscription.plan as PlanKey)
    : "free";
}

/** Whether a team of this size may still grow on this plan */
export function canAddMember(plan: PlanKey, memberCount: number): boolean {
  const limit = PLANS[plan].members;
  return limit === null || memberCount < limit;
}

/** "Starter" plan words for a subscription's state, for the screen */
export function statusNote(status: string, cancelAtPeriodEnd: boolean): string | null {
  if (cancelAtPeriodEnd && ACTIVE_STATUSES.includes(status)) {
    return "Cancelled: stays active until the end of the paid period.";
  }
  if (status === "past_due") {
    return "The last payment failed. Update the payment method to keep the plan.";
  }
  if (status === "trialing") return "In its trial period.";
  return null;
}
