// ─────────────────────────────────────────────────────────────────────────────
// Notifications: working out what to tell people
//
// In plain words: the bell in the top bar points at things in the company's
// books that deserve a look — a charge far above what that vendor usually
// charges, an account that has gone below zero, a balance that is expected
// to run short within 30 days, a category that went over
// its monthly budget or has nearly used it up, bills that are overdue or
// due within a week or that a payment already there may have paid, a
// payment card over its monthly limit, payments that have been "pending" for more than a
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
import { DEFAULT_LOCALE, fill, plural, type Locale } from "@/i18n/config";
import { messagesFor, type Messages } from "@/i18n/messages";
import { ALL_SPENDING, monthName, monthStart } from "@/lib/finance/budgets";
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
  /**
   * Categories that have used up most of their budget this month without
   * going over (80% or more), and when each last changed
   */
  nearBudget: {
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
  /** Payment cards over their monthly limit, and when each last changed */
  cardsOverLimit: {
    id: string;
    name: string;
    last4: string;
    limit: number;
    spent: number;
    at: Date;
  }[];
  /**
   * Unpaid bills for which a payment of the same amount is already among
   * the transactions; `billId` is set when it's just one, `at` is when the
   * latest such payment was entered
   */
  billsMaybePaid: { count: number; billId: string | null; at: Date | null };
  /** Payments pending for more than a week; `at` is when the latest became late */
  stalePending: { count: number; at: Date | null };
  /** Transactions without a category; `at` is when the latest was entered */
  uncategorized: { count: number; at: Date | null };
}

// Where a budget's notification leads: the month's transactions, in its
// category (all of them for the overall budget)
const budgetHref = (categoryId: string, today: ISODate) =>
  `/dashboard/transactions?${categoryId === ALL_SPENDING ? "" : `category=${categoryId}&`}from=${monthStart(today)}`;


/** The company's notifications, newest first. */
export function buildNotifications(
  facts: NotificationFacts,
  /** When this person last marked everything as read; null if never */
  readAt: Date | null,
  timeZone: string,
  /** Today in that timezone, for the month the budgets are about */
  today: ISODate,
  /** The company's currency, for the amounts in the texts */
  currency = "USD",
  /** The reader's language */
  locale: Locale = DEFAULT_LOCALE,
): Notification[] {
  const t: Messages["notifications"] = messagesFor(locale).notifications;
  const money = (amount: number) => formatCurrency(amount, { currency }, locale);
  const month = monthName(today, locale);
  const items: (Omit<Notification, "day" | "read"> & { at: Date })[] = [];

  for (const charge of facts.unusualCharges) {
    items.push({
      id: `unusual-${charge.id}`,
      type: "alert",
      title: t.unusualTitle,
      description: fill(t.unusual, {
        name: charge.name,
        amount: money(charge.amount),
        percent: charge.percentAbove,
        usual: money(charge.usual),
      }),
      href: `/dashboard/transactions?edit=${charge.id}`,
      at: charge.at,
    });
  }

  for (const account of facts.overdrawnAccounts) {
    items.push({
      id: `overdrawn-${account.id}`,
      type: "alert",
      title: t.overdrawnTitle,
      description: fill(t.overdrawn, { name: account.name, balance: money(account.balance) }),
      href: `/dashboard/transactions?account=${account.id}`,
      at: account.at,
    });
  }

  if (facts.cashShortfall) {
    const { balance, day } = facts.cashShortfall;
    items.push({
      id: "cash-shortfall",
      type: "alert",
      title: t.shortfallTitle,
      description: fill(t.shortfall, { balance: money(balance), date: formatDate(day, locale) }),
      href: "/dashboard#forecast",
      at: facts.cashShortfall.at,
    });
  }

  for (const category of facts.overBudget) {
    items.push({
      // One per month: next month's is a new notification
      id: `budget-${category.categoryId}-${today.slice(0, 7)}`,
      type: "alert",
      title: t.overBudgetTitle,
      description: fill(t.overBudget, {
        name: category.name,
        over: money(category.spent - category.budget),
        budget: money(category.budget),
        month,
      }),
      href: budgetHref(category.categoryId, today),
      at: category.at,
    });
  }

  for (const category of facts.nearBudget) {
    items.push({
      // Its own ID: going over later is a new notification
      id: `budget-near-${category.categoryId}-${today.slice(0, 7)}`,
      type: "reminder",
      title: t.nearBudgetTitle,
      description: fill(t.nearBudget, {
        name: category.name,
        percent: Math.floor((category.spent / category.budget) * 100),
        budget: money(category.budget),
        month,
        left: money(category.budget - category.spent),
      }),
      href: budgetHref(category.categoryId, today),
      at: category.at,
    });
  }

  for (const card of facts.cardsOverLimit) {
    items.push({
      // One per month: next month's is a new notification
      id: `card-${card.id}-${today.slice(0, 7)}`,
      type: "alert",
      title: t.cardTitle,
      description: fill(t.card, {
        name: card.name,
        last4: card.last4,
        spent: money(card.spent),
        limit: money(card.limit),
        month,
      }),
      href: `/dashboard/transactions?card=${card.id}&from=${monthStart(today)}`,
      at: card.at,
    });
  }

  if (facts.overdueBills.count > 0 && facts.overdueBills.at) {
    const { count, amount } = facts.overdueBills;
    items.push({
      id: "bills-overdue",
      type: "alert",
      title: plural(count, t.overdueTitle),
      description: plural(count, t.overdue, { amount: money(amount) }),
      href: "/dashboard/bills",
      at: facts.overdueBills.at,
    });
  }

  if (facts.billsDueSoon.count > 0 && facts.billsDueSoon.at) {
    const { count, amount } = facts.billsDueSoon;
    items.push({
      id: "bills-due-soon",
      type: "reminder",
      title: plural(count, t.dueSoonTitle),
      description: plural(count, t.dueSoon, { amount: money(amount) }),
      href: "/dashboard/bills",
      at: facts.billsDueSoon.at,
    });
  }

  if (facts.billsMaybePaid.count > 0 && facts.billsMaybePaid.at) {
    const { count, billId } = facts.billsMaybePaid;
    items.push({
      id: "bills-maybe-paid",
      type: "reminder",
      title: plural(count, t.maybePaidTitle),
      description: plural(count, t.maybePaid),
      href: billId ? `/dashboard/bills?pay=${billId}` : "/dashboard/bills",
      at: facts.billsMaybePaid.at,
    });
  }

  if (facts.stalePending.count > 0 && facts.stalePending.at) {
    const { count } = facts.stalePending;
    items.push({
      id: "stale-pending",
      type: "reminder",
      title: t.pendingTitle,
      description: plural(count, t.pending),
      href: "/dashboard/transactions",
      at: facts.stalePending.at,
    });
  }

  if (facts.uncategorized.count > 0 && facts.uncategorized.at) {
    const { count } = facts.uncategorized;
    items.push({
      id: "uncategorized",
      type: "reminder",
      title: t.uncategorizedTitle,
      description: plural(count, t.uncategorized),
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
