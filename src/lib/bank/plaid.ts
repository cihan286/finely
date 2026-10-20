// ─────────────────────────────────────────────────────────────────────────────
// Plaid: the service that talks to banks
//
// In plain words: Plaid lets a person log in at their own bank in a window
// Plaid provides (we never see the bank login), and then gives us that
// bank's accounts and transactions. This file is the only place that knows
// how to ask Plaid for things.
//
// For developers: plain HTTPS calls to Plaid's API (no SDK), each with our
// client ID and secret (PLAID_CLIENT_ID, PLAID_SECRET) in the JSON body.
// PLAID_ENV chooses "sandbox" (pretend banks, the default) or "production".
// Plaid reports money leaving an account as a positive amount; it's turned
// around here, so the rest of Finely only sees its own convention. Failures
// become a BankError with a message for the person; Plaid's own message is
// only logged, never shown or sent on. Docs: https://plaid.com/docs/api/
// ─────────────────────────────────────────────────────────────────────────────

import { BankError, type BankErrorKey, type BankProvider, type BankTransaction } from "./types";

const HOSTS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  production: "https://production.plaid.com",
};
const baseUrl = HOSTS[process.env.PLAID_ENV ?? "sandbox"] ?? HOSTS.sandbox;

// What to tell the person for the failures they can do something about: a
// sentence of i18n/messages/<language>/errors.ts, so it's shown in their language
const MESSAGES: Record<string, BankErrorKey> = {
  ITEM_LOGIN_REQUIRED: "bankLoginRequired",
  INSTITUTION_DOWN: "bankDown",
  INSTITUTION_NOT_RESPONDING: "bankDown",
  RATE_LIMIT_EXCEEDED: "bankRateLimited",
  TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION: "bankDataChanged",
  ACCESS_NOT_GRANTED: "bankNoAccess",
};

// One call to Plaid's API
async function plaid<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        ...body,
      }),
      cache: "no-store",
    });
  } catch {
    throw new BankError("bankUnreachable", "NETWORK");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const code = typeof data?.error_code === "string" ? data.error_code : `HTTP_${response.status}`;
    // For us: which call failed and why. Never the request (it has secrets).
    console.error(`[plaid] ${path} failed: ${code} (${data?.error_type ?? "no error type"})`);
    throw new BankError(MESSAGES[code] ?? "bankGeneric", code);
  }
  return data as T;
}

interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
  balances: { current: number | null; iso_currency_code: string | null };
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
  pending_transaction_id: string | null;
}

const toBankTransaction = (t: PlaidTransaction): BankTransaction => ({
  externalId: t.transaction_id,
  accountExternalId: t.account_id,
  // Plaid: positive = money out. Finely: positive = money in.
  amount: -t.amount,
  day: t.date,
  // The cleaned-up merchant name when Plaid has one, else the bank's own text
  name: (t.merchant_name || t.name || "Bank transaction").slice(0, 120),
  pending: t.pending,
  replacesExternalId: t.pending_transaction_id,
});

export const plaidProvider: BankProvider = {
  name: "plaid",

  async createLinkToken(userId) {
    const data = await plaid<{ link_token: string }>("/link/token/create", {
      client_name: "Finely",
      // Plaid wants an ID of ours for the person; never their email or name
      user: { client_user_id: userId },
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    return data.link_token;
  },

  async exchangePublicToken(publicToken) {
    const data = await plaid<{ access_token: string; item_id: string }>(
      "/item/public_token/exchange",
      { public_token: publicToken },
    );
    return { accessToken: data.access_token, externalId: data.item_id };
  },

  async getAccounts(accessToken) {
    const data = await plaid<{ accounts: PlaidAccount[] }>("/accounts/get", {
      access_token: accessToken,
    });
    return data.accounts.map((a) => ({
      externalId: a.account_id,
      name: (a.name || a.official_name || "Bank account").slice(0, 120),
      mask: a.mask,
      type: a.type,
      subtype: a.subtype,
      balance: a.balances.current,
      currency: a.balances.iso_currency_code,
    }));
  },

  async getChanges(accessToken, cursor) {
    const data = await plaid<{
      added: PlaidTransaction[];
      modified: PlaidTransaction[];
      removed: { transaction_id: string }[];
      next_cursor: string;
      has_more: boolean;
    }>("/transactions/sync", {
      access_token: accessToken,
      // Left out the first time: Plaid then starts from the beginning
      ...(cursor ? { cursor } : {}),
      count: 500,
    });
    return {
      added: data.added.map(toBankTransaction),
      modified: data.modified.map(toBankTransaction),
      removed: data.removed.map((r) => r.transaction_id),
      cursor: data.next_cursor,
      hasMore: data.has_more,
    };
  },

  async remove(accessToken) {
    await plaid("/item/remove", { access_token: accessToken });
  },
};
