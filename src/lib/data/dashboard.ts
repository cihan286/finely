// ─────────────────────────────────────────────────────────────────────────────
// Dashboard figures
//
// In plain words: everything the dashboard's first page shows, calculated
// from the company's real accounts and transactions — the total balance,
// money in and out over the last 30 days compared with the 30 days before,
// the cash flow chart (per day for the last 30 days, per month for this
// year), where the money went by category, the latest transactions and each
// account's balance. Only completed transactions count; pending ones don't.
//
// For developers: server-only; finds the company itself via
// getFinanceContext(). Days are calendar days in UTC, matching how
// transaction dates are stored (noon UTC for a date without a time). A
// per-company timezone would replace this if companies need their own
// day boundaries.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { category, transaction } from "@/db/finance";
import type {
  Account,
  Cashflow,
  CashflowPoint,
  CategoryIconKey,
  ExpenseCategory,
  Metric,
  TransactionDetails,
} from "@/types/finance";
import { listAccounts } from "./accounts";
import { getFinanceContext } from "./common";
import { listTransactions } from "./transactions";

export interface DashboardSummary {
  /** The four summary tiles */
  metrics: Metric[];
  cashflow: Cashflow;
  /** Spending by category over the last 30 days, largest first */
  expenseCategories: ExpenseCategory[];
  /** All spending over the last 30 days */
  expensesTotal: number;
  recentTransactions: TransactionDetails[];
  accounts: Account[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;

// How many categories the breakdown lists before grouping the rest
const TOP_CATEGORIES = 4;
// Color for spending without a category, and for "everything else"
const NEUTRAL_COLOR = "#94a3b8";

const round2 = (n: number) => Math.round(n * 100) / 100;
// Date -> "2026-10-01" (UTC)
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { organizationId } = await getFinanceContext();

  // Time windows, in whole UTC days. "Last 30 days" includes today.
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(today.getTime() + DAY);
  const last30Start = new Date(today.getTime() - 29 * DAY);
  const previous30Start = new Date(last30Start.getTime() - 30 * DAY);
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  // One query covers both the 60-day comparison and this year's chart
  const queryStart = previous30Start < yearStart ? previous30Start : yearStart;

  const completedBetween = (from: Date, to: Date) =>
    and(
      eq(transaction.organizationId, organizationId),
      eq(transaction.status, "completed"),
      gte(transaction.occurredAt, from),
      lt(transaction.occurredAt, to),
    );

  const day = sql<string>`to_char(${transaction.occurredAt}, 'YYYY-MM-DD')`;
  const [dailyRows, categoryRows, recent, accounts] = await Promise.all([
    // Money in and out per day
    db
      .select({
        day,
        income: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.amount} > 0), 0)`.mapWith(Number),
        expenses: sql<number>`coalesce(-sum(${transaction.amount}) filter (where ${transaction.amount} < 0), 0)`.mapWith(Number),
      })
      .from(transaction)
      .where(completedBetween(queryStart, tomorrow))
      .groupBy(day),
    // Spending per category over the last 30 days
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

  const byDay = new Map(dailyRows.map((r) => [r.day, r]));
  const sumDays = (from: Date, to: Date) => {
    let income = 0;
    let expenses = 0;
    for (const r of dailyRows) {
      if (r.day >= isoDay(from) && r.day < isoDay(to)) {
        income += r.income;
        expenses += r.expenses;
      }
    }
    return { income: round2(income), expenses: round2(expenses) };
  };

  // Chart: one point per day for the last 30 days...
  const last30Days: CashflowPoint[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(last30Start.getTime() + i * DAY);
    const row = byDay.get(isoDay(date));
    return {
      date: isoDay(date),
      label: `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`,
      income: round2(row?.income ?? 0),
      expenses: round2(row?.expenses ?? 0),
    };
  });
  // ...and one per month of this year so far
  const thisYear: CashflowPoint[] = Array.from(
    { length: today.getUTCMonth() + 1 },
    (_, month) => {
      const from = new Date(Date.UTC(today.getUTCFullYear(), month, 1));
      const to = new Date(Date.UTC(today.getUTCFullYear(), month + 1, 1));
      return { label: MONTHS[month], ...sumDays(from, to) };
    },
  );

  // Summary tiles: the last 30 days against the 30 days before
  const current = sumDays(last30Start, tomorrow);
  const previous = sumDays(previous30Start, last30Start);
  const totalBalance = round2(accounts.reduce((sum, a) => sum + a.balance, 0));
  const net = round2(current.income - current.expenses);
  const previousNet = round2(previous.income - previous.expenses);
  const metrics: Metric[] = [
    {
      id: "balance",
      title: "Total Balance",
      value: totalBalance,
      // The balance 30 days ago: today's minus what changed since
      previousValue: round2(totalBalance - net),
      format: "currency",
      iconKey: "dollar",
      higherIsBetter: true,
    },
    {
      id: "income",
      title: "Income (30 days)",
      value: current.income,
      previousValue: previous.income,
      format: "currency",
      iconKey: "income",
      higherIsBetter: true,
    },
    {
      id: "expenses",
      title: "Expenses (30 days)",
      value: current.expenses,
      previousValue: previous.expenses,
      format: "currency",
      iconKey: "expenses",
      higherIsBetter: false,
    },
    {
      id: "net",
      title: "Net Cash Flow (30 days)",
      value: net,
      previousValue: previousNet,
      format: "currency",
      iconKey: "net",
      higherIsBetter: true,
    },
  ];

  // Breakdown: the biggest categories, then everything else together
  const categories: ExpenseCategory[] = categoryRows
    .map((r) => ({
      id: r.categoryId ?? "uncategorized",
      category: r.name ?? "Uncategorized",
      amount: round2(r.amount),
      iconKey: (r.iconKey ?? "more") as CategoryIconKey,
      color: r.color ?? NEUTRAL_COLOR,
    }))
    .sort((a, b) => b.amount - a.amount);
  const rest = categories.slice(TOP_CATEGORIES + 1);
  const expenseCategories =
    rest.length === 0
      ? categories
      : [
          ...categories.slice(0, TOP_CATEGORIES),
          {
            id: "everything-else",
            category: `${rest.length + 1} more categories`,
            amount: round2(
              categories
                .slice(TOP_CATEGORIES)
                .reduce((sum, c) => sum + c.amount, 0),
            ),
            iconKey: "more" as const,
            color: NEUTRAL_COLOR,
          },
        ];

  return {
    metrics,
    cashflow: { last30Days, thisYear },
    expenseCategories,
    expensesTotal: current.expenses,
    recentTransactions: recent.transactions,
    accounts,
  };
}
