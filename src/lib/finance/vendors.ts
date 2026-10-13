// ─────────────────────────────────────────────────────────────────────────────
// Vendors: who a payment went to
//
// In plain words: banks often add a reference number to a description, so
// two payments to the same company read "STRIPE ST-ABC1" and "STRIPE
// ST-XYZ2". This removes those changing parts, so both count as "STRIPE"
// on the Insights page.
//
// For developers: pure functions, unit-tested in vendors.test.ts. A word is
// dropped when it looks like a reference: a date, a "#…" number, a mix of
// letters and digits, or four or more digits. The first word always stays
// ("7-Eleven"), and so do short numbers ("Office 365", "Studio 24").
// ─────────────────────────────────────────────────────────────────────────────

const DATE = /^\d{1,4}[/.-]\d{1,2}([/.-]\d{1,4})?$/;

// Whether a word of a description is a reference rather than part of a name
function isReference(word: string): boolean {
  if (!/\d/.test(word)) return false;
  if (word.startsWith("#") || DATE.test(word)) return true;
  return /\p{L}/u.test(word) || word.replace(/\D/g, "").length >= 4;
}

/** "STRIPE  ST-ABC1" -> "STRIPE": the description without reference numbers */
export function vendorName(description: string): string {
  const words = description.trim().split(/\s+/);
  const kept = words.filter((word, i) => i === 0 || !isReference(word));
  return kept.join(" ");
}

/** What two descriptions of the same vendor have in common, ignoring case */
export function vendorKey(description: string): string {
  return vendorName(description).toLowerCase();
}

// "FIGMA, INC. INV-1004" -> ["figma", "inc"]: the vendor's words, without
// references and without the punctuation around them
function vendorWords(description: string): string[] {
  return vendorKey(description)
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

/**
 * Whether two descriptions name the same vendor, for telling that a bank's
 * line is the payment of a bill someone named themselves: the shorter one's
 * words appear in a row in the longer one ("Figma" and "FIGMA INC DUBLIN",
 * "Office rent" and "OFFICE RENT OCTOBER"). Too little to go by (under
 * three letters) is never a match.
 */
export function sameVendor(a: string, b: string): boolean {
  const wordsA = vendorWords(a);
  const wordsB = vendorWords(b);
  const [short, long] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];
  if (short.join("").length < 3) return false;
  return long.some((_, start) => short.every((word, i) => long[start + i] === word));
}
