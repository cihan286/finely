import { describe, expect, test } from "vitest";
import {
  compactNumber,
  isValidMersis,
  isValidTaxId,
  isValidTckn,
  isValidVkn,
} from "./company-identity";

describe("VKN", () => {
  test("its last digit checks the others", () => {
    expect(isValidVkn("1234567890")).toBe(true);
    expect(isValidVkn("9876543217")).toBe(true);
    expect(isValidVkn("0000000001")).toBe(true);
    expect(isValidVkn("1234567891")).toBe(false);
    // One digit mistyped
    expect(isValidVkn("1234567809")).toBe(false);
  });

  test("exactly ten digits", () => {
    expect(isValidVkn("123456789")).toBe(false);
    expect(isValidVkn("12345678901")).toBe(false);
    expect(isValidVkn("12345678a0")).toBe(false);
  });
});

describe("TCKN", () => {
  test("its last two digits check the others", () => {
    expect(isValidTckn("10000000146")).toBe(true);
    expect(isValidTckn("10000000145")).toBe(false);
    expect(isValidTckn("10000000156")).toBe(false);
  });

  test("eleven digits, not starting with zero", () => {
    expect(isValidTckn("01000000146")).toBe(false);
    expect(isValidTckn("1000000014")).toBe(false);
  });
});

test("a tax number is checked by the company's country", () => {
  expect(isValidTaxId("1234567890", "TR")).toBe(true);
  expect(isValidTaxId("10000000146", "TR")).toBe(true);
  expect(isValidTaxId("1234567891", "TR")).toBe(false);
  // Elsewhere, letters and digits as the country writes them
  expect(isValidTaxId("DE123456789", "DE")).toBe(true);
  expect(isValidTaxId("1234567891", null)).toBe(true);
  expect(isValidTaxId("not/valid", "DE")).toBe(false);
});

test("MERSİS numbers and typed separators", () => {
  expect(isValidMersis("0123456789012345")).toBe(true);
  expect(isValidMersis("012345678901234")).toBe(false);
  expect(compactNumber(" 123 456-78.90 ")).toBe("1234567890");
});
