// ─────────────────────────────────────────────────────────────────────────────
// Bank accounts: reading and saving
//
// In plain words: lists the company's bank accounts with how much is in each,
// and lets owners and admins add, change or remove them. An account's balance
// is what it started with plus every completed payment in or out of it. An
// account that still has transactions can't be removed, so no history is lost.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { financialAccount, transaction } from "@/db/finance";
import { ACCOUNT_TYPES, type Account } from "@/types/finance";
import { recordAudit } from "./audit";
import {
  DataError,
  getFinanceContext,
  money,
  oneOf,
  optionalText,
  requiredText,
} from "./common";

/** What a person fills in when adding or editing an account */
export interface AccountInput {
  name: string;
  type: Account["type"];
  last4?: string | null;
  openingBalance?: number;
}

/** The company's accounts, oldest first, with their current balances */
export async function listAccounts(): Promise<Account[]> {
  const { organizationId } = await getFinanceContext();
  const rows = await db
    .select({
      id: financialAccount.id,
      name: financialAccount.name,
      type: financialAccount.type,
      last4: financialAccount.last4,
      openingBalance: financialAccount.openingBalance,
      // Pending payments don't count until they go through
      completedTotal: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.status} = 'completed'), 0)`.mapWith(Number),
    })
    .from(financialAccount)
    .leftJoin(transaction, eq(transaction.accountId, financialAccount.id))
    .where(eq(financialAccount.organizationId, organizationId))
    .groupBy(financialAccount.id)
    .orderBy(asc(financialAccount.createdAt));

  return rows.map(({ openingBalance, completedTotal, ...row }) => ({
    ...row,
    type: row.type as Account["type"],
    balance: Math.round((openingBalance + completedTotal) * 100) / 100,
  }));
}

// Checks and tidies what was typed into the account form
function parseAccountInput(input: AccountInput, currency: string) {
  const last4 = optionalText(input.last4, "lastFour", 4);
  if (last4 !== null && !/^\d{4}$/.test(last4)) {
    throw new DataError("lastFourDigits");
  }
  return {
    name: requiredText(input.name, "name"),
    type: oneOf(input.type, ACCOUNT_TYPES, "accountType"),
    last4,
    openingBalance: money(input.openingBalance ?? 0, "openingBalance", currency),
  };
}

/** Adds an account (owners and admins only) and returns its ID. */
export async function createAccount(input: AccountInput): Promise<string> {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  const [row] = await db
    .insert(financialAccount)
    .values({ ...parseAccountInput(input, actor.currency), organizationId })
    .returning({ id: financialAccount.id, name: financialAccount.name });
  await recordAudit(actor, {
    area: "account",
    action: "created",
    entityId: row.id,
    key: "accountAdded",
    values: { name: row.name },
  });
  return row.id;
}

/** Changes an account's details (owners and admins only). */
export async function updateAccount(id: string, input: AccountInput) {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  const updated = await db
    .update(financialAccount)
    .set(parseAccountInput(input, actor.currency))
    .where(
      and(
        eq(financialAccount.id, id),
        eq(financialAccount.organizationId, organizationId),
      ),
    )
    .returning({ id: financialAccount.id, name: financialAccount.name });
  if (updated.length === 0) throw new DataError("accountNotFound");
  await recordAudit(actor, {
    area: "account",
    action: "updated",
    entityId: id,
    key: "accountChanged",
    values: { name: updated[0].name },
  });
}

/** Removes an account that has no transactions (owners and admins only). */
export async function deleteAccount(id: string) {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  const transactionCount = await db.$count(
    transaction,
    and(
      eq(transaction.accountId, id),
      eq(transaction.organizationId, organizationId),
    ),
  );
  if (transactionCount > 0) {
    throw new DataError("accountHasTransactions");
  }
  const deleted = await db
    .delete(financialAccount)
    .where(
      and(
        eq(financialAccount.id, id),
        eq(financialAccount.organizationId, organizationId),
      ),
    )
    .returning({ id: financialAccount.id, name: financialAccount.name });
  if (deleted.length === 0) throw new DataError("accountNotFound");
  await recordAudit(actor, {
    area: "account",
    action: "deleted",
    entityId: id,
    key: "accountRemoved",
    values: { name: deleted[0].name },
  });
}
