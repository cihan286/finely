// ─────────────────────────────────────────────────────────────────────────────
// Applying database migrations
//
// In plain words: brings the database's tables up to date with the change
// files in drizzle/. Runs on every deploy (vercel.json) and with
// `npm run db:migrate`. If something goes wrong, it says exactly what.
//
// For developers: replaces `drizzle-kit migrate`, which exits with an error
// but prints no message when a migration fails. Uses Drizzle's migrator over
// Neon's WebSocket driver, so each run happens in one transaction: either
// every pending migration is applied and recorded, or none is. Reads
// DATABASE_URL from .env.local locally, the same way Next.js does.
// ─────────────────────────────────────────────────────────────────────────────

import nextEnv from "@next/env";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (or to Vercel).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("Database is up to date.");
} catch (error) {
  console.error("Migration failed. Nothing from this run was applied.\n");
  console.error(error);
  // Postgres says which statement and why; show it plainly
  const cause = error?.cause ?? error;
  if (cause?.message) console.error(`\nReason: ${cause.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
