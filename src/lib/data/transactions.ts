// ─────────────────────────────────────────────────────────────────────────────
// Transactions: reading and saving
//
// In plain words: lists the company's payments in and out — newest first,
// searchable and filterable by account, category and date — and lets people
// add and edit them. Everyone on the team can add and edit transactions; only
// owners and admins can delete them.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. Account and
// category IDs coming from the browser are checked to belong to the company
// before anything is saved.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, count, desc, eq, gte, ilike, isNull, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { category, financialAccount, transaction } from "@/db/finance";
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
  date: ISODateTime;
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
function toTransactionDetails({
  categoryName,
  occurredAt,
  ...row
}: TransactionRow): TransactionDetails {
  return {
    ...row,
    category: categoryName ?? "Uncategorized",
    date: occurredAt.toISOString(),
    status: row.status as TransactionStatus,
  };
}

// "50%_off" -> "50\%\_off", so search text is matched literally
const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

// The day after an ISO date, e.g. "2026-10-01" -> Oct 2 at midnight
function dayAfter(isoDate: ISODate, field: string): Date {
  const date = dateTime(isoDate, field);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

/**
 * One page of the company's transactions, newest first, plus how many match
 * the filters in total (for paging).
 */
export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<{ transactions: TransactionDetails[]; total: number }> {
  const { organizationId } = await getFinanceContext();

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
  if (filters.from) {
    conditions.push(gte(transaction.occurredAt, dateTime(filters.from, "Start date")));
  }
  if (filters.to) {
    conditions.push(lt(transaction.occurredAt, dayAfter(filters.to, "End date")));
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

  return { transactions: rows.map(toTransactionDetails), total };
}

/** One transaction, or null if the company has no transaction with this ID */
export async function getTransaction(
  id: string,
): Promise<TransactionDetails | null> {
  const { organizationId } = await getFinanceContext();
  const [row] = await selectTransactions().where(
      and(eq(transaction.id, id), eq(transaction.organizationId, organizationId)),
    );
  return row ? toTransactionDetails(row) : null;
}

// Checks what was typed into the transaction form, including that the chosen
// account and category belong to this company
async function parseTransactionInput(
  input: TransactionInput,
  organizationId: string,
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

  return {
    accountId,
    categoryId,
    name: requiredText(input.name, "Name"),
    amount,
    occurredAt: dateTime(input.date, "Date"),
    status: oneOf(input.status, TRANSACTION_STATUSES, "Status"),
    notes: optionalText(input.notes, "Notes"),
  };
}

/** Adds a transaction and returns its ID. */
export async function createTransaction(
  input: TransactionInput,
): Promise<string> {
  const { organizationId, userId } = await getFinanceContext();
  const values = await parseTransactionInput(input, organizationId);
  const [row] = await db
    .insert(transaction)
    .values({ ...values, organizationId, createdById: userId })
    .returning({ id: transaction.id });
  return row.id;
}

/** Changes a transaction. */
export async function updateTransaction(id: string, input: TransactionInput) {
  const { organizationId } = await getFinanceContext();
  const values = await parseTransactionInput(input, organizationId);
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
