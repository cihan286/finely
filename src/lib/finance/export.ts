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

import { BILL_REPEAT_LABELS } from "@/lib/finance/bills";
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
const money = (amount: number) => amount.toFixed(2);

/** The transactions list as a CSV file, in the order given */
export function transactionsCsv(rows: TransactionExportRow[]): string {
  return toCsv([
    ["Date", "Description", "Category", "Account", "Amount", "Status", "Notes"],
    ...rows.map((row) => [
      row.day,
      row.name,
      row.category ?? "",
      row.account,
      money(row.amount),
      row.status === "pending" ? "Pending" : "Completed",
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
): string {
  const { totals } = insights;
  const tables: CsvCell[][][] = [
    [
      ["Finely insights"],
      ["Company", organizationName],
      ["Period", `Last ${insights.period} months`],
      ["Currency", currency],
      ["Exported on", insights.today],
    ],
    [
      ["Totals"],
      ["Money in", money(totals.income)],
      ["Money out", money(totals.expenses)],
      ["Net", money(totals.net)],
      [
        "Savings rate",
        totals.savingsRate === null ? "" : `${(totals.savingsRate * 100).toFixed(1)}%`,
      ],
    ],
    [
      ["By month"],
      ["Month", "Money in", "Money out", "Net"],
      ...insights.monthly.map((m) => [
        m.month,
        money(m.income),
        money(m.expenses),
        money(m.income - m.expenses),
      ]),
    ],
    [
      ["Spending by category"],
      ["Category", "Spent"],
      ...insights.categories.map((c) => [c.category, money(c.amount)]),
    ],
    [
      ["Top vendors"],
      ["Vendor", "Payments", "Spent"],
      ...insights.vendors.map((v) => [v.name, v.count, money(v.amount)]),
    ],
    [
      ["Regular payments (from the last 13 months; yearly ones from the last 26)"],
      ["Name", "Direction", "Category", "How often", "Usual amount", "Per month", "Next expected"],
      ...recurring.map((r) => [
        r.name,
        r.direction === "in" ? "Money in" : "Money out",
        r.category ?? "",
        BILL_REPEAT_LABELS[r.cadence],
        money(r.amount),
        money(r.monthlyAmount),
        r.nextDay,
      ]),
    ],
    [
      ["Unusual charges (last 30 days)"],
      ["Date", "Vendor", "Charged", "Usual", "Above usual"],
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
export function billsCsv(bills: Bill[]): string {
  return toCsv([
    ["Name", "Amount", "Due date", "Repeats", "Category", "Status", "Paid on", "Notes"],
    ...bills.map((bill) => [
      bill.name,
      money(bill.amount),
      bill.dueDate,
      BILL_REPEAT_LABELS[bill.repeat],
      bill.category ?? "",
      bill.paidDay ? "Paid" : "Unpaid",
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
): string {
  const STATUS = { ok: "Within budget", near: "Nearly used up", over: "Over budget" };
  return toCsv([
    ["Month", "Category", "Budget", "Spent", "Left", "Used", "Status"],
    ...budgets.map((budget) => [
      today.slice(0, 7),
      budget.name,
      money(budget.budget),
      money(budget.spent),
      money(budget.remaining),
      `${(budget.ratio * 100).toFixed(1)}%`,
      STATUS[budget.status],
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
export function activityCsv(rows: ActivityExportRow[]): string {
  return toCsv([
    ["When", "Who", "About", "What happened"],
    ...rows.map((row) => [row.when, row.actor, row.area, row.summary]),
  ]);
}

/** "finely-transactions-2026-10-13.csv" */
export function exportFileName(what: string, today: ISODate): string {
  return `finely-${what}-${today}.csv`;
}
