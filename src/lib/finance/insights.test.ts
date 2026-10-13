import { describe, expect, test } from "vitest";
import {
  buildInsights,
  findUnusualCharges,
  insightRange,
  type ExpenseLine,
} from "./insights";

describe("insightRange", () => {
  test("the period ends with the current month", () => {
    expect(insightRange("2026-10-06", 3)).toEqual({
      months: ["2026-08", "2026-09", "2026-10"],
      start: "2026-08-01",
      end: "2026-10-07",
      recentStart: "2026-09-07",
      historyStart: "2026-03-11",
    });
  });

  test("12 months reach back across the year", () => {
    const { months, start } = insightRange("2026-02-15", 12);
    expect(months[0]).toBe("2025-03");
    expect(months.at(-1)).toBe("2026-02");
    expect(start).toBe("2025-03-01");
  });
});

describe("buildInsights", () => {
  const insights = buildInsights({
    today: "2026-10-06",
    period: 3,
    monthly: [
      { month: "2026-08", income: 5000, expenses: 3000 },
      { month: "2026-10", income: 1000, expenses: 500 },
      // Outside the period: ignored
      { month: "2026-07", income: 9999, expenses: 9999 },
    ],
    categorySpending: [],
    vendors: [
      { name: "AWS", count: 3, amount: 300 },
      { name: "Rent", count: 3, amount: 3600 },
      { name: "Figma", count: 3, amount: 100 },
    ],
    expenses: [],
  });

  test("one entry per month, missing months are zero, the current one is partial", () => {
    expect(insights.monthly).toEqual([
      { month: "2026-08", label: "Aug", income: 5000, expenses: 3000, partial: false },
      { month: "2026-09", label: "Sep", income: 0, expenses: 0, partial: false },
      { month: "2026-10", label: "Oct", income: 1000, expenses: 500, partial: true },
    ]);
  });

  test("totals and savings rate for the period", () => {
    expect(insights.totals).toEqual({
      income: 6000,
      expenses: 3500,
      net: 2500,
      savingsRate: 2500 / 6000,
    });
  });

  test("vendors largest first, with their share", () => {
    expect(insights.vendors.map((v) => [v.name, v.share])).toEqual([
      ["Rent", 0.9],
      ["AWS", 0.075],
      ["Figma", 0.025],
    ]);
  });

  test("descriptions that differ only by a reference number are one vendor", () => {
    const { vendors } = buildInsights({
      today: "2026-10-06",
      period: 3,
      monthly: [],
      categorySpending: [],
      vendors: [
        { name: "STRIPE ST-ABC1", count: 1, amount: 40 },
        { name: "Rent", count: 1, amount: 50 },
        { name: "stripe ST-XYZ2", count: 2, amount: 60 },
      ],
      expenses: [],
    });
    expect(vendors).toEqual([
      { name: "STRIPE", count: 3, amount: 100, share: 100 / 150 },
      { name: "Rent", count: 1, amount: 50, share: 50 / 150 },
    ]);
  });

  test("no income: no savings rate", () => {
    const empty = buildInsights({
      today: "2026-10-06",
      period: 3,
      monthly: [],
      categorySpending: [],
      vendors: [],
      expenses: [],
    });
    expect(empty.totals.savingsRate).toBeNull();
    expect(empty.vendors).toEqual([]);
  });
});

describe("findUnusualCharges", () => {
  let id = 0;
  const charge = (name: string, amount: number, day: string): ExpenseLine => ({
    id: `tx_${++id}`,
    name,
    amount: -amount,
    day,
  });
  const today = "2026-10-06";
  const history = [
    charge("AWS", 240, "2026-07-01"),
    charge("aws", 250, "2026-08-01"),
    charge("AWS ", 250, "2026-09-01"),
  ];

  test("flags a recent charge well above the vendor's usual", () => {
    const result = findUnusualCharges([...history, charge("AWS", 400, "2026-10-01")], today);
    expect(result).toEqual([
      {
        id: expect.any(String),
        name: "AWS",
        day: "2026-10-01",
        amount: 400,
        usual: 246.67,
        percentAbove: 62,
      },
    ]);
  });

  test("ignores normal charges and small absolute differences", () => {
    expect(findUnusualCharges([...history, charge("AWS", 300, "2026-10-01")], today)).toEqual([]);
    const coffee = [charge("Coffee", 4, "2026-08-01"), charge("Coffee", 4, "2026-09-01")];
    // 3x the usual, but only $8 more
    expect(findUnusualCharges([...coffee, charge("Coffee", 12, "2026-10-01")], today)).toEqual([]);
  });

  test("needs at least two earlier charges, within the half year before", () => {
    const once = [charge("Hotel", 100, "2026-09-01")];
    expect(findUnusualCharges([...once, charge("Hotel", 500, "2026-10-01")], today)).toEqual([]);
    const tooOld = [charge("Hotel", 100, "2025-01-01"), charge("Hotel", 100, "2025-02-01")];
    expect(findUnusualCharges([...tooOld, charge("Hotel", 500, "2026-10-01")], today)).toEqual([]);
  });

  test("compares charges whose descriptions differ only by a reference number", () => {
    const stripe = [
      charge("STRIPE ST-ABC1", 100, "2026-08-01"),
      charge("STRIPE ST-DEF2", 100, "2026-09-01"),
    ];
    const result = findUnusualCharges([...stripe, charge("STRIPE ST-XYZ3", 300, "2026-10-01")], today);
    expect(result.map((c) => [c.name, c.usual])).toEqual([["STRIPE ST-XYZ3", 100]]);
  });

  test("only charges from the last 30 days are checked", () => {
    expect(findUnusualCharges([...history, charge("AWS", 900, "2026-09-06")], today)).toEqual([]);
  });
});
