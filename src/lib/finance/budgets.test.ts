import { describe, expect, test } from "vitest";
import {
  ALL_SPENDING,
  budgetStatus,
  buildBudgets,
  monthName,
  monthStart,
  nextMonthStart,
  type BudgetSpending,
} from "./budgets";

const budget = (name: string, limit: number, spent: number): BudgetSpending => ({
  categoryId: `cat_${name}`,
  name,
  color: "#6366f1",
  iconKey: "more",
  budget: limit,
  spent,
});

describe("months", () => {
  test("name, first day and first day of the next month", () => {
    expect(monthName("2026-10-13")).toBe("October");
    expect(monthStart("2026-10-13")).toBe("2026-10-01");
    expect(nextMonthStart("2026-10-13")).toBe("2026-11-01");
    expect(nextMonthStart("2026-12-31")).toBe("2027-01-01");
  });
});

describe("budgetStatus", () => {
  test("fine below 80%, nearly used up from 80%, over above the budget", () => {
    expect(budgetStatus(0, 500)).toBe("ok");
    expect(budgetStatus(399.99, 500)).toBe("ok");
    expect(budgetStatus(400, 500)).toBe("near");
    expect(budgetStatus(500, 500)).toBe("near");
    expect(budgetStatus(500.01, 500)).toBe("over");
  });
});

describe("buildBudgets", () => {
  test("works out what's left and puts the most used up first", () => {
    const result = buildBudgets([
      budget("Travel", 1000, 100),
      budget("Marketing", 500, 620.5),
      budget("Software", 200, 180),
    ]);
    expect(result.map((b) => [b.name, b.remaining, b.status])).toEqual([
      ["Marketing", -120.5, "over"],
      ["Software", 20, "near"],
      ["Travel", 900, "ok"],
    ]);
    expect(result[0].ratio).toBeCloseTo(1.241);
  });

  test("no budgets: nothing", () => {
    expect(buildBudgets([])).toEqual([]);
  });
});

test("buildBudgets: the overall budget comes first, however little of it is used", () => {
  const budgets = buildBudgets([
    { categoryId: "cat_1", name: "Marketing", color: "#000", iconKey: "megaphone", budget: 100, spent: 150 },
    { categoryId: ALL_SPENDING, name: "All spending", color: "#000", iconKey: "receipt", budget: 1000, spent: 150 },
  ]);
  expect(budgets.map((b) => [b.name, b.status])).toEqual([
    ["All spending", "ok"],
    ["Marketing", "over"],
  ]);
});
