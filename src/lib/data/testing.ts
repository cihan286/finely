// ─────────────────────────────────────────────────────────────────────────────
// Test helpers for the data functions
//
// In plain words: lets the automated tests run the real "read and save
// company data" code against a throwaway database that lives in memory, and
// pretend to be any person in any company. Nothing here runs in the real app.
//
// For developers: tests-only. The database is PGlite (real Postgres, in
// memory) with our migrations from drizzle/ applied, so the actual SQL runs.
// A test file wires it in with vi.mock (see isolation.test.ts): "@/db" is
// replaced by testDb and "@/lib/session" by currentSession. Use actAs() to
// choose who the data functions think is logged in.
// ─────────────────────────────────────────────────────────────────────────────

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as authSchema from "@/db/schema";
import * as financeSchema from "@/db/finance";
import type { Role } from "@/lib/roles";

const database = drizzle(new PGlite(), {
  schema: { ...authSchema, ...financeSchema },
});

// The app's driver (Neon over HTTP) can send several statements together
// with db.batch(); PGlite's can't, so run them one after another instead
export const testDb = Object.assign(database, {
  batch: async (queries: PromiseLike<unknown>[]) => {
    const results = [];
    for (const query of queries) results.push(await query);
    return results;
  },
});

/** Creates every table, exactly as `npm run db:migrate` would */
export async function setUpTestDb() {
  await migrate(database, { migrationsFolder: "drizzle" });
}

/** Adds a company with one person in it; returns their IDs */
export async function createTestCompany(name: string, timeZone = "UTC") {
  const organizationId = `org_${name}`;
  const userId = `user_${name}`;
  await database.insert(authSchema.user).values({
    id: userId,
    name: `${name} owner`,
    email: `${name}@example.com`,
  });
  await database.insert(authSchema.organization).values({
    id: organizationId,
    name,
    slug: name,
    createdAt: new Date(),
  });
  await database
    .insert(financeSchema.companySettings)
    .values({ organizationId, timezone: timeZone });
  return { organizationId, userId };
}

let current: { organizationId: string; userId: string; role: Role } | null = null;

/** From now on, the data functions see this person, company and role */
export function actAs(
  company: { organizationId: string; userId: string },
  role: Role = "owner",
) {
  current = { ...company, role };
}

/** Stands in for requireOrganization() from lib/session.ts */
export async function currentSession() {
  if (!current) throw new Error("Call actAs() before using a data function.");
  return {
    user: { id: current.userId },
    organization: { id: current.organizationId },
    role: current.role,
  };
}
