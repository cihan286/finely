import { describe, expect, test } from "vitest";
import { addDays } from "@/lib/dates";
import { DEMO_HISTORY_DAYS, generateDemoData } from "./demo-data";
import { findUnusualCharges } from "./insights";
import { detectRecurring } from "./recurring";

// The categories every company starts with (lib/data/default-categories.ts)
const DEFAULT_CATEGORY_NAMES = [
  "Sales",
  "Payroll",
  "Office & Rent",
  "Software & IT",
  "Marketing",
  "Other",
];

// Different times of the month and year, since the data is built from today
const TODAYS = ["2026-10-18", "2026-03-01", "2026-02-28", "2027-01-31"];

describe.each(TODAYS)("generateDemoData on %s", (today) => {
  const data = generateDemoData(today);
  const start = addDays(today, -(DEMO_HISTORY_DAYS - 1));

  test("has half a year of history, none of it in the future", () => {
    expect(data.transactions.length).toBeGreaterThan(150);
    for (const t of data.transactions) {
      expect(t.day >= start && t.day <= today, `${t.name} on ${t.day}`).toBe(true);
      expect(Number.isFinite(t.amount) && t.amount !== 0).toBe(true);
      expect(Math.round(t.amount * 100) / 100).toBe(t.amount);
    }
  });

  test("only uses the accounts, cards and categories it creates", () => {
    const accounts = new Set(data.accounts.map((a) => a.key));
    const cards = new Set(data.cards.map((c) => c.key));
    for (const t of data.transactions) {
      expect(accounts.has(t.account)).toBe(true);
      if (t.card) expect(cards.has(t.card)).toBe(true);
      if (t.category) expect(DEFAULT_CATEGORY_NAMES).toContain(t.category);
    }
    for (const name of [
      ...Object.keys(data.budgets),
      ...data.rules.map((r) => r.category),
      ...data.bills.flatMap((b) => (b.category ? [b.category] : [])),
    ]) {
      expect(DEFAULT_CATEGORY_NAMES).toContain(name);
    }
  });

  test("keeps the checking account above zero every day", () => {
    let balance = data.accounts.find((a) => a.key === "checking")!.openingBalance;
    for (const t of data.transactions) {
      if (t.account !== "checking" || t.status !== "completed") continue;
      balance += t.amount;
      expect(balance, `after ${t.name} on ${t.day}`).toBeGreaterThan(0);
    }
  });

  test("gives Insights regular payments and an unusual charge to find", () => {
    const completed = data.transactions.filter((t) => t.status === "completed");
    const recurring = detectRecurring(
      completed.map((t) => ({ name: t.name, amount: t.amount, day: t.day, categoryId: null })),
      today,
    ).map((r) => r.name.toLowerCase());
    for (const name of ["wework office rent", "gusto payroll", "figma", "acme corp retainer"]) {
      expect(recurring).toContain(name);
    }

    const unusual = findUnusualCharges(
      completed
        .filter((t) => t.amount < 0)
        .map((t, i) => ({ id: String(i), name: t.name, amount: t.amount, day: t.day })),
      today,
    );
    expect(unusual.map((u) => u.name)).toContain("Amazon Web Services");
  });

  test("has something waiting: a pending payment, uncategorized ones and bills", () => {
    expect(data.transactions.some((t) => t.status === "pending")).toBe(true);
    expect(data.transactions.filter((t) => t.category === null).length).toBeGreaterThanOrEqual(3);
    expect(data.bills.some((b) => b.dueDate < today)).toBe(true);
    expect(data.bills.some((b) => b.dueDate > today)).toBe(true);
  });
});

test("the same seed gives the same data, another seed different amounts", () => {
  expect(generateDemoData("2026-10-18", 7)).toEqual(generateDemoData("2026-10-18", 7));
  expect(generateDemoData("2026-10-18", 7)).not.toEqual(generateDemoData("2026-10-18", 8));
});
