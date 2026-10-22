// ─────────────────────────────────────────────────────────────────────────────
// File storage (Vercel Blob)
//
// In plain words: where attached receipts and invoices are kept. Once a
// Vercel Blob store is connected, each file goes there, privately: nobody
// can open it from the internet, only Finely can read it, and Finely only
// shows it to people of the company it belongs to. Without one (on a
// developer's computer, in the tests), files stay in the database as before.
//
// For developers: server-only. Set BLOB_READ_WRITE_TOKEN to turn it on.
// Keys are "attachments/<company id>/<attachment id>", so a company's files
// can be found and removed together. Blob's own URLs never reach the
// browser: files are served through our own route, which checks the role.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { del, get, put } from "@vercel/blob";

/** Whether files go to Vercel Blob (otherwise they stay in the database) */
export function isFileStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Where one attachment's file is kept */
export function attachmentKey(organizationId: string, attachmentId: string): string {
  return `attachments/${organizationId}/${attachmentId}`;
}

/** Saves a file under a key, replacing nothing (keys are unique) */
export async function saveFile(key: string, bytes: Uint8Array, contentType: string) {
  await put(key, Buffer.from(bytes), {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });
}

/** A file's bytes, or null if it isn't there */
export async function readFile(key: string): Promise<Uint8Array | null> {
  const found = await get(key, { access: "private", useCache: false });
  if (!found || found.statusCode !== 200) return null;
  return new Uint8Array(await new Response(found.stream).arrayBuffer());
}

/**
 * Removes files. Never throws: a file that can't be removed now is only
 * reported, so the change people made (deleting a transaction, a company)
 * isn't undone because of it.
 */
export async function deleteFiles(keys: (string | null)[]) {
  const present = keys.filter((key): key is string => Boolean(key));
  if (present.length === 0) return;
  try {
    for (let i = 0; i < present.length; i += 100) await del(present.slice(i, i + 100));
  } catch (error) {
    console.error(`[storage] Could not delete ${present.length} file(s):`, error);
  }
}
