// ─────────────────────────────────────────────────────────────────────────────
// Budgets: the calculations
//
// In plain words: a spending category can have a monthly budget ("Marketing:
// $2,000 a month"). This compares each budget with what was spent in that
// category so far this month, and says whether it's fine, nearly used up
// (80% or more) or over.
//
// For developers: pure functions, unit-tested in budgets.test.ts. The month
// is the calendar month in the company's timezone; the spending is fetched
// by lib/data/budgets.ts (completed money out only).
// ─────────────────────────────────────────────────────────────────────────────

import type { CategoryIconKey, ISODate } from "@/types/finance";

/** From this share of the budget on, a category counts as "nearly used up" */
export const NEAR_BUDGET_RATIO = 0.8;

export type BudgetStatus = "ok" | "near" | "over";

/** A category that has a budget, and what was spent in it this month */
export interface BudgetSpending {
  categoryId: string;
  name: string;
  color: string;
  iconKey: CategoryIconKey;
  /** The monthly limit (more than zero) */
  budget: number;
  /** Spent so far this month (a positive number) */
  spent: number;
}

export interface BudgetProgress extends BudgetSpending {
  /** What's left; negative once over budget */
  remaining: number;
  /** spent ÷ budget, e.g. 1.2 when 20% over */
  ratio: number;
  status: BudgetStatus;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const round2 = (n: number) => Math.round(n * 100) / 100;

/** "2026-10-13" -> "October" */
export function monthName(day: ISODate): string {
  return MONTHS[Number(day.slice(5, 7)) - 1];
}

/** "2026-10-13" -> "2026-10-01", the first day of that month */
export function monthStart(day: ISODate): ISODate {
  return `${day.slice(0, 7)}-01`;
}

/** "2026-12-13" -> "2027-01-01", the first day of the month after */
export function nextMonthStart(day: ISODate): ISODate {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  return month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (spent > budget) return "over";
  return spent >= budget * NEAR_BUDGET_RATIO ? "near" : "ok";
}

/** Each budget's progress, the most used up first. */
export function buildBudgets(spending: BudgetSpending[]): BudgetProgress[] {
  return spending
    .map((b) => ({
      ...b,
      spent: round2(b.spent),
      remaining: round2(b.budget - b.spent),
      ratio: b.spent / b.budget,
      status: budgetStatus(b.spent, b.budget),
    }))
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));
}
