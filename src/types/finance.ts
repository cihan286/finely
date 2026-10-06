// ─────────────────────────────────────────────────────────────────────────────
// Data shapes (types)
//
// In plain words: these describe what each kind of information looks like —
// for example, "a bill has a name, a due date and an amount". The code checker
// uses them to catch mistakes, such as a missing amount or a misspelled field,
// before the app ever runs.
//
// For developers: both the mock data and the real data functions (lib/data/)
// return these shapes (raw numbers, ISO dates). The lists of allowed values
// (ACCOUNT_TYPES, …) are also used to check what people type into forms.
// ─────────────────────────────────────────────────────────────────────────────

// Dates are stored as text in a standard format (ISO 8601), e.g. 2026-10-01
export type ISODate = string; // "2026-10-01"
export type ISODateTime = string; // "2026-10-01T14:41:00"

// A message in the notifications panel (the bell icon)
export interface Notification {
  id: string;
  type: "payment" | "alert" | "bill" | "card" | "system";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

// The kinds of bank account: everyday, savings, or money set aside for taxes
export const ACCOUNT_TYPES = ["checking", "savings", "reserve"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// A bank account and how much is in it
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Last four digits of the account number; null if it has none */
  last4: string | null;
  balance: number;
  apy?: number;
}

// A company payment card and how much of its limit has been spent
export interface Card {
  id: string;
  brand: "Visa" | "Mastercard";
  last4: string;
  holder: string;
  kind: "physical" | "virtual";
  status: "active" | "frozen";
  expires: string; // "MM/YY"
  limit: number;
  spent: number;
}

// Which icon to show next to each category
export const CATEGORY_ICON_KEYS = [
  "users",
  "building",
  "laptop",
  "megaphone",
  "income",
  "more",
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

// Whether a category is for money coming in or going out
export const CATEGORY_KINDS = ["income", "expense"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

// A label a company gives its transactions, e.g. "Payroll" or "Sales"
export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Hex color for charts, e.g. "#8b5cf6" */
  color: string;
  iconKey: CategoryIconKey;
}

// A spending category (e.g. Payroll) and how much went to it
export interface ExpenseCategory {
  id: string;
  category: string;
  amount: number;
  iconKey: CategoryIconKey;
  color: string;
}

// Which icon to show on each summary tile
export type MetricIconKey = "dollar" | "income" | "expenses" | "net";

// A summary tile at the top of the dashboard (e.g. Total Balance), with the
// value for the previous 30 days so we can show the change
export interface Metric {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  format: "currency" | "number";
  iconKey: MetricIconKey;
  higherIsBetter: boolean;
}

// One point on the cash flow chart: money in and out for one day or month
export interface CashflowPoint {
  date?: ISODate;
  label: string;
  income: number;
  expenses: number;
}

// The time ranges the chart can show
export type CashflowRange = "last30Days" | "thisYear";

export type Cashflow = Record<CashflowRange, CashflowPoint[]>;

export const TRANSACTION_STATUSES = ["completed", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// A single payment in or out of an account
export interface Transaction {
  id: string;
  name: string;
  /** The category's name ("Uncategorized" if it has none) */
  category: string;
  /** Positive = income, negative = expense */
  amount: number;
  /** The exact moment (UTC) */
  date: ISODateTime;
  /** The calendar day it happened on, in the company's timezone */
  day: ISODate;
  status: TransactionStatus;
  /** The account's ID */
  account: string;
}

// A transaction with everything an edit form needs
export interface TransactionDetails extends Transaction {
  categoryId: string | null;
  notes: string | null;
}

// A bill that has to be paid by a certain date
export interface Bill {
  id: string;
  name: string;
  dueDate: ISODate;
  amount: number;
}

// A warning that needs attention, e.g. an unusual charge
export interface Alert {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  actionLabel: string;
}
