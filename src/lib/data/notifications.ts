// ─────────────────────────────────────────────────────────────────────────────
// Notifications: fetching the facts, and remembering what was read
//
// In plain words: collects what the bell in the top bar reports on — recent
// expenses (to spot unusually high charges), accounts below zero,
// categories over their monthly budget or close to it, unpaid
// bills that are overdue or due within a week, payments pending for more
// than a week and transactions without a category — and
// hands it to lib/finance/notifications.ts. Also saves the moment someone
// presses "Mark all as read"; that's per person and per company.
//
// For developers: server-only; finds the person and company itself via
// getFinanceContext().
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  bill,
  financialAccount,
  notificationRead,
  transaction,
} from "@/db/finance";
import { addDays, localDay, startOfDay, todayIn } from "@/lib/dates";
import { billStatus, DUE_SOON_DAYS, summarizeBills } from "@/lib/finance/bills";
import { budgetStatus } from "@/lib/finance/budgets";
import { findUnusualCharges, insightRange } from "@/lib/finance/insights";
import {
  buildNotifications,
  PENDING_REMINDER_DAYS,
} from "@/lib/finance/notifications";
import type { Notification } from "@/types/finance";
import { selectPossiblyPaid } from "./bills";
import { selectBudgetSpending } from "./budgets";
import { getFinanceContext } from "./common";
import { getForecast } from "./recurring";

/** The company's notifications for the signed-in person, newest first */
export async function listNotifications(): Promise<Notification[]> {
  const { organizationId, userId, timeZone, currency } = await getFinanceContext();
  const today = todayIn(timeZone);
  const { historyStart } = insightRange(today, 3);
  // Payments from before this moment have been pending for too long
  const staleBefore = startOfDay(addDays(today, -PENDING_REMINDER_DAYS), timeZone);
  const ownTransactions = eq(transaction.organizationId, organizationId);
  // The latest moment in a group of rows, read like any other timestamp
  // (null without rows)
  const latest = (
    column: typeof transaction.createdAt | typeof transaction.occurredAt,
  ) =>
    sql`max(${column})`.mapWith(column) as SQL<Date | null>;

  const [
    expenses,
    accounts,
    budgets,
    forecast,
    bills,
    [stalePending],
    [uncategorized],
    [read],
    possiblyPaid,
  ] = await Promise.all([
      // Every completed expense since the history for unusual charges begins
      db
        .select({
          id: transaction.id,
          name: transaction.name,
          amount: transaction.amount,
          occurredAt: transaction.occurredAt,
          createdAt: transaction.createdAt,
        })
        .from(transaction)
        .where(
          and(
            ownTransactions,
            eq(transaction.status, "completed"),
            lt(transaction.amount, 0),
            gte(transaction.occurredAt, startOfDay(historyStart, timeZone)),
          ),
        ),
      // Each account's balance and when a completed payment was last entered
      db
        .select({
          id: financialAccount.id,
          name: financialAccount.name,
          createdAt: financialAccount.createdAt,
          openingBalance: financialAccount.openingBalance,
          completedTotal: sql<number>`coalesce(sum(${transaction.amount}), 0)`.mapWith(Number),
          changedAt: latest(transaction.createdAt),
        })
        .from(financialAccount)
        .leftJoin(
          transaction,
          and(
            eq(transaction.accountId, financialAccount.id),
            eq(transaction.status, "completed"),
          ),
        )
        .where(eq(financialAccount.organizationId, organizationId))
        .groupBy(financialAccount.id),
      // What was spent this month in each category that has a budget
      selectBudgetSpending(organizationId, timeZone, today),
      // Where the balance is heading over the next 30 days
      getForecast(),
      // Unpaid bills that are overdue or due within a week
      db
        .select({
          amount: bill.amount,
          dueDate: bill.dueDate,
          createdAt: bill.createdAt,
        })
        .from(bill)
        .where(
          and(
            eq(bill.organizationId, organizationId),
            isNull(bill.paidAt),
            lt(bill.dueDate, addDays(today, DUE_SOON_DAYS)),
          ),
        ),
      db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          occurredAt: latest(transaction.occurredAt),
        })
        .from(transaction)
        .where(
          and(
            ownTransactions,
            eq(transaction.status, "pending"),
            lt(transaction.occurredAt, staleBefore),
          ),
        ),
      db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
          createdAt: latest(transaction.createdAt),
        })
        .from(transaction)
        .where(and(ownTransactions, isNull(transaction.categoryId))),
      db
        .select({ readAt: notificationRead.readAt })
        .from(notificationRead)
        .where(
          and(
            eq(notificationRead.userId, userId),
            eq(notificationRead.organizationId, organizationId),
          ),
        ),
      // Unpaid bills that a payment already there may have paid
      selectPossiblyPaid(organizationId),
    ]);

  const enteredAt = new Map(expenses.map((e) => [e.id, e.createdAt]));
  const unusualCharges = findUnusualCharges(
    expenses.map((e) => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      day: localDay(e.occurredAt, timeZone),
    })),
    today,
  ).map((charge) => ({ ...charge, at: enteredAt.get(charge.id)! }));

  const overdrawnAccounts = accounts
    .map((a) => ({
      id: a.id,
      name: a.name,
      balance: Math.round((a.openingBalance + a.completedTotal) * 100) / 100,
      // No payments yet: it started below zero
      at: a.changedAt ?? a.createdAt,
    }))
    .filter((a) => a.balance < 0);

  // A bill counts from the moment it became overdue (or came within a week
  // of its due date), or from when it was entered if that was later
  const billFacts = (status: "overdue" | "dueSoon") => {
    const matching = bills.filter((b) => billStatus(b.dueDate, today) === status);
    const since = matching.map((b) => {
      const reached = startOfDay(
        addDays(b.dueDate, status === "overdue" ? 1 : 1 - DUE_SOON_DAYS),
        timeZone,
      );
      return Math.max(reached.getTime(), b.createdAt.getTime());
    });
    return {
      ...summarizeBills(matching, today)[status],
      at: since.length > 0 ? new Date(Math.max(...since)) : null,
    };
  };

  return buildNotifications(
    {
      unusualCharges,
      overdrawnAccounts,
      // Only a warning when it's news: not while already below zero, and not
      // before any bank account was added (then there's no balance to go by)
      cashShortfall:
        accounts.length > 0 &&
        forecast.lowest.balance < 0 &&
        forecast.startBalance >= 0 &&
        forecast.changedAt
          ? { ...forecast.lowest, at: forecast.changedAt }
          : null,
      overBudget: budgets.flatMap((b) =>
        // Over budget means something was spent, so there's a latest payment
        b.spent > b.budget && b.changedAt ? [{ ...b, at: b.changedAt }] : [],
      ),
      nearBudget: budgets.flatMap((b) =>
        budgetStatus(b.spent, b.budget) === "near" && b.changedAt
          ? [{ ...b, at: b.changedAt }]
          : [],
      ),
      overdueBills: billFacts("overdue"),
      billsDueSoon: billFacts("dueSoon"),
      billsMaybePaid: {
        count: possiblyPaid.length,
        billId: possiblyPaid.length === 1 ? possiblyPaid[0].billId : null,
        at:
          possiblyPaid.length > 0
            ? new Date(Math.max(...possiblyPaid.map((p) => p.at.getTime())))
            : null,
      },
      stalePending: {
        count: stalePending.count,
        // It became late a week after it was due
        at: stalePending.occurredAt
          ? new Date(
              stalePending.occurredAt.getTime() + PENDING_REMINDER_DAYS * 86_400_000,
            )
          : null,
      },
      uncategorized: { count: uncategorized.count, at: uncategorized.createdAt },
    },
    read?.readAt ?? null,
    timeZone,
    today,
    currency,
  );
}

/** Marks every notification so far as read, for this person in this company. */
export async function markNotificationsRead() {
  const { organizationId, userId } = await getFinanceContext();
  const readAt = new Date();
  await db
    .insert(notificationRead)
    .values({ userId, organizationId, readAt })
    .onConflictDoUpdate({
      target: [notificationRead.userId, notificationRead.organizationId],
      set: { readAt },
    });
}
