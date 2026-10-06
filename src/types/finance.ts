// Shapes of the data the dashboard works with. The mock data implements these
// today; a real API should return the same shapes (raw numbers, ISO dates).

export type ISODate = string; // "2026-10-01"
export type ISODateTime = string; // "2026-10-01T14:41:00"

export interface Notification {
  id: string;
  type: "payment" | "alert" | "bill" | "card" | "system";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "reserve";
  last4: string;
  balance: number;
  apy?: number;
}

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

export type CategoryIconKey =
  | "users"
  | "building"
  | "laptop"
  | "megaphone"
  | "more";

export interface ExpenseCategory {
  id: string;
  category: string;
  amount: number;
  iconKey: CategoryIconKey;
  color: string;
}

export type MetricIconKey = "dollar" | "income" | "expenses" | "card";

export interface Metric {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  format: "currency" | "number";
  iconKey: MetricIconKey;
  higherIsBetter: boolean;
}

export interface CashflowPoint {
  date?: ISODate;
  label: string;
  income: number;
  expenses: number;
}

export type CashflowRange = "last30Days" | "thisYear";

export type Cashflow = Record<CashflowRange, CashflowPoint[]>;

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

export interface Bill {
  id: string;
  name: string;
  dueDate: ISODate;
  amount: number;
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  actionLabel: string;
}
