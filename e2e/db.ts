// ─────────────────────────────────────────────────────────────────────────────
// Direct database access for the end-to-end tests
//
// In plain words: a few things a test can't do through the browser, like
// opening the link in an email, are done straight in the test database.
//
// For developers: the same Postgres the app under test uses
// (playwright.config.ts). Only for e2e/; never imported by the app.
// ─────────────────────────────────────────────────────────────────────────────

import { Pool } from "pg";
import { databaseUrl } from "../playwright.config";

let pool: Pool | undefined;

export async function query<Row extends object>(sql: string, params: unknown[] = []) {
  pool ??= new Pool({ connectionString: databaseUrl });
  const result = await pool.query<Row>(sql, params);
  return result.rows;
}

/** Marks an address as verified, as opening the "verify your email" link would */
export async function verifyEmail(email: string) {
  await query(`update "user" set email_verified = true where email = $1`, [email]);
}

/** A company's ID, found by its name */
export async function companyId(name: string) {
  const [row] = await query<{ id: string }>(`select id from organization where name = $1`, [
    name,
  ]);
  if (!row) throw new Error(`No company is called ${name}`);
  return row.id;
}

/** The ID in the newest invitation sent to an address (the link's last part) */
export async function invitationId(email: string) {
  const [row] = await query<{ id: string }>(
    `select id from invitation where email = $1 order by created_at desc limit 1`,
    [email],
  );
  if (!row) throw new Error(`No invitation was sent to ${email}`);
  return row.id;
}
