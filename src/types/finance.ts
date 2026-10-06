// ─────────────────────────────────────────────────────────────────────────────
// Data shapes (types)
//
// In plain words: these describe what each kind of information looks like —
// for example, "a bill has a name, a due date and an amount". The code checker
// uses them to catch mistakes, such as a missing amount or a misspelled field,
// before the app ever runs.
//
// For developers: the mock data implements these today; a real API should
// return the same shapes (raw numbers, ISO dates).
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

// A bank account (checking, savings, or money set aside for taxes)
export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "reserve";
  last4: string;
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

// Which icon to show next to each spending category
export type CategoryIconKey =
  | "users"
  | "building"
  | "laptop"
  | "megaphone"
  | "more";

// A spending category (e.g. Payroll) and how much went to it
export interface ExpenseCategory {
  id: string;
  category: string;
  amount: number;
  iconKey: CategoryIconKey;
  color: string;
}

// Which icon to show on each summary tile
export type MetricIconKey = "dollar" | "income" | "expenses" | "card";

// A summary tile at the top of the dashboard (e.g. Total Balance), with last
// month's value so we can show the change
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

// A single payment in or out of an account
export interface Transaction {
  id: string;
  name: string;
  category: string;
  /** Positive = income, negative = expense */
  amount: number;
  date: ISODateTime;
  status: "completed" | "pending";
  account: string;
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
