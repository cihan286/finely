// ─────────────────────────────────────────────────────────────────────────────
// Dashboard figures: fetching them
//
// In plain words: collects what the dashboard's first page needs from the
// database — money in and out per day, spending per category, the latest
// transactions and the accounts — and hands it to the calculations in
// lib/dashboard-summary.ts. Only completed transactions count; pending ones
// don't. Days follow the company's timezone.
//
// For developers: server-only; finds the company itself via
// getFinanceContext(). Grouping by day happens in Postgres, converting
// each moment (stored as UTC) to the company's local day.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { category, transaction } from "@/db/finance";
import {
  buildDashboardSummary,
  dashboardWindows,
  type DashboardSummary,
} from "@/lib/dashboard-summary";
import { startOfDay, todayIn } from "@/lib/dates";
import { listAccounts } from "./accounts";
import { getFinanceContext } from "./common";
import { listTransactions } from "./transactions";

export type { DashboardSummary };

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { organizationId, timeZone } = await getFinanceContext();
  const today = todayIn(timeZone);
  const { last30Start, queryStart, tomorrow } = dashboardWindows(today);

  // Completed transactions from the start of one local day to another
  const completedBetween = (from: string, to: string) =>
    and(
      eq(transaction.organizationId, organizationId),
      eq(transaction.status, "completed"),
      gte(transaction.occurredAt, startOfDay(from, timeZone)),
      lt(transaction.occurredAt, startOfDay(to, timeZone)),
    );
  // The local day of each transaction, e.g. "2026-10-06"
  const localDay = sql<string>`to_char((${transaction.occurredAt} at time zone 'UTC') at time zone ${timeZone}, 'YYYY-MM-DD')`;

  const [daily, categorySpending, recent, accounts] = await Promise.all([
    db
      .select({
        day: localDay,
        income: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.amount} > 0), 0)`.mapWith(Number),
        expenses: sql<number>`coalesce(-sum(${transaction.amount}) filter (where ${transaction.amount} < 0), 0)`.mapWith(Number),
      })
      .from(transaction)
      .where(completedBetween(queryStart, tomorrow))
      // By position: the day expression has its own parameters, so repeating
      // it here wouldn't count as "the same" expression for Postgres
      .groupBy(sql`1`),
    db
      .select({
        categoryId: transaction.categoryId,
        name: category.name,
        color: category.color,
        iconKey: category.iconKey,
        amount: sql<number>`-sum(${transaction.amount})`.mapWith(Number),
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(and(completedBetween(last30Start, tomorrow), lt(transaction.amount, 0)))
      .groupBy(transaction.categoryId, category.name, category.color, category.iconKey),
    listTransactions({ limit: 5 }),
    listAccounts(),
  ]);

  return buildDashboardSummary({
    today,
    daily,
    categorySpending,
    accounts,
    recentTransactions: recent.transactions,
  });
}
