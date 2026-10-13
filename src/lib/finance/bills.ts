// ─────────────────────────────────────────────────────────────────────────────
// Bills: the calculations
//
// In plain words: works out whether a bill is overdue, due soon or still far
// off, when a repeating bill comes back (a monthly bill due Jan 15 is next
// due Feb 15), the totals shown at the top of the Bills page, and which
// newly arrived transactions are the payments of which unpaid bills.
//
// For developers: pure functions, unit-tested in bills.test.ts. Days are ISO
// strings in the company's timezone ("2026-11-01"). A day that doesn't exist
// in the next month moves to that month's last day (Jan 31 -> Feb 28), and
// the following bill continues from there (Mar 28).
//
// A transaction is taken for a bill's payment only when three things agree:
// it's money out of exactly the bill's amount, it names the same vendor
// (see sameVendor()), and it happened close to the due date. "Close" is at
// most 10 days early and 45 late, and less for bills that come back often,
// so last week's payment isn't taken for this week's bill.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays, daysBetween } from "@/lib/dates";
import { sameVendor } from "@/lib/finance/vendors";
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

// How many days before and after its due date a bill's payment may have
// happened to be recognized by itself: always less than the time until the
// bill comes back
const PAYMENT_WINDOW: Record<BillRepeat, { early: number; late: number }> = {
  none: { early: 10, late: 45 },
  weekly: { early: 3, late: 3 },
  biweekly: { early: 6, late: 7 },
  monthly: { early: 10, late: 17 },
  quarterly: { early: 10, late: 45 },
  yearly: { early: 10, late: 45 },
};

/** An unpaid bill, as much as the matching needs */
export interface OwedBill {
  id: string;
  name: string;
  /** A positive number */
  amount: number;
  dueDate: ISODate;
  repeat: BillRepeat;
}

/** A transaction that might be a bill's payment */
export interface ArrivedPayment {
  id: string;
  name: string;
  /** Negative: money out */
  amount: number;
  day: ISODate;
}

/**
 * Which transactions are the payments of which unpaid bills. Each
 * transaction pays at most one bill and each bill is paid at most once: the
 * bill due first chooses first, and takes the payment closest to its due
 * date.
 */
export function matchBillPayments(
  bills: OwedBill[],
  payments: ArrivedPayment[],
): { billId: string; paymentId: string }[] {
  const cents = (amount: number) => Math.round(amount * 100);
  const used = new Set<string>();
  const matches: { billId: string; paymentId: string }[] = [];
  const byDueDate = [...bills].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id),
  );
  for (const bill of byDueDate) {
    const window = PAYMENT_WINDOW[bill.repeat];
    let best: { id: string; distance: number } | null = null;
    for (const payment of payments) {
      if (used.has(payment.id)) continue;
      if (payment.amount >= 0 || cents(-payment.amount) !== cents(bill.amount)) continue;
      // Positive when paid after the due date
      const late = daysBetween(bill.dueDate, payment.day);
      if (late < -window.early || late > window.late) continue;
      if (!sameVendor(bill.name, payment.name)) continue;
      const distance = Math.abs(late);
      if (!best || distance < best.distance) best = { id: payment.id, distance };
    }
    if (best) {
      used.add(best.id);
      matches.push({ billId: bill.id, paymentId: best.id });
    }
  }
  return matches;
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
