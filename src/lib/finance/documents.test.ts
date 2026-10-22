import { expect, test } from "vitest";
import {
  canMoveTo,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  formatDocumentNumber,
  isDocumentType,
  isEditable,
  PREFIX_PATTERN,
} from "./documents";

test("a document is drafted, approved, then perhaps cancelled; never back", () => {
  const allowed = DOCUMENT_STATUSES.flatMap((from) =>
    DOCUMENT_STATUSES.filter((to) => canMoveTo(from, to)).map((to) => `${from} → ${to}`),
  );
  expect(allowed).toEqual(["draft → approved", "approved → cancelled"]);
  expect(DOCUMENT_STATUSES.filter(isEditable)).toEqual(["draft"]);
});

test("numbers follow the e-invoice format", () => {
  expect(formatDocumentNumber("FTR", 2026, 1)).toBe("FTR2026000000001");
  expect(formatDocumentNumber("A1B", 2027, 123_456_789)).toBe("A1B2027123456789");
  expect(formatDocumentNumber("FTR", 2026, 1)).toHaveLength(16);
  expect(() => formatDocumentNumber("ftr", 2026, 1)).toThrow();
  expect(() => formatDocumentNumber("FTRX", 2026, 1)).toThrow();
  expect(() => formatDocumentNumber("FTR", 2026, 0)).toThrow();
  expect(() => formatDocumentNumber("FTR", 2026, 1_000_000_000)).toThrow();
});

test("every kind of document starts with a valid, different prefix", () => {
  const prefixes = Object.values(DOCUMENT_TYPES);
  expect(prefixes.every((p) => PREFIX_PATTERN.test(p))).toBe(true);
  expect(new Set(prefixes).size).toBe(prefixes.length);
  expect(isDocumentType("salesInvoice")).toBe(true);
  expect(isDocumentType("toString")).toBe(false);
});
