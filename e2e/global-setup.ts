// ─────────────────────────────────────────────────────────────────────────────
// Before the end-to-end tests: a fresh, empty database
//
// In plain words: wipes the test database and creates every table again
// from the migrations in drizzle/, exactly as `npm run db:migrate` would, so
// every run starts from the same place.
// ─────────────────────────────────────────────────────────────────────────────

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { databaseUrl } from "../playwright.config";

export default async function globalSetup() {
  // Everything in it is deleted: never a database on another machine (like
  // the real one on Neon), whatever E2E_DATABASE_URL says
  const { hostname } = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
    throw new Error(
      `The end-to-end tests wipe their database, so they only use one on this machine (not ${hostname}).`,
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(`
      drop schema if exists public cascade;
      drop schema if exists drizzle cascade;
      create schema public;
    `);
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  } catch (error) {
    throw new Error(
      `Could not prepare the test database at ${databaseUrl}. Is it running? (npm run test:e2e:db)`,
      { cause: error },
    );
  } finally {
    await pool.end();
  }
}
