// ─────────────────────────────────────────────────────────────────────────────
// Bills: the calculations
//
// In plain words: works out whether a bill is overdue, due soon or still far
// off, when a repeating bill comes back (a monthly bill due Jan 15 is next
// due Feb 15), and the totals shown at the top of the Bills page.
//
// For developers: pure functions, unit-tested in bills.test.ts. Days are ISO
// strings in the company's timezone ("2026-11-01"). A day that doesn't exist
// in the next month moves to that month's last day (Jan 31 -> Feb 28), and
// the following bill continues from there (Mar 28).
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from "@/lib/dates";
import type { BillRepeat, ISODate } from "@/types/finance";

/** Bills due within this many days (today included) count as "due soon" */
export const DUE_SOON_DAYS = 7;

/** How each repeat is shown on screen */
export const BILL_REPEAT_LABELS: Record<BillRepeat, string> = {
  none: "Doesn't repeat",
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
  quarterly: "Every 3 months",
  yearly: "Every year",
};

export type BillStatus = "overdue" | "dueSoon" | "upcoming";

// "2026-01-31" + 1 month -> "2026-02-28"
function addMonths(day: ISODate, months: number): ISODate {
  const [year, month, date] = day.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = index % 12;
  // Day 0 of the following month is this month's last day
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m + 1)}-${pad(Math.min(date, lastDay))}`;
}

/** When a repeating bill is due next; null if it doesn't repeat */
export function nextDueDate(dueDate: ISODate, repeat: BillRepeat): ISODate | null {
  switch (repeat) {
    case "weekly":
      return addDays(dueDate, 7);
    case "biweekly":
      return addDays(dueDate, 14);
    case "monthly":
      return addMonths(dueDate, 1);
    case "quarterly":
      return addMonths(dueDate, 3);
    case "yearly":
      return addMonths(dueDate, 12);
    default:
      return null;
  }
}

/** Where an unpaid bill stands today */
export function billStatus(dueDate: ISODate, today: ISODate): BillStatus {
  if (dueDate < today) return "overdue";
  return dueDate < addDays(today, DUE_SOON_DAYS) ? "dueSoon" : "upcoming";
}

export interface BillsSummary {
  overdue: { count: number; amount: number };
  dueSoon: { count: number; amount: number };
  /** Everything still owed, overdue and due soon included */
  unpaid: { count: number; amount: number };
}

/** How much is overdue, due soon and owed in total */
export function summarizeBills(
  unpaid: { amount: number; dueDate: ISODate }[],
  today: ISODate,
): BillsSummary {
  const summary: BillsSummary = {
    overdue: { count: 0, amount: 0 },
    dueSoon: { count: 0, amount: 0 },
    unpaid: { count: 0, amount: 0 },
  };
  const add = (to: { count: number; amount: number }, amount: number) => {
    to.count += 1;
    to.amount = Math.round((to.amount + amount) * 100) / 100;
  };
  for (const bill of unpaid) {
    add(summary.unpaid, bill.amount);
    const status = billStatus(bill.dueDate, today);
    if (status !== "upcoming") add(summary[status], bill.amount);
  }
  return summary;
}
