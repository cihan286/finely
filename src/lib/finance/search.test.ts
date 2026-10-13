import { expect, test } from "vitest";
import { amountFromSearch } from "./search";

test("amountFromSearch: numbers, with or without sign, currency and separators", () => {
  expect(amountFromSearch("45")).toBe(45);
  expect(amountFromSearch(" 45.5 ")).toBe(45.5);
  expect(amountFromSearch("$1,234.50")).toBe(1234.5);
  expect(amountFromSearch("-80")).toBe(80);
  expect(amountFromSearch("- $80.00")).toBe(80);
  expect(amountFromSearch("€12")).toBe(12);
});

test("amountFromSearch: anything else isn't an amount", () => {
  expect(amountFromSearch("AWS")).toBeNull();
  expect(amountFromSearch("365 Office")).toBeNull();
  expect(amountFromSearch("12.345")).toBeNull();
  expect(amountFromSearch("1,23")).toBeNull();
  expect(amountFromSearch("0")).toBeNull();
  expect(amountFromSearch("")).toBeNull();
});
