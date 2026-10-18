// ─────────────────────────────────────────────────────────────────────────────
// Database connection for the end-to-end tests
//
// In plain words: the end-to-end tests (e2e/) run the real app in a real
// browser against a throwaway Postgres on the same machine, not against Neon.
// This file connects to that one instead. The real app never uses it.
//
// For developers: next.config.ts puts this file in place of "@/db" only when
// building with E2E=1. Neon's HTTP driver can't talk to a plain Postgres, so
// this uses node-postgres. Like the PGlite test database (lib/data/testing.ts),
// db.batch() runs its statements one after another.
// ─────────────────────────────────────────────────────────────────────────────

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schema";
import * as financeSchema from "./finance";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set for the end-to-end tests (see playwright.config.ts).");
}

const database = drizzle(new Pool({ connectionString: url }), {
  schema: { ...authSchema, ...financeSchema },
});

export const db = Object.assign(database, {
  batch: async (queries: PromiseLike<unknown>[]) => {
    const results = [];
    for (const query of queries) results.push(await query);
    return results;
  },
});
