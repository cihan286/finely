// ─────────────────────────────────────────────────────────────────────────────
// Insights: the calculations
//
// In plain words: the Insights page looks at a longer stretch of time than
// the dashboard — the last 3, 6 or 12 months. This works out, for that
// period: money in and out per month, the totals and how much of the income
// was kept (savings rate), where the money went by category and by vendor,
// and which recent charges were unusually high compared with what that
// vendor normally charges. The figures are fetched by lib/data/insights.ts.
//
// For developers: pure functions, unit-tested in insights.test.ts. Days and
// months are strings in the company's timezone ("2026-10-06", "2026-10").
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from "@/lib/dates";
import { topCategories, type CategorySpending } from "@/lib/finance/dashboard-summary";
import type { ExpenseCategory, ISODate } from "@/types/finance";

/** The periods to choose from, in months */
export const INSIGHT_PERIODS = [3, 6, 12] as const;
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

/** Money in and out in one month ("2026-10"), completed transactions only */
export interface MonthlyTotals {
  month: string;
  income: number;
  /** A positive number */
  expenses: number;
}

/** Spending with one vendor (transactions with the same description) */
export interface VendorSpending {
  name: string;
  count: number;
  /** A positive number */
  amount: number;
}

/** One expense, for spotting unusual charges */
export interface ExpenseLine {
  id: string;
  name: string;
  /** Negative, as stored */
  amount: number;
  day: ISODate;
}

export interface UnusualCharge {
  id: string;
  name: string;
  day: ISODate;
  /** What was charged (positive) */
  amount: number;
  /** The vendor's average charge before (positive) */
  usual: number;
  /** How much more than usual, e.g. 38 for 38% */
  percentAbove: number;
}

export interface Insights {
  today: ISODate;
  period: InsightPeriod;
  /** One entry per month of the period, oldest first */
  monthly: {
    month: string;
    label: string;
    income: number;
    expenses: number;
    /** The current month, which isn't over yet */
    partial: boolean;
  }[];
  totals: {
    income: number;
    expenses: number;
    net: number;
    /** Share of income kept (net ÷ income), null without income */
    savingsRate: number | null;
  };
  categories: ExpenseCategory[];
  vendors: (VendorSpending & { share: number })[];
  unusualCharges: UnusualCharge[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const round2 = (n: number) => Math.round(n * 100) / 100;

// Unusual charges: recent = the last 30 days, compared with the half year
// before; at least 50% and $20 above the vendor's average, which must be
// based on at least two earlier charges
const RECENT_DAYS = 30;
const HISTORY_DAYS = 180;
const UNUSUAL_RATIO = 1.5;
const UNUSUAL_MIN_DIFFERENCE = 20;
const MIN_HISTORY = 2;
const MAX_UNUSUAL = 5;
const TOP_VENDORS = 8;

/** "2026-10" + -2 -> "2026-08" */
function addMonths(month: string, months: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * The months a period covers (ending with the current month) and the days
 * to fetch: the period itself, and the earlier days unusual charges are
 * compared with.
 */
export function insightRange(today: ISODate, period: InsightPeriod) {
  const currentMonth = today.slice(0, 7);
  const months = Array.from({ length: period }, (_, i) =>
    addMonths(currentMonth, i - period + 1),
  );
  const recentStart = addDays(today, -(RECENT_DAYS - 1));
  return {
    months,
    /** First day of the period */
    start: `${months[0]}-01` as ISODate,
    /** The day after today (ranges run up to, not including, it) */
    end: addDays(today, 1),
    /** First day of "recent" for unusual charges */
    recentStart,
    /** First day of the history unusual charges are compared with */
    historyStart: addDays(recentStart, -HISTORY_DAYS),
  };
}

/** Works out everything the Insights page shows. */
export function buildInsights({
  today,
  period,
  monthly,
  categorySpending,
  vendors,
  expenses,
}: {
  today: ISODate;
  period: InsightPeriod;
  monthly: MonthlyTotals[];
  categorySpending: CategorySpending[];
  vendors: VendorSpending[];
  expenses: ExpenseLine[];
}): Insights {
  const { months } = insightRange(today, period);
  const byMonth = new Map(monthly.map((m) => [m.month, m]));
  const points = months.map((month) => ({
    month,
    label: MONTHS[Number(month.slice(5, 7)) - 1],
    income: round2(byMonth.get(month)?.income ?? 0),
    expenses: round2(byMonth.get(month)?.expenses ?? 0),
    partial: month === today.slice(0, 7),
  }));

  const income = round2(points.reduce((sum, m) => sum + m.income, 0));
  const spent = round2(points.reduce((sum, m) => sum + m.expenses, 0));
  const net = round2(income - spent);

  const vendorTotal = vendors.reduce((sum, v) => sum + v.amount, 0);
  return {
    today,
    period,
    monthly: points,
    totals: {
      income,
      expenses: spent,
      net,
      savingsRate: income > 0 ? net / income : null,
    },
    // Up to seven categories; the rest together
    categories: topCategories(categorySpending, 6),
    vendors: [...vendors]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, TOP_VENDORS)
      .map((v) => ({
        ...v,
        amount: round2(v.amount),
        share: vendorTotal > 0 ? v.amount / vendorTotal : 0,
      })),
    unusualCharges: findUnusualCharges(expenses, today),
  };
}

/**
 * Recent charges well above what the same vendor (same description,
 * ignoring case) usually charges. Biggest jumps first.
 */
export function findUnusualCharges(
  expenses: ExpenseLine[],
  today: ISODate,
): UnusualCharge[] {
  const { recentStart, historyStart } = insightRange(today, 3);
  const vendor = (name: string) => name.trim().toLowerCase();

  // Each vendor's earlier charges
  const history = new Map<string, number[]>();
  for (const e of expenses) {
    if (e.day >= historyStart && e.day < recentStart) {
      const list = history.get(vendor(e.name)) ?? [];
      list.push(Math.abs(e.amount));
      history.set(vendor(e.name), list);
    }
  }

  const unusual: UnusualCharge[] = [];
  for (const e of expenses) {
    if (e.day < recentStart || e.day > today) continue;
    const earlier = history.get(vendor(e.name));
    if (!earlier || earlier.length < MIN_HISTORY) continue;
    const usual = earlier.reduce((sum, a) => sum + a, 0) / earlier.length;
    const amount = Math.abs(e.amount);
    if (amount >= usual * UNUSUAL_RATIO && amount - usual >= UNUSUAL_MIN_DIFFERENCE) {
      unusual.push({
        id: e.id,
        name: e.name,
        day: e.day,
        amount: round2(amount),
        usual: round2(usual),
        percentAbove: Math.round((amount / usual - 1) * 100),
      });
    }
  }
  return unusual
    .sort((a, b) => b.percentAbove - a.percentAbove)
    .slice(0, MAX_UNUSUAL);
}
