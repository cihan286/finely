// ─────────────────────────────────────────────────────────────────────────────
// Database connection
//
// In plain words: this opens the connection to our database, which is hosted
// by Neon. Any code that needs to read or save data (like user accounts)
// imports `db` from here.
//
// For developers: Drizzle over Neon's HTTP driver (no interactive transactions).
// Table definitions live in ./schema.ts (auth and companies, generated) and
// ./finance.ts (the companies' financial data).
// ─────────────────────────────────────────────────────────────────────────────

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as authSchema from "./schema";
import * as financeSchema from "./finance";

// The database address and password come from the secret .env.local file.
// Without it nothing can work, so stop right away with a clear message.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Add your Neon connection string to .env.local (see .env.example).",
  );
}

export const db = drizzle(neon(url), {
  schema: { ...authSchema, ...financeSchema },
});
