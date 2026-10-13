import { describe, expect, test } from "vitest";
import { countOf, describeChanges } from "./audit";

describe("describeChanges", () => {
  test("lists only what changed", () => {
    expect(
      describeChanges([
        { label: "amount", before: "$500.00", after: "$550.00" },
        { label: "date", before: "Oct 1, 2026", after: "Oct 1, 2026" },
        { label: "category", before: null, after: "Rent" },
        { label: "notes", before: "Paid late", after: "" },
      ]),
    ).toBe("amount from $500.00 to $550.00, category from none to Rent, notes from Paid late to none");
  });

  test("nothing changed: nothing to say", () => {
    expect(describeChanges([{ label: "amount", before: "$1.00", after: "$1.00" }])).toBe("");
    expect(describeChanges([{ label: "notes", before: null, after: "" }])).toBe("");
  });
});

test("countOf", () => {
  expect(countOf(1, "transaction")).toBe("1 transaction");
  expect(countOf(3, "transaction")).toBe("3 transactions");
  expect(countOf(2, "category", "categories")).toBe("2 categories");
});
