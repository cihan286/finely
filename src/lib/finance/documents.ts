// ─────────────────────────────────────────────────────────────────────────────
// Business documents: their kinds, their life and their numbers
//
// In plain words: invoices, quotes, orders, delivery notes and journal
// entries are all "documents", and they all live the same way:
//
//   draft      being prepared; can be changed or thrown away, and has no
//              number yet
//   approved   final: it gets the next number of its series, counts in the
//              books, and can no longer be changed
//   cancelled  undone by a reversing entry; it keeps its number, so the
//              numbers never have a gap
//
// Numbers follow the Turkish e-invoice format: three letters or digits
// for the series, the year, then a nine-digit count that starts again each
// year: "FTR2026000000001".
//
// For developers: pure functions, usable anywhere. Taking the next number
// (atomically, per company, series and year) is in
// lib/data/document-numbers.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Every kind of document, with the series prefix it starts with */
export const DOCUMENT_TYPES = {
  salesInvoice: "FTR",
  purchaseInvoice: "ALF",
  quote: "TKL",
  salesOrder: "SSP",
  purchaseOrder: "ASP",
  deliveryNote: "IRS",
  goodsReceipt: "MKB",
  journalEntry: "YEV",
} as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && Object.hasOwn(DOCUMENT_TYPES, value);
}

export const DOCUMENT_STATUSES = ["draft", "approved", "cancelled"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

// Where each status can go next. Nothing comes back from "cancelled", and
// an approved document is never a draft again: it's cancelled and made anew.
const NEXT: Record<DocumentStatus, readonly DocumentStatus[]> = {
  draft: ["approved"],
  approved: ["cancelled"],
  cancelled: [],
};

/** Whether a document may go from one status to another */
export function canMoveTo(from: DocumentStatus, to: DocumentStatus): boolean {
  return NEXT[from].includes(to);
}

/** Whether a document in this status can still be changed or thrown away */
export function isEditable(status: DocumentStatus): boolean {
  return status === "draft";
}

/** How a series prefix must look: three capital letters or digits */
export const PREFIX_PATTERN = /^[A-Z0-9]{3}$/;

/** Digits of the count in a number (the e-invoice format's nine) */
export const COUNT_DIGITS = 9;

/** "FTR", 2026, 1 → "FTR2026000000001" */
export function formatDocumentNumber(prefix: string, year: number, count: number): string {
  if (!PREFIX_PATTERN.test(prefix)) throw new Error(`Invalid series prefix: ${prefix}`);
  if (!Number.isInteger(count) || count < 1 || count >= 10 ** COUNT_DIGITS) {
    throw new Error(`Document count out of range: ${count}`);
  }
  return `${prefix}${year}${String(count).padStart(COUNT_DIGITS, "0")}`;
}
