// ─────────────────────────────────────────────────────────────────────────────
// Insights: fetching the figures
//
// In plain words: collects what the Insights page needs from the database
// for the chosen period — money in and out per month, spending per category
// and per vendor — plus the expenses of the last seven months to spot
// unusual charges, and hands it to the calculations in
// lib/finance/insights.ts. Only completed transactions count. Months and
// days follow the company's timezone.
//
// For developers: server-only; finds the company itself via
// getFinanceContext(). Grouping happens in Postgres, converting each moment
// (stored as UTC) to the company's local time.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { category, transaction } from "@/db/finance";
import { startOfDay, todayIn } from "@/lib/dates";
import {
  buildInsights,
  insightRange,
  type InsightPeriod,
  type Insights,
} from "@/lib/finance/insights";
import { getFinanceContext } from "./common";

export async function getInsights(period: InsightPeriod): Promise<Insights> {
  const { organizationId, timeZone } = await getFinanceContext();
  const today = todayIn(timeZone);
  const { start, end, historyStart } = insightRange(today, period);

  // Completed transactions from the start of one local day to another
  const completedBetween = (from: string, to: string) =>
    and(
      eq(transaction.organizationId, organizationId),
      eq(transaction.status, "completed"),
      gte(transaction.occurredAt, startOfDay(from, timeZone)),
      lt(transaction.occurredAt, startOfDay(to, timeZone)),
    );
  // A transaction's moment in the company's timezone, as text
  const local = (format: string) =>
    sql<string>`to_char((${transaction.occurredAt} at time zone 'UTC') at time zone ${timeZone}, ${format})`;
  const spent = sql<number>`-sum(${transaction.amount})`.mapWith(Number);

  const [monthly, categorySpending, vendors, expenses] = await Promise.all([
    // Money in and out per month
    db
      .select({
        month: local("YYYY-MM"),
        income: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.amount} > 0), 0)`.mapWith(Number),
        expenses: sql<number>`coalesce(-sum(${transaction.amount}) filter (where ${transaction.amount} < 0), 0)`.mapWith(Number),
      })
      .from(transaction)
      .where(completedBetween(start, end))
      // By position: the month expression has its own parameters, so
      // repeating it here wouldn't count as "the same" for Postgres
      .groupBy(sql`1`),
    // Spending per category
    db
      .select({
        categoryId: transaction.categoryId,
        name: category.name,
        color: category.color,
        iconKey: category.iconKey,
        amount: spent,
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(and(completedBetween(start, end), lt(transaction.amount, 0)))
      .groupBy(transaction.categoryId, category.name, category.color, category.iconKey),
    // Spending per vendor (same description, ignoring case)
    db
      .select({
        name: sql<string>`max(${transaction.name})`,
        count: sql<number>`count(*)`.mapWith(Number),
        amount: spent,
      })
      .from(transaction)
      .where(and(completedBetween(start, end), lt(transaction.amount, 0)))
      .groupBy(sql`lower(trim(${transaction.name}))`)
      .orderBy(asc(sql`sum(${transaction.amount})`))
      .limit(8),
    // Every expense since the history for unusual charges begins
    db
      .select({
        id: transaction.id,
        name: transaction.name,
        amount: transaction.amount,
        day: local("YYYY-MM-DD"),
      })
      .from(transaction)
      .where(and(completedBetween(historyStart, end), lt(transaction.amount, 0))),
  ]);

  return buildInsights({ today, period, monthly, categorySpending, vendors, expenses });
}
