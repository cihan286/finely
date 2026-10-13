// ─────────────────────────────────────────────────────────────────────────────
// Regular payments and the cash-flow forecast: fetching what they need
//
// In plain words: reads the last 26 months of completed transactions to spot
// payments that come back regularly (lib/finance/recurring.ts), and combines
// them with the unpaid bills, the payments still pending and today's
// balances into the forecast for the next 30 days (lib/finance/forecast.ts).
//
// For developers: server-only; finds the company itself via
// getFinanceContext(). The history is read once per request (React cache),
// however many parts of a page ask: the Insights page, the Bills page, the
// dashboard's forecast and the notifications all use it.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { cache } from "react";
import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bill, category, transaction } from "@/db/finance";
import { addDays, localDay, startOfDay, todayIn } from "@/lib/dates";
import { buildForecast, type Forecast } from "@/lib/finance/forecast";
import {
  billKey,
  detectRecurring,
  RECURRING_HISTORY_DAYS,
  type RecurringPayment,
} from "@/lib/finance/recurring";
import type { BillRepeat, ISODate } from "@/types/finance";
import { listAccounts } from "./accounts";
import { getFinanceContext } from "./common";

/** A regular payment, with what the screens show next to it */
export interface RecurringPaymentDetails extends RecurringPayment {
  /** The category's name; null if it has none */
  category: string | null;
  /** Whether an unpaid bill already covers it */
  billed: boolean;
}

// The company's regular payments, unpaid bills and pending payments, and
// when any of them last changed. Read once per request.
const loadRecurring = cache(async (organizationId: string, timeZone: string) => {
  const today = todayIn(timeZone);
  const [history, bills, pending] = await Promise.all([
    db
      .select({
        name: transaction.name,
        amount: transaction.amount,
        occurredAt: transaction.occurredAt,
        createdAt: transaction.createdAt,
        categoryId: transaction.categoryId,
        category: category.name,
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(
        and(
          eq(transaction.organizationId, organizationId),
          eq(transaction.status, "completed"),
          gte(
            transaction.occurredAt,
            startOfDay(addDays(today, -RECURRING_HISTORY_DAYS), timeZone),
          ),
        ),
      ),
    db
      .select({
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.dueDate,
        repeat: bill.repeat,
        createdAt: bill.createdAt,
      })
      .from(bill)
      .where(and(eq(bill.organizationId, organizationId), isNull(bill.paidAt))),
    db
      .select({
        name: transaction.name,
        amount: transaction.amount,
        occurredAt: transaction.occurredAt,
        createdAt: transaction.createdAt,
      })
      .from(transaction)
      .where(
        and(
          eq(transaction.organizationId, organizationId),
          eq(transaction.status, "pending"),
        ),
      ),
  ]);

  const categoryNames = new Map(history.map((h) => [h.categoryId, h.category]));
  const billed = new Set(bills.map((b) => billKey(b.name)));
  const payments: RecurringPaymentDetails[] = detectRecurring(
    history.map((h) => ({
      name: h.name,
      amount: h.amount,
      day: localDay(h.occurredAt, timeZone),
      categoryId: h.categoryId,
    })),
    today,
  ).map((payment) => ({
    ...payment,
    category: categoryNames.get(payment.categoryId) ?? null,
    billed: billed.has(payment.key),
  }));

  const changes = [...history, ...bills, ...pending].map((row) =>
    row.createdAt.getTime(),
  );
  return {
    today,
    payments,
    bills: bills.map((b) => ({ ...b, repeat: b.repeat as BillRepeat })),
    pending: pending.map((p) => ({
      name: p.name,
      amount: p.amount,
      day: localDay(p.occurredAt, timeZone),
    })),
    /** When a transaction or unpaid bill was last entered; null without any */
    changedAt: changes.length > 0 ? new Date(Math.max(...changes)) : null,
  };
});

/** The payments that come back regularly, the largest per month first */
export async function getRecurring(): Promise<{
  today: ISODate;
  payments: RecurringPaymentDetails[];
}> {
  const { organizationId, timeZone } = await getFinanceContext();
  const { today, payments } = await loadRecurring(organizationId, timeZone);
  return { today, payments };
}

/**
 * The estimate of the next 30 days: today's balances plus unpaid bills,
 * pending payments and regular payments. `changedAt` is when its ingredients last changed (for
 * the notifications).
 */
export async function getForecast(): Promise<Forecast & { changedAt: Date | null }> {
  const { organizationId, timeZone } = await getFinanceContext();
  const [{ today, payments, bills, pending, changedAt }, accounts] = await Promise.all([
    loadRecurring(organizationId, timeZone),
    listAccounts(),
  ]);
  return {
    ...buildForecast({
      today,
      balance: accounts.reduce((sum, account) => sum + account.balance, 0),
      bills,
      pending,
      recurring: payments,
    }),
    changedAt,
  };
}
