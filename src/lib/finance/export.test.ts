import { describe, expect, test } from "vitest";
import { parseCsv } from "./csv";
import { buildBudgets } from "./budgets";
import {
  activityCsv,
  billsCsv,
  budgetsCsv,
  exportFileName,
  insightsCsv,
  transactionsCsv,
} from "./export";
import { buildInsights } from "./insights";

describe("transactionsCsv", () => {
  test("one line per transaction under a header, with plain dates and amounts", () => {
    const csv = transactionsCsv([
      {
        day: "2026-10-13",
        name: "Office rent, October",
        category: "Office & Rent",
        account: "Business Checking",
        amount: -1234.5,
        status: "completed",
        notes: null,
      },
      {
        day: "2026-10-12",
        name: "=HYPERLINK(\"http://evil\")",
        category: null,
        account: "Savings",
        amount: 2400,
        status: "pending",
        notes: "Paid by\nwire",
      },
    ]);
    expect(parseCsv(csv)).toEqual([
      ["Date", "Description", "Category", "Account", "Amount", "Status", "Notes"],
      ["2026-10-13", "Office rent, October", "Office & Rent", "Business Checking", "-1234.50", "Completed", ""],
      ["2026-10-12", "'=HYPERLINK(\"http://evil\")", "", "Savings", "2400.00", "Pending", "Paid by\nwire"],
    ]);
  });

  test("no transactions: just the header", () => {
    expect(parseCsv(transactionsCsv([]))).toHaveLength(1);
  });
});

describe("insightsCsv", () => {
  const insights = buildInsights({
    today: "2026-10-06",
    period: 3,
    monthly: [
      { month: "2026-08", income: 5000, expenses: 3000 },
      { month: "2026-10", income: 1000, expenses: 500 },
    ],
    categorySpending: [
      { categoryId: "cat_1", name: "Payroll", color: "#8b5cf6", iconKey: "users", amount: 3500 },
    ],
    vendors: [{ name: "Rent", count: 3, amount: 3600 }],
    expenses: [],
  });

  test("a table per section, each under its title", () => {
    const rows = parseCsv(
      insightsCsv("Northpeak, Inc.", insights, [
        {
          key: "out:figma",
          name: "Figma",
          direction: "out",
          cadence: "monthly",
          amount: 45,
          variable: false,
          monthlyAmount: 45,
          count: 4,
          lastDay: "2026-10-03",
          nextDay: "2026-11-03",
          categoryId: null,
          category: "Software & IT",
        },
      ]),
    );
    const section = (title: string) => rows.findIndex((row) => row[0] === title);

    expect(rows.slice(0, 5)).toEqual([
      ["Finely insights"],
      ["Company", "Northpeak, Inc."],
      ["Period", "Last 3 months"],
      ["Currency", "USD"],
      ["Exported on", "2026-10-06"],
    ]);
    expect(rows.slice(section("Totals") + 1, section("Totals") + 5)).toEqual([
      ["Money in", "6000.00"],
      ["Money out", "3500.00"],
      ["Net", "2500.00"],
      ["Savings rate", "41.7%"],
    ]);
    expect(rows.slice(section("By month") + 2, section("By month") + 5)).toEqual([
      ["2026-08", "5000.00", "3000.00", "2000.00"],
      ["2026-09", "0.00", "0.00", "0.00"],
      ["2026-10", "1000.00", "500.00", "500.00"],
    ]);
    expect(rows[section("Spending by category") + 2]).toEqual(["Payroll", "3500.00"]);
    expect(rows[section("Top vendors") + 2]).toEqual(["Rent", "3", "3600.00"]);
    expect(rows[section("Regular payments (from the last 13 months; yearly ones from the last 26)") + 2]).toEqual([
      "Figma",
      "Money out",
      "Software & IT",
      "Every month",
      "45.00",
      "45.00",
      "2026-11-03",
    ]);
  });
});

test("billsCsv: unpaid and paid bills, one per line", () => {
  const bill = {
    id: "bill_1",
    name: "Office rent",
    amount: 1200,
    dueDate: "2026-11-01",
    repeat: "monthly" as const,
    categoryId: "cat_1",
    category: "Rent",
    notes: null,
    paidDay: null,
    transactionId: null,
    paymentLinked: false,
  };
  expect(
    parseCsv(
      billsCsv([
        bill,
        { ...bill, dueDate: "2026-10-01", category: null, paidDay: "2026-10-02", notes: "Late" },
      ]),
    ),
  ).toEqual([
    ["Name", "Amount", "Due date", "Repeats", "Category", "Status", "Paid on", "Notes"],
    ["Office rent", "1200.00", "2026-11-01", "Every month", "Rent", "Unpaid", "", ""],
    ["Office rent", "1200.00", "2026-10-01", "Every month", "", "Paid", "2026-10-02", "Late"],
  ]);
});

test("budgetsCsv: what was budgeted, spent and left this month", () => {
  const budgets = buildBudgets([
    { categoryId: "cat_1", name: "Marketing", color: "#000", iconKey: "megaphone", budget: 500, spent: 620.5 },
    { categoryId: "cat_2", name: "Travel", color: "#000", iconKey: "plane", budget: 1000, spent: 100 },
  ]);
  expect(parseCsv(budgetsCsv("2026-10-13", budgets))).toEqual([
    ["Month", "Category", "Budget", "Spent", "Left", "Used", "Status"],
    ["2026-10", "Marketing", "500.00", "620.50", "-120.50", "124.1%", "Over budget"],
    ["2026-10", "Travel", "1000.00", "100.00", "900.00", "10.0%", "Within budget"],
  ]);
});

test("activityCsv: one line per entry, formulas made harmless", () => {
  expect(
    parseCsv(
      activityCsv([
        {
          when: "2026-10-13 14:05",
          actor: "Maya Carter",
          area: "Bills",
          summary: "=Deleted the bill",
        },
      ]),
    ),
  ).toEqual([
    ["When", "Who", "About", "What happened"],
    ["2026-10-13 14:05", "Maya Carter", "Bills", "'=Deleted the bill"],
  ]);
});

test("exportFileName", () => {
  expect(exportFileName("transactions", "2026-10-13")).toBe(
    "finely-transactions-2026-10-13.csv",
  );
});
