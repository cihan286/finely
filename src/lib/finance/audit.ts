// ─────────────────────────────────────────────────────────────────────────────
// Activity log: the wording
//
// In plain words: the activity log says who changed what in a company
// ("Maya changed the amount of Office rent from $500.00 to $550.00"). Each
// line is kept as what happened (which kind of change, with its names,
// amounts and dates) rather than as finished text, so it can be written out
// in the language of whoever reads it.
//
// For developers: pure functions, unit-tested in audit.test.ts. The data
// functions describe a change as AuditDetails (lib/data/audit.ts saves it,
// with its English text for searching); renderAudit() writes it out with
// the reader's words (m) and language.
// ─────────────────────────────────────────────────────────────────────────────

import { intlLocale, fill, plural, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { currencyName } from "@/lib/finance/currencies";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ISODate } from "@/types/finance";

/** What an entry can be about (its name is in m.audit.areas) */
export const AUDIT_AREAS = [
  "transaction",
  "bill",
  "card",
  "account",
  "bank",
  "category",
  "rule",
  "attachment",
  "team",
  "settings",
] as const;
export type AuditArea = (typeof AUDIT_AREAS)[number];

export function isAuditArea(value: string): value is AuditArea {
  return (AUDIT_AREAS as readonly string[]).includes(value);
}

/** Which sentence an entry is (in m.audit.sentences) */
export type AuditKey = keyof Messages["audit"]["sentences"];
/** What changed, by name (in m.audit.fields) */
export type ChangeField = keyof Messages["audit"]["fields"];

/** One thing that may have changed: its value before and after */
export interface AuditChange {
  field: ChangeField;
  before: AuditValue;
  after: AuditValue;
}

/**
 * Something a sentence is filled in with. Text and numbers are shown as
 * they are; the rest is written in the reader's language.
 */
export type AuditValue =
  | string
  | number
  | null
  | { money: number; currency: string; signed?: boolean }
  /** "$500.00 a month" */
  | { perMonth: number; currency: string }
  | { day: ISODate }
  | { role: string }
  | { repeat: string }
  /** "income" or "expense" */
  | { kind: string }
  /** "pending" or "completed" */
  | { status: string }
  /** "EUR (Euro)" */
  | { currency: string }
  /** "3 transactions" */
  | { count: number; of: keyof Messages["audit"]["counts"] }
  /** What a bank sync brought: "1 new account, 3 transactions added" */
  | { sync: { newAccounts: number; added: number; updated: number; removed: number } }
  /** What changed: "amount from $500.00 to $550.00, …" */
  | { changes: (AuditChange | { moved: true })[] };

/** One entry, as kept: which sentence, and what fills it in */
export interface AuditDetails {
  key: AuditKey;
  values?: Record<string, AuditValue>;
}

/** Whether a list of changes has anything that really changed */
export function hasChanges(changes: (AuditChange | { moved: true })[]): boolean {
  return changes.some((c) => "moved" in c || !same(c.before, c.after));
}

// Empty text and nothing count as the same
const same = (a: AuditValue, b: AuditValue) =>
  JSON.stringify(a === "" ? null : a) === JSON.stringify(b === "" ? null : b);

/** One value in the reader's words; "" for nothing */
export function renderValue(value: AuditValue, m: Messages, locale: Locale): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if ("money" in value) {
    return formatCurrency(value.money, { signed: value.signed, currency: value.currency }, locale);
  }
  if ("perMonth" in value) {
    return fill(m.audit.perMonth, {
      amount: formatCurrency(value.perMonth, { currency: value.currency }, locale),
    });
  }
  if ("day" in value) return formatDate(value.day, locale);
  if ("role" in value) {
    const roles: Record<string, string> = m.rolesInSentence;
    return roles[value.role] ?? value.role;
  }
  if ("repeat" in value) {
    const repeats: Record<string, string> = m.bills.repeats;
    return repeats[value.repeat] ?? value.repeat;
  }
  if ("kind" in value) {
    return value.kind === "income" ? m.transactions.moneyIn : m.transactions.moneyOut;
  }
  if ("status" in value) {
    return value.status === "pending" ? m.audit.statuses.pending : m.audit.statuses.completed;
  }
  if ("currency" in value) {
    return `${value.currency} (${currencyName(value.currency, intlLocale(locale))})`;
  }
  if ("count" in value) return plural(value.count, m.audit.counts[value.of]);
  if ("sync" in value) {
    const { newAccounts, added, updated, removed } = value.sync;
    return [
      newAccounts > 0 && plural(newAccounts, m.audit.counts.newAccount),
      added > 0 &&
        fill(m.audit.sync.added, { transactions: plural(added, m.audit.counts.transaction) }),
      updated > 0 && fill(m.audit.sync.updated, { count: updated }),
      removed > 0 && fill(m.audit.sync.removed, { count: removed }),
    ]
      .filter(Boolean)
      .join(", ");
  }
  return value.changes
    .filter((c) => "moved" in c || !same(c.before, c.after))
    .map((c) =>
      "moved" in c
        ? m.audit.movedAccount
        : fill(m.audit.change, {
            field: m.audit.fields[c.field],
            before: renderValue(c.before, m, locale) || m.audit.none,
            after: renderValue(c.after, m, locale) || m.audit.none,
          }),
    )
    .join(", ");
}

/** An entry as a sentence in the reader's words */
export function renderAudit(details: AuditDetails, m: Messages, locale: Locale): string {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(details.values ?? {})) {
    values[name] = renderValue(value, m, locale);
  }
  return fill(m.audit.sentences[details.key], values);
}
