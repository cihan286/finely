// ─────────────────────────────────────────────────────────────────────────────
// Linked banks: deciding what to do with what the bank reports
//
// In plain words: when a linked bank reports its accounts and what changed
// since last time, this decides which accounts Finely can keep (everyday
// and savings accounts in the company's currency), and for every reported payment
// whether it's new, a change to one we already have, or the booked version
// of one that was pending before.
//
// For developers: pure functions, unit-tested in bank-sync.test.ts. The
// database work is in lib/data/bank.ts. Running the same changes twice
// gives the same result (the bank service may repeat itself).
// ─────────────────────────────────────────────────────────────────────────────

import type { BankAccount, BankChanges, BankTransaction } from "@/lib/bank/types";
import type { AccountType } from "@/types/finance";

/**
 * The kind of Finely account a bank account becomes, or null for accounts
 * Finely can't keep yet: credit cards, loans and investments (their
 * "balance" is money owed or invested, not money in the bank) and
 * accounts in another currency than the company's (nothing is converted).
 */
export function finelyAccountType(
  account: BankAccount,
  /** The company's currency, e.g. "USD" */
  currency = "USD",
): AccountType | null {
  if (account.type !== "depository") return null;
  if (account.currency !== null && account.currency !== currency) return null;
  const saving = ["savings", "money market", "cd"].includes(account.subtype ?? "");
  return saving ? "savings" : "checking";
}

/** "1234" for a four-digit mask; anything else isn't kept */
export function last4From(mask: string | null): string | null {
  return mask !== null && /^\d{4}$/.test(mask) ? mask : null;
}

/** What to do with the reported changes */
export interface SyncPlan {
  /** Payments we don't have yet */
  insert: BankTransaction[];
  /**
   * Payments we have, with their new details. `currentExternalId` is the ID
   * it's stored under now (the pending one's, when it got booked).
   */
  update: (BankTransaction & { currentExternalId: string })[];
  /** IDs of payments that no longer exist at the bank */
  remove: string[];
}

/**
 * Sorts the bank's changes into what to add, change and delete, given the
 * IDs we already have. Payments of accounts Finely doesn't keep are left
 * out.
 */
export function planSync(
  changes: Pick<BankChanges, "added" | "modified" | "removed">,
  /** The bank IDs of the transactions we already have */
  known: Set<string>,
  /** The bank IDs of the accounts Finely keeps */
  accounts: Set<string>,
): SyncPlan {
  const plan: SyncPlan = { insert: [], update: [], remove: [] };
  // What each stored ID will be called after this sync, and what's new
  const have = new Set(known);
  const planned = new Set<string>();

  // The same payment can be reported more than once: the last word counts
  const latest = new Map<string, BankTransaction>();
  for (const t of [...changes.added, ...changes.modified]) latest.set(t.externalId, t);

  for (const t of latest.values()) {
    if (!accounts.has(t.accountExternalId) || t.amount === 0) continue;
    if (have.has(t.externalId)) {
      plan.update.push({ ...t, currentExternalId: t.externalId });
    } else if (t.replacesExternalId && have.has(t.replacesExternalId)) {
      // The booked version of a pending payment: keep the row (with its
      // category, notes and files) under the new ID
      plan.update.push({ ...t, currentExternalId: t.replacesExternalId });
      have.delete(t.replacesExternalId);
      have.add(t.externalId);
    } else if (!planned.has(t.externalId)) {
      plan.insert.push(t);
      planned.add(t.externalId);
    }
  }

  // Only what still exists under that ID; a pending payment that was just
  // booked has moved to its new ID and stays
  plan.remove = [...new Set(changes.removed)].filter((id) => have.has(id));
  return plan;
}
