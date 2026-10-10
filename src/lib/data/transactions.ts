// ─────────────────────────────────────────────────────────────────────────────
// Transactions: reading and saving
//
// In plain words: lists the company's payments in and out — newest first,
// searchable and filterable by account, category and date — and lets people
// add and edit them, one by one or many at once from a bank statement file.
// Everyone on the team can add, import and edit transactions; only owners and
// admins can delete them.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. Account and
// category IDs coming from the browser are checked to belong to the company
// before anything is saved. Days (filters, form dates, each transaction's
// `day`) are calendar days in the company's timezone; a day without a time
// is stored as noon on that day there.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, count, desc, eq, gte, ilike, isNull, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { category, financialAccount, transaction } from "@/db/finance";
import { addDays, localDay, startOfDay, zonedTime } from "@/lib/dates";
import {
  duplicateKey,
  MAX_IMPORT_ROWS,
  removeExisting,
  type StatementRow,
} from "@/lib/finance/statement-import";
import {
  TRANSACTION_STATUSES,
  type ISODate,
  type ISODateTime,
  type TransactionDetails,
  type TransactionStatus,
} from "@/types/finance";
import {
  DataError,
  dateTime,
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
}

/** Ways to narrow down the transactions list */
export interface TransactionFilters {
  /** Matches part of the name, ignoring upper/lower case */
  search?: string;
  accountId?: string;
  /** A category's ID, or "none" for uncategorized transactions */
  categoryId?: string;
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
  amount: transaction.amount,
  occurredAt: transaction.occurredAt,
  status: transaction.status,
  account: transaction.accountId,
  notes: transaction.notes,
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
): TransactionDetails {
  return {
    ...row,
    category: categoryName ?? "Uncategorized",
    date: occurredAt.toISOString(),
    day: localDay(occurredAt, timeZone),
    status: row.status as TransactionStatus,
  };
}

// "50%_off" -> "50\%\_off", so search text is matched literally
const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

/**
 * One page of the company's transactions, newest first, plus how many match
 * the filters in total (for paging).
 */
export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<{ transactions: TransactionDetails[]; total: number }> {
  const { organizationId, timeZone } = await getFinanceContext();

  const conditions: SQL[] = [eq(transaction.organizationId, organizationId)];
  const search = optionalText(filters.search, "Search", 100);
  if (search) {
    conditions.push(ilike(transaction.name, `%${escapeLike(search)}%`));
  }
  if (filters.accountId) {
    conditions.push(eq(transaction.accountId, filters.accountId));
  }
  if (filters.categoryId === "none") {
    conditions.push(isNull(transaction.categoryId));
  } else if (filters.categoryId) {
    conditions.push(eq(transaction.categoryId, filters.categoryId));
  }
  // From the start of the first day to the end of the last, over there
  if (filters.from) {
    const from = isoDay(filters.from, "Start date");
    conditions.push(gte(transaction.occurredAt, startOfDay(from, timeZone)));
  }
  if (filters.to) {
    const to = isoDay(filters.to, "End date");
    conditions.push(lt(transaction.occurredAt, startOfDay(addDays(to, 1), timeZone)));
  }
  const where = and(...conditions);

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
    transactions: rows.map((row) => toTransactionDetails(row, timeZone)),
    total,
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
  return row ? toTransactionDetails(row, timeZone) : null;
}

// Checks what was typed into the transaction form, including that the chosen
// account and category belong to this company
async function parseTransactionInput(
  input: TransactionInput,
  organizationId: string,
  timeZone: string,
) {
  const accountId = requiredText(input.accountId, "Account");
  const categoryId = optionalText(input.categoryId, "Category", 120);

  const [accountMatches, categoryMatches] = await Promise.all([
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
  ]);
  if (accountMatches === 0) throw new DataError("Account not found.");
  if (categoryMatches === 0) throw new DataError("Category not found.");

  const amount = money(input.amount, "Amount");
  if (amount === 0) throw new DataError("Amount can't be zero.");

  // Keep the exact moment when the day didn't change; otherwise noon that day
  const day = isoDay(input.date, "Date");
  const original = input.originalDate ? dateTime(input.originalDate, "Date") : null;
  const occurredAt =
    original && localDay(original, timeZone) === day
      ? original
      : zonedTime(day, "12:00", timeZone);

  return {
    accountId,
    categoryId,
    name: requiredText(input.name, "Name"),
    amount,
    occurredAt,
    status: oneOf(input.status, TRANSACTION_STATUSES, "Status"),
    notes: optionalText(input.notes, "Notes"),
  };
}

/** Adds a transaction and returns its ID. */
export async function createTransaction(
  input: TransactionInput,
): Promise<string> {
  const { organizationId, userId, timeZone } = await getFinanceContext();
  const values = await parseTransactionInput(input, organizationId, timeZone);
  const [row] = await db
    .insert(transaction)
    .values({ ...values, organizationId, createdById: userId })
    .returning({ id: transaction.id });
  return row.id;
}

/** Changes a transaction. */
export async function updateTransaction(id: string, input: TransactionInput) {
  const { organizationId, timeZone } = await getFinanceContext();
  const values = await parseTransactionInput(input, organizationId, timeZone);
  const updated = await db
    .update(transaction)
    .set(values)
    .where(
      and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)),
    )
    .returning({ id: transaction.id });
  if (updated.length === 0) throw new DataError("Transaction not found.");
}

/** Removes a transaction (owners and admins only). */
export async function deleteTransaction(id: string) {
  const { organizationId } = await getFinanceContext({ manage: true });
  const deleted = await db
    .delete(transaction)
    .where(
      and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)),
    )
    .returning({ id: transaction.id });
  if (deleted.length === 0) throw new DataError("Transaction not found.");
}

/* ------------------------------------------------------------------ */
/* Importing a bank statement                                          */
/* ------------------------------------------------------------------ */

/**
 * Adds many transactions to one account at once, e.g. from a bank statement
 * file. Lines already in the account (same day, amount and description) are
 * skipped, so importing the same statement twice adds nothing the second
 * time. Category names are matched to the company's categories, ignoring
 * upper/lower case; unknown ones are left uncategorized. Either every line is
 * saved or none is.
 */
export async function importTransactions(
  accountId: string,
  rows: StatementRow[],
): Promise<{ imported: number; skipped: number }> {
  const { organizationId, userId, timeZone } = await getFinanceContext();

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new DataError("There's nothing to import.");
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new DataError(
      `A file can have at most ${MAX_IMPORT_ROWS} transactions. Split it into smaller files.`,
    );
  }

  const [accountMatches, categories] = await Promise.all([
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
  ]);
  if (accountMatches === 0) throw new DataError("Account not found.");
  const categoryIds = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  // Check every line again: the browser's preview can't be trusted
  const parsed = rows.map((row, index) => {
    const line = (message: string) => new DataError(`Row ${index + 1}: ${message}`);
    try {
      const day = isoDay(row?.date, "Date");
      const amount = money(row.amount, "Amount");
      if (amount === 0) throw new DataError("Amount can't be zero.");
      const categoryName = optionalText(row.category, "Category", 120);
      return {
        day,
        name: requiredText(row.name, "Description"),
        amount,
        // Statements list days, not times: noon that day, in the company's timezone
        occurredAt: zonedTime(day, "12:00", timeZone),
        categoryId: categoryName ? (categoryIds.get(categoryName.toLowerCase()) ?? null) : null,
      };
    } catch (error) {
      if (error instanceof DataError) throw line(error.message);
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

  if (toInsert.length > 0) {
    // In chunks, sent together so the database saves all of them or none
    const values = toInsert.map((p) => ({
      name: p.name,
      amount: p.amount,
      occurredAt: p.occurredAt,
      categoryId: p.categoryId,
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
  }

  return { imported: toInsert.length, skipped: parsed.length - toInsert.length };
}
