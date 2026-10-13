// ─────────────────────────────────────────────────────────────────────────────
// Attachments: reading and saving
//
// In plain words: lets people add a receipt or invoice (a PDF or a picture)
// to a transaction, see what's attached, open a file and delete it.
// Everyone on the team can add files; the person who added one, and owners
// and admins, can delete it.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); the transaction and the file are always looked up
// together with the company's ID. Files are kept in the database as base64
// text (see db/finance.ts): listAttachments() never reads that column, only
// getAttachmentFile() does. What kind a file is comes from its content, not
// from what the browser claims.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachment, transaction } from "@/db/finance";
import {
  ATTACHMENT_TYPES,
  cleanFileName,
  detectAttachmentType,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TRANSACTION,
} from "@/lib/finance/attachments";
import { canManageFinances } from "@/lib/roles";
import type { Attachment } from "@/types/finance";
import { recordAudit } from "./audit";
import { DataError, getFinanceContext } from "./common";

// A transaction's files, oldest first, without their content
async function selectAttachments(
  transactionId: string,
  context: { organizationId: string; userId: string; role: string },
): Promise<Attachment[]> {
  const rows = await db
    .select({
      id: attachment.id,
      name: attachment.name,
      contentType: attachment.contentType,
      size: attachment.size,
      createdById: attachment.createdById,
    })
    .from(attachment)
    .where(
      and(
        eq(attachment.transactionId, transactionId),
        eq(attachment.organizationId, context.organizationId),
      ),
    )
    .orderBy(asc(attachment.createdAt), asc(attachment.id));
  return rows.map(({ createdById, ...row }) => ({
    ...row,
    canDelete: createdById === context.userId || canManageFinances(context.role),
  }));
}

/** The files attached to one of the company's transactions, oldest first */
export async function listAttachments(transactionId: string): Promise<Attachment[]> {
  return selectAttachments(transactionId, await getFinanceContext());
}

/**
 * Adds a file to a transaction and returns the transaction's files. The
 * file must be a PDF or a picture, of at most 4 MB.
 */
export async function addAttachment(
  transactionId: string,
  file: { name: string; bytes: Uint8Array },
): Promise<Attachment[]> {
  const context = await getFinanceContext();
  const { organizationId, userId } = context;

  if (!(file?.bytes instanceof Uint8Array) || file.bytes.length === 0) {
    throw new DataError("Choose a file to attach.");
  }
  if (file.bytes.length > MAX_ATTACHMENT_BYTES) {
    throw new DataError(
      `A file can be at most ${formatFileSize(MAX_ATTACHMENT_BYTES)}. This one is ${formatFileSize(file.bytes.length)}.`,
    );
  }
  const contentType = detectAttachmentType(file.bytes);
  if (!contentType) {
    throw new DataError(
      `Only ${Object.values(ATTACHMENT_TYPES).join(", ")} files can be attached.`,
    );
  }

  const [transactionMatches, existing] = await Promise.all([
    db.$count(
      transaction,
      and(
        eq(transaction.id, transactionId),
        eq(transaction.organizationId, organizationId),
      ),
    ),
    db.$count(
      attachment,
      and(
        eq(attachment.transactionId, transactionId),
        eq(attachment.organizationId, organizationId),
      ),
    ),
  ]);
  if (transactionMatches === 0) throw new DataError("Transaction not found.");
  if (existing >= MAX_ATTACHMENTS_PER_TRANSACTION) {
    throw new DataError(
      `A transaction can have at most ${MAX_ATTACHMENTS_PER_TRANSACTION} files.`,
    );
  }

  const name = cleanFileName(typeof file.name === "string" ? file.name : "");
  await db.insert(attachment).values({
    organizationId,
    transactionId,
    name,
    contentType,
    size: file.bytes.length,
    data: Buffer.from(file.bytes).toString("base64"),
    createdById: userId,
  });
  await recordAudit(context, {
    area: "attachment",
    action: "created",
    entityId: transactionId,
    summary: `Attached “${name}” to a transaction`,
  });
  return selectAttachments(transactionId, context);
}

/**
 * Removes a file and returns what's left on its transaction. Allowed for
 * the person who added it, and for owners and admins.
 */
export async function deleteAttachment(id: string): Promise<Attachment[]> {
  const context = await getFinanceContext();
  const [row] = await db
    .select({
      transactionId: attachment.transactionId,
      createdById: attachment.createdById,
      name: attachment.name,
    })
    .from(attachment)
    .where(
      and(eq(attachment.id, id), eq(attachment.organizationId, context.organizationId)),
    );
  if (!row) throw new DataError("File not found.");
  if (row.createdById !== context.userId && !canManageFinances(context.role)) {
    throw new DataError("Only the person who added this file, an owner or an admin can delete it.");
  }
  await db
    .delete(attachment)
    .where(
      and(eq(attachment.id, id), eq(attachment.organizationId, context.organizationId)),
    );
  await recordAudit(context, {
    area: "attachment",
    action: "deleted",
    entityId: row.transactionId,
    summary: `Deleted the attached file “${row.name}”`,
  });
  return selectAttachments(row.transactionId, context);
}

/** One file with its content, or null if the company has no file with this ID */
export async function getAttachmentFile(
  id: string,
): Promise<{ name: string; contentType: string; bytes: Uint8Array } | null> {
  const { organizationId } = await getFinanceContext();
  const [row] = await db
    .select({
      name: attachment.name,
      contentType: attachment.contentType,
      data: attachment.data,
    })
    .from(attachment)
    .where(and(eq(attachment.id, id), eq(attachment.organizationId, organizationId)));
  if (!row) return null;
  return {
    name: row.name,
    contentType: row.contentType,
    bytes: new Uint8Array(Buffer.from(row.data, "base64")),
  };
}
