// ─────────────────────────────────────────────────────────────────────────────
// Activity log: writing and reading
//
// In plain words: every time someone adds, changes or deletes something in
// a company — a transaction, a bill, a category, a teammate's role — a line
// is added to the company's activity log saying who did what and when.
// Owners, admins and accountants can read the log in Settings, search it
// and save it as a file, each in their own language. Lines are never changed or removed
// (until the company itself is deleted).
//
// For developers: server-only. The data functions call recordAudit() right
// after a change succeeded, with the context they already have. It never
// throws: a line that couldn't be written must not turn a saved change into
// an error message (it's logged for us instead). Summaries are shown to the
// team, so they may name things; they are never put into error messages
// (which go to Sentry).
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/finance";
import {
  isAuditArea,
  renderAudit,
  type AuditArea,
  type AuditDetails,
} from "@/lib/finance/audit";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { messagesFor, type Messages } from "@/i18n/messages";
import { getI18n } from "@/i18n/server";
import { todayIn } from "@/lib/dates";
import type { ActivityExportRow } from "@/lib/finance/export";
import type { ISODate } from "@/types/finance";
import { escapeLike, getFinanceContext } from "./common";

/** The most lines an export file holds, newest first */
const MAX_EXPORT_LINES = 20_000;

/** Which lines to show: one kind of thing, and/or what matches a search */
export interface AuditFilters {
  area?: string;
  /** Part of what happened or of the person's name; upper/lower case doesn't matter */
  search?: string;
}

// The lines of a company that match the filters
function matching(organizationId: string, filters: AuditFilters) {
  const search = filters.search?.trim();
  const pattern = search ? `%${escapeLike(search)}%` : null;
  return and(
    eq(auditLog.organizationId, organizationId),
    // Only a known area narrows the list; anything else shows everything
    filters.area && isAuditArea(filters.area)
      ? eq(auditLog.area, filters.area)
      : undefined,
    pattern
      ? or(ilike(auditLog.summary, pattern), ilike(auditLog.actorName, pattern))
      : undefined,
  );
}

// No name and no person: Finely did it. No name but a person: we never
// knew what they were called.
const actorOf = (row: { actorName: string | null; actorId: string | null }, m: Messages) =>
  row.actorName ?? (row.actorId ? m.audit.someone : "Finely");

// A line in the reader's words; older lines only have their English text
const summaryOf = (
  row: { summary: string; details: AuditDetails | null },
  { locale, m }: { locale: typeof DEFAULT_LOCALE; m: Messages },
) => (row.details ? renderAudit(row.details, m, locale) : row.summary);

// The words the log is kept in for searching: English
const english = messagesFor(DEFAULT_LOCALE);

// A moment in a timezone the way the export files write it:
// "2026-10-13 14:05" (Sweden writes dates year-month-day)
const fileDateTime = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);

/** Who did it, and in which company */
export interface AuditActor {
  organizationId: string;
  /** null for what Finely did by itself, e.g. a scheduled bank sync */
  userId: string | null;
  userName?: string | null;
}

/** What happened */
export interface AuditEvent extends AuditDetails {
  area: AuditArea;
  /** "created", "updated", "deleted", "paid", "imported", … */
  action: string;
  entityId?: string | null;
}

/** One line of the log, as shown on screen */
export interface AuditEntry {
  id: string;
  /** Who did it; "Finely" for what happened by itself */
  actor: string;
  area: AuditArea;
  action: string;
  summary: string;
  /** The exact moment (UTC) */
  at: Date;
}

/** Adds a line to a company's activity log. Never throws. */
export async function recordAudit(actor: AuditActor, event: AuditEvent) {
  try {
    await db.insert(auditLog).values({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      actorName: actor.userName ?? null,
      area: event.area,
      action: event.action,
      entityId: event.entityId ?? null,
      summary: renderAudit(event, english, DEFAULT_LOCALE).slice(0, 1000),
      details: { key: event.key, values: event.values ?? {} },
    });
  } catch (error) {
    console.error(`[audit] Could not record ${event.area}.${event.action}:`, error);
  }
}

/**
 * One page of the company's activity log, newest first, plus how many lines
 * there are in total (owners, admins and accountants).
 */
export async function listAuditLog(
  filters: AuditFilters & { limit?: number; offset?: number } = {},
): Promise<{ entries: AuditEntry[]; total: number }> {
  const { organizationId } = await getFinanceContext({ need: "activity.view" });
  const i18n = await getI18n();
  const where = matching(organizationId, filters);
  const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200);
  const offset = Math.max(Math.trunc(filters.offset ?? 0), 0);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        actorName: auditLog.actorName,
        actorId: auditLog.actorId,
        area: auditLog.area,
        action: auditLog.action,
        summary: auditLog.summary,
        details: auditLog.details,
        at: auditLog.createdAt,
      })
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(auditLog).where(where),
  ]);

  return {
    entries: rows.map(({ actorName, actorId, details, summary, ...row }) => ({
      ...row,
      area: row.area as AuditArea,
      actor: actorOf({ actorName, actorId }, i18n.m),
      summary: summaryOf({ summary, details }, i18n),
    })),
    total,
  };
}

/**
 * Every line that matches the filters (paging ignored), newest first, for
 * the export file (owners, admins and accountants).
 */
export async function exportAuditLog(
  filters: AuditFilters = {},
): Promise<{ rows: ActivityExportRow[]; today: ISODate }> {
  const { organizationId, timeZone } = await getFinanceContext({ need: "activity.view" });
  const i18n = await getI18n();
  const areas: Record<string, string> = i18n.m.audit.areas;
  const rows = await db
    .select({
      actorName: auditLog.actorName,
      actorId: auditLog.actorId,
      area: auditLog.area,
      summary: auditLog.summary,
      details: auditLog.details,
      at: auditLog.createdAt,
    })
    .from(auditLog)
    .where(matching(organizationId, filters))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(MAX_EXPORT_LINES);
  return {
    rows: rows.map((row) => ({
      when: fileDateTime(row.at, timeZone),
      actor: actorOf(row, i18n.m),
      area: areas[row.area] ?? row.area,
      summary: summaryOf(row, i18n),
    })),
    today: todayIn(timeZone),
  };
}
