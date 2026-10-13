// ─────────────────────────────────────────────────────────────────────────────
// Activity log: writing and reading
//
// In plain words: every time someone adds, changes or deletes something in
// a company — a transaction, a bill, a category, a teammate's role — a line
// is added to the company's activity log saying who did what and when.
// Owners and admins can read the log in Settings. Lines are never changed or
// removed (until the company itself is deleted).
//
// For developers: server-only. The data functions call recordAudit() right
// after a change succeeded, with the context they already have. It never
// throws: a line that couldn't be written must not turn a saved change into
// an error message (it's logged for us instead). Summaries are shown to the
// team, so they may name things; they are never put into error messages
// (which go to Sentry).
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/finance";
import { AUDIT_AREAS, type AuditArea } from "@/lib/finance/audit";
import { getFinanceContext } from "./common";

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
  filters: { area?: string; limit?: number; offset?: number } = {},
): Promise<{ entries: AuditEntry[]; total: number }> {
  const { organizationId } = await getFinanceContext({ manage: true });
  const where = and(
    eq(auditLog.organizationId, organizationId),
    // Only a known area narrows the list; anything else shows everything
    filters.area && filters.area in AUDIT_AREAS
      ? eq(auditLog.area, filters.area)
      : undefined,
  );
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
      // No name and no person: Finely did it. A name without a person: the
      // person's account was deleted since.
      actor: actorName ?? (actorId ? "Someone" : "Finely"),
    })),
    total,
  };
}
