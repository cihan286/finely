// ─────────────────────────────────────────────────────────────────────────────
// Database tool (Drizzle Kit) settings
//
// In plain words: Drizzle Kit is the tool that creates and updates the tables
// in our database. This file tells it where our table definitions live, where
// to save the change files it writes ("migrations"), and how to reach the
// database.
//
// For developers: used by `npm run db:generate`, `db:migrate` and `db:studio`.
// ─────────────────────────────────────────────────────────────────────────────

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Read DATABASE_URL from .env.local, the same way Next.js does
loadEnvConfig(process.cwd());

export default defineConfig({
  // The file that describes our tables
  schema: "./src/db/schema.ts",
  // The folder where migration files are saved (these are committed to git)
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // The database address and password, kept secret in .env.local
    url: process.env.DATABASE_URL!,
  },
});
