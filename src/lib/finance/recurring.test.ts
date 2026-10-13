import { describe, expect, test } from "vitest";
import { billKey, detectRecurring, type HistoryLine } from "./recurring";

const today = "2026-10-13";
const line = (name: string, amount: number, day: string): HistoryLine => ({
  name,
  amount,
  day,
  categoryId: null,
});

describe("detectRecurring", () => {
  test("spots a monthly subscription and expects the next one a month later", () => {
    const result = detectRecurring(
      [
        line("FIGMA INV-1001", -45, "2026-07-03"),
        line("FIGMA INV-1002", -45, "2026-08-03"),
        line("FIGMA INV-1003", -45, "2026-09-04"),
        line("FIGMA INV-1004", -45, "2026-10-03"),
      ],
      today,
    );
    expect(result).toEqual([
      {
        key: "out:figma",
        name: "FIGMA",
        direction: "out",
        cadence: "monthly",
        amount: 45,
        variable: false,
        monthlyAmount: 45,
        count: 4,
        lastDay: "2026-10-03",
        nextDay: "2026-11-03",
        categoryId: null,
      },
    ]);
  });

  test("spots a yearly payment from two payments of about the same amount", () => {
    const result = detectRecurring(
      [
        line("ACME INSURANCE POL-2024", -1200, "2024-11-02"),
        line("ACME INSURANCE POL-2025", -1260, "2025-11-03"),
      ],
      today,
    );
    expect(result).toMatchObject([
      {
        name: "ACME INSURANCE",
        cadence: "yearly",
        amount: 1230,
        monthlyAmount: 102.5,
        count: 2,
        nextDay: "2026-11-03",
      },
    ]);
  });

  test("two purchases a year apart for different amounts aren't a yearly payment", () => {
    expect(
      detectRecurring(
        [line("APPLE STORE", -1999, "2024-11-02"), line("APPLE STORE", -129, "2025-11-03")],
        today,
      ),
    ).toEqual([]);
  });

  test("a yearly payment that didn't come back is dropped", () => {
    expect(
      detectRecurring(
        [line("DOMAIN CO", -20, "2024-08-01"), line("DOMAIN CO", -20, "2025-08-01")],
        today,
      ),
    ).toEqual([]);
  });

  test("a monthly rhythm isn't hidden by how it was paid two years ago", () => {
    const result = detectRecurring(
      [
        line("FIGMA", -45, "2024-09-01"),
        line("FIGMA", -45, "2024-09-20"),
        line("FIGMA", -45, "2024-11-11"),
        line("FIGMA", -45, "2026-07-03"),
        line("FIGMA", -45, "2026-08-03"),
        line("FIGMA", -45, "2026-09-04"),
        line("FIGMA", -45, "2026-10-03"),
      ],
      today,
    );
    expect(result).toMatchObject([{ cadence: "monthly", count: 4 }]);
  });

  test("payroll every two weeks: several payments on one day count as one", () => {
    const paydays = ["2026-08-21", "2026-09-04", "2026-09-18", "2026-10-02"];
    const result = detectRecurring(
      paydays.flatMap((day) => [line("Payroll", -3000, day), line("Payroll", -2500, day)]),
      today,
    );
    expect(result.map((r) => [r.cadence, r.amount, r.count, r.nextDay, r.monthlyAmount])).toEqual([
      ["biweekly", 5500, 4, "2026-10-16", 11916.67],
    ]);
  });

  test("weekly and quarterly rhythms, and regular income", () => {
    const result = detectRecurring(
      [
        line("Cleaning", -80, "2026-09-21"),
        line("Cleaning", -80, "2026-09-28"),
        line("Cleaning", -80, "2026-10-05"),
        line("Cleaning", -80, "2026-10-12"),
        line("Insurance", -900, "2026-01-15"),
        line("Insurance", -900, "2026-04-15"),
        line("Insurance", -900, "2026-07-15"),
        line("Acme retainer", 4000, "2026-08-01"),
        line("Acme retainer", 4000, "2026-09-01"),
        line("Acme retainer", 4000, "2026-10-01"),
      ],
      today,
    );
    expect(result.map((r) => [r.name, r.direction, r.cadence, r.nextDay])).toEqual([
      ["Acme retainer", "in", "monthly", "2026-11-01"],
      ["Cleaning", "out", "weekly", "2026-10-19"],
      ["Insurance", "out", "quarterly", "2026-10-15"],
    ]);
  });

  test("an amount that changes is marked, and the latest ones decide the usual", () => {
    const [aws] = detectRecurring(
      [
        line("AWS", -200, "2026-06-01"),
        line("AWS", -240, "2026-07-01"),
        line("AWS", -260, "2026-08-01"),
        line("AWS", -300, "2026-09-01"),
        line("AWS", -280, "2026-10-01"),
      ],
      today,
    );
    expect(aws.variable).toBe(true);
    expect(aws.amount).toBe(280);
  });

  test("needs three payments and a steady rhythm", () => {
    expect(
      detectRecurring(
        [line("Hotel", -300, "2026-09-01"), line("Hotel", -300, "2026-10-01")],
        today,
      ),
    ).toEqual([]);
    expect(
      detectRecurring(
        [
          line("Uber", -20, "2026-09-01"),
          line("Uber", -35, "2026-09-03"),
          line("Uber", -18, "2026-09-20"),
          line("Uber", -40, "2026-10-09"),
        ],
        today,
      ),
    ).toEqual([]);
  });

  test("one skipped or shifted payment doesn't break a long rhythm", () => {
    const days = ["2026-04-01", "2026-05-01", "2026-06-01", "2026-08-01", "2026-09-01", "2026-10-01"];
    const result = detectRecurring(days.map((day) => line("Rent", -2000, day)), today);
    expect(result.map((r) => r.cadence)).toEqual(["monthly"]);
  });

  test("a payment that stopped coming is left out", () => {
    const result = detectRecurring(
      [
        line("Old tool", -30, "2026-03-01"),
        line("Old tool", -30, "2026-04-01"),
        line("Old tool", -30, "2026-05-01"),
      ],
      today,
    );
    expect(result).toEqual([]);
  });

  test("a few days late is still expected", () => {
    const [rent] = detectRecurring(
      [
        line("Rent", -2000, "2026-07-08"),
        line("Rent", -2000, "2026-08-08"),
        line("Rent", -2000, "2026-09-08"),
      ],
      today,
    );
    expect(rent.nextDay).toBe("2026-10-08");
  });

  test("money in and money out with one name are separate", () => {
    const result = detectRecurring(
      ["2026-08-01", "2026-09-01", "2026-10-01"].flatMap((day) => [
        line("Stripe", 500, day),
        line("Stripe", -25, day),
      ]),
      today,
    );
    expect(result.map((r) => [r.key, r.amount])).toEqual([
      ["in:stripe", 500],
      ["out:stripe", 25],
    ]);
  });
});

describe("billKey", () => {
  test("matches a regular payment's key, whatever the reference number", () => {
    expect(billKey("Figma INV-2001")).toBe("out:figma");
  });
});
