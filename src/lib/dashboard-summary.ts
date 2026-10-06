// ─────────────────────────────────────────────────────────────────────────────
// Dashboard figures: the calculations
//
// In plain words: given the money in and out per day, spending per category,
// the accounts and the latest transactions, this works out what the
// dashboard shows — totals for the last 30 days compared with the 30 days
// before, the cash flow chart (per day, and per month for this year), and
// the spending breakdown. Only calculations happen here; the figures are
// fetched from the database by lib/data/dashboard.ts.
//
// For developers: pure functions, unit-tested in dashboard-summary.test.ts.
// All days are ISO day strings in the company's timezone.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from "@/lib/dates";
import type {
  Account,
  Cashflow,
  CashflowPoint,
  CategoryIconKey,
  ExpenseCategory,
  ISODate,
  Metric,
  TransactionDetails,
} from "@/types/finance";

/** Money in and out on one day (completed transactions only) */
export interface DailyTotals {
  day: ISODate;
  income: number;
  /** A positive number */
  expenses: number;
}

/** Spending in one category; null fields = uncategorized */
export interface CategorySpending {
  categoryId: string | null;
  name: string | null;
  color: string | null;
  iconKey: string | null;
  /** A positive number */
  amount: number;
}

export interface DashboardSummary {
  /** Today, in the company's timezone */
  today: ISODate;
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

// How many categories the breakdown lists before grouping the rest
const TOP_CATEGORIES = 4;
// Color for spending without a category, and for "N more categories"
const NEUTRAL_COLOR = "#94a3b8";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The days the dashboard looks at. "Last 30 days" includes today; the 30
 * days before that are the comparison. Each range runs up to (not
 * including) its end day.
 */
export function dashboardWindows(today: ISODate) {
  const last30Start = addDays(today, -29);
  const previous30Start = addDays(last30Start, -30);
  const yearStart: ISODate = `${today.slice(0, 4)}-01-01`;
  return {
    last30Start,
    previous30Start,
    yearStart,
    tomorrow: addDays(today, 1),
    // The earliest day any part of the dashboard needs
    queryStart: previous30Start < yearStart ? previous30Start : yearStart,
  };
}

/** Works out everything the dashboard shows. */
export function buildDashboardSummary({
  today,
  daily,
  categorySpending,
  accounts,
  recentTransactions,
}: {
  today: ISODate;
  daily: DailyTotals[];
  categorySpending: CategorySpending[];
  accounts: Account[];
  recentTransactions: TransactionDetails[];
}): DashboardSummary {
  const { last30Start, previous30Start, tomorrow } = dashboardWindows(today);

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const sumDays = (include: (day: ISODate) => boolean) => {
    let income = 0;
    let expenses = 0;
    for (const d of daily) {
      if (include(d.day)) {
        income += d.income;
        expenses += d.expenses;
      }
    }
    return { income: round2(income), expenses: round2(expenses) };
  };
  const between = (from: ISODate, to: ISODate) => (day: ISODate) => day >= from && day < to;

  // Chart: one point per day for the last 30 days...
  const last30Days: CashflowPoint[] = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(last30Start, i);
    const [, month, date] = day.split("-").map(Number);
    return {
      date: day,
      label: `${MONTHS[month - 1]} ${date}`,
      income: round2(byDay.get(day)?.income ?? 0),
      expenses: round2(byDay.get(day)?.expenses ?? 0),
    };
  });
  // ...and one per month of this year so far
  const year = today.slice(0, 4);
  const thisYear: CashflowPoint[] = Array.from(
    { length: Number(today.slice(5, 7)) },
    (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, "0")}`;
      return { label: MONTHS[i], ...sumDays((day) => day.startsWith(month)) };
    },
  );

  // Summary tiles: the last 30 days against the 30 days before
  const current = sumDays(between(last30Start, tomorrow));
  const previous = sumDays(between(previous30Start, last30Start));
  const totalBalance = round2(accounts.reduce((sum, a) => sum + a.balance, 0));
  const net = round2(current.income - current.expenses);
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
      previousValue: round2(previous.income - previous.expenses),
      format: "currency",
      iconKey: "net",
      higherIsBetter: true,
    },
  ];

  return {
    today,
    metrics,
    cashflow: { last30Days, thisYear },
    expenseCategories: topCategories(categorySpending),
    expensesTotal: current.expenses,
    recentTransactions,
    accounts,
  };
}

/** The biggest categories, largest first, then everything else together */
export function topCategories(spending: CategorySpending[]): ExpenseCategory[] {
  const categories: ExpenseCategory[] = spending
    .map((s) => ({
      id: s.categoryId ?? "uncategorized",
      category: s.name ?? "Uncategorized",
      amount: round2(s.amount),
      iconKey: (s.iconKey ?? "more") as CategoryIconKey,
      color: s.color ?? NEUTRAL_COLOR,
    }))
    .sort((a, b) => b.amount - a.amount);
  // Five fit; with six or more, the smallest are grouped
  if (categories.length <= TOP_CATEGORIES + 1) return categories;
  const rest = categories.slice(TOP_CATEGORIES);
  return [
    ...categories.slice(0, TOP_CATEGORIES),
    {
      id: "everything-else",
      category: `${rest.length} more categories`,
      amount: round2(rest.reduce((sum, c) => sum + c.amount, 0)),
      iconKey: "more",
      color: NEUTRAL_COLOR,
    },
  ];
}
