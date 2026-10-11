import { describe, expect, test } from "vitest";
import {
  categoryFromRules,
  matchCategoryRule,
  normalizeRuleText,
} from "./category-rules";

const rules = [
  { matchText: "amazon", categoryId: "cat_office" },
  { matchText: "amazon web services", categoryId: "cat_software" },
  { matchText: "Stripe", categoryId: "cat_sales" },
];

describe("normalizeRuleText", () => {
  test.each([
    ["AWS", "aws"],
    ["  AWS   Inc ", "aws inc"],
    ["Google\tWorkspace\n", "google workspace"],
    ["   ", ""],
  ])("%j -> %j", (text, expected) => {
    expect(normalizeRuleText(text)).toBe(expected);
  });
});

describe("matchCategoryRule", () => {
  test("finds the text anywhere in the description", () => {
    expect(categoryFromRules("POS 4471 AMAZON MKTP US", rules)).toBe("cat_office");
  });

  test("ignores upper/lower case and extra spaces", () => {
    expect(categoryFromRules("stripe payout", rules)).toBe("cat_sales");
    expect(categoryFromRules("AMAZON   WEB  SERVICES", rules)).toBe("cat_software");
    expect(
      categoryFromRules("aws emea", [{ matchText: "  AWS  ", categoryId: "cat_software" }]),
    ).toBe("cat_software");
  });

  test("prefers the longest text when several rules fit", () => {
    expect(categoryFromRules("Amazon Web Services EMEA", rules)).toBe("cat_software");
    // Whatever order the rules come in
    expect(categoryFromRules("Amazon Web Services EMEA", [...rules].reverse())).toBe(
      "cat_software",
    );
  });

  test("prefers the first of equally long texts", () => {
    const tied = [
      { matchText: "rent", categoryId: "cat_first" },
      { matchText: "paid", categoryId: "cat_second" },
    ];
    expect(categoryFromRules("Rent paid", tied)).toBe("cat_first");
  });

  test("returns the whole rule, so callers can tell which one applied", () => {
    const withIds = rules.map((rule, i) => ({ ...rule, id: `rule_${i}` }));
    expect(matchCategoryRule("Stripe fee", withIds)?.id).toBe("rule_2");
  });

  test("matches nothing when no rule fits", () => {
    expect(categoryFromRules("Office rent", rules)).toBeNull();
    expect(categoryFromRules("Office rent", [])).toBeNull();
    expect(matchCategoryRule("Office rent", rules)).toBeNull();
  });

  test("an empty text matches nothing", () => {
    expect(categoryFromRules("Office rent", [{ matchText: "  ", categoryId: "cat_x" }])).toBeNull();
  });
});
