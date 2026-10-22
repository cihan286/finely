import { describe, expect, test } from "vitest";
import {
  addMoney,
  multiplyMoney,
  roundMoney,
  sameAmount,
  subtractMoney,
  sumMoney,
  toCents,
} from "./money";

describe("roundMoney", () => {
  test("half a cent goes away from zero", () => {
    // Math.round(1.005 * 100) / 100 gives 1 and Math.round(-0.125 * 100) / 100
    // gives -0.12: the bugs these helpers exist for
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(0.125)).toBe(0.13);
    expect(roundMoney(-0.125)).toBe(-0.13);
    expect(roundMoney(2.344)).toBe(2.34);
  });

  test("other numbers of places, and Postgres strings", () => {
    expect(roundMoney(1234.5, 0)).toBe(1235);
    expect(roundMoney("12.30")).toBe(12.3);
    expect(roundMoney("-0.004")).toBe(0);
  });
});

describe("sums and differences", () => {
  test("exact to the cent", () => {
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
    expect(sumMoney(Array.from({ length: 1000 }, () => 0.01))).toBe(10);
    expect(sumMoney([])).toBe(0);
    expect(subtractMoney(0.3, 0.1)).toBe(0.2);
    expect(subtractMoney("100.10", 100)).toBe(0.1);
  });

  test("large amounts stay exact", () => {
    expect(addMoney(999_999_999_999.98, 0.01)).toBe(999_999_999_999.99);
    expect(subtractMoney(999_999_999_999.99, 0.01)).toBe(999_999_999_999.98);
  });
});

test("multiplyMoney rounds the result once", () => {
  expect(multiplyMoney(19.99, 3)).toBe(59.97);
  expect(multiplyMoney(1.15, 3)).toBe(3.45);
  // Weekly payments in a month (52 / 12 weeks)
  expect(multiplyMoney(100, 52 / 12)).toBe(433.33);
  expect(multiplyMoney(10, 0.185)).toBe(1.85);
});

test("toCents and sameAmount", () => {
  expect(toCents(12.3)).toBe(1230);
  expect(toCents(1.005)).toBe(101);
  expect(toCents(-4.35)).toBe(-435);
  expect(sameAmount(4.35, "4.350")).toBe(true);
  expect(sameAmount(0.1 + 0.2, 0.3)).toBe(true);
  expect(sameAmount(4.35, 4.36)).toBe(false);
});
