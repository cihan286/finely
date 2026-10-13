// ─────────────────────────────────────────────────────────────────────────────
// Activity log: the wording
//
// In plain words: the activity log says who changed what in a company
// ("Maya changed the amount of Office rent from $500.00 to $550.00"). This
// file holds the kinds of things it can be about, and writes the part of a
// sentence that says what changed.
//
// For developers: pure functions, unit-tested in audit.test.ts. The entries
// are written by lib/data/audit.ts from the data functions.
// ─────────────────────────────────────────────────────────────────────────────

/** What an entry can be about, with the name shown in the filter */
export const AUDIT_AREAS = {
  transaction: "Transactions",
  bill: "Bills",
  card: "Cards",
  account: "Bank accounts",
  bank: "Bank connections",
  category: "Categories & budgets",
  rule: "Category rules",
  attachment: "Attachments",
  team: "Team",
  settings: "Company settings",
} as const;
export type AuditArea = keyof typeof AUDIT_AREAS;

/** One thing that may have changed: its name, and its value before and after */
export interface Change {
  label: string;
  before: string | null;
  after: string | null;
}

/**
 * The changes that really are changes, as text: "amount from $500.00 to
 * $550.00, category from none to Rent". "" when nothing changed.
 */
export function describeChanges(changes: Change[]): string {
  return changes
    .filter((c) => (c.before ?? "") !== (c.after ?? ""))
    .map((c) => `${c.label} from ${c.before || "none"} to ${c.after || "none"}`)
    .join(", ");
}

/** 1 -> "1 transaction", 3 -> "3 transactions" */
export function countOf(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
