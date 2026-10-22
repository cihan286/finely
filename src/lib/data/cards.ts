// ─────────────────────────────────────────────────────────────────────────────
// Payment cards: reading and saving
//
// In plain words: the company's payment cards — the ones its bank issued —
// listed with who carries each, its last four digits and, if wanted, a
// monthly limit, plus what was paid with each so far this month. Owners and
// admins add, change, archive and delete cards; everyone on the team sees
// them and can say which card a transaction was paid with. Finely keeps
// track only: it doesn't issue cards and can't block one.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. A card's
// holder must be on the company's team. "This month" is the calendar month
// in the company's timezone; only completed money out counts, like the
// budgets. selectActiveCards() is for the code that recognizes a card in a
// new transaction's description (lib/finance/cards.ts).
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, eq, gte, isNull, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { card, transaction } from "@/db/finance";
import { member, user } from "@/db/schema";
import { startOfDay, todayIn } from "@/lib/dates";
import { hasChanges, type AuditChange } from "@/lib/finance/audit";
import { monthStart, nextMonthStart } from "@/lib/finance/budgets";
import { buildCards, type CardProgress } from "@/lib/finance/cards";
import type { Card, ISODate } from "@/types/finance";
import { recordAudit } from "./audit";
import {
  DataError,
  getFinanceContext,
  money,
  optionalText,
  requiredText,
} from "./common";

/** What a person fills in when adding or editing a card */
export interface CardInput {
  name: string;
  /** The last four digits of the card's number */
  last4: string;
  /** The team member (their user ID) who carries it; null for a shared card */
  holderId: string | null;
  /** The most it should spend per month; null for no limit */
  monthlyLimit: number | null;
}

// Cards with their holder's name; add .where() etc. to narrow down
function selectCards() {
  return db
    .select({
      id: card.id,
      name: card.name,
      last4: card.last4,
      holderId: card.holderId,
      holder: user.name,
      monthlyLimit: card.monthlyLimit,
      archivedAt: card.archivedAt,
    })
    .from(card)
    .leftJoin(user, eq(card.holderId, user.id));
}

type CardRow = Awaited<ReturnType<typeof selectCards>>[number];

// Turns a database row into the shape the components use
const toCard = ({ archivedAt, ...row }: CardRow): Card => ({
  ...row,
  archived: archivedAt !== null,
});

/**
 * A company's cards that are in use, as much as recognizing one in a
 * description needs. No login here: the caller has checked the company.
 */
export async function selectActiveCards(
  organizationId: string,
): Promise<{ id: string; last4: string }[]> {
  return db
    .select({ id: card.id, last4: card.last4 })
    .from(card)
    .where(and(eq(card.organizationId, organizationId), isNull(card.archivedAt)))
    .orderBy(asc(card.createdAt));
}

/**
 * Every card of a company with what was paid with it during the month
 * `today` is in, and when its latest payment was entered (null without
 * payments). Shared with the notifications.
 */
export async function selectCardSpending(
  organizationId: string,
  timeZone: string,
  today: ISODate,
) {
  const rows = await db
    .select({
      id: card.id,
      name: card.name,
      last4: card.last4,
      holderId: card.holderId,
      holder: user.name,
      monthlyLimit: card.monthlyLimit,
      archivedAt: card.archivedAt,
      spent: sql<number>`coalesce(-sum(${transaction.amount}), 0)`.mapWith(Number),
      payments: sql<number>`count(${transaction.id})`.mapWith(Number),
      changedAt: sql`max(${transaction.createdAt})`.mapWith(
        transaction.createdAt,
      ) as SQL<Date | null>,
    })
    .from(card)
    .leftJoin(user, eq(card.holderId, user.id))
    // The month's payments are picked in the join, so cards without any
    // still appear, with nothing spent
    .leftJoin(
      transaction,
      and(
        eq(transaction.cardId, card.id),
        eq(transaction.status, "completed"),
        lt(transaction.amount, 0),
        gte(transaction.occurredAt, startOfDay(monthStart(today), timeZone)),
        lt(transaction.occurredAt, startOfDay(nextMonthStart(today), timeZone)),
      ),
    )
    .where(eq(card.organizationId, organizationId))
    .groupBy(card.id, user.name);
  return rows.map(({ archivedAt, ...row }) => ({ ...row, archived: archivedAt !== null }));
}

/** The company's cards with this month's spending; cards in use first */
export async function listCards(): Promise<{
  /** Today in the company's timezone; its month is the one shown */
  today: ISODate;
  cards: CardProgress[];
}> {
  const { organizationId, timeZone } = await getFinanceContext();
  const today = todayIn(timeZone);
  const rows = await selectCardSpending(organizationId, timeZone, today);
  return {
    today,
    cards: buildCards(rows),
  };
}

/** One card, or null if the company has no card with this ID */
export async function getCard(id: string): Promise<Card | null> {
  const { organizationId } = await getFinanceContext();
  const [row] = await selectCards().where(
    and(eq(card.id, id), eq(card.organizationId, organizationId)),
  );
  return row ? toCard(row) : null;
}

// Checks what was typed into the card form, including that the chosen
// holder is on this company's team
async function parseCardInput(
  input: CardInput,
  organizationId: string,
  currency: string,
) {
  const last4 = requiredText(input.last4, "lastFour", 4);
  if (!/^\d{4}$/.test(last4)) {
    throw new DataError("lastFourDigits");
  }
  const holderId = optionalText(input.holderId, "cardHolder", 120);
  if (holderId) {
    const matches = await db.$count(
      member,
      and(eq(member.userId, holderId), eq(member.organizationId, organizationId)),
    );
    if (matches === 0) throw new DataError("holderNotOnTeam");
  }
  const monthlyLimit =
    input.monthlyLimit === null || input.monthlyLimit === undefined
      ? null
      : money(input.monthlyLimit, "monthlyLimit", currency);
  if (monthlyLimit !== null && monthlyLimit <= 0) {
    throw new DataError("limitAboveZero");
  }
  return {
    name: requiredText(input.name, "name", 60),
    last4,
    holderId,
    monthlyLimit,
  };
}

// "Marketing card (•••• 4821)"
const label = (c: { name: string; last4: string }) => `“${c.name}” (•••• ${c.last4})`;
// A limit for the activity log: "$500.00 a month", or nothing
const limitValue = (amount: number | null, currency: string) =>
  amount === null ? null : { perMonth: amount, currency };

/** Adds a card (owners, admins and accountants only) and returns its ID. */
export async function createCard(input: CardInput): Promise<string> {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId, currency } = actor;
  const values = await parseCardInput(input, organizationId, currency);
  const [row] = await db
    .insert(card)
    .values({ ...values, organizationId })
    .returning({ id: card.id });
  await recordAudit(actor, {
    area: "card",
    action: "created",
    entityId: row.id,
    key: "cardAdded",
    values: { card: label(values) },
  });
  return row.id;
}

/** Changes a card (owners, admins and accountants only). */
export async function updateCard(id: string, input: CardInput) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId, currency } = actor;
  const values = await parseCardInput(input, organizationId, currency);
  const own = and(eq(card.id, id), eq(card.organizationId, organizationId));
  // What it was, to say what changed
  const [before] = await selectCards().where(own);
  const updated = await db.update(card).set(values).where(own).returning({ id: card.id });
  if (updated.length === 0) throw new DataError("cardNotFound");
  const [after] = await selectCards().where(own);
  const changes: AuditChange[] =
    before && after
      ? [
          { field: "name", before: before.name, after: after.name },
          { field: "last4", before: before.last4, after: after.last4 },
          { field: "holder", before: before.holder, after: after.holder },
          {
            field: "limit",
            before: limitValue(before.monthlyLimit, currency),
            after: limitValue(after.monthlyLimit, currency),
          },
        ]
      : [];
  // Saved without changing anything: nothing to record
  if (hasChanges(changes)) {
    await recordAudit(actor, {
      area: "card",
      action: "updated",
      entityId: id,
      key: "cardChanged",
      values: { card: label(values), changes: { changes } },
    });
  }
}

/**
 * Puts a card away (cancelled, expired) or takes it back into use (owners,
 * admins and accountants only). An archived card keeps its past payments, but new
 * transactions can't be given it and it's no longer recognized in
 * descriptions.
 */
export async function setCardArchived(id: string, archived: boolean) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const updated = await db
    .update(card)
    .set({ archivedAt: archived ? new Date() : null })
    .where(
      and(
        eq(card.id, id),
        eq(card.organizationId, organizationId),
        // Only if that changes something
        archived ? isNull(card.archivedAt) : sql`${card.archivedAt} is not null`,
      ),
    )
    .returning({ name: card.name, last4: card.last4 });
  if (updated.length === 0) {
    const exists = await db.$count(
      card,
      and(eq(card.id, id), eq(card.organizationId, organizationId)),
    );
    if (exists === 0) throw new DataError("cardNotFound");
    return;
  }
  await recordAudit(actor, {
    area: "card",
    action: archived ? "archived" : "restored",
    entityId: id,
    key: archived ? "cardArchived" : "cardRestored",
    values: { card: label(updated[0]) },
  });
}

/**
 * Removes a card (owners, admins and accountants only). The transactions paid
 * with it stay, without a card.
 */
export async function deleteCard(id: string) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const deleted = await db
    .delete(card)
    .where(and(eq(card.id, id), eq(card.organizationId, organizationId)))
    .returning({ name: card.name, last4: card.last4 });
  if (deleted.length === 0) throw new DataError("cardNotFound");
  await recordAudit(actor, {
    area: "card",
    action: "deleted",
    entityId: id,
    key: "cardDeleted",
    values: { card: label(deleted[0]) },
  });
}
