// ─────────────────────────────────────────────────────────────────────────────
// Bills: reading and saving
//
// In plain words: lists what the company still owes (soonest first) and what it
// paid recently, and lets people add, change and pay bills. Paying a bill
// records the payment as a transaction in the chosen account — or, when the
// payment is already among the transactions (it came with a bank statement),
// points the bill at that one — and, if the bill repeats, adds the next one.
// When transactions arrive (an imported statement, a linked bank, one typed
// in), the ones that clearly are a bill's payment mark that bill as paid by
// themselves; ones that only might be are pointed out on the Bills page. A
// payment can be undone, which makes the bill owed again. Everyone on the team
// can add, edit and pay bills; only owners, admins and accountants can delete
// them or undo a payment.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. Account and
// category IDs coming from the browser are checked to belong to the company
// before anything is saved. Due dates are calendar days; the payment is
// stored as noon on the chosen day in the company's timezone, like a
// transaction entered by hand.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  attachment,
  bill,
  category,
  financialAccount,
  prefixedId,
  transaction,
} from "@/db/finance";
import { addDays, localDay, startOfDay, todayIn, zonedTime } from "@/lib/dates";
import { hasChanges, type AuditChange } from "@/lib/finance/audit";
import {
  matchBillPayments,
  nextDueDate,
} from "@/lib/finance/bills";
import { categoryFromRules } from "@/lib/finance/category-rules";
import {
  BILL_REPEATS,
  type Bill,
  type BillPaymentCandidate,
  type BillRepeat,
  type ISODate,
} from "@/types/finance";
import { recordAudit, type AuditActor } from "./audit";
import { selectRules } from "./category-rules";
import {
  DataError,
  escapeLike,
  getCompanyLocale,
  getFinanceContext,
  isoDay,
  money,
  oneOf,
  optionalText,
  requiredText,
} from "./common";

/** How many paid bills the list shows, most recently paid first */
export const PAID_BILLS_SHOWN = 20;
/** How many it shows when asked for all of them */
export const ALL_PAID_BILLS_SHOWN = 500;

/** The most bills an export file holds */
const MAX_EXPORT_BILLS = 20_000;

/** What a person fills in when adding or editing a bill */
export interface BillInput {
  name: string;
  /** A positive number */
  amount: number;
  dueDate: ISODate;
  repeat: BillRepeat;
  categoryId: string | null;
  notes?: string | null;
}

/**
 * A transaction counts as a possible payment of a bill when it happened
 * within this many days of the due date, before or after
 */
export const PAYMENT_MATCH_DAYS = 45;
/** How many possible payments the "Mark as paid" window offers */
const MAX_PAYMENT_CANDIDATES = 5;

/**
 * What a person fills in when marking a bill as paid: where and when the
 * money left, or the transaction that already is the payment
 */
export type BillPayment =
  | {
      /** The account the money left */
      accountId: string;
      /** The day it was paid, in the company's timezone */
      date: ISODate;
    }
  | {
      /** A transaction of the company that is this bill's payment */
      transactionId: string;
    };

// Bills with their category's name; add .where() etc. to narrow down
function selectBills() {
  return db
    .select({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      dueDate: bill.dueDate,
      repeat: bill.repeat,
      categoryId: bill.categoryId,
      category: category.name,
      notes: bill.notes,
      paidAt: bill.paidAt,
      transactionId: bill.transactionId,
      paymentLinked: bill.paymentLinked,
    })
    .from(bill)
    .leftJoin(category, eq(bill.categoryId, category.id));
}

type BillRow = Awaited<ReturnType<typeof selectBills>>[number];

// Turns a database row into the shape the components use
function toBill({ paidAt, ...row }: BillRow, timeZone: string): Bill {
  return {
    ...row,
    repeat: row.repeat as BillRepeat,
    paidDay: paidAt ? localDay(paidAt, timeZone) : null,
  };
}

// Bills with the text in their name, notes or category's name (upper/lower
// case doesn't matter); undefined for an empty search. For queries made
// with selectBills(), which joins the category.
function matchingSearch(search: string | undefined) {
  const text = (search ?? "").trim().slice(0, 100);
  if (!text) return undefined;
  const pattern = `%${escapeLike(text)}%`;
  return or(
    ilike(bill.name, pattern),
    ilike(bill.notes, pattern),
    ilike(category.name, pattern),
  );
}

/** How many of the company's bills, paid or not, match a search */
export async function countBillsMatching(search: string): Promise<number> {
  const { organizationId } = await getFinanceContext();
  const matching = matchingSearch(search);
  if (!matching) return 0;
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(bill)
    .leftJoin(category, eq(bill.categoryId, category.id))
    .where(and(eq(bill.organizationId, organizationId), matching));
  return row.count;
}

/**
 * The company's bills: everything still owed (soonest due first) and the
 * most recently paid ones.
 */
export async function listBills({
  allPaid = false,
  search = "",
}: {
  /** Every paid bill (up to ALL_PAID_BILLS_SHOWN) rather than the latest few */
  allPaid?: boolean;
  /** Only bills with this in their name, notes or category's name */
  search?: string;
} = {}): Promise<{
  unpaid: Bill[];
  paid: Bill[];
  /** The unpaid bills (IDs) that a transaction already there may have paid */
  possiblyPaid: string[];
  /** Whether there are more paid bills than `paid` holds */
  morePaid: boolean;
}> {
  const { organizationId, timeZone } = await getFinanceContext();
  const own = and(
    eq(bill.organizationId, organizationId),
    matchingSearch(search),
  );
  const [unpaid, paid, possiblyPaid] = await Promise.all([
    selectBills()
      .where(and(own, isNull(bill.paidAt)))
      .orderBy(asc(bill.dueDate), asc(bill.createdAt)),
    selectBills()
      .where(and(own, isNotNull(bill.paidAt)))
      .orderBy(desc(bill.paidAt), desc(bill.createdAt))
      // One more than shown, so the page knows whether there are more
      .limit(allPaid ? ALL_PAID_BILLS_SHOWN : PAID_BILLS_SHOWN + 1),
    selectPossiblyPaid(organizationId),
  ]);
  return {
    unpaid: unpaid.map((row) => toBill(row, timeZone)),
    paid: paid
      .slice(0, allPaid ? ALL_PAID_BILLS_SHOWN : PAID_BILLS_SHOWN)
      .map((row) => toBill(row, timeZone)),
    possiblyPaid: possiblyPaid.map((row) => row.billId),
    morePaid: !allPaid && paid.length > PAID_BILLS_SHOWN,
  };
}

/**
 * The unpaid bills of a company that a transaction already there may have
 * paid: money out of exactly the bill's amount, within PAYMENT_MATCH_DAYS of
 * its due date, that no bill points at. With when the latest such
 * transaction was entered (for the notifications). It's what the "Mark as
 * paid" window offers, give or take the hours between the company's
 * timezone and UTC at the edges.
 */
export async function selectPossiblyPaid(
  organizationId: string,
): Promise<{ billId: string; at: Date }[]> {
  const rows = await db
    .select({
      billId: bill.id,
      at: sql`max(${transaction.createdAt})`.mapWith(transaction.createdAt),
    })
    .from(bill)
    .innerJoin(
      transaction,
      and(
        eq(transaction.organizationId, bill.organizationId),
        sql`${transaction.amount} = -${bill.amount}`,
        sql`${transaction.occurredAt} >= ${bill.dueDate}::date - ${PAYMENT_MATCH_DAYS}::int`,
        sql`${transaction.occurredAt} < ${bill.dueDate}::date + ${PAYMENT_MATCH_DAYS + 1}::int`,
        sql`not exists (select 1 from ${bill} as paid_bill where paid_bill.transaction_id = ${transaction.id})`,
      ),
    )
    .where(and(eq(bill.organizationId, organizationId), isNull(bill.paidAt)))
    .groupBy(bill.id);
  return rows as { billId: string; at: Date }[];
}

/** How many rounds of matching one batch of new transactions gets */
const MAX_SETTLE_ROUNDS = 12;

/**
 * Marks as paid the unpaid bills whose payment is among these transactions
 * (ones that just arrived: an import, a bank sync, one typed in), and adds
 * the next bill of each that repeats. The transactions stay as they are.
 * Only clear cases: see matchBillPayments().
 *
 * A bill that someone already marked as paid by hand gets the same check:
 * if its payment now arrives as well, the transaction "Mark as paid"
 * recorded is a duplicate. It's removed (its notes, category and files move
 * to the one that arrived) and the bill points at the arrived one. Not for
 * a transaction typed in by hand (`merge: false`): a person adding a second
 * payment to the same vendor may well mean a second payment.
 *
 * Returns how many bills were paid and how many duplicates were removed.
 * Never throws: a bill that couldn't be matched must not undo an import. No
 * login here; the caller has checked the company.
 */
export async function settleBillsWith(
  actor: AuditActor,
  transactionIds: string[],
  { merge = true }: { merge?: boolean } = {},
): Promise<{ paid: number; merged: number }> {
  const nothing = { paid: 0, merged: 0 };
  try {
    const { organizationId } = actor;
    if (transactionIds.length === 0) return nothing;
    // Without bills there's nothing to do, however large the import
    const anyBills = await db.$count(bill, eq(bill.organizationId, organizationId));
    if (anyBills === 0) return nothing;

    const { timeZone, currency } = await getCompanyLocale(organizationId);
    const arrived = [];
    for (let i = 0; i < transactionIds.length; i += 5000) {
      arrived.push(
        ...(await db
          .select({
            id: transaction.id,
            name: transaction.name,
            amount: transaction.amount,
            occurredAt: transaction.occurredAt,
          })
          .from(transaction)
          .where(
            and(
              eq(transaction.organizationId, organizationId),
              inArray(transaction.id, transactionIds.slice(i, i + 5000)),
              lt(transaction.amount, 0),
              notExists(
                db
                  .select({ id: bill.id })
                  .from(bill)
                  .where(eq(bill.transactionId, transaction.id)),
              ),
            ),
          )),
      );
    }
    let payments = arrived.map((t) => ({ ...t, day: localDay(t.occurredAt, timeZone) }));

    let settled = 0;
    // A statement of several months can hold several payments of one
    // repeating bill: each round pays the bill that's owed now, which adds
    // the next one for the following round
    for (let round = 0; round < MAX_SETTLE_ROUNDS && payments.length > 0; round++) {
      const owed = await db
        .select()
        .from(bill)
        .where(and(eq(bill.organizationId, organizationId), isNull(bill.paidAt)));
      const matches = matchBillPayments(
        owed.map((b) => ({ ...b, repeat: b.repeat as BillRepeat })),
        payments,
      );
      if (matches.length === 0) break;

      for (const match of matches) {
        const row = owed.find((b) => b.id === match.billId)!;
        const payment = payments.find((p) => p.id === match.paymentId)!;
        const next = nextDueDate(row.dueDate, row.repeat as BillRepeat);
        const markPaid = db
          .update(bill)
          .set({ paidAt: payment.occurredAt, transactionId: payment.id, paymentLinked: true })
          .where(
            and(
              eq(bill.id, row.id),
              eq(bill.organizationId, organizationId),
              isNull(bill.paidAt),
            ),
          );
        if (next) {
          await db.batch([
            markPaid,
            db.insert(bill).values({
              organizationId,
              name: row.name,
              amount: row.amount,
              dueDate: next,
              repeat: row.repeat,
              categoryId: row.categoryId,
              notes: row.notes,
              createdById: actor.userId,
            }),
          ]);
        } else {
          await markPaid;
        }
        settled++;
        await recordAudit(actor, {
          area: "bill",
          action: "paid",
          entityId: row.id,
          key: "billPaidByArrival",
          values: {
            name: row.name,
            amount: { money: row.amount, currency },
            day: { day: payment.day },
            payment: payment.name,
          },
        });
      }
      const used = new Set(matches.map((m) => m.paymentId));
      payments = payments.filter((p) => !used.has(p.id));
    }

    // Bills marked as paid by hand, whose recorded payment is still there
    let merged = 0;
    const recorded =
      merge && payments.length > 0
        ? await db
            .select()
            .from(bill)
            .where(
              and(
                eq(bill.organizationId, organizationId),
                isNotNull(bill.paidAt),
                isNotNull(bill.transactionId),
                eq(bill.paymentLinked, false),
              ),
            )
        : [];
    for (const match of matchBillPayments(
      recorded.map((b) => ({ ...b, repeat: b.repeat as BillRepeat })),
      payments,
    )) {
      const row = recorded.find((b) => b.id === match.billId)!;
      const payment = payments.find((p) => p.id === match.paymentId)!;
      const duplicateId = row.transactionId!;
      const [duplicate] = await db
        .select({ notes: transaction.notes, categoryId: transaction.categoryId })
        .from(transaction)
        .where(
          and(
            eq(transaction.id, duplicateId),
            eq(transaction.organizationId, organizationId),
          ),
        );
      if (!duplicate) continue;
      await db.batch([
        // What people added to the recorded payment isn't lost
        db
          .update(attachment)
          .set({ transactionId: payment.id })
          .where(
            and(
              eq(attachment.transactionId, duplicateId),
              eq(attachment.organizationId, organizationId),
            ),
          ),
        db
          .update(transaction)
          .set({
            notes: sql`coalesce(${transaction.notes}, ${duplicate.notes})`,
            categoryId: sql`coalesce(${transaction.categoryId}, ${duplicate.categoryId})`,
          })
          .where(
            and(
              eq(transaction.id, payment.id),
              eq(transaction.organizationId, organizationId),
            ),
          ),
        db
          .update(bill)
          .set({ paidAt: payment.occurredAt, transactionId: payment.id, paymentLinked: true })
          .where(and(eq(bill.id, row.id), eq(bill.organizationId, organizationId))),
        db
          .delete(transaction)
          .where(
            and(
              eq(transaction.id, duplicateId),
              eq(transaction.organizationId, organizationId),
            ),
          ),
      ]);
      merged++;
      await recordAudit(actor, {
        area: "bill",
        action: "payment-merged",
        entityId: row.id,
        key: "billPaymentMerged",
        values: {
          name: row.name,
          amount: { money: row.amount, currency },
          payment: payment.name,
          day: { day: payment.day },
        },
      });
    }
    return { paid: settled, merged };
  } catch (error) {
    console.error("[bills] Could not match new transactions to bills:", error);
    return nothing;
  }
}

/** Every bill for the export file: what's still owed first, then the paid ones */
export async function exportBills(): Promise<{ bills: Bill[]; today: ISODate }> {
  const { organizationId, timeZone } = await getFinanceContext();
  const rows = await selectBills()
    .where(eq(bill.organizationId, organizationId))
    .orderBy(
      // Unpaid (no payment day) first
      sql`${bill.paidAt} is not null`,
      desc(bill.paidAt),
      asc(bill.dueDate),
      asc(bill.createdAt),
    )
    .limit(MAX_EXPORT_BILLS);
  return {
    bills: rows.map((row) => toBill(row, timeZone)),
    today: todayIn(timeZone),
  };
}

/** One bill, or null if the company has no bill with this ID */
export async function getBill(id: string): Promise<Bill | null> {
  const { organizationId, timeZone } = await getFinanceContext();
  const [row] = await selectBills().where(
    and(eq(bill.id, id), eq(bill.organizationId, organizationId)),
  );
  return row ? toBill(row, timeZone) : null;
}

// Transactions that could be the payment of a bill: money out of exactly
// its amount, around its due date, that no bill points at yet. The closest
// to the due date first.
async function selectPaymentCandidates(
  organizationId: string,
  timeZone: string,
  owed: { amount: number; dueDate: ISODate },
) {
  const rows = await db
    .select({
      id: transaction.id,
      name: transaction.name,
      occurredAt: transaction.occurredAt,
      account: financialAccount.name,
    })
    .from(transaction)
    .innerJoin(financialAccount, eq(transaction.accountId, financialAccount.id))
    .where(
      and(
        eq(transaction.organizationId, organizationId),
        eq(transaction.amount, -owed.amount),
        gte(
          transaction.occurredAt,
          startOfDay(addDays(owed.dueDate, -PAYMENT_MATCH_DAYS), timeZone),
        ),
        lt(
          transaction.occurredAt,
          startOfDay(addDays(owed.dueDate, PAYMENT_MATCH_DAYS + 1), timeZone),
        ),
        notExists(
          db
            .select({ id: bill.id })
            .from(bill)
            .where(eq(bill.transactionId, transaction.id)),
        ),
      ),
    );
  const due = zonedTime(owed.dueDate, "12:00", timeZone).getTime();
  const distance = (row: (typeof rows)[number]) =>
    Math.abs(row.occurredAt.getTime() - due);
  return rows.sort((a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id));
}

/**
 * The transactions that look like the payment of an unpaid bill (see
 * selectPaymentCandidates), for the "Mark as paid" window. Empty for a bill
 * that is paid or isn't the company's.
 */
export async function listBillPaymentCandidates(
  id: string,
): Promise<BillPaymentCandidate[]> {
  const { organizationId, timeZone } = await getFinanceContext();
  const [owed] = await db
    .select({ amount: bill.amount, dueDate: bill.dueDate })
    .from(bill)
    .where(
      and(
        eq(bill.id, id),
        eq(bill.organizationId, organizationId),
        isNull(bill.paidAt),
      ),
    );
  if (!owed) return [];
  const rows = await selectPaymentCandidates(organizationId, timeZone, owed);
  return rows.slice(0, MAX_PAYMENT_CANDIDATES).map(({ occurredAt, ...row }) => ({
    ...row,
    day: localDay(occurredAt, timeZone),
  }));
}

// Checks what was typed into the bill form, including that the chosen
// category belongs to this company
async function parseBillInput(
  input: BillInput,
  organizationId: string,
  currency: string,
) {
  const categoryId = optionalText(input.categoryId, "category", 120);
  if (categoryId) {
    const matches = await db.$count(
      category,
      and(eq(category.id, categoryId), eq(category.organizationId, organizationId)),
    );
    if (matches === 0) throw new DataError("categoryNotFound");
  }
  const amount = money(input.amount, "amount", currency);
  if (amount <= 0) throw new DataError("amountAboveZero");
  return {
    name: requiredText(input.name, "bill"),
    amount,
    dueDate: isoDay(input.dueDate, "dueDate"),
    repeat: oneOf(input.repeat, BILL_REPEATS, "repeat"),
    categoryId,
    notes: optionalText(input.notes, "notes"),
  };
}

/** Adds a bill and returns its ID. */
export async function createBill(input: BillInput): Promise<string> {
  const actor = await getFinanceContext({ need: "finance.record" });
  const { organizationId, userId } = actor;
  const values = await parseBillInput(input, organizationId, actor.currency);
  const [row] = await db
    .insert(bill)
    .values({ ...values, organizationId, createdById: userId })
    .returning({ id: bill.id });
  await recordAudit(actor, {
    area: "bill",
    action: "created",
    entityId: row.id,
    key: "billAdded",
    values: {
      name: values.name,
      amount: { money: values.amount, currency: actor.currency },
      due: { day: values.dueDate },
    },
  });
  return row.id;
}

/** Changes a bill that hasn't been paid yet. */
export async function updateBill(id: string, input: BillInput) {
  const actor = await getFinanceContext({ need: "finance.record" });
  const { organizationId } = actor;
  const values = await parseBillInput(input, organizationId, actor.currency);
  const own = and(eq(bill.id, id), eq(bill.organizationId, organizationId));
  // What it was, to say what changed
  const [before] = await selectBills().where(own);
  const updated = await db
    .update(bill)
    .set(values)
    .where(
      and(
        eq(bill.id, id),
        eq(bill.organizationId, organizationId),
        isNull(bill.paidAt),
      ),
    )
    .returning({ id: bill.id });
  if (updated.length > 0) {
    const [after] = await selectBills().where(own);
    const money = (amount: number) => ({ money: amount, currency: actor.currency });
    const changes: AuditChange[] =
      before && after
        ? [
            { field: "name", before: before.name, after: after.name },
            { field: "amount", before: money(before.amount), after: money(after.amount) },
            { field: "dueDate", before: { day: before.dueDate }, after: { day: after.dueDate } },
            { field: "repeat", before: { repeat: before.repeat }, after: { repeat: after.repeat } },
            { field: "category", before: before.category, after: after.category },
            { field: "notes", before: before.notes, after: after.notes },
          ]
        : [];
    // Saved without changing anything: nothing to record
    if (hasChanges(changes)) {
      await recordAudit(actor, {
        area: "bill",
        action: "updated",
        entityId: id,
        key: "billChanged",
        values: { name: values.name, changes: { changes } },
      });
    }
    return;
  }
  // Nothing changed: either it isn't this company's, or it's already paid
  const exists = await db.$count(
    bill,
    and(eq(bill.id, id), eq(bill.organizationId, organizationId)),
  );
  throw new DataError(exists ? "billPaidCantChange" : "billNotFound");
}

/**
 * Removes a bill (owners, admins and accountants only). The payment of a paid
 * bill stays in the transactions.
 */
export async function deleteBill(id: string) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const deleted = await db
    .delete(bill)
    .where(and(eq(bill.id, id), eq(bill.organizationId, organizationId)))
    .returning({ id: bill.id, name: bill.name, amount: bill.amount, paidAt: bill.paidAt });
  if (deleted.length === 0) throw new DataError("billNotFound");
  const [gone] = deleted;
  await recordAudit(actor, {
    area: "bill",
    action: "deleted",
    entityId: id,
    key: gone.paidAt ? "paidBillDeleted" : "billDeleted",
    values: { name: gone.name, amount: { money: gone.amount, currency: actor.currency } },
  });
}

/**
 * Marks a bill as paid and, if the bill repeats, adds the next one. The
 * payment is either recorded as a completed transaction in the chosen
 * account (without a category, it gets one from the company's category
 * rules if a rule fits), or it is a transaction that's already there: one
 * of the bill's possible payments (see selectPaymentCandidates), which is
 * left as it is. Returns the next bill's due date (null if it doesn't
 * repeat).
 */
export async function payBill(
  id: string,
  payment: BillPayment,
): Promise<{ transactionId: string; nextDueDate: ISODate | null }> {
  const actor = await getFinanceContext({ need: "finance.record" });
  const { organizationId, userId, timeZone } = actor;
  const existingId =
    "transactionId" in payment
      ? requiredText(payment.transactionId, "payment")
      : null;
  const accountId =
    "transactionId" in payment ? null : requiredText(payment.accountId, "account");
  const day = "transactionId" in payment ? null : isoDay(payment.date, "paymentDate");

  const [row] = await db
    .select()
    .from(bill)
    .where(and(eq(bill.id, id), eq(bill.organizationId, organizationId)));
  if (!row) throw new DataError("billNotFound");
  if (row.paidAt) throw new DataError("billAlreadyPaid");

  let paidAt: Date;
  let transactionId: string;
  let recordPayment = null;
  if (existingId) {
    // Only what the window offered: the company's own, of the bill's
    // amount, and not another bill's payment already
    const candidates = await selectPaymentCandidates(organizationId, timeZone, row);
    const existing = candidates.find((candidate) => candidate.id === existingId);
    if (!existing) {
      throw new DataError("wrongPayment");
    }
    paidAt = existing.occurredAt;
    transactionId = existing.id;
  } else {
    const accountMatches = await db.$count(
      financialAccount,
      and(
        eq(financialAccount.id, accountId!),
        eq(financialAccount.organizationId, organizationId),
      ),
    );
    if (accountMatches === 0) throw new DataError("accountNotFound");
    paidAt = zonedTime(day!, "12:00", timeZone);
    transactionId = prefixedId("tx")();
    recordPayment = db.insert(transaction).values({
      id: transactionId,
      organizationId,
      accountId: accountId!,
      categoryId:
        row.categoryId ??
        categoryFromRules(row.name, await selectRules(organizationId)),
      name: row.name,
      amount: -row.amount,
      occurredAt: paidAt,
      status: "completed",
      notes: row.notes,
      createdById: userId,
    });
  }
  const next = nextDueDate(row.dueDate, row.repeat as BillRepeat);

  const markPaid = db
    .update(bill)
    .set({ paidAt, transactionId, paymentLinked: recordPayment === null })
    .where(and(eq(bill.id, id), eq(bill.organizationId, organizationId)));
  const addNext = next
    ? db.insert(bill).values({
        organizationId,
        name: row.name,
        amount: row.amount,
        dueDate: next,
        repeat: row.repeat,
        categoryId: row.categoryId,
        notes: row.notes,
        createdById: userId,
      })
    : null;
  // All together or not at all: a payment without a paid bill would be
  // paid twice
  const steps = [recordPayment, markPaid, addNext].filter((step) => step !== null);
  await db.batch(steps as [(typeof steps)[number], ...typeof steps]);
  await recordAudit(actor, {
    area: "bill",
    action: "paid",
    entityId: id,
    key: recordPayment ? "billPaid" : "billPaidLinked",
    values: {
      name: row.name,
      amount: { money: row.amount, currency: actor.currency },
      day: { day: localDay(paidAt, timeZone) },
    },
  });
  return { transactionId, nextDueDate: next };
}

/**
 * Undoes a bill's payment (owners, admins and accountants only): the bill is
 * owed again. The transaction that "Mark as paid" recorded is deleted; a
 * payment that was already in the transactions stays there. The next bill that
 * was added for a repeating one is removed too, if nobody touched it since.
 * Returns whether a transaction was deleted.
 */
export async function undoBillPayment(id: string): Promise<{ deletedPayment: boolean }> {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const own = and(eq(bill.id, id), eq(bill.organizationId, organizationId));
  const [row] = await db.select().from(bill).where(own);
  if (!row) throw new DataError("billNotFound");
  if (!row.paidAt) throw new DataError("billNotPaid");

  // The bill that paying this one added, as long as it's still as it was
  const next = nextDueDate(row.dueDate, row.repeat as BillRepeat);
  const [followUp] = next
    ? await db
        .select({ id: bill.id })
        .from(bill)
        .where(
          and(
            eq(bill.organizationId, organizationId),
            isNull(bill.paidAt),
            eq(bill.name, row.name),
            eq(bill.amount, row.amount),
            eq(bill.dueDate, next),
            eq(bill.repeat, row.repeat),
          ),
        )
        .orderBy(desc(bill.createdAt))
        .limit(1)
    : [];

  const deletePayment =
    row.transactionId && !row.paymentLinked
      ? db
          .delete(transaction)
          .where(
            and(
              eq(transaction.id, row.transactionId),
              eq(transaction.organizationId, organizationId),
            ),
          )
      : null;
  const steps = [
    // First, while it still says which transaction it is
    db
      .update(bill)
      .set({ paidAt: null, transactionId: null, paymentLinked: false })
      .where(own),
    deletePayment,
    followUp ? db.delete(bill).where(eq(bill.id, followUp.id)) : null,
  ].filter((step) => step !== null);
  await db.batch(steps as [(typeof steps)[number], ...typeof steps]);

  await recordAudit(actor, {
    area: "bill",
    action: "payment-undone",
    entityId: id,
    key: deletePayment ? "billPaymentUndoneDeleted" : "billPaymentUndone",
    values: { name: row.name, amount: { money: row.amount, currency: actor.currency } },
  });
  return { deletedPayment: deletePayment !== null };
}
