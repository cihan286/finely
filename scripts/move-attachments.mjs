// ─────────────────────────────────────────────────────────────────────────────
// Moving attached files from the database to file storage
//
// In plain words: files attached before file storage (Vercel Blob) was set
// up are still in the database. This moves each one to the store and then
// takes it out of the database. Run it once, after BLOB_READ_WRITE_TOKEN is
// set: `npm run files:move`. It can be stopped and run again: files already
// moved are skipped, and a file is only taken out of the database once it's
// safely in the store.
//
// For developers: reads DATABASE_URL and BLOB_READ_WRITE_TOKEN from
// .env.local locally, as Next.js does. Uses the same keys and settings as
// lib/storage.ts ("attachments/<company id>/<attachment id>", private).
// ─────────────────────────────────────────────────────────────────────────────

import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

nextEnv.loadEnvConfig(process.cwd());

for (const name of ["DATABASE_URL", "BLOB_READ_WRITE_TOKEN"]) {
  if (!process.env[name]) {
    console.error(`${name} is not set. Add it to .env.local (or run this where it is).`);
    process.exit(1);
  }
}

const sql = neon(process.env.DATABASE_URL);
let moved = 0;

// A few at a time: each row holds a whole file
for (;;) {
  const rows = await sql`
    select id, organization_id, content_type, data
    from attachment
    where storage_key is null
    limit 20`;
  if (rows.length === 0) break;
  for (const row of rows) {
    const key = `attachments/${row.organization_id}/${row.id}`;
    await put(key, Buffer.from(row.data, "base64"), {
      access: "private",
      contentType: row.content_type,
      addRandomSuffix: false,
      // A run that stopped half-way may have stored it already
      allowOverwrite: true,
    });
    await sql`
      update attachment set storage_key = ${key}, data = null
      where id = ${row.id} and storage_key is null`;
    moved += 1;
  }
  console.log(`${moved} file(s) moved…`);
}

console.log(moved === 0 ? "No files left in the database." : `Done: ${moved} file(s) moved.`);
