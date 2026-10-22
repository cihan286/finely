// ─────────────────────────────────────────────────────────────────────────────
// The demo company's made-up finances
//
// In plain words: "Try the demo" on the home page opens a pretend design
// studio, Northpeak Studio, with half a year of believable money in and out:
// clients paying, payroll, rent, software subscriptions, ads, card spending,
// a few bills coming up, budgets, and one surprisingly large cloud bill. That
// way every page (Insights, the forecast, budgets, cards) has something to
// show straight away. Everything here is invented.
//
// For developers: a pure function, no database. Days are ISO dates relative
// to `today`; lib/data/demo.ts turns them into rows. The same `seed` always
// gives the same data (demo-data.test.ts relies on it).
// ─────────────────────────────────────────────────────────────────────────────

import { messagesFor, type Messages } from "@/i18n/messages";
import { addDays, daysBetween } from "@/lib/dates";
import { roundMoney } from "@/lib/money";
import type { AccountType, BillRepeat, ISODate, TransactionStatus } from "@/types/finance";

/** How far back the demo's history goes */
export const DEMO_HISTORY_DAYS = 180;

export const DEMO_COMPANY_NAME = "Northpeak Studio";
export const DEMO_OWNER_NAME = "Maya Carter";
export const DEMO_TEAMMATE_NAME = "Jordan Lee";

type AccountKey = "checking" | "savings";
type CardKey = "maya" | "jordan";
/** The default categories every company starts with (default-categories.ts) */
type CategoryName =
  | "Sales"
  | "Payroll"
  | "Office & Rent"
  | "Software & IT"
  | "Marketing"
  | "Other";

export interface DemoTransaction {
  account: AccountKey;
  day: ISODate;
  name: string;
  /** Positive for money in, negative for money out */
  amount: number;
  /** Null: left for the visitor to categorize */
  category: CategoryName | null;
  card: CardKey | null;
  status: TransactionStatus;
  notes: string | null;
}

export interface DemoBill {
  name: string;
  amount: number;
  dueDate: ISODate;
  repeat: BillRepeat;
  category: CategoryName | null;
  notes: string | null;
}

export interface DemoData {
  accounts: { key: AccountKey; name: string; type: AccountType; last4: string; openingBalance: number }[];
  cards: { key: CardKey; name: string; last4: string; holder: "owner" | "teammate"; monthlyLimit: number }[];
  /** Monthly budgets per category */
  budgets: Partial<Record<CategoryName, number>>;
  /** The most the whole company wants to spend per month */
  companyBudget: number;
  rules: { matchText: string; category: CategoryName }[];
  transactions: DemoTransaction[];
  bills: DemoBill[];
}

// A small, seeded random number generator (mulberry32): the same seed always
// gives the same numbers, unlike Math.random()
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The days in [from, to] that fall on a given day of the month */
function monthlyDays(from: ISODate, to: ISODate, dayOfMonth: number): ISODate[] {
  const days: ISODate[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  for (;;) {
    // Short months: the last day instead (e.g. the 31st in April is the 30th)
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = `${year}-${String(month).padStart(2, "0")}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, "0")}`;
    if (day > to) break;
    if (day >= from) days.push(day);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return days;
}

/** Every `step` days from `from` up to `to` */
function everyDays(from: ISODate, to: ISODate, step: number): ISODate[] {
  const days: ISODate[] = [];
  for (let day = from; day <= to; day = addDays(day, step)) days.push(day);
  return days;
}

/**
 * The demo company's accounts, cards, budgets, transactions and bills, with
 * the names and notes a person would have typed in the visitor's language
 * (`words`: m.samples.demo)
 */
export function generateDemoData(
  today: ISODate,
  seed = 1,
  words: Messages["samples"]["demo"] = messagesFor("en").samples.demo,
): DemoData {
  const random = seededRandom(seed);
  const between = (min: number, max: number) => roundMoney(min + random() * (max - min));
  const start = addDays(today, -(DEMO_HISTORY_DAYS - 1));
  const transactions: DemoTransaction[] = [];

  const add = (
    day: ISODate,
    name: string,
    amount: number,
    category: CategoryName | null,
    extra: Partial<Pick<DemoTransaction, "account" | "card" | "status" | "notes">> = {},
  ) => {
    transactions.push({
      account: extra.account ?? "checking",
      day,
      name,
      amount: roundMoney(amount),
      category,
      card: extra.card ?? null,
      status: extra.status ?? "completed",
      notes: extra.notes ?? null,
    });
  };

  // ── Money in ──────────────────────────────────────────────────────────────
  // A client on a monthly retainer
  for (const day of monthlyDays(start, today, 3)) {
    add(day, "Acme Corp retainer", 7500, "Sales", { notes: words.retainerNote });
  }
  // Project invoices from another client, two or three a month
  for (const day of everyDays(addDays(start, 5), today, 12)) {
    const invoice = 1040 + transactions.length;
    add(day, `Brightline Media invoice #${invoice}`, between(2200, 5400), "Sales");
  }
  // Card payments from smaller customers, paid out every Friday-ish week
  for (const day of everyDays(addDays(start, 2), today, 7)) {
    add(day, "Stripe payout", between(650, 1450), "Sales");
  }
  // Interest on the savings account
  for (const day of monthlyDays(start, today, 28)) {
    add(day, "Interest payment", between(48, 56), "Sales", { account: "savings" });
  }

  // ── Money out ─────────────────────────────────────────────────────────────
  // Payday every other Friday-ish
  for (const day of everyDays(addDays(start, 4), today, 14)) {
    add(day, "Gusto payroll", -5760, "Payroll");
  }
  for (const day of monthlyDays(start, today, 1)) {
    add(day, "WeWork office rent", -3200, "Office & Rent");
  }
  // Subscriptions, most of them on Maya's card
  const subscriptions: [number, string, number, CardKey | null][] = [
    [4, "Figma", -45, "maya"],
    [6, "Slack", -87.5, null],
    [10, "Google Workspace", -72, null],
    [19, "Adobe Creative Cloud", -89.99, "maya"],
  ];
  for (const [dayOfMonth, name, amount, card] of subscriptions) {
    for (const day of monthlyDays(start, today, dayOfMonth)) {
      add(day, name, amount, "Software & IT", { card });
    }
  }
  // The cloud bill changes every month; the latest one is unusually high
  const awsDays = monthlyDays(start, today, 8);
  awsDays.forEach((day, i) => {
    const latest = i === awsDays.length - 1;
    add(day, "Amazon Web Services", latest ? -1180.4 : -between(140, 220), "Software & IT", {
      notes: latest ? words.awsNote : null,
    });
  });
  // Ads, now and then
  for (const day of everyDays(addDays(start, 9), today, 16)) {
    add(day, "LinkedIn Ads", -between(280, 760), "Marketing", { card: "maya" });
  }
  for (const day of monthlyDays(start, today, 22)) {
    add(day, "Google Ads", -between(180, 420), "Marketing");
  }
  // Everyday spending on Jordan's card
  for (const day of everyDays(addDays(start, 1), today, 4)) {
    const [name, min, max] =
      random() < 0.5 ? ["Blue Bottle Coffee", 9, 36] : ["Uber", 14, 48];
    add(day, name, -between(min, max), "Other", { card: "jordan" });
  }
  for (const day of everyDays(addDays(start, 11), today, 27)) {
    add(day, "Staples office supplies", -between(35, 160), "Office & Rent");
  }
  // ── Recent things that need someone's attention ───────────────────────────
  add(addDays(today, -3), "Team offsite lunch", -340, "Other", { card: "jordan" });
  add(addDays(today, -1), "Upwork contractor", -850, null, {
    status: "pending",
    notes: words.upworkNote,
  });
  // Not categorized yet
  add(addDays(today, -2), "PAYPAL *NOTION LABS", -96, null);
  add(addDays(today, -4), "Amazon Marketplace", -64.37, null);
  add(addDays(today, -6), "Delta Air Lines", -412.8, null, { card: "maya" });

  // Never in the future, oldest first
  const history = transactions
    .filter((t) => t.day <= today && daysBetween(start, t.day) >= 0)
    .sort((a, b) => a.day.localeCompare(b.day));

  return {
    accounts: [
      { key: "checking", name: words.checking, type: "checking", last4: "3201", openingBalance: 24000 },
      { key: "savings", name: words.savings, type: "savings", last4: "7740", openingBalance: 40000 },
    ],
    cards: [
      { key: "maya", name: words.mayaCard, last4: "4821", holder: "owner", monthlyLimit: 1500 },
      { key: "jordan", name: words.jordanCard, last4: "9055", holder: "teammate", monthlyLimit: 300 },
    ],
    budgets: {
      "Software & IT": 900,
      Marketing: 1200,
      "Office & Rent": 3400,
      Other: 700,
    },
    companyBudget: 24000,
    rules: [
      { matchText: "figma", category: "Software & IT" },
      { matchText: "gusto", category: "Payroll" },
      { matchText: "stripe payout", category: "Sales" },
    ],
    transactions: history,
    bills: [
      { name: words.insurance, amount: 420, dueDate: addDays(today, 5), repeat: "monthly", category: "Other", notes: null },
      { name: words.bookkeeping, amount: 650, dueDate: addDays(today, 12), repeat: "quarterly", category: "Other", notes: words.bookkeepingNote },
      { name: words.domain, amount: 24, dueDate: addDays(today, -2), repeat: "yearly", category: "Software & IT", notes: null },
    ],
  };
}
