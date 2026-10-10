import { describe, expect, test } from "vitest";
import type { Account } from "@/types/finance";
import {
  buildDashboardSummary,
  dashboardWindows,
  topCategories,
  type CategorySpending,
} from "./dashboard-summary";

const account: Account = {
  id: "acc_1",
  name: "Business Checking",
  type: "checking",
  last4: null,
  balance: 13000,
};

describe("dashboardWindows", () => {
  test("30 days including today, and the 30 before", () => {
    expect(dashboardWindows("2026-10-06")).toEqual({
      last30Start: "2026-09-07",
      previous30Start: "2026-08-08",
      yearStart: "2026-01-01",
      tomorrow: "2026-10-07",
      queryStart: "2026-01-01",
    });
  });

  test("early in a year, the comparison reaches back into the last one", () => {
    const windows = dashboardWindows("2027-01-10");
    expect(windows.previous30Start).toBe("2026-11-12");
    expect(windows.queryStart).toBe("2026-11-12");
  });
});

describe("buildDashboardSummary", () => {
  const summary = buildDashboardSummary({
    today: "2026-10-06",
    daily: [
      { day: "2026-10-05", income: 3000, expenses: 0 },
      { day: "2026-10-01", income: 0, expenses: 1200 },
      { day: "2026-09-26", income: 0, expenses: 300 },
      { day: "2026-08-27", income: 2000, expenses: 0 },
      { day: "2026-08-22", income: 0, expenses: 500 },
      // Last year: only in neither window
      { day: "2025-12-31", income: 999, expenses: 999 },
    ],
    categorySpending: [],
    accounts: [account],
    recentTransactions: [],
  });

  test("tiles compare the last 30 days with the 30 before", () => {
    const tiles = Object.fromEntries(summary.metrics.map((m) => [m.id, [m.value, m.previousValue]]));
    expect(tiles).toEqual({
      balance: [13000, 11500],
      income: [3000, 2000],
      expenses: [1500, 500],
      net: [1500, 1500],
    });
    expect(summary.expensesTotal).toBe(1500);
  });

  test("daily chart: 30 points ending today, empty days are zero", () => {
    const days = summary.cashflow.last30Days;
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: "2026-09-07", label: "Sep 7", income: 0, expenses: 0 });
    expect(days.at(-1)?.date).toBe("2026-10-06");
    expect(days.find((d) => d.date === "2026-10-05")).toMatchObject({ income: 3000 });
  });

  test("monthly chart: January to the current month of this year only", () => {
    const months = summary.cashflow.thisYear;
    expect(months.map((m) => m.label)).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct",
    ]);
    expect(months[7]).toEqual({ label: "Aug", income: 2000, expenses: 500 });
    expect(months[8]).toEqual({ label: "Sep", income: 0, expenses: 300 });
    expect(months[9]).toEqual({ label: "Oct", income: 3000, expenses: 1200 });
    expect(months[0]).toEqual({ label: "Jan", income: 0, expenses: 0 });
  });
});

describe("topCategories", () => {
  const spend = (name: string | null, amount: number): CategorySpending => ({
    categoryId: name && `cat_${name}`,
    name,
    color: name && "#123456",
    iconKey: name && "laptop",
    amount,
  });

  test("largest first; uncategorized gets a neutral look", () => {
    expect(topCategories([spend("Rent", 100), spend(null, 300)])).toEqual([
      { id: "uncategorized", category: "Uncategorized", amount: 300, iconKey: "more", color: "#94a3b8" },
      { id: "cat_Rent", category: "Rent", amount: 100, iconKey: "laptop", color: "#123456" },
    ]);
  });

  test("five are listed as they are", () => {
    const five = ["A", "B", "C", "D", "E"].map((n, i) => spend(n, 10 - i));
    expect(topCategories(five)).toHaveLength(5);
  });

  test("six or more: the top four, then the rest together", () => {
    const six = ["A", "B", "C", "D", "E", "F"].map((n, i) => spend(n, 60 - i * 10));
    const result = topCategories(six);
    expect(result.map((c) => c.category)).toEqual(["A", "B", "C", "D", "2 more categories"]);
    expect(result[4].amount).toBe(30); // E (20) + F (10)
  });
});
