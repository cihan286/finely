// Single source of truth for the dashboard mock data.
// Shapes mirror what a real API would return: raw numbers and ISO dates,
// no pre-formatted strings. Formatting lives in utils/format.js.
// Everything is internally consistent (see the "Totals" section).

import type {
  Account,
  Alert,
  Bill,
  Card,
  Cashflow,
  CashflowPoint,
  ExpenseCategory,
  Metric,
  Notification,
  Transaction,
  User,
} from "@/types/finance";

/** "Today" for the mock world. Keeps relative labels ("Yesterday") stable. */
export const TODAY = "2026-10-01";

/* ------------------------------------------------------------------ */
/* User & company                                                      */
/* ------------------------------------------------------------------ */
export const currentUser: User = {
  id: "usr_01",
  firstName: "Maya",
  lastName: "Carter",
  email: "maya@northpeak.io",
  role: "Finance Lead",
  company: "Northpeak Studio",
  initials: "MC",
};

export const notifications: Notification[] = [
  {
    id: "n1",
    type: "payment",
    title: "Stripe payout received",
    description: "$2,400.00 landed in Business Checking.",
    time: "2h ago",
    read: false,
  },
  {
    id: "n2",
    type: "alert",
    title: "Unusual charge detected",
    description: "AWS billed 38% more than your 3-month average.",
    time: "6h ago",
    read: false,
  },
  {
    id: "n3",
    type: "bill",
    title: "Bill due tomorrow",
    description: "Google Workspace – $120.00 is due Oct 2.",
    time: "Yesterday",
    read: false,
  },
  {
    id: "n4",
    type: "card",
    title: "Card frozen",
    description: "Virtual card ••7730 was frozen by an admin.",
    time: "Sep 27",
    read: true,
  },
  {
    id: "n5",
    type: "system",
    title: "Monthly statement ready",
    description: "Your September statement is ready to download.",
    time: "Sep 26",
    read: true,
  },
];

/* ------------------------------------------------------------------ */
/* Accounts & cards                                                    */
/* ------------------------------------------------------------------ */
export const accounts: Account[] = [
  {
    id: "acc_1",
    name: "Business Checking",
    type: "checking",
    last4: "3201",
    balance: 84230.5,
  },
  {
    id: "acc_2",
    name: "High-Yield Savings",
    type: "savings",
    last4: "8842",
    balance: 38500.0,
    apy: 4.1,
  },
  {
    id: "acc_3",
    name: "Tax Reserve",
    type: "reserve",
    last4: "5517",
    balance: 6212.0,
  },
];

export const cards: Card[] = [
  {
    id: "card_1",
    brand: "Visa",
    last4: "4821",
    holder: "Maya Carter",
    kind: "physical",
    status: "active",
    expires: "11/26",
    limit: 15000,
    spent: 6420.35,
  },
  {
    id: "card_2",
    brand: "Mastercard",
    last4: "1093",
    holder: "Daniel Okafor",
    kind: "physical",
    status: "active",
    expires: "03/28",
    limit: 8000,
    spent: 2310.0,
  },
  {
    id: "card_3",
    brand: "Visa",
    last4: "5562",
    holder: "Marketing",
    kind: "virtual",
    status: "active",
    expires: "08/27",
    limit: 5000,
    spent: 2850.0,
  },
  {
    id: "card_4",
    brand: "Visa",
    last4: "9014",
    holder: "Software",
    kind: "virtual",
    status: "active",
    expires: "08/27",
    limit: 4000,
    spent: 3240.0,
  },
  {
    id: "card_5",
    brand: "Visa",
    last4: "7730",
    holder: "Travel",
    kind: "virtual",
    status: "frozen",
    expires: "01/27",
    limit: 3000,
    spent: 0,
  },
];

/* ------------------------------------------------------------------ */
/* Expense breakdown (last 30 days)                                    */
/* ------------------------------------------------------------------ */
// iconKey is mapped to a lucide icon inside the component.
export const expenseCategories: ExpenseCategory[] = [
  {
    id: "cat_payroll",
    category: "Payroll",
    amount: 16408.0,
    iconKey: "users",
    color: "#8b5cf6",
  },
  {
    id: "cat_office",
    category: "Office & Rent",
    amount: 5700.0,
    iconKey: "building",
    color: "#f59e0b",
  },
  {
    id: "cat_software",
    category: "Software & IT",
    amount: 3240.0,
    iconKey: "laptop",
    color: "#3b82f6",
  },
  {
    id: "cat_marketing",
    category: "Marketing",
    amount: 2100.0,
    iconKey: "megaphone",
    color: "#10b981",
  },
  {
    id: "cat_other",
    category: "Other",
    amount: 1051.88,
    iconKey: "more",
    color: "#94a3b8",
  },
];

/* ------------------------------------------------------------------ */
/* Totals — everything below is derived so the page can't disagree     */
/* ------------------------------------------------------------------ */
const round2 = (n: number) => Math.round(n * 100) / 100;

export const INCOME_30D = 42600.0;
export const EXPENSES_30D = round2(
  expenseCategories.reduce((sum, c) => sum + c.amount, 0),
); // 28,499.88
export const TOTAL_BALANCE = round2(
  accounts.reduce((sum, a) => sum + a.balance, 0),
); // 128,942.50

// Last month's figures give the "+12.4% from last month" style deltas.
export const metrics: Metric[] = [
  {
    id: "balance",
    title: "Total Balance",
    value: TOTAL_BALANCE,
    previousValue: 114719.0,
    format: "currency",
    iconKey: "dollar",
    higherIsBetter: true,
  },
  {
    id: "income",
    title: "Monthly Income",
    value: INCOME_30D,
    previousValue: 39371.0,
    format: "currency",
    iconKey: "income",
    higherIsBetter: true,
  },
  {
    id: "expenses",
    title: "Monthly Expenses",
    value: EXPENSES_30D,
    previousValue: 27833.0,
    format: "currency",
    iconKey: "expenses",
    higherIsBetter: false,
  },
  {
    id: "cards",
    title: "Active Cards",
    value: cards.filter((c) => c.status === "active").length, // 4
    previousValue: 4,
    format: "number",
    iconKey: "card",
    higherIsBetter: true,
  },
];

/* ------------------------------------------------------------------ */
/* Cash flow chart                                                     */
/* ------------------------------------------------------------------ */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Small deterministic PRNG so the chart is identical on server and client.
function seeded(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Splits `total` into n uneven, positive parts that sum exactly to `total`.
function distribute(total: number, n: number, rand: () => number): number[] {
  const weights = Array.from({ length: n }, () => 0.4 + rand() * 1.2);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((w) => round2((w / weightSum) * total));
  const rest = values.slice(0, -1).reduce((a, b) => a + b, 0);
  values[n - 1] = round2(total - rest);
  return values;
}

function buildLast30Days(): CashflowPoint[] {
  const rand = seeded(2026);
  const income = distribute(INCOME_30D, 30, rand);
  const expenses = distribute(EXPENSES_30D, 30, rand);
  return income.map((inc, i) => {
    const d = new Date(2026, 9, 1 - (29 - i)); // Sep 2 → Oct 1
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      label: `${MONTHS[d.getMonth()]} ${d.getDate()}`,
      income: inc,
      expenses: expenses[i],
    };
  });
}

export const cashflow: Cashflow = {
  // Daily points; sums equal INCOME_30D / EXPENSES_30D exactly.
  last30Days: buildLast30Days(),
  // Monthly points; Aug matches the "previous" figures above, Oct is month-to-date.
  thisYear: [
    { label: "Jan", income: 31200, expenses: 22100 },
    { label: "Feb", income: 33000, expenses: 22900 },
    { label: "Mar", income: 34500, expenses: 23800 },
    { label: "Apr", income: 35200, expenses: 24600 },
    { label: "May", income: 36800, expenses: 25100 },
    { label: "Jun", income: 37400, expenses: 25900 },
    { label: "Jul", income: 38100, expenses: 26700 },
    { label: "Aug", income: 39371, expenses: 27833 },
    { label: "Sep", income: INCOME_30D, expenses: EXPENSES_30D },
    { label: "Oct", income: 2400, expenses: 340.12 },
  ],
};

/* ------------------------------------------------------------------ */
/* Transactions (newest first). A sample of recent activity — the      */
/* category totals above include more rows than are listed here.       */
/* amount: positive = income, negative = expense                       */
/* ------------------------------------------------------------------ */
export const transactions: Transaction[] = [
  {
    id: "tx_01",
    name: "Stripe payout",
    category: "Income",
    amount: 2400.0,
    date: "2026-10-01T14:41:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_02",
    name: "AWS",
    category: "Software & IT",
    amount: -340.12,
    date: "2026-10-01T09:02:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_03",
    name: "Payroll",
    category: "Payroll",
    amount: -8204.0,
    date: "2026-09-30T08:00:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_04",
    name: "Figma",
    category: "Software & IT",
    amount: -15.0,
    date: "2026-09-28T11:15:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_05",
    name: "WeWork Office",
    category: "Office & Rent",
    amount: -1200.0,
    date: "2026-09-25T10:30:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_06",
    name: "Google Ads",
    category: "Marketing",
    amount: -750.0,
    date: "2026-09-24T07:45:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_07",
    name: "Stripe payout",
    category: "Income",
    amount: 3150.0,
    date: "2026-09-22T14:20:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_08",
    name: "Notion",
    category: "Software & IT",
    amount: -96.0,
    date: "2026-09-20T09:10:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_09",
    name: "Northwind Co. invoice",
    category: "Income",
    amount: 6800.0,
    date: "2026-09-18T16:05:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_10",
    name: "Payroll",
    category: "Payroll",
    amount: -8204.0,
    date: "2026-09-15T08:00:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_11",
    name: "Mailchimp",
    category: "Marketing",
    amount: -85.0,
    date: "2026-09-06T12:00:00",
    status: "completed",
    account: "acc_1",
  },
  {
    id: "tx_12",
    name: "Office Rent",
    category: "Office & Rent",
    amount: -4500.0,
    date: "2026-09-04T09:00:00",
    status: "completed",
    account: "acc_1",
  },
];

/* ------------------------------------------------------------------ */
/* Bills & alerts                                                      */
/* ------------------------------------------------------------------ */
export const upcomingBills: Bill[] = [
  {
    id: "bill_1",
    name: "Google Workspace",
    dueDate: "2026-10-02",
    amount: 120.0,
  },
  { id: "bill_2", name: "Office Rent", dueDate: "2026-10-04", amount: 4500.0 },
  { id: "bill_3", name: "Mailchimp", dueDate: "2026-10-06", amount: 85.0 },
  { id: "bill_4", name: "Notion", dueDate: "2026-10-08", amount: 96.0 },
];

// For the upcoming "Needs attention" strip.
export const alerts: Alert[] = [
  {
    id: "al_1",
    severity: "warning",
    title: "Office Rent is due in 3 days",
    description: "$4,500.00 will be paid from Business Checking.",
    actionLabel: "Review payment",
  },
  {
    id: "al_2",
    severity: "danger",
    title: "Unusual charge from AWS",
    description: "$340.12 is 38% above your 3-month average.",
    actionLabel: "Review charge",
  },
  {
    id: "al_3",
    severity: "info",
    title: "Card ••4821 expires next month",
    description: "Order a replacement to avoid failed payments.",
    actionLabel: "Order card",
  },
];
