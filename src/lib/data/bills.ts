// ─────────────────────────────────────────────────────────────────────────────
// Bills: reading and saving
//
// In plain words: lists what the company still owes (soonest first) and what
// it paid recently, and lets people add, change and pay bills. Paying a bill
// records the payment as a transaction in the chosen account and, if the
// bill repeats, adds the next one. Everyone on the team can add, edit and
// pay bills; only owners and admins can delete them.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. Account and
// category IDs coming from the browser are checked to belong to the company
// before anything is saved. Due dates are calendar days; the payment is
// stored as noon on the chosen day in the company's timezone, like a
// transaction entered by hand.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  bill,
  category,
  financialAccount,
  prefixedId,
  transaction,
} from "@/db/finance";
import { localDay, zonedTime } from "@/lib/dates";
import { describeChanges } from "@/lib/finance/audit";
import { BILL_REPEAT_LABELS, nextDueDate } from "@/lib/finance/bills";
import { categoryFromRules } from "@/lib/finance/category-rules";
import {
  BILL_REPEATS,
  type Bill,
  type BillRepeat,
  type ISODate,
} from "@/types/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { recordAudit } from "./audit";
import { selectRules } from "./category-rules";
import {
  DataError,
  getFinanceContext,
  isoDay,
  money,
  oneOf,
  optionalText,
  requiredText,
} from "./common";

/** How many paid bills the list shows, most recently paid first */
export const PAID_BILLS_SHOWN = 20;

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

/** What a person fills in when marking a bill as paid */
export interface BillPayment {
  /** The account the money left */
  accountId: string;
  /** The day it was paid, in the company's timezone */
  date: ISODate;
}

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

/**
 * The company's bills: everything still owed (soonest due first) and the
 * most recently paid ones.
 */
export async function listBills(): Promise<{ unpaid: Bill[]; paid: Bill[] }> {
  const { organizationId, timeZone } = await getFinanceContext();
  const own = eq(bill.organizationId, organizationId);
  const [unpaid, paid] = await Promise.all([
    selectBills()
      .where(and(own, isNull(bill.paidAt)))
      .orderBy(asc(bill.dueDate), asc(bill.createdAt)),
    selectBills()
      .where(and(own, isNotNull(bill.paidAt)))
      .orderBy(desc(bill.paidAt), desc(bill.createdAt))
      .limit(PAID_BILLS_SHOWN),
  ]);
  return {
    unpaid: unpaid.map((row) => toBill(row, timeZone)),
    paid: paid.map((row) => toBill(row, timeZone)),
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

// Checks what was typed into the bill form, including that the chosen
// category belongs to this company
async function parseBillInput(input: BillInput, organizationId: string) {
  const categoryId = optionalText(input.categoryId, "Category", 120);
  if (categoryId) {
    const matches = await db.$count(
      category,
      and(eq(category.id, categoryId), eq(category.organizationId, organizationId)),
    );
    if (matches === 0) throw new DataError("Category not found.");
  }
  const amount = money(input.amount, "Amount");
  if (amount <= 0) throw new DataError("Amount must be more than zero.");
  return {
    name: requiredText(input.name, "Name"),
    amount,
    dueDate: isoDay(input.dueDate, "Due date"),
    repeat: oneOf(input.repeat, BILL_REPEATS, "Repeat"),
    categoryId,
    notes: optionalText(input.notes, "Notes"),
  };
}

/** Adds a bill and returns its ID. */
export async function createBill(input: BillInput): Promise<string> {
  const actor = await getFinanceContext();
  const { organizationId, userId } = actor;
  const values = await parseBillInput(input, organizationId);
  const [row] = await db
    .insert(bill)
    .values({ ...values, organizationId, createdById: userId })
    .returning({ id: bill.id });
  await recordAudit(actor, {
    area: "bill",
    action: "created",
    entityId: row.id,
    summary: `Added the bill “${values.name}” (${formatCurrency(values.amount, { currency: actor.currency })}, due ${formatDate(values.dueDate)})`,
  });
  return row.id;
}

/** Changes a bill that hasn't been paid yet. */
export async function updateBill(id: string, input: BillInput) {
  const actor = await getFinanceContext();
  const { organizationId } = actor;
  const values = await parseBillInput(input, organizationId);
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
    const changes =
      before && after
        ? describeChanges([
            { label: "name", before: before.name, after: after.name },
            {
              label: "amount",
              before: formatCurrency(before.amount, { currency: actor.currency }),
              after: formatCurrency(after.amount, { currency: actor.currency }),
            },
            {
              label: "due date",
              before: formatDate(before.dueDate),
              after: formatDate(after.dueDate),
            },
            {
              label: "repeat",
              before: BILL_REPEAT_LABELS[before.repeat as BillRepeat],
              after: BILL_REPEAT_LABELS[after.repeat as BillRepeat],
            },
            { label: "category", before: before.category, after: after.category },
            { label: "notes", before: before.notes, after: after.notes },
          ])
        : "";
    // Saved without changing anything: nothing to record
    if (changes) {
      await recordAudit(actor, {
        area: "bill",
        action: "updated",
        entityId: id,
        summary: `Changed the bill “${values.name}”: ${changes}`,
      });
    }
    return;
  }
  // Nothing changed: either it isn't this company's, or it's already paid
  const exists = await db.$count(
    bill,
    and(eq(bill.id, id), eq(bill.organizationId, organizationId)),
  );
  throw new DataError(
    exists ? "This bill is already paid and can't be changed." : "Bill not found.",
  );
}

/**
 * Removes a bill (owners and admins only). The payment of a paid bill stays
 * in the transactions.
 */
export async function deleteBill(id: string) {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  const deleted = await db
    .delete(bill)
    .where(and(eq(bill.id, id), eq(bill.organizationId, organizationId)))
    .returning({ id: bill.id, name: bill.name, amount: bill.amount, paidAt: bill.paidAt });
  if (deleted.length === 0) throw new DataError("Bill not found.");
  const [gone] = deleted;
  await recordAudit(actor, {
    area: "bill",
    action: "deleted",
    entityId: id,
    summary: `Deleted the ${gone.paidAt ? "paid " : ""}bill “${gone.name}” (${formatCurrency(gone.amount, { currency: actor.currency })})`,
  });
}

/**
 * Marks a bill as paid: records the payment as a completed transaction in
 * the chosen account and, if the bill repeats, adds the next one. Without a
 * category, the payment gets one from the company's category rules if a rule
 * fits. Returns the next bill's due date (null if it doesn't repeat).
 */
export async function payBill(
  id: string,
  payment: BillPayment,
): Promise<{ transactionId: string; nextDueDate: ISODate | null }> {
  const actor = await getFinanceContext();
  const { organizationId, userId, timeZone } = actor;
  const accountId = requiredText(payment.accountId, "Account");
  const day = isoDay(payment.date, "Payment date");

  const [[row], accountMatches] = await Promise.all([
    db
      .select()
      .from(bill)
      .where(and(eq(bill.id, id), eq(bill.organizationId, organizationId))),
    db.$count(
      financialAccount,
      and(
        eq(financialAccount.id, accountId),
        eq(financialAccount.organizationId, organizationId),
      ),
    ),
  ]);
  if (!row) throw new DataError("Bill not found.");
  if (row.paidAt) throw new DataError("This bill is already paid.");
  if (accountMatches === 0) throw new DataError("Account not found.");

  const paidAt = zonedTime(day, "12:00", timeZone);
  const transactionId = prefixedId("tx")();
  const next = nextDueDate(row.dueDate, row.repeat as BillRepeat);

  const recordPayment = db.insert(transaction).values({
    id: transactionId,
    organizationId,
    accountId,
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
  const markPaid = db
    .update(bill)
    .set({ paidAt, transactionId })
    .where(and(eq(bill.id, id), eq(bill.organizationId, organizationId)));
  // All together or not at all: a payment without a paid bill would be
  // paid twice
  if (next) {
    await db.batch([
      recordPayment,
      markPaid,
      db.insert(bill).values({
        organizationId,
        name: row.name,
        amount: row.amount,
        dueDate: next,
        repeat: row.repeat,
        categoryId: row.categoryId,
        notes: row.notes,
        createdById: userId,
      }),
    ]);
  } else {
    await db.batch([recordPayment, markPaid]);
  }
  await recordAudit(actor, {
    area: "bill",
    action: "paid",
    entityId: id,
    summary: `Marked the bill “${row.name}” (${formatCurrency(row.amount, { currency: actor.currency })}) as paid on ${formatDate(day)}`,
  });
  return { transactionId, nextDueDate: next };
}
