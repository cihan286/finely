// ─────────────────────────────────────────────────────────────────────────────
// Notifications: working out what to tell people
//
// In plain words: the bell in the top bar points at things in the company's
// books that deserve a look — a charge far above what that vendor usually
// charges, an account that has gone below zero, a balance that is expected
// to run short within 30 days, a category that went over
// its monthly budget, bills that are overdue or
// due within a week, payments that have been "pending" for more than a
// week, and transactions without a category.
// Nothing is stored: each one is worked out from the data, and disappears by
// itself once it's dealt with.
//
// For developers: pure functions, unit-tested in notifications.test.ts. The
// facts are fetched by lib/data/notifications.ts. Every notification has a
// moment (`at`) it became true; the ones after the person last pressed
// "Mark all as read" are unread.
// ─────────────────────────────────────────────────────────────────────────────

import { localDay } from "@/lib/dates";
import { formatCurrency, formatDate } from "@/lib/format";
import { monthName, monthStart } from "@/lib/finance/budgets";
import type { UnusualCharge } from "@/lib/finance/insights";
import type { ISODate, Notification } from "@/types/finance";

/** Payments still pending after this many days get a reminder */
export const PENDING_REMINDER_DAYS = 7;

export interface NotificationFacts {
  /** Recent charges well above the vendor's usual, and when each was entered */
  unusualCharges: (UnusualCharge & { at: Date })[];
  /** Accounts with a balance below zero, and when each last changed */
  overdrawnAccounts: { id: string; name: string; balance: number; at: Date }[];
  /**
   * Set when the forecast expects the balance to drop below zero: how low,
   * on which day, and when the forecast last changed
   */
  cashShortfall: { balance: number; day: ISODate; at: Date } | null;
  /** Categories over their budget this month, and when each last changed */
  overBudget: {
    categoryId: string;
    name: string;
    budget: number;
    spent: number;
    at: Date;
  }[];
  /** Unpaid bills past their due date; `at` is when the latest became overdue */
  overdueBills: { count: number; amount: number; at: Date | null };
  /** Unpaid bills due within a week; `at` is when the latest came that close */
  billsDueSoon: { count: number; amount: number; at: Date | null };
  /** Payments pending for more than a week; `at` is when the latest became late */
  stalePending: { count: number; at: Date | null };
  /** Transactions without a category; `at` is when the latest was entered */
  uncategorized: { count: number; at: Date | null };
}

const plural = (count: number, one: string, many: string) =>
  count === 1 ? `1 ${one}` : `${count} ${many}`;

/** The company's notifications, newest first. */
export function buildNotifications(
  facts: NotificationFacts,
  /** When this person last marked everything as read; null if never */
  readAt: Date | null,
  timeZone: string,
  /** Today in that timezone, for the month the budgets are about */
  today: ISODate,
): Notification[] {
  const items: (Omit<Notification, "day" | "read"> & { at: Date })[] = [];

  for (const charge of facts.unusualCharges) {
    items.push({
      id: `unusual-${charge.id}`,
      type: "alert",
      title: "Unusually high charge",
      description: `${charge.name} charged ${formatCurrency(charge.amount)}, ${charge.percentAbove}% above its usual ${formatCurrency(charge.usual)}.`,
      href: `/dashboard/transactions?edit=${charge.id}`,
      at: charge.at,
    });
  }

  for (const account of facts.overdrawnAccounts) {
    items.push({
      id: `overdrawn-${account.id}`,
      type: "alert",
      title: "Account below zero",
      description: `${account.name} is at ${formatCurrency(account.balance)}.`,
      href: `/dashboard/transactions?account=${account.id}`,
      at: account.at,
    });
  }

  if (facts.cashShortfall) {
    const { balance, day } = facts.cashShortfall;
    items.push({
      id: "cash-shortfall",
      type: "alert",
      title: "Cash may run short",
      description: `With the bills and regular payments expected, your balance could drop to ${formatCurrency(balance)} by ${formatDate(day)}.`,
      href: "/dashboard#forecast",
      at: facts.cashShortfall.at,
    });
  }

  for (const category of facts.overBudget) {
    items.push({
      // One per month: next month's is a new notification
      id: `budget-${category.categoryId}-${today.slice(0, 7)}`,
      type: "alert",
      title: "Over budget",
      description: `${category.name} is ${formatCurrency(category.spent - category.budget)} over its ${formatCurrency(category.budget)} budget for ${monthName(today)}.`,
      href: `/dashboard/transactions?category=${category.categoryId}&from=${monthStart(today)}`,
      at: category.at,
    });
  }

  if (facts.overdueBills.count > 0 && facts.overdueBills.at) {
    const { count, amount } = facts.overdueBills;
    items.push({
      id: "bills-overdue",
      type: "alert",
      title: count === 1 ? "Bill overdue" : "Bills overdue",
      description: `${plural(count, "bill is", "bills are")} past ${count === 1 ? "its" : "their"} due date, ${formatCurrency(amount)} in total.`,
      href: "/dashboard/bills",
      at: facts.overdueBills.at,
    });
  }

  if (facts.billsDueSoon.count > 0 && facts.billsDueSoon.at) {
    const { count, amount } = facts.billsDueSoon;
    items.push({
      id: "bills-due-soon",
      type: "reminder",
      title: count === 1 ? "Bill due soon" : "Bills due soon",
      description: `${plural(count, "bill is", "bills are")} due within a week, ${formatCurrency(amount)} in total.`,
      href: "/dashboard/bills",
      at: facts.billsDueSoon.at,
    });
  }

  if (facts.stalePending.count > 0 && facts.stalePending.at) {
    const { count } = facts.stalePending;
    items.push({
      id: "stale-pending",
      type: "reminder",
      title: "Payments still pending",
      description: `${plural(count, "payment has", "payments have")} been pending for more than a week. Mark ${count === 1 ? "it" : "them"} completed once ${count === 1 ? "it has" : "they've"} gone through.`,
      href: "/dashboard/transactions",
      at: facts.stalePending.at,
    });
  }

  if (facts.uncategorized.count > 0 && facts.uncategorized.at) {
    const { count } = facts.uncategorized;
    items.push({
      id: "uncategorized",
      type: "reminder",
      title: "Transactions without a category",
      description: `${plural(count, "transaction has", "transactions have")} no category, so ${count === 1 ? "it's" : "they're"} missing from the spending breakdowns.`,
      href: "/dashboard/transactions?category=none",
      at: facts.uncategorized.at,
    });
  }

  return items
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map(({ at, ...item }) => ({
      ...item,
      day: localDay(at, timeZone),
      read: readAt !== null && at <= readAt,
    }));
}
