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
import { DEFAULT_LOCALE, fill, intlLocale, type Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";
import { roundMoney, subtractMoney, sumMoney } from "@/lib/money";
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

// "Oct 8" and "Oct" on the chart, in the page's language
const dayLabel = (day: ISODate, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
const monthLabel = (month: string, locale: Locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { month: "short", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

// Color for spending without a category, and for "N more categories"
const NEUTRAL_COLOR = "#94a3b8";

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
  locale = DEFAULT_LOCALE,
}: {
  today: ISODate;
  daily: DailyTotals[];
  categorySpending: CategorySpending[];
  accounts: Account[];
  recentTransactions: TransactionDetails[];
  locale?: Locale;
}): DashboardSummary {
  const m = messagesFor(locale).dashboard;
  const { last30Start, previous30Start, tomorrow } = dashboardWindows(today);

  const byDay = new Map(daily.map((d) => [d.day, d]));
  const sumDays = (include: (day: ISODate) => boolean) => {
    const days = daily.filter((d) => include(d.day));
    return {
      income: sumMoney(days.map((d) => d.income)),
      expenses: sumMoney(days.map((d) => d.expenses)),
    };
  };
  const between = (from: ISODate, to: ISODate) => (day: ISODate) => day >= from && day < to;

  // Chart: one point per day for the last 30 days...
  const last30Days: CashflowPoint[] = Array.from({ length: 30 }, (_, i) => {
    const day = addDays(last30Start, i);
    return {
      date: day,
      label: dayLabel(day, locale),
      income: roundMoney(byDay.get(day)?.income ?? 0),
      expenses: roundMoney(byDay.get(day)?.expenses ?? 0),
    };
  });
  // ...and one per month of this year so far
  const year = today.slice(0, 4);
  const thisYear: CashflowPoint[] = Array.from(
    { length: Number(today.slice(5, 7)) },
    (_, i) => {
      const month = `${year}-${String(i + 1).padStart(2, "0")}`;
      return { label: monthLabel(month, locale), ...sumDays((day) => day.startsWith(month)) };
    },
  );

  // Summary tiles: the last 30 days against the 30 days before
  const current = sumDays(between(last30Start, tomorrow));
  const previous = sumDays(between(previous30Start, last30Start));
  const totalBalance = sumMoney(accounts.map((a) => a.balance));
  const net = subtractMoney(current.income, current.expenses);
  const metrics: Metric[] = [
    {
      id: "balance",
      title: m.metrics.balance,
      value: totalBalance,
      // The balance 30 days ago: today's minus what changed since
      previousValue: subtractMoney(totalBalance, net),
      format: "currency",
      iconKey: "dollar",
      higherIsBetter: true,
    },
    {
      id: "income",
      title: m.metrics.income,
      value: current.income,
      previousValue: previous.income,
      format: "currency",
      iconKey: "income",
      higherIsBetter: true,
    },
    {
      id: "expenses",
      title: m.metrics.expenses,
      value: current.expenses,
      previousValue: previous.expenses,
      format: "currency",
      iconKey: "expenses",
      higherIsBetter: false,
    },
    {
      id: "net",
      title: m.metrics.net,
      value: net,
      previousValue: subtractMoney(previous.income, previous.expenses),
      format: "currency",
      iconKey: "net",
      higherIsBetter: true,
    },
  ];

  return {
    today,
    metrics,
    cashflow: { last30Days, thisYear },
    expenseCategories: topCategories(categorySpending, 4, locale),
    expensesTotal: current.expenses,
    recentTransactions,
    accounts,
  };
}

/**
 * The biggest categories, largest first. If there are more than `top + 1`,
 * the smallest are grouped together as "N more categories".
 */
export function topCategories(
  spending: CategorySpending[],
  top = 4,
  locale: Locale = DEFAULT_LOCALE,
): ExpenseCategory[] {
  const m = messagesFor(locale).dashboard;
  const categories: ExpenseCategory[] = spending
    .map((s) => ({
      id: s.categoryId ?? "uncategorized",
      category: s.name ?? m.uncategorized,
      amount: roundMoney(s.amount),
      iconKey: (s.iconKey ?? "more") as CategoryIconKey,
      color: s.color ?? NEUTRAL_COLOR,
    }))
    .sort((a, b) => b.amount - a.amount);
  // One more than `top` fits as it is; beyond that, the smallest are grouped
  if (categories.length <= top + 1) return categories;
  const rest = categories.slice(top);
  return [
    ...categories.slice(0, top),
    {
      id: "everything-else",
      category: fill(m.moreCategories, { count: rest.length }),
      amount: sumMoney(rest.map((c) => c.amount)),
      iconKey: "more",
      color: NEUTRAL_COLOR,
    },
  ];
}
