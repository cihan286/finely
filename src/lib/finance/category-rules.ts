// ─────────────────────────────────────────────────────────────────────────────
// Category rules: choosing a category from a description
//
// In plain words: a company can say "anything with AWS in its description is
// Software & IT". This decides which rule, if any, applies to a transaction's
// description. Upper/lower case and extra spaces don't matter, the text can
// sit anywhere in the description, and when several rules fit, the one with
// the longest text wins — "amazon web services" beats "amazon".
//
// For developers: pure functions, unit-tested in category-rules.test.ts. The
// rules are stored in the category_rule table (db/finance.ts).
// ─────────────────────────────────────────────────────────────────────────────

/** A rule's text must be at least this long: "a" would match almost anything */
export const MIN_RULE_TEXT_LENGTH = 2;
/** Descriptions are at most this long, so longer text could never match */
export const MAX_RULE_TEXT_LENGTH = 120;

/** What matching needs to know about a rule */
export interface CategoryRuleMatch {
  /** The text to look for in a description */
  matchText: string;
  categoryId: string;
}

/**
 * Text as rules compare it: lower case, without spaces around it, and with
 * runs of spaces collapsed ("  AWS   Inc " -> "aws inc").
 */
export function normalizeRuleText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The rule that applies to a description, or null if none does. With several
 * candidates the longest text wins; between equally long ones, the first in
 * the list.
 */
export function matchCategoryRule<T extends CategoryRuleMatch>(
  description: string,
  rules: readonly T[],
): T | null {
  const haystack = normalizeRuleText(description);
  let best: T | null = null;
  let bestLength = 0;
  for (const rule of rules) {
    const needle = normalizeRuleText(rule.matchText);
    // An empty text is "in" every description; it should match none
    if (needle.length > bestLength && haystack.includes(needle)) {
      best = rule;
      bestLength = needle.length;
    }
  }
  return best;
}

/** The category a description gets from the rules, or null */
export function categoryFromRules(
  description: string,
  rules: readonly CategoryRuleMatch[],
): string | null {
  return matchCategoryRule(description, rules)?.categoryId ?? null;
}
