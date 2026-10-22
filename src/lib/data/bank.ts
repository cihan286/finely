// ─────────────────────────────────────────────────────────────────────────────
// Linked banks: connecting, syncing, disconnecting
//
// In plain words: an owner or admin can link the company's bank. Finely
// then adds that bank's everyday and savings accounts and keeps their
// transactions up to date by itself — when the bank is linked, whenever
// someone presses "Sync now", and once a day. New transactions get a
// category from the company's rules; a pending payment that gets booked
// stays the same transaction, with its category, notes and receipts. The
// account's balance always follows what the bank says. Disconnecting stops
// the syncing; the accounts and transactions stay.
//
// For developers: server-only. The functions people call find the company
// via getFinanceContext({ manage: true }). syncAllBankConnections() is for
// the daily job: no login, every connection, each with its own company's ID.
// The bank's key is stored encrypted (lib/bank/crypto.ts) and only decrypted
// here, right before a call; it never leaves this file, the logs or error
// messages. Syncing is safe to repeat: the cursor only moves on after the
// changes were saved, and saving the same changes twice changes nothing.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bankConnection,
  financialAccount,
  prefixedId,
  transaction,
} from "@/db/finance";
import { organization } from "@/db/schema";
import { afterResponse } from "@/lib/after-response";
import { decryptToken, encryptToken } from "@/lib/bank/crypto";
import { bankEncryptionKey, getBankProvider } from "@/lib/bank/provider";
import { BankError, type BankChanges, type BankProvider } from "@/lib/bank/types";
import { zonedTime } from "@/lib/dates";
import { finelyAccountType, last4From, planSync } from "@/lib/finance/bank-sync";
import { cardFromDescription } from "@/lib/finance/cards";
import { categoryFromRules } from "@/lib/finance/category-rules";
import { roundMoney, subtractMoney } from "@/lib/money";
import { recordAudit, type AuditActor } from "./audit";
import { selectRules } from "./category-rules";
import {
  DataError,
  getCompanyLocale,
  getFinanceContext,
  isUniqueViolation,
  refuseInDemo,
  requiredText,
} from "./common";
import { settleBillsWith } from "./bills";
import { selectActiveCards } from "./cards";
import { alertUnusualCharges } from "./email-notifications";

/** A linked bank, as shown in Settings (never with its key) */
export interface BankConnectionSummary {
  id: string;
  institutionName: string;
  /** How many of the company's accounts come through it */
  accountCount: number;
  lastSyncedAt: Date | null;
  /** Why the last sync failed, in words for the person; null when it worked */
  lastError: string | null;
}

/** What a sync did */
export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  /** Accounts Finely started keeping in this sync */
  newAccounts: number;
}

// The most pages of changes read in one sync (500 transactions each)
const MAX_PAGES = 40;

// The service that talks to banks; an error for the person if it isn't set up
function requireProvider(): BankProvider {
  const provider = getBankProvider();
  if (!provider) throw new DataError("bankNotSetUp");
  return provider;
}

// Bank problems become messages for the person; anything else is a bug
function asDataError(error: unknown): never {
  if (error instanceof BankError) throw new DataError(error.key);
  throw error;
}

/** The company's linked banks, oldest first */
export async function listBankConnections(): Promise<BankConnectionSummary[]> {
  const { organizationId } = await getFinanceContext();
  return db
    .select({
      id: bankConnection.id,
      institutionName: bankConnection.institutionName,
      accountCount: sql<number>`count(${financialAccount.id})`.mapWith(Number),
      lastSyncedAt: bankConnection.lastSyncedAt,
      lastError: bankConnection.lastError,
    })
    .from(bankConnection)
    .leftJoin(financialAccount, eq(financialAccount.connectionId, bankConnection.id))
    .where(eq(bankConnection.organizationId, organizationId))
    .groupBy(bankConnection.id)
    .orderBy(asc(bankConnection.createdAt));
}

/**
 * Starts linking a bank (owners and admins only): the one-time token that
 * opens the "log in at your bank" window in the browser.
 */
export async function createBankLinkToken(): Promise<string> {
  const { userId, organizationId } = await getFinanceContext({ manage: true });
  await refuseInDemo(organizationId);
  try {
    return await requireProvider().createLinkToken(userId);
  } catch (error) {
    asDataError(error);
  }
}

/**
 * Finishes linking a bank (owners and admins only) with what the bank
 * window handed back, and brings in its accounts and transactions.
 */
export async function connectBank(
  publicToken: string,
  institutionName: string,
): Promise<SyncResult & { institutionName: string }> {
  const actor = await getFinanceContext({ manage: true });
  await refuseInDemo(actor.organizationId);
  const provider = requireProvider();
  const token = requiredText(publicToken, "bankLink", 500);
  // Shown on screen later; whatever the browser sent, kept short
  const name = (typeof institutionName === "string" && institutionName.trim()
    ? institutionName.trim()
    : "Bank"
  ).slice(0, 80);

  let connection;
  try {
    const { accessToken, externalId } = await provider.exchangePublicToken(token);
    [connection] = await db
      .insert(bankConnection)
      .values({
        organizationId: actor.organizationId,
        provider: provider.name,
        externalId,
        institutionName: name,
        accessToken: encryptToken(accessToken, bankEncryptionKey),
        createdById: actor.userId,
      })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError("bankAlreadyConnected");
    asDataError(error);
  }
  await recordAudit(actor, {
    area: "bank",
    action: "connected",
    entityId: connection.id,
    key: "bankConnected",
    values: { bank: name },
  });

  // The link is made; a first sync that fails is tried again later
  try {
    return { ...(await syncConnection(connection, provider, actor)), institutionName: name };
  } catch (error) {
    if (!(error instanceof BankError)) throw error;
    return { added: 0, updated: 0, removed: 0, newAccounts: 0, institutionName: name };
  }
}

/** Brings one linked bank up to date now (owners and admins only). */
export async function syncBankConnection(id: string): Promise<SyncResult> {
  const actor = await getFinanceContext({ manage: true });
  const [connection] = await db
    .select()
    .from(bankConnection)
    .where(
      and(eq(bankConnection.id, id), eq(bankConnection.organizationId, actor.organizationId)),
    );
  if (!connection) throw new DataError("bankNotFound");
  try {
    return await syncConnection(connection, requireProvider(), actor);
  } catch (error) {
    asDataError(error);
  }
}

/**
 * Stops syncing a bank (owners and admins only). Its accounts and
 * transactions stay in Finely, as ordinary ones.
 */
export async function disconnectBank(id: string) {
  const actor = await getFinanceContext({ manage: true });
  const own = and(
    eq(bankConnection.id, id),
    eq(bankConnection.organizationId, actor.organizationId),
  );
  const [connection] = await db.select().from(bankConnection).where(own);
  if (!connection) throw new DataError("bankNotFound");

  // Tell the service the key is no longer wanted. If that fails (the bank
  // already ended it, the service is down), the link is forgotten here anyway.
  try {
    await getBankProvider()?.remove(decryptToken(connection.accessToken, bankEncryptionKey));
  } catch (error) {
    console.error(
      `[bank] Could not end connection ${connection.id} at the service:`,
      error instanceof BankError ? error.code : "unreadable key or unexpected error",
    );
  }
  await db.delete(bankConnection).where(own);
  await recordAudit(actor, {
    area: "bank",
    action: "disconnected",
    entityId: id,
    key: "bankDisconnected",
    values: { bank: connection.institutionName },
  });
}

/**
 * Brings every linked bank of every company up to date, for the daily job.
 * One bank's failure doesn't stop the others. Returns how many were synced
 * and how many failed.
 */
export async function syncAllBankConnections(): Promise<{ synced: number; failed: number }> {
  const provider = getBankProvider();
  const result = { synced: 0, failed: 0 };
  if (!provider) return result;

  const connections = await db
    .select({ connection: bankConnection })
    .from(bankConnection)
    // Only banks of companies that still exist
    .innerJoin(organization, eq(bankConnection.organizationId, organization.id))
    .orderBy(asc(bankConnection.lastSyncedAt));
  for (const { connection } of connections) {
    try {
      await syncConnection(connection, provider, {
        organizationId: connection.organizationId,
        userId: null,
      });
      result.synced++;
    } catch (error) {
      result.failed++;
      if (!(error instanceof BankError)) {
        console.error(`[bank] Could not sync connection ${connection.id}:`, error);
      }
    }
  }
  return result;
}

// Brings one linked bank up to date: its accounts, then everything that
// changed since the last time. Throws a BankError (after noting it on the
// connection, for the screen) when the bank or the service refuses.
async function syncConnection(
  connection: typeof bankConnection.$inferSelect,
  provider: BankProvider,
  actor: AuditActor,
): Promise<SyncResult> {
  const organizationId = connection.organizationId;
  const ownConnection = and(
    eq(bankConnection.id, connection.id),
    eq(bankConnection.organizationId, organizationId),
  );

  let bankAccounts;
  const changes: Pick<BankChanges, "added" | "modified" | "removed"> = {
    added: [],
    modified: [],
    removed: [],
  };
  let cursor = connection.cursor;
  try {
    const accessToken = decryptToken(connection.accessToken, bankEncryptionKey);
    bankAccounts = await provider.getAccounts(accessToken);
    for (let page = 0; page < MAX_PAGES; page++) {
      const next = await provider.getChanges(accessToken, cursor);
      changes.added.push(...next.added);
      changes.modified.push(...next.modified);
      changes.removed.push(...next.removed);
      cursor = next.cursor;
      if (!next.hasMore) break;
    }
  } catch (error) {
    // For the screen: what the person can do about it
    await db
      .update(bankConnection)
      .set({
        // A sentence of i18n/messages/<language>/errors.ts, shown in Settings
        lastError: error instanceof BankError ? error.key : "bankGeneric",
      })
      .where(ownConnection);
    throw error;
  }

  const [{ timeZone, currency }, existingAccounts, rules, cards] = await Promise.all([
    getCompanyLocale(organizationId),
    db
      .select({ id: financialAccount.id, externalId: financialAccount.externalId })
      .from(financialAccount)
      .where(
        and(
          eq(financialAccount.organizationId, organizationId),
          eq(financialAccount.connectionId, connection.id),
        ),
      ),
    selectRules(organizationId),
    selectActiveCards(organizationId),
  ]);

  // The bank's accounts Finely keeps, each with its Finely account
  const accountIds = new Map(
    existingAccounts.flatMap((a) => (a.externalId ? [[a.externalId, a.id] as const] : [])),
  );
  let newAccounts = 0;
  for (const bankAccount of bankAccounts) {
    const type = finelyAccountType(bankAccount, currency);
    if (!type || accountIds.has(bankAccount.externalId)) continue;
    const [created] = await db
      .insert(financialAccount)
      .values({
        organizationId,
        name: `${connection.institutionName} ${bankAccount.name}`.slice(0, 120),
        type,
        last4: last4From(bankAccount.mask),
        connectionId: connection.id,
        externalId: bankAccount.externalId,
      })
      .returning({ id: financialAccount.id });
    accountIds.set(bankAccount.externalId, created.id);
    newAccounts++;
  }

  // Which of the reported transactions we already have
  const mentioned = [
    ...new Set(
      [...changes.added, ...changes.modified]
        .flatMap((t) => [t.externalId, t.replacesExternalId])
        .concat(changes.removed)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const known = new Set<string>();
  for (let i = 0; i < mentioned.length; i += 1000) {
    const rows = await db
      .select({ externalId: transaction.externalId })
      .from(transaction)
      .where(
        and(
          eq(transaction.organizationId, organizationId),
          inArray(transaction.externalId, mentioned.slice(i, i + 1000)),
        ),
      );
    for (const row of rows) if (row.externalId) known.add(row.externalId);
  }

  const plan = planSync(changes, known, new Set(accountIds.keys()));
  // What the bank says about one payment, as our columns. Statements list
  // days, not times: noon that day, in the company's timezone.
  const fromBank = (t: (typeof plan.insert)[number]) => ({
    accountId: accountIds.get(t.accountExternalId)!,
    name: t.name,
    amount: roundMoney(t.amount),
    occurredAt: zonedTime(t.day, "12:00", timeZone),
    status: t.pending ? "pending" : "completed",
    externalId: t.externalId,
  });
  const inserts = plan.insert.map((t) => ({
    ...fromBank(t),
    id: prefixedId("tx")(),
    organizationId,
    categoryId: categoryFromRules(t.name, rules),
    // The card the bank's description names, for money out
    cardId: t.amount < 0 ? cardFromDescription(t.name, cards) : null,
  }));

  const writes = [];
  for (let i = 0; i < inserts.length; i += 500) {
    writes.push(
      db
        .insert(transaction)
        .values(inserts.slice(i, i + 500))
        // Already there (the same changes arriving twice): leave it
        .onConflictDoNothing(),
    );
  }
  for (const t of plan.update) {
    // The category, notes and files people added stay as they are
    writes.push(
      db
        .update(transaction)
        .set(fromBank(t))
        .where(
          and(
            eq(transaction.organizationId, organizationId),
            eq(transaction.externalId, t.currentExternalId),
          ),
        ),
    );
  }
  for (let i = 0; i < plan.remove.length; i += 500) {
    writes.push(
      db
        .delete(transaction)
        .where(
          and(
            eq(transaction.organizationId, organizationId),
            inArray(transaction.externalId, plan.remove.slice(i, i + 500)),
          ),
        ),
    );
  }
  // Remember where we stopped, together with the changes: all or nothing
  writes.push(
    db
      .update(bankConnection)
      .set({ cursor, lastSyncedAt: new Date(), lastError: null })
      .where(ownConnection),
  );
  await db.batch(writes as [(typeof writes)[number], ...typeof writes]);

  // The bank knows the balance: set where each account "started" so that
  // start + its completed transactions is exactly what the bank says
  const totals = await db
    .select({
      accountId: transaction.accountId,
      completed: sql<number>`coalesce(sum(${transaction.amount}), 0)`.mapWith(Number),
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.organizationId, organizationId),
        eq(transaction.status, "completed"),
        inArray(transaction.accountId, [...accountIds.values(), ""]),
      ),
    )
    .groupBy(transaction.accountId);
  const completedIn = new Map(totals.map((t) => [t.accountId, t.completed]));
  for (const bankAccount of bankAccounts) {
    const accountId = accountIds.get(bankAccount.externalId);
    if (!accountId || bankAccount.balance === null) continue;
    await db
      .update(financialAccount)
      .set({
        openingBalance: subtractMoney(bankAccount.balance, completedIn.get(accountId) ?? 0),
      })
      .where(
        and(
          eq(financialAccount.id, accountId),
          eq(financialAccount.organizationId, organizationId),
        ),
      );
  }

  const result = {
    added: inserts.length,
    updated: plan.update.length,
    removed: plan.remove.length,
    newAccounts,
  };
  if (result.added + result.updated + result.removed + newAccounts > 0) {
    await recordAudit(actor, {
      area: "bank",
      action: "synced",
      entityId: connection.id,
      key: "bankSynced",
      values: { bank: connection.institutionName, sync: { sync: result } },
    });
  }

  // Payments of bills that are still owed mark those bills as paid, and
  // replace a payment that was recorded for a bill by hand
  await settleBillsWith(
    actor,
    inserts.filter((t) => t.amount < 0).map((t) => t.id),
  );

  // Not for the first sync: that one brings in months of history at once
  if (connection.cursor !== null) {
    const charges = inserts
      .filter((t) => t.amount < 0 && t.status === "completed")
      .map((t) => t.id);
    await afterResponse(async () => {
      await alertUnusualCharges(organizationId, timeZone, charges);
    });
  }
  return result;
}
