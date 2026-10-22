// ─────────────────────────────────────────────────────────────────────────────
// Transactions: reading and saving
//
// In plain words: lists the company's payments in and out — newest first,
// searchable and filterable by account, category and date — and lets people
// add and edit them, one by one or many at once from a bank statement file,
// change the category of several at once, and export what the filters show.
// Everyone on the team can add, import and edit transactions; only owners and
// admins can delete them. New transactions without a category get one from
// the company's category rules, if a rule fits their description. When a new
// charge is far above what its vendor usually charges, the team is emailed
// (see email-notifications.ts).
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. Account and
// category IDs coming from the browser are checked to belong to the company
// before anything is saved. Days (filters, form dates, each transaction's
// `day`) are calendar days in the company's timezone; a day without a time
// is stored as noon on that day there.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { getMessages } from "@/i18n/server";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  attachment,
  card,
  category,
  financialAccount,
  prefixedId,
  transaction,
} from "@/db/finance";
import { afterResponse } from "@/lib/after-response";
import { addDays, localDay, startOfDay, todayIn, zonedTime } from "@/lib/dates";
import { hasChanges, type AuditChange } from "@/lib/finance/audit";
import { cardFromDescription } from "@/lib/finance/cards";
import { categoryFromRules } from "@/lib/finance/category-rules";
import type { TransactionExportRow } from "@/lib/finance/export";
import { amountFromSearch } from "@/lib/finance/search";
import {
  duplicateKey,
  MAX_IMPORT_ROWS,
  removeExisting,
  type StatementRow,
} from "@/lib/finance/statement-import";
import { deleteFiles } from "@/lib/storage";
import {
  TRANSACTION_STATUSES,
  type ISODate,
  type ISODateTime,
  type TransactionDetails,
  type TransactionStatus,
} from "@/types/finance";
import { storedFileKeys } from "./attachments";
import { recordAudit } from "./audit";
import { settleBillsWith } from "./bills";
import { selectActiveCards } from "./cards";
import { selectRules } from "./category-rules";
import { alertUnusualCharges } from "./email-notifications";
import {
  DataError,
  dateTime,
  escapeLike,
  getFinanceContext,
  isoDay,
  money,
  oneOf,
  optionalText,
  requiredText,
} from "./common";

/** What a person fills in when adding or editing a transaction */
export interface TransactionInput {
  accountId: string;
  categoryId: string | null;
  name: string;
  /** Positive = income, negative = expense */
  amount: number;
  /** The day it happened, in the company's timezone */
  date: ISODate;
  /**
   * When editing: the transaction's current moment. Kept as it is when the
   * day didn't change, so imported times aren't lost.
   */
  originalDate?: ISODateTime | null;
  status: TransactionStatus;
  notes?: string | null;
  /**
   * The payment card it was paid with; null or left out when that isn't
   * known (a new transaction then gets the card its description names, if
   * any)
   */
  cardId?: string | null;
}

/** Ways to narrow down the transactions list */
export interface TransactionFilters {
  /**
   * Matches part of the description, notes or category name (ignoring
   * upper/lower case), or the exact amount
   */
  search?: string;
  accountId?: string;
  /** A category's ID, or "none" for uncategorized transactions */
  categoryId?: string;
  /** A payment card's ID */
  cardId?: string;
  /** First day to include */
  from?: ISODate;
  /** Last day to include */
  to?: ISODate;
  /** How many to return (at most 200) */
  limit?: number;
  /** How many to skip, for paging */
  offset?: number;
}

// The columns that make up a TransactionDetails (category comes from a join)
const transactionColumns = {
  id: transaction.id,
  name: transaction.name,
  categoryName: category.name,
  categoryId: transaction.categoryId,
  cardId: transaction.cardId,
  amount: transaction.amount,
  occurredAt: transaction.occurredAt,
  status: transaction.status,
  account: transaction.accountId,
  notes: transaction.notes,
  // How many files are attached (the files themselves aren't read here)
  attachmentCount: sql<number>`(select count(*) from ${attachment} where ${attachment.transactionId} = ${transaction.id})`.mapWith(Number),
};

// Transactions with their category's name; add .where() etc. to narrow down
function selectTransactions() {
  return db
    .select(transactionColumns)
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id));
}

type TransactionRow = Awaited<ReturnType<typeof selectTransactions>>[number];

// Turns a database row into the shape the components use
function toTransactionDetails(
  { categoryName, occurredAt, ...row }: TransactionRow,
  timeZone: string,
  /** "Uncategorized" in the page's language */
  uncategorized: string,
): TransactionDetails {
  return {
    ...row,
    category: categoryName ?? uncategorized,
    date: occurredAt.toISOString(),
    day: localDay(occurredAt, timeZone),
    status: row.status as TransactionStatus,
  };
}

// The company's transactions that match the filters
function matching(
  filters: TransactionFilters,
  organizationId: string,
  timeZone: string,
) {
  const conditions: SQL[] = [eq(transaction.organizationId, organizationId)];
  const search = optionalText(filters.search, "search", 100);
  if (search) {
    const pattern = `%${escapeLike(search)}%`;
    const amount = amountFromSearch(search);
    // In the description, the notes, the category's name or the account's
    // name; a number also finds that exact amount, in or out
    conditions.push(
      or(
        ilike(transaction.name, pattern),
        ilike(transaction.notes, pattern),
        inArray(
          transaction.categoryId,
          db
            .select({ id: category.id })
            .from(category)
            .where(
              and(eq(category.organizationId, organizationId), ilike(category.name, pattern)),
            ),
        ),
        inArray(
          transaction.accountId,
          db
            .select({ id: financialAccount.id })
            .from(financialAccount)
            .where(
              and(
                eq(financialAccount.organizationId, organizationId),
                ilike(financialAccount.name, pattern),
              ),
            ),
        ),
        amount === null ? undefined : sql`abs(${transaction.amount}) = ${amount}`,
      )!,
    );
  }
  if (filters.accountId) {
    conditions.push(eq(transaction.accountId, filters.accountId));
  }
  if (filters.categoryId === "none") {
    conditions.push(isNull(transaction.categoryId));
  } else if (filters.categoryId) {
    conditions.push(eq(transaction.categoryId, filters.categoryId));
  }
  if (filters.cardId) {
    conditions.push(eq(transaction.cardId, filters.cardId));
  }
  // From the start of the first day to the end of the last, over there
  if (filters.from) {
    const from = isoDay(filters.from, "startDate");
    conditions.push(gte(transaction.occurredAt, startOfDay(from, timeZone)));
  }
  if (filters.to) {
    const to = isoDay(filters.to, "endDate");
    conditions.push(lt(transaction.occurredAt, startOfDay(addDays(to, 1), timeZone)));
  }
  return and(...conditions);
}

/**
 * One page of the company's transactions, newest first, plus how many match
 * the filters in total (for paging).
 */
export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<{ transactions: TransactionDetails[]; total: number }> {
  const { organizationId, timeZone } = await getFinanceContext();
  const where = matching(filters, organizationId, timeZone);
  const { uncategorized } = (await getMessages()).transactions;

  const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200);
  const offset = Math.max(Math.trunc(filters.offset ?? 0), 0);

  const [rows, [{ total }]] = await Promise.all([
    selectTransactions()
      .where(where)
      // Same time? Newest entry first, so the order never jumps around
      .orderBy(desc(transaction.occurredAt), desc(transaction.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(transaction).where(where),
  ]);

  return {
    transactions: rows.map((row) => toTransactionDetails(row, timeZone, uncategorized)),
    total,
  };
}

/** The most transactions one export file holds */
export const MAX_EXPORT_ROWS = 20_000;

/**
 * Every transaction that matches the filters (paging ignored), newest
 * first, with its account's name, for the export file. `truncated` says
 * whether there were more than fit.
 */
export async function exportTransactions(
  filters: TransactionFilters = {},
): Promise<{ rows: TransactionExportRow[]; truncated: boolean; today: ISODate }> {
  const { organizationId, timeZone } = await getFinanceContext();
  const rows = await db
    .select({
      name: transaction.name,
      category: category.name,
      account: financialAccount.name,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
      status: transaction.status,
      notes: transaction.notes,
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .innerJoin(financialAccount, eq(transaction.accountId, financialAccount.id))
    .where(matching(filters, organizationId, timeZone))
    .orderBy(desc(transaction.occurredAt), desc(transaction.createdAt))
    // One more than fits, to know whether some were left out
    .limit(MAX_EXPORT_ROWS + 1);

  return {
    rows: rows.slice(0, MAX_EXPORT_ROWS).map(({ occurredAt, ...row }) => ({
      ...row,
      day: localDay(occurredAt, timeZone),
      status: row.status as TransactionStatus,
    })),
    truncated: rows.length > MAX_EXPORT_ROWS,
    today: todayIn(timeZone),
  };
}

/** One transaction, or null if the company has no transaction with this ID */
export async function getTransaction(
  id: string,
): Promise<TransactionDetails | null> {
  const { organizationId, timeZone } = await getFinanceContext();
  const [row] = await selectTransactions().where(
    and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)),
  );
  return row ? toTransactionDetails(row, timeZone, (await getMessages()).transactions.uncategorized) : null;
}

// Checks what was typed into the transaction form, including that the chosen
// account and category belong to this company
async function parseTransactionInput(
  input: TransactionInput,
  organizationId: string,
  timeZone: string,
  currency: string,
  /** When editing: the card it has now, which may stay even if archived */
  currentCardId: string | null = null,
) {
  const accountId = requiredText(input.accountId, "account");
  const categoryId = optionalText(input.categoryId, "category", 120);
  const cardId = optionalText(input.cardId, "card", 120);

  const [accountMatches, categoryMatches, [chosenCard]] = await Promise.all([
    db.$count(
      financialAccount,
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.organizationId, organizationId),
      ),
    ),
    categoryId
      ? db.$count(
          category,
          and(eq(category.id, categoryId), eq(category.organizationId, organizationId)),
        )
      : Promise.resolve(1),
    cardId
      ? db
          .select({ archivedAt: card.archivedAt })
          .from(card)
          .where(and(eq(card.id, cardId), eq(card.organizationId, organizationId)))
      : Promise.resolve([]),
  ]);
  if (accountMatches === 0) throw new DataError("accountNotFound");
  if (categoryMatches === 0) throw new DataError("categoryNotFound");
  if (cardId && !chosenCard) throw new DataError("cardNotFound");
  if (chosenCard?.archivedAt && cardId !== currentCardId) {
    throw new DataError("cardArchived");
  }

  const amount = money(input.amount, "amount", currency);
  if (amount === 0) throw new DataError("amountZero");

  // Keep the exact moment when the day didn't change; otherwise noon that day
  const day = isoDay(input.date, "date");
  const original = input.originalDate ? dateTime(input.originalDate, "date") : null;
  const occurredAt =
    original && localDay(original, timeZone) === day
      ? original
      : zonedTime(day, "12:00", timeZone);

  return {
    accountId,
    categoryId,
    cardId,
    name: requiredText(input.name, "description"),
    amount,
    occurredAt,
    status: oneOf(input.status, TRANSACTION_STATUSES, "status"),
    notes: optionalText(input.notes, "notes"),
  };
}

/**
 * Adds a transaction and returns its ID. Left without a category, it gets
 * one from the company's category rules if a rule fits its description.
 */
export async function createTransaction(
  input: TransactionInput,
): Promise<string> {
  const actor = await getFinanceContext({ need: "finance.record" });
  const { organizationId, userId, timeZone } = actor;
  const values = await parseTransactionInput(
    input,
    organizationId,
    timeZone,
    actor.currency,
  );
  if (values.categoryId === null) {
    values.categoryId = categoryFromRules(
      values.name,
      await selectRules(organizationId),
    );
  }
  // No card chosen: the one the description names, if it names one
  if (values.cardId === null && values.amount < 0) {
    values.cardId = cardFromDescription(
      values.name,
      await selectActiveCards(organizationId),
    );
  }
  const [row] = await db
    .insert(transaction)
    .values({ ...values, organizationId, createdById: userId })
    .returning({ id: transaction.id });
  await recordAudit(actor, {
    area: "transaction",
    action: "created",
    entityId: row.id,
    key: "transactionAdded",
    values: {
      name: values.name,
      amount: { money: values.amount, currency: actor.currency, signed: true },
    },
  });
  // The payment of a bill that's still owed? Then that bill is paid
  if (values.amount < 0) await settleBillsWith(actor, [row.id], { merge: false });
  // Far above what this vendor usually charges? Email the team, without
  // making the person wait
  if (values.amount < 0 && values.status === "completed") {
    await afterResponse(async () => {
      await alertUnusualCharges(organizationId, timeZone, [row.id]);
    });
  }
  return row.id;
}

/**
 * Changes a transaction. Category rules don't apply here: someone who
 * removes a category on purpose shouldn't get it back.
 */
export async function updateTransaction(id: string, input: TransactionInput) {
  const actor = await getFinanceContext({ need: "finance.record" });
  const { organizationId, timeZone } = actor;
  const own = and(eq(transaction.id, id), eq(transaction.organizationId, organizationId));
  // What it was, to say what changed
  const [before] = await selectTransactions().where(own);
  const values = await parseTransactionInput(
    input,
    organizationId,
    timeZone,
    actor.currency,
    before?.cardId ?? null,
  );
  const updated = await db
    .update(transaction)
    .set(values)
    .where(own)
    .returning({ id: transaction.id });
  if (updated.length === 0) throw new DataError("transactionNotFound");

  const [after] = await selectTransactions().where(own);
  if (before && after) {
    const status = (value: string) => ({ status: value === "pending" ? "pending" : "completed" });
    // The cards' names, if the card changed
    const cardNames = new Map<string, string>();
    if (before.cardId !== after.cardId) {
      const ids = [before.cardId, after.cardId].filter((c): c is string => c !== null);
      const rows = await db
        .select({ id: card.id, name: card.name })
        .from(card)
        .where(and(eq(card.organizationId, organizationId), inArray(card.id, ids)));
      for (const row of rows) cardNames.set(row.id, row.name);
    }
    const cardName = (cardId: string | null) =>
      cardId ? (cardNames.get(cardId) ?? null) : null;
    const money = (amount: number) => ({ money: amount, currency: actor.currency, signed: true });
    const changes: (AuditChange | { moved: true })[] = [
      { field: "description", before: before.name, after: after.name },
      { field: "amount", before: money(before.amount), after: money(after.amount) },
      {
        field: "date",
        before: { day: localDay(before.occurredAt, timeZone) },
        after: { day: localDay(after.occurredAt, timeZone) },
      },
      { field: "category", before: before.categoryName, after: after.categoryName },
      { field: "card", before: cardName(before.cardId), after: cardName(after.cardId) },
      { field: "status", before: status(before.status), after: status(after.status) },
      { field: "notes", before: before.notes, after: after.notes },
    ];
    if (before.account !== after.account) changes.push({ moved: true });
    // Saved without changing anything: nothing to record
    if (hasChanges(changes)) {
      await recordAudit(actor, {
        area: "transaction",
        action: "updated",
        entityId: id,
        key: "transactionChanged",
        values: { name: after.name, changes: { changes } },
      });
    }
  }
}

/** Removes a transaction (owners, admins and accountants only). */
export async function deleteTransaction(id: string) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId, timeZone } = actor;
  // Its files go with it (the database removes their rows by itself)
  const files = await storedFileKeys(
    and(eq(attachment.transactionId, id), eq(attachment.organizationId, organizationId)),
  );
  const deleted = await db
    .delete(transaction)
    .where(
      and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)),
    )
    .returning({
      id: transaction.id,
      name: transaction.name,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
    });
  if (deleted.length === 0) throw new DataError("transactionNotFound");
  await deleteFiles(files);
  const [gone] = deleted;
  await recordAudit(actor, {
    area: "transaction",
    action: "deleted",
    entityId: id,
    key: "transactionDeleted",
    values: {
      name: gone.name,
      amount: { money: gone.amount, currency: actor.currency, signed: true },
      day: { day: localDay(gone.occurredAt, timeZone) },
    },
  });
}

/** The most transactions whose category can be changed at once */
export const MAX_BULK_TRANSACTIONS = 200;

/**
 * Gives several transactions the same category at once (null = none) and
 * returns how many were changed. IDs the company doesn't have are ignored.
 */
export async function setTransactionsCategory(
  ids: string[],
  categoryId: string | null,
): Promise<number> {
  const actor = await getFinanceContext({ need: "finance.record" });
  const { organizationId } = actor;

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id)) {
    throw new DataError("transactionsInvalid");
  }
  if (ids.length === 0) throw new DataError("selectOne");
  if (ids.length > MAX_BULK_TRANSACTIONS) {
    throw new DataError("tooManyAtOnce", { max: MAX_BULK_TRANSACTIONS });
  }

  const chosen = optionalText(categoryId, "category", 120);
  let chosenName: string | null = null;
  if (chosen) {
    const [match] = await db
      .select({ name: category.name })
      .from(category)
      .where(and(eq(category.id, chosen), eq(category.organizationId, organizationId)));
    if (!match) throw new DataError("categoryNotFound");
    chosenName = match.name;
  }

  const updated = await db
    .update(transaction)
    .set({ categoryId: chosen })
    .where(
      and(
        eq(transaction.organizationId, organizationId),
        inArray(transaction.id, ids),
      ),
    )
    .returning({ id: transaction.id });
  if (updated.length > 0) {
    await recordAudit(actor, {
      area: "transaction",
      action: "categorized",
      ...(chosenName
        ? {
            key: "categorized" as const,
            values: { count: { count: updated.length, of: "transaction" }, category: chosenName },
          }
        : {
            key: "uncategorized" as const,
            values: { count: { count: updated.length, of: "transaction" } },
          }),
    });
  }
  return updated.length;
}

/* ------------------------------------------------------------------ */
/* Importing a bank statement                                          */
/* ------------------------------------------------------------------ */

/**
 * Adds many transactions to one account at once, e.g. from a bank statement
 * file. Lines already in the account (same day, amount and description) are
 * skipped, so importing the same statement twice adds nothing the second
 * time. Category names are matched to the company's categories, ignoring
 * upper/lower case; lines without a known category get one from the
 * company's category rules, or stay uncategorized. Either every line is
 * saved or none is. Unpaid bills whose payment is among the new lines are
 * marked as paid (`billsPaid` says how many), and payments that were
 * recorded by hand for a bill and now arrived as well are removed
 * (`billsMerged`).
 */
export async function importTransactions(
  accountId: string,
  rows: StatementRow[],
): Promise<{
  imported: number;
  skipped: number;
  billsPaid: number;
  billsMerged: number;
}> {
  const actor = await getFinanceContext({ need: "finance.record" });
  const { organizationId, userId, timeZone } = actor;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new DataError("nothingToImport");
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new DataError("tooManyRows", { max: MAX_IMPORT_ROWS });
  }

  const [accountMatches, categories, rules, cards] = await Promise.all([
    db.$count(
      financialAccount,
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.organizationId, organizationId),
      ),
    ),
    db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(eq(category.organizationId, organizationId)),
    selectRules(organizationId),
    selectActiveCards(organizationId),
  ]);
  if (accountMatches === 0) throw new DataError("accountNotFound");
  const categoryIds = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  // Check every line again: the browser's preview can't be trusted
  const parsed = rows.map((row, index) => {
    const line = (problem: DataError) =>
      new DataError("importRow", { row: index + 1, message: (locale) => problem.in(locale) });
    try {
      const day = isoDay(row?.date, "date");
      const amount = money(row.amount, "amount", actor.currency);
      if (amount === 0) throw new DataError("amountZero");
      const categoryName = optionalText(row.category, "category", 120);
      const name = requiredText(row.name, "description");
      return {
        day,
        name,
        amount,
        // Statements list days, not times: noon that day, in the company's timezone
        occurredAt: zonedTime(day, "12:00", timeZone),
        // The file's own category if we know it, otherwise what the rules say
        categoryId:
          (categoryName && categoryIds.get(categoryName.toLowerCase())) ||
          categoryFromRules(name, rules),
        // The card the bank's description names, for money out
        cardId: amount < 0 ? cardFromDescription(name, cards) : null,
      };
    } catch (error) {
      if (error instanceof DataError) throw line(error);
      throw error;
    }
  });

  // What the account already has in the file's date range
  const days = parsed.map((p) => p.day).sort();
  const existing = await db
    .select({
      name: transaction.name,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.organizationId, organizationId),
        eq(transaction.accountId, accountId),
        gte(transaction.occurredAt, startOfDay(days[0], timeZone)),
        lt(transaction.occurredAt, startOfDay(addDays(days.at(-1)!, 1), timeZone)),
      ),
    );
  const toInsert = removeExisting(
    parsed,
    existing.map((t) => duplicateKey(localDay(t.occurredAt, timeZone), t.amount, t.name)),
    (p) => duplicateKey(p.day, p.amount, p.name),
  );

  let bills = { paid: 0, merged: 0 };
  if (toInsert.length > 0) {
    // In chunks, sent together so the database saves all of them or none
    const values = toInsert.map((p) => ({
      // Chosen here, to know afterwards which ones were added
      id: prefixedId("tx")(),
      name: p.name,
      amount: p.amount,
      occurredAt: p.occurredAt,
      categoryId: p.categoryId,
      cardId: p.cardId,
      organizationId,
      accountId,
      status: "completed",
      createdById: userId,
    }));
    const chunks = [];
    for (let i = 0; i < values.length; i += 500) {
      chunks.push(db.insert(transaction).values(values.slice(i, i + 500)));
    }
    await db.batch(chunks as [(typeof chunks)[number], ...typeof chunks]);
    await recordAudit(actor, {
      area: "transaction",
      action: "imported",
      entityId: accountId,
      key: "imported",
      values: { count: { count: toInsert.length, of: "transaction" } },
    });
    // Any of them far above what its vendor usually charges? One email
    // about all of them, without making the person wait
    const charges = values.filter((v) => v.amount < 0).map((v) => v.id);
    // Payments of bills that are still owed mark those bills as paid
    bills = await settleBillsWith(actor, charges);
    await afterResponse(async () => {
      await alertUnusualCharges(organizationId, timeZone, charges);
    });
  }

  return {
    imported: toInsert.length,
    skipped: parsed.length - toInsert.length,
    billsPaid: bills.paid,
    billsMerged: bills.merged,
  };
}
