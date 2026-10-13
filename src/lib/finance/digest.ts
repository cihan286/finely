// ─────────────────────────────────────────────────────────────────────────────
// Emails about a company's money: what goes in them
//
// In plain words: two emails keep a team informed without opening Finely.
// The weekly summary says what came in and went out over the last seven
// days, what's in the bank, where the money went, and what needs attention
// (overdue bills, budgets that were exceeded, unusual charges). The alert is
// sent right away when a charge is far above what that vendor usually
// charges. Each person chooses in Settings which of the two they get; this
// file also says what they get before they've chosen.
//
// For developers: pure functions, unit-tested in digest.test.ts. The facts
// are fetched by lib/data/digest.ts; the wording is in
// lib/email/templates.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from "@/lib/dates";
import type { UnusualCharge } from "@/lib/finance/insights";
import type { EmailPreferences, ISODate } from "@/types/finance";

/** What people get until they choose otherwise in Settings */
export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  weeklyDigest: true,
  unusualCharges: true,
};

/** How many days the weekly summary looks back */
export const DIGEST_DAYS = 7;

/** The most charges one alert email lists */
export const MAX_CHARGES_PER_ALERT = 10;

/** The days a summary sent on `today` covers: the seven days before it */
export function digestRange(today: ISODate) {
  return {
    /** First day covered */
    from: addDays(today, -DIGEST_DAYS),
    /** Last day covered (yesterday) */
    to: addDays(today, -1),
  };
}

/** Everything one company's weekly summary says */
export interface Digest {
  organizationName: string;
  /** The company's currency, e.g. "USD" */
  currency: string;
  from: ISODate;
  to: ISODate;
  /** Completed transactions in those days */
  transactionCount: number;
  moneyIn: number;
  /** A positive number */
  moneyOut: number;
  /** What's in all accounts now */
  balance: number;
  /** The categories most was spent in, largest first (at most three) */
  topCategories: { name: string; amount: number }[];
  overdueBills: { count: number; amount: number };
  billsDueSoon: { count: number; amount: number };
  /** Categories over their budget this month */
  overBudget: { name: string; spent: number; budget: number }[];
  /** Unusually high charges in those days */
  unusualCharges: UnusualCharge[];
}

/**
 * Whether there's anything to tell. A company where nothing happened and
 * nothing is due gets no email.
 */
export function digestHasNews(digest: Digest): boolean {
  return (
    digest.transactionCount > 0 ||
    digest.overdueBills.count > 0 ||
    digest.billsDueSoon.count > 0 ||
    digest.overBudget.length > 0
  );
}
