// ─────────────────────────────────────────────────────────────────────────────
// Linked banks: which service, and whether it's set up
//
// In plain words: linking a bank only works once Finely has been given its
// keys for Plaid and a secret to encrypt the banks' keys with. Until then
// the "Connect a bank" button stays hidden, like "Continue with Google".
//
// For developers: needs PLAID_CLIENT_ID, PLAID_SECRET and
// BANK_ENCRYPTION_KEY. The tests replace this module with a pretend bank
// (vi.mock), so the syncing code runs without Plaid.
// ─────────────────────────────────────────────────────────────────────────────

import { plaidProvider } from "./plaid";
import type { BankProvider } from "./types";

/** The secret bank keys are encrypted with ("" if not set) */
export const bankEncryptionKey = process.env.BANK_ENCRYPTION_KEY ?? "";

/** Linking banks is offered only once everything it needs is configured. */
export const isBankEnabled = Boolean(
  process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET && bankEncryptionKey,
);

/** The service that talks to banks, or null if it isn't set up */
export function getBankProvider(): BankProvider | null {
  return isBankEnabled ? plaidProvider : null;
}
