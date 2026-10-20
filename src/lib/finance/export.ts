// ─────────────────────────────────────────────────────────────────────────────
// Exports: turning figures into CSV files
//
// In plain words: builds the files behind the "Export CSV" buttons — the
// list of transactions, the Insights page's figures, the bills, this
// month's budgets and the activity log — in a form a spreadsheet or an
// accountant's software can open.
//
// For developers: pure functions, unit-tested in export.test.ts. Amounts are
// plain numbers with two decimals and a dot ("-1234.50"), dates are ISO days
// ("2026-10-13"): unambiguous for any program, whatever its language. The
// Insights file has several small tables, each under its own title line.
// ─────────────────────────────────────────────────────────────────────────────

import { fill } from "@/i18n/config";
import { messagesFor, type Messages } from "@/i18n/messages";
import { toCsv, type CsvCell } from "@/lib/finance/csv";
import type { Insights } from "@/lib/finance/insights";
import type { RecurringPayment } from "@/lib/finance/recurring";
import type { BudgetProgress } from "@/lib/finance/budgets";
import type { Bill, ISODate, TransactionStatus } from "@/types/finance";

/** One transaction, as it's written to the file */
export interface TransactionExportRow {
  day: ISODate;
  name: string;
  /** null = uncategorized */
  category: string | null;
  account: string;
  /** Positive = money in, negative = money out */
  amount: number;
  status: TransactionStatus;
  notes: string | null;
}

// 1234.5 -> "1234.50": a number for the spreadsheet, always with cents
// (the same in every language, so spreadsheets read it as a number)
const money = (amount: number) => amount.toFixed(2);

// The files' words when no language is given
const english = messagesFor("en");

/** The transactions list as a CSV file, in the order given */
export function transactionsCsv(rows: TransactionExportRow[], m: Messages = english): string {
  const t = m.exports.transactions;
  return toCsv([
    t.headers,
    ...rows.map((row) => [
      row.day,
      row.name,
      row.category ?? "",
      row.account,
      money(row.amount),
      row.status === "pending" ? t.pending : t.completed,
      row.notes ?? "",
    ]),
  ]);
}

/** The Insights page's figures as one CSV file with a table per section */
export function insightsCsv(
  organizationName: string,
  insights: Insights,
  recurring: (RecurringPayment & { category: string | null })[],
  /** The company's currency, e.g. "USD" */
  currency = "USD",
  m: Messages = english,
): string {
  const t = m.exports.insights;
  const { totals } = insights;
  const tables: CsvCell[][][] = [
    [
      [t.title],
      [t.company, organizationName],
      [t.period, fill(t.lastMonths, { months: insights.period })],
      [t.currency, currency],
      [t.exportedOn, insights.today],
    ],
    [
      [t.totals],
      [t.moneyIn, money(totals.income)],
      [t.moneyOut, money(totals.expenses)],
      [t.net, money(totals.net)],
      [
        t.savingsRate,
        totals.savingsRate === null ? "" : `${(totals.savingsRate * 100).toFixed(1)}%`,
      ],
    ],
    [
      [t.byMonth],
      [t.month, t.moneyIn, t.moneyOut, t.net],
      ...insights.monthly.map((m) => [
        m.month,
        money(m.income),
        money(m.expenses),
        money(m.income - m.expenses),
      ]),
    ],
    [
      [t.byCategory],
      [t.category, t.spent],
      ...insights.categories.map((c) => [c.category, money(c.amount)]),
    ],
    [
      [t.topVendors],
      [t.vendor, t.payments, t.spent],
      ...insights.vendors.map((v) => [v.name, v.count, money(v.amount)]),
    ],
    [
      [t.regular],
      t.regularHeaders,
      ...recurring.map((r) => [
        r.name,
        r.direction === "in" ? t.moneyIn : t.moneyOut,
        r.category ?? "",
        m.bills.repeats[r.cadence],
        money(r.amount),
        money(r.monthlyAmount),
        r.nextDay,
      ]),
    ],
    [
      [t.unusual],
      t.unusualHeaders,
      ...insights.unusualCharges.map((u) => [
        u.day,
        u.name,
        money(u.amount),
        money(u.usual),
        `${u.percentAbove}%`,
      ]),
    ],
  ];
  // An empty line between the tables
  return toCsv(tables.flatMap((table, i) => (i === 0 ? table : [[], ...table])));
}

/** The bills as a CSV file, in the order given */
export function billsCsv(bills: Bill[], m: Messages = english): string {
  const t = m.exports.bills;
  return toCsv([
    t.headers,
    ...bills.map((bill) => [
      bill.name,
      money(bill.amount),
      bill.dueDate,
      m.bills.repeats[bill.repeat],
      bill.category ?? "",
      bill.paidDay ? t.paid : t.unpaid,
      bill.paidDay ?? "",
      bill.notes ?? "",
    ]),
  ]);
}

/** One month's budgets as a CSV file, in the order given */
export function budgetsCsv(
  /** Any day of the month the figures are about */
  today: ISODate,
  budgets: BudgetProgress[],
  m: Messages = english,
): string {
  const t = m.exports.budgets;
  return toCsv([
    t.headers,
    ...budgets.map((budget) => [
      today.slice(0, 7),
      budget.name,
      money(budget.budget),
      money(budget.spent),
      money(budget.remaining),
      `${(budget.ratio * 100).toFixed(1)}%`,
      t[budget.status],
    ]),
  ]);
}

/** One line of the activity log, as it's written to the file */
export interface ActivityExportRow {
  /** The moment in the company's timezone, e.g. "2026-10-13 14:05" */
  when: string;
  actor: string;
  /** What it was about, e.g. "Transactions" */
  area: string;
  summary: string;
}

/** The activity log as a CSV file, in the order given */
export function activityCsv(rows: ActivityExportRow[], m: Messages = english): string {
  return toCsv([
    m.exports.activity.headers,
    ...rows.map((row) => [row.when, row.actor, row.area, row.summary]),
  ]);
}

/** "finely-transactions-2026-10-13.csv" */
export function exportFileName(what: string, today: ISODate): string {
  return `finely-${what}-${today}.csv`;
}
