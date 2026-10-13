// ─────────────────────────────────────────────────────────────────────────────
// Data shapes (types)
//
// In plain words: these describe what each kind of information looks like —
// for example, "a transaction has a name, a date and an amount". The code
// checker uses them to catch mistakes, such as a missing amount or a
// misspelled field, before the app ever runs.
//
// For developers: the data functions (lib/data/) return these shapes (raw
// numbers, ISO dates). The lists of allowed values
// (ACCOUNT_TYPES, …) are also used to check what people type into forms.
// ─────────────────────────────────────────────────────────────────────────────

// Dates are stored as text in a standard format (ISO 8601), e.g. 2026-10-01
export type ISODate = string; // "2026-10-01"
export type ISODateTime = string; // "2026-10-01T14:41:00"

// A message in the notifications panel (the bell icon)
export interface Notification {
  id: string;
  /** "alert" needs a look soon; "reminder" is housekeeping */
  type: "alert" | "reminder";
  title: string;
  description: string;
  /** The calendar day it's about, in the company's timezone */
  day: ISODate;
  read: boolean;
  /** Where clicking it goes */
  href: string;
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
}

// Which icon to show next to each category
export const CATEGORY_ICON_KEYS = [
  "income",
  "users",
  "building",
  "laptop",
  "megaphone",
  "plane",
  "utensils",
  "receipt",
  "briefcase",
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
  /**
   * The most to spend in it per calendar month; null without a budget
   * (always null for "income" categories)
   */
  budget: number | null;
}

// "Transactions whose description contains this text get this category"
export interface CategoryRule {
  id: string;
  /** The text to look for, e.g. "AWS" (upper/lower case doesn't matter) */
  matchText: string;
  categoryId: string;
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

// How often a bill comes back
export const BILL_REPEATS = [
  "none",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
export type BillRepeat = (typeof BILL_REPEATS)[number];

// A payment the company owes (or has paid)
export interface Bill {
  id: string;
  /** Who is paid or what for, e.g. "Office rent" */
  name: string;
  /** A positive number */
  amount: number;
  /** The calendar day it's due, in the company's timezone */
  dueDate: ISODate;
  repeat: BillRepeat;
  categoryId: string | null;
  /** The category's name; null if it has none */
  category: string | null;
  notes: string | null;
  /** The day it was paid; null while it's still owed */
  paidDay: ISODate | null;
  /** The payment's transaction; null if unpaid or if it was deleted since */
  transactionId: string | null;
}

// A transaction with everything an edit form needs
export interface TransactionDetails extends Transaction {
  categoryId: string | null;
  notes: string | null;
  /** How many receipts or other files are attached */
  attachmentCount: number;
}

// A receipt, invoice or other file attached to a transaction (without the
// file itself)
export interface Attachment {
  id: string;
  /** The file's name, e.g. "receipt.pdf" */
  name: string;
  /** e.g. "application/pdf" */
  contentType: string;
  /** In bytes */
  size: number;
  /** Whether the signed-in person may delete it */
  canDelete: boolean;
}

// Which emails a person gets about a company
export interface EmailPreferences {
  /** The summary of the week, every Monday */
  weeklyDigest: boolean;
  /** An email right away when a charge is unusually high */
  unusualCharges: boolean;
}
