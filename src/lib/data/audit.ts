// ─────────────────────────────────────────────────────────────────────────────
// Activity log: writing and reading
//
// In plain words: every time someone adds, changes or deletes something in
// a company — a transaction, a bill, a category, a teammate's role — a line
// is added to the company's activity log saying who did what and when.
// Owners and admins can read the log in Settings, search it and save it as
// a file. Lines are never changed or removed (until the company itself is
// deleted).
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
import { AUDIT_AREAS, type AuditArea } from "@/lib/finance/audit";
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
    filters.area && filters.area in AUDIT_AREAS
      ? eq(auditLog.area, filters.area)
      : undefined,
    pattern
      ? or(ilike(auditLog.summary, pattern), ilike(auditLog.actorName, pattern))
      : undefined,
  );
}

// No name and no person: Finely did it. No name but a person: we never
// knew what they were called.
const actorOf = (row: { actorName: string | null; actorId: string | null }) =>
  row.actorName ?? (row.actorId ? "Someone" : "Finely");

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
export interface AuditEvent {
  area: AuditArea;
  /** "created", "updated", "deleted", "paid", "imported", … */
  action: string;
  /** What happened, as a sentence without the person: 'Deleted "Office rent"' */
  summary: string;
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
      summary: event.summary.slice(0, 1000),
    });
  } catch (error) {
    console.error(`[audit] Could not record ${event.area}.${event.action}:`, error);
  }
}

/**
 * One page of the company's activity log, newest first, plus how many lines
 * there are in total (owners and admins only).
 */
export async function listAuditLog(
  filters: AuditFilters & { limit?: number; offset?: number } = {},
): Promise<{ entries: AuditEntry[]; total: number }> {
  const { organizationId } = await getFinanceContext({ manage: true });
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
    entries: rows.map(({ actorName, actorId, ...row }) => ({
      ...row,
      area: row.area as AuditArea,
      actor: actorOf({ actorName, actorId }),
    })),
    total,
  };
}

/**
 * Every line that matches the filters (paging ignored), newest first, for
 * the export file (owners and admins only).
 */
export async function exportAuditLog(
  filters: AuditFilters = {},
): Promise<{ rows: ActivityExportRow[]; today: ISODate }> {
  const { organizationId, timeZone } = await getFinanceContext({ manage: true });
  const rows = await db
    .select({
      actorName: auditLog.actorName,
      actorId: auditLog.actorId,
      area: auditLog.area,
      summary: auditLog.summary,
      at: auditLog.createdAt,
    })
    .from(auditLog)
    .where(matching(organizationId, filters))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(MAX_EXPORT_LINES);
  return {
    rows: rows.map((row) => ({
      when: fileDateTime(row.at, timeZone),
      actor: actorOf(row),
      area: AUDIT_AREAS[row.area as AuditArea] ?? row.area,
      summary: row.summary,
    })),
    today: todayIn(timeZone),
  };
}
