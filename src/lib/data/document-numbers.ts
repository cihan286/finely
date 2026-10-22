// ─────────────────────────────────────────────────────────────────────────────
// Document numbers: series and the next number
//
// In plain words: each kind of document (invoices, orders, journal
// entries…) is numbered in its own series, "FTR2026000000001" and up, and
// the count starts again at 1 each year. A company can choose the three
// letters of each series; owners, admins and accountants change them.
// Numbers are given out one at a time, so two documents never get the
// same number and none is skipped.
//
// For developers: server-only. takeDocumentNumber() is for the data
// functions that approve a document (it takes the company from its caller,
// which has already checked the role); call it only once the document is
// sure to be saved, since a number taken is gone. The rules and the format
// are in lib/finance/documents.ts.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { documentCounter, documentSeries } from "@/db/finance";
import { todayIn } from "@/lib/dates";
import {
  DOCUMENT_TYPES,
  formatDocumentNumber,
  PREFIX_PATTERN,
  type DocumentType,
} from "@/lib/finance/documents";
import type { ISODate } from "@/types/finance";
import { recordAudit } from "./audit";
import { DataError, getFinanceContext } from "./common";

export interface DocumentSeriesInfo {
  type: DocumentType;
  prefix: string;
  /** The number the next document of this kind gets this year */
  next: string;
}

// The company's own prefixes, over the standard ones
async function prefixesOf(organizationId: string): Promise<Record<DocumentType, string>> {
  const rows = await db
    .select({ type: documentSeries.type, prefix: documentSeries.prefix })
    .from(documentSeries)
    .where(eq(documentSeries.organizationId, organizationId));
  const prefixes: Record<string, string> = { ...DOCUMENT_TYPES };
  for (const row of rows) prefixes[row.type] = row.prefix;
  return prefixes as Record<DocumentType, string>;
}

/** Every series of the current company, with the number each gives next */
export async function listDocumentSeries(): Promise<DocumentSeriesInfo[]> {
  const { organizationId, timeZone } = await getFinanceContext();
  const year = Number(todayIn(timeZone).slice(0, 4));
  const [prefixes, counters] = await Promise.all([
    prefixesOf(organizationId),
    db
      .select({ type: documentCounter.type, last: documentCounter.lastNumber })
      .from(documentCounter)
      .where(
        and(eq(documentCounter.organizationId, organizationId), eq(documentCounter.year, year)),
      ),
  ]);
  const last = new Map(counters.map((c) => [c.type, c.last]));
  return (Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((type) => ({
    type,
    prefix: prefixes[type],
    next: formatDocumentNumber(prefixes[type], year, (last.get(type) ?? 0) + 1),
  }));
}

/**
 * Changes the three letters a kind of document is numbered with (owners,
 * admins and accountants only). Numbers already given keep theirs; the
 * count goes on. No two series of a company may share a prefix.
 */
export async function setSeriesPrefix(type: DocumentType, prefix: string) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  if (!Object.hasOwn(DOCUMENT_TYPES, type)) throw new DataError("invalid", { field: "type" });
  const wanted = typeof prefix === "string" ? prefix.trim().toUpperCase() : "";
  if (!PREFIX_PATTERN.test(wanted)) throw new DataError("seriesPrefix");
  const prefixes = await prefixesOf(actor.organizationId);
  const taken = Object.entries(prefixes).some(([other, p]) => other !== type && p === wanted);
  if (taken) throw new DataError("seriesPrefixTaken");
  const before = prefixes[type];
  if (before === wanted) return;
  await db
    .insert(documentSeries)
    .values({ organizationId: actor.organizationId, type, prefix: wanted })
    .onConflictDoUpdate({
      target: [documentSeries.organizationId, documentSeries.type],
      set: { prefix: wanted, updatedAt: new Date() },
    });
  await recordAudit(actor, {
    area: "settings",
    action: "updated",
    key: "seriesPrefixChanged",
    values: { from: before, to: wanted },
  });
}

/**
 * The next number of a kind of document, for a document dated `day` (its
 * year picks the count). Taken atomically: two callers at the same moment
 * get two different, consecutive numbers.
 */
export async function takeDocumentNumber(
  organizationId: string,
  type: DocumentType,
  day: ISODate,
): Promise<string> {
  const year = Number(day.slice(0, 4));
  const [prefixes, [counter]] = await Promise.all([
    prefixesOf(organizationId),
    db
      .insert(documentCounter)
      .values({ organizationId, type, year, lastNumber: 1 })
      .onConflictDoUpdate({
        target: [documentCounter.organizationId, documentCounter.type, documentCounter.year],
        set: { lastNumber: sql`${documentCounter.lastNumber} + 1`, updatedAt: new Date() },
      })
      .returning({ lastNumber: documentCounter.lastNumber }),
  ]);
  return formatDocumentNumber(prefixes[type], year, counter.lastNumber);
}
