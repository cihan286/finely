// ─────────────────────────────────────────────────────────────────────────────
// Linked banks: what we need from the service that talks to them
//
// In plain words: Finely doesn't talk to banks itself. A service in between
// (Plaid) asks the person to log in at their bank, and then hands us the
// accounts and their transactions. This file describes, in Finely's own
// words, what such a service has to be able to do — so the rest of the app
// doesn't depend on which service it is.
//
// For developers: types only (plus the error class), so both the
// implementation (lib/bank/plaid.ts) and the code that picks it
// (lib/bank/provider.ts) can import from here. Everything that crosses this
// boundary is already in Finely's terms: amounts are positive for money in
// and negative for money out, days are ISO strings.
// ─────────────────────────────────────────────────────────────────────────────

import type { ISODate } from "@/types/finance";

/** An account at the bank */
export interface BankAccount {
  /** The service's own ID of the account */
  externalId: string;
  name: string;
  /** The last digits of the account number, if the bank gives them */
  mask: string | null;
  /** "depository", "credit", "loan", "investment", … */
  type: string;
  /** "checking", "savings", "money market", … */
  subtype: string | null;
  /** What's in it now; null if the bank doesn't say */
  balance: number | null;
  /** "USD", …; null if the bank doesn't say */
  currency: string | null;
}

/** A payment as the bank reports it */
export interface BankTransaction {
  /** The service's own ID of the transaction */
  externalId: string;
  accountExternalId: string;
  /** Positive = money in, negative = money out */
  amount: number;
  day: ISODate;
  name: string;
  /** Not booked yet: it can still change or disappear */
  pending: boolean;
  /**
   * For a booked payment that was reported as pending before: the ID it had
   * then, so the same payment isn't kept twice
   */
  replacesExternalId: string | null;
}

/** What changed at the bank since the last time we asked */
export interface BankChanges {
  added: BankTransaction[];
  modified: BankTransaction[];
  /** The IDs of transactions that no longer exist */
  removed: string[];
  /** Where to continue from next time */
  cursor: string;
  /** Whether there's more to fetch right now */
  hasMore: boolean;
}

export interface BankProvider {
  /** Which service this is, stored with each link: "plaid" */
  name: string;
  /** A one-time token that opens the "log in at your bank" window */
  createLinkToken(userId: string): Promise<string>;
  /** Turns what that window hands back into a lasting key */
  exchangePublicToken(
    publicToken: string,
  ): Promise<{ accessToken: string; externalId: string }>;
  getAccounts(accessToken: string): Promise<BankAccount[]>;
  /** The changes since `cursor` (null = everything the bank has) */
  getChanges(accessToken: string, cursor: string | null): Promise<BankChanges>;
  /** Ends the link at the service; the key stops working */
  remove(accessToken: string): Promise<void>;
}

/**
 * Something the bank or the service refused. `message` is written for the
 * person (and safe to show); `code` is the service's own word for it.
 */
/** What a BankError tells the person: a sentence of i18n/messages/<language>/errors.ts */
export type BankErrorKey =
  | "bankLoginRequired"
  | "bankDown"
  | "bankRateLimited"
  | "bankDataChanged"
  | "bankNoAccess"
  | "bankUnreachable"
  | "bankGeneric";

export class BankError extends Error {
  constructor(
    public readonly key: BankErrorKey,
    public readonly code: string,
  ) {
    super(`${key} (${code})`);
    this.name = "BankError";
  }
}
