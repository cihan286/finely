import { describe, expect, test } from "vitest";
import { buildForecast } from "./forecast";
import type { RecurringPayment } from "./recurring";

const today = "2026-10-13";

const regular = (overrides: Partial<RecurringPayment>): RecurringPayment => ({
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
  ...overrides,
});

describe("buildForecast", () => {
  test("counts pending payments, late ones today, and skips ones after the 30 days", () => {
    const forecast = buildForecast({
      today,
      balance: 1000,
      bills: [],
      pending: [
        { name: "Laptop", amount: -1500, day: "2026-10-09" },
        { name: "Invoice 12", amount: 800, day: "2026-10-20" },
        { name: "Far off", amount: -50, day: "2026-12-01" },
      ],
      recurring: [],
    });
    expect(forecast.events).toEqual([
      { day: today, name: "Laptop", amount: -1500, source: "pending", estimated: false },
      { day: "2026-10-20", name: "Invoice 12", amount: 800, source: "pending", estimated: false },
    ]);
    expect(forecast.lowest).toEqual({ balance: -500, day: today });
    expect(forecast.endBalance).toBe(300);
  });

  test("nothing expected: the balance stays where it is", () => {
    const forecast = buildForecast({ today, balance: 1000, bills: [], recurring: [] });
    expect(forecast).toEqual({
      today,
      until: "2026-11-12",
      startBalance: 1000,
      endBalance: 1000,
      lowest: { balance: 1000, day: today },
      moneyIn: 0,
      moneyOut: 0,
      events: [],
    });
  });

  test("adds bills and regular payments in order, and finds the lowest point", () => {
    const forecast = buildForecast({
      today,
      balance: 1000,
      bills: [{ name: "Rent", amount: 1200, dueDate: "2026-10-20", repeat: "none" }],
      recurring: [
        regular({}),
        regular({
          key: "in:acme",
          name: "Acme retainer",
          direction: "in",
          amount: 4000,
          nextDay: "2026-11-01",
        }),
      ],
    });
    expect(forecast.events.map((e) => [e.day, e.name, e.amount, e.source])).toEqual([
      ["2026-10-20", "Rent", -1200, "bill"],
      ["2026-11-01", "Acme retainer", 4000, "recurring"],
      ["2026-11-03", "Figma", -45, "recurring"],
    ]);
    expect(forecast.lowest).toEqual({ balance: -200, day: "2026-10-20" });
    expect(forecast.endBalance).toBe(3755);
    expect(forecast.moneyIn).toBe(4000);
    expect(forecast.moneyOut).toBe(1245);
  });

  test("an overdue bill and a late regular payment are expected today", () => {
    const forecast = buildForecast({
      today,
      balance: 500,
      bills: [{ name: "Late invoice", amount: 100, dueDate: "2026-10-01", repeat: "none" }],
      recurring: [regular({ nextDay: "2026-10-10" })],
    });
    // …and the regular payment again a month after it was due
    expect(forecast.events.map((e) => e.day)).toEqual([today, today, "2026-11-10"]);
    expect(forecast.endBalance).toBe(310);
  });

  test("what comes back within the 30 days is counted each time", () => {
    const forecast = buildForecast({
      today,
      balance: 0,
      bills: [{ name: "Cleaning", amount: 80, dueDate: "2026-10-15", repeat: "biweekly" }],
      recurring: [regular({ key: "out:coffee", name: "Coffee", cadence: "weekly", amount: 10, nextDay: "2026-10-16" })],
    });
    expect(forecast.events.filter((e) => e.name === "Cleaning").map((e) => e.day)).toEqual([
      "2026-10-15",
      "2026-10-29",
      "2026-11-12",
    ]);
    expect(forecast.events.filter((e) => e.name === "Coffee")).toHaveLength(4);
  });

  test("a regular payment that's already a bill is counted once", () => {
    const forecast = buildForecast({
      today,
      balance: 0,
      bills: [{ name: "Figma INV-9", amount: 45, dueDate: "2026-11-03", repeat: "monthly" }],
      recurring: [regular({})],
    });
    expect(forecast.events.map((e) => e.source)).toEqual(["bill"]);
  });

  test("nothing beyond 30 days, and a varying amount is marked as an estimate", () => {
    const forecast = buildForecast({
      today,
      balance: 0,
      bills: [{ name: "Far", amount: 1, dueDate: "2026-11-13", repeat: "none" }],
      recurring: [regular({ variable: true, nextDay: "2026-11-12" })],
    });
    expect(forecast.events.map((e) => [e.name, e.estimated])).toEqual([["Figma", true]]);
  });

  test("on one day, money out comes first", () => {
    const forecast = buildForecast({
      today,
      balance: 100,
      bills: [{ name: "Rent", amount: 300, dueDate: "2026-10-20", repeat: "none" }],
      recurring: [regular({ key: "in:acme", name: "Acme", direction: "in", amount: 500, nextDay: "2026-10-20" })],
    });
    expect(forecast.lowest).toEqual({ balance: -200, day: "2026-10-20" });
    expect(forecast.endBalance).toBe(300);
  });
});
