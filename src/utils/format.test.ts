import { describe, expect, test } from "vitest";
import {
  formatCompactCurrency,
  formatCurrency,
  getInitials,
  getMetricChange,
} from "./format";

describe("formatCurrency", () => {
  test("plain and signed", () => {
    expect(formatCurrency(2400)).toBe("$2,400.00");
    expect(formatCurrency(-15.5)).toBe("-$15.50");
    expect(formatCurrency(2400, { signed: true })).toBe("+$2,400.00");
    expect(formatCurrency(-15.5, { signed: true })).toBe("-$15.50");
  });
});

test("formatCompactCurrency", () => {
  expect(formatCompactCurrency(12400)).toBe("$12.4k");
  expect(formatCompactCurrency(3000)).toBe("$3k");
  expect(formatCompactCurrency(750)).toBe("$750");
});

test("getInitials", () => {
  expect(getInitials("Maya Carter")).toBe("MC");
  expect(getInitials("maya")).toBe("M");
  expect(getInitials("Anna Maria de Souza")).toBe("AS");
  expect(getInitials("  ")).toBe("?");
});

describe("getMetricChange", () => {
  test("percentage against the previous 30 days", () => {
    expect(getMetricChange({ value: 3000, previousValue: 2000, higherIsBetter: true })).toEqual({
      text: "+50.0% vs. previous 30 days",
      isPositive: true,
    });
  });

  test("more spending is bad", () => {
    expect(getMetricChange({ value: 1500, previousValue: 500, higherIsBetter: false })).toEqual({
      text: "+200.0% vs. previous 30 days",
      isPositive: false,
    });
  });

  test("from a negative value, improving counts as positive", () => {
    expect(getMetricChange({ value: -50, previousValue: -100, higherIsBetter: true })).toEqual({
      text: "+50.0% vs. previous 30 days",
      isPositive: true,
    });
  });

  test("no change, and nothing to compare with", () => {
    expect(getMetricChange({ value: 10, previousValue: 10, higherIsBetter: true }).text).toBe("No change");
    expect(getMetricChange({ value: 10, previousValue: 0, higherIsBetter: true }).text).toBe(
      "No activity in the previous 30 days",
    );
  });
});
