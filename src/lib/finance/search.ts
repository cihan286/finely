// ─────────────────────────────────────────────────────────────────────────────
// Searching transactions: is it an amount?
//
// In plain words: the search box looks through descriptions, notes and
// category names. If what was typed is a number ("45", "$1,234.50", "-80"),
// it also finds transactions of exactly that amount, whether money in or
// out.
//
// For developers: a pure function, unit-tested in search.test.ts. Used by
// lib/data/transactions.ts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The amount a search text stands for (always positive), or null if it
 * isn't one. Accepts a currency sign, a minus and thousands separators.
 */
export function amountFromSearch(text: string): number | null {
  const cleaned = text.trim().replace(/^[-+]?\s*[$€£₺¥]?\s*/, "").replace(/,(?=\d{3}\b)/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  // More than a money column can hold: not an amount we could have
  return amount > 0 && amount < 1e12 ? amount : null;
}
