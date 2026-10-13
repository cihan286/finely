import { describe, expect, test } from "vitest";
import { digestHasNews, digestRange, type Digest } from "./digest";

const quiet: Digest = {
  organizationName: "Northpeak",
  currency: "USD",
  from: "2026-10-05",
  to: "2026-10-11",
  transactionCount: 0,
  moneyIn: 0,
  moneyOut: 0,
  balance: 1000,
  topCategories: [],
  overdueBills: { count: 0, amount: 0 },
  billsDueSoon: { count: 0, amount: 0 },
  overBudget: [],
  unusualCharges: [],
};

test("digestRange: the seven days before the day it's sent", () => {
  expect(digestRange("2026-10-12")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
});

describe("digestHasNews", () => {
  test("nothing happened and nothing is due: no email", () => {
    expect(digestHasNews(quiet)).toBe(false);
  });

  test("activity, bills or an exceeded budget are worth an email", () => {
    expect(digestHasNews({ ...quiet, transactionCount: 1 })).toBe(true);
    expect(digestHasNews({ ...quiet, overdueBills: { count: 1, amount: 10 } })).toBe(true);
    expect(digestHasNews({ ...quiet, billsDueSoon: { count: 1, amount: 10 } })).toBe(true);
    expect(
      digestHasNews({ ...quiet, overBudget: [{ name: "Travel", spent: 2, budget: 1 }] }),
    ).toBe(true);
  });
});
