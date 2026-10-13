// ─────────────────────────────────────────────────────────────────────────────
// Regular payments: spotting them in the history
//
// In plain words: looks through past transactions for payments that come
// back like clockwork — a subscription every month, payroll every two
// weeks, rent, a customer who pays every quarter — and works out how much
// each usually is and when the next one is expected.
//
// For developers: pure functions, unit-tested in recurring.test.ts. A
// payment is "regular" when the same vendor (see vendors.ts) was paid on at
// least three different days, at least three quarters of the gaps between
// them fit one rhythm (weekly, every 2 weeks, monthly or quarterly), the
// latest gap fits it too, and the next one isn't long overdue (then it
// probably stopped). Money in and money out are looked at separately.
// Several payments to one vendor on the same day count as one (payroll for
// several people).
// ─────────────────────────────────────────────────────────────────────────────

import { daysBetween } from "@/lib/dates";
import { nextDueDate } from "@/lib/finance/bills";
import { vendorKey, vendorName } from "@/lib/finance/vendors";
import type { BillRepeat, ISODate } from "@/types/finance";

/** The rhythms we look for (each is also a way a bill can repeat) */
export type Cadence = Extract<BillRepeat, "weekly" | "biweekly" | "monthly" | "quarterly">;

/** How far back to look for a rhythm, in days */
export const RECURRING_HISTORY_DAYS = 400;

// For each rhythm: the gaps (in days) that fit it — banks shift payments
// around weekends and months differ in length — how many a month it makes,
// and how many days late the next one may be before we assume it stopped
const CADENCES: {
  cadence: Cadence;
  min: number;
  max: number;
  perMonth: number;
  grace: number;
}[] = [
  { cadence: "weekly", min: 6, max: 8, perMonth: 52 / 12, grace: 4 },
  { cadence: "biweekly", min: 13, max: 15, perMonth: 26 / 12, grace: 7 },
  { cadence: "monthly", min: 26, max: 35, perMonth: 1, grace: 10 },
  { cadence: "quarterly", min: 84, max: 98, perMonth: 1 / 3, grace: 20 },
];

const MIN_OCCURRENCES = 3;
const MIN_FITTING_SHARE = 0.75;
// Amounts that differ by more than this are shown as "about"
const VARIABLE_SPREAD = 0.1;

/** One transaction, as much as the detection needs */
export interface HistoryLine {
  name: string;
  /** Positive = money in, negative = money out */
  amount: number;
  day: ISODate;
  categoryId: string | null;
}

export interface RecurringPayment {
  /** The same for every payment of this vendor in this direction */
  key: string;
  /** The vendor, without reference numbers */
  name: string;
  /** Money in or money out */
  direction: "in" | "out";
  cadence: Cadence;
  /** What one payment usually is (a positive number) */
  amount: number;
  /** Whether the amount changes noticeably from one time to the next */
  variable: boolean;
  /** What it adds up to per month (a positive number) */
  monthlyAmount: number;
  /** On how many days it was paid in the history */
  count: number;
  lastDay: ISODate;
  /** When the next one is expected (may be a few days ago if it's late) */
  nextDay: ISODate;
  /** The latest payment's category */
  categoryId: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** The regular payments in a history, the largest per month first. */
export function detectRecurring(
  history: HistoryLine[],
  today: ISODate,
): RecurringPayment[] {
  // Per vendor and direction: one entry per day, same-day payments added up
  const groups = new Map<
    string,
    { days: Map<ISODate, number>; latest: HistoryLine }
  >();
  for (const line of history) {
    if (line.amount === 0 || line.day > today) continue;
    const key = `${line.amount > 0 ? "in" : "out"}:${vendorKey(line.name)}`;
    const group = groups.get(key) ?? { days: new Map(), latest: line };
    group.days.set(line.day, (group.days.get(line.day) ?? 0) + Math.abs(line.amount));
    if (line.day >= group.latest.day) group.latest = line;
    groups.set(key, group);
  }

  const found: RecurringPayment[] = [];
  for (const [key, { days, latest }] of groups) {
    if (days.size < MIN_OCCURRENCES) continue;
    const occurrences = [...days].sort(([a], [b]) => a.localeCompare(b));
    const gaps = occurrences
      .slice(1)
      .map(([day], i) => daysBetween(occurrences[i][0], day));

    const fits = (gap: number, c: (typeof CADENCES)[number]) =>
      gap >= c.min && gap <= c.max;
    const rhythm = CADENCES.find(
      (c) =>
        fits(gaps[gaps.length - 1], c) &&
        gaps.filter((gap) => fits(gap, c)).length / gaps.length >= MIN_FITTING_SHARE,
    );
    if (!rhythm) continue;

    const lastDay = occurrences[occurrences.length - 1][0];
    const nextDay = nextDueDate(lastDay, rhythm.cadence)!;
    // Long overdue: it was probably cancelled
    if (daysBetween(nextDay, today) > rhythm.grace) continue;

    // The latest amounts say most about the next one
    const recent = occurrences.slice(-6).map(([, amount]) => amount);
    const amount = median(recent.slice(-3));
    found.push({
      key,
      name: vendorName(latest.name),
      direction: latest.amount > 0 ? "in" : "out",
      cadence: rhythm.cadence,
      amount: round2(amount),
      variable: (Math.max(...recent) - Math.min(...recent)) / amount > VARIABLE_SPREAD,
      monthlyAmount: round2(amount * rhythm.perMonth),
      count: occurrences.length,
      lastDay,
      nextDay,
      categoryId: latest.categoryId,
    });
  }
  return found.sort(
    (a, b) => b.monthlyAmount - a.monthlyAmount || a.name.localeCompare(b.name),
  );
}

/**
 * What identifies a bill's vendor the way recurring payments are identified,
 * to tell whether a regular payment is already tracked as a bill.
 */
export function billKey(billName: string): string {
  return `out:${vendorKey(billName)}`;
}
