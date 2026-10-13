import { describe, expect, test } from "vitest";
import { parseCsv } from "./csv";
import { exportFileName, insightsCsv, transactionsCsv } from "./export";
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
    expect(rows[section("Regular payments (from the last 13 months)") + 2]).toEqual([
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

test("exportFileName", () => {
  expect(exportFileName("transactions", "2026-10-13")).toBe(
    "finely-transactions-2026-10-13.csv",
  );
});
