// ─────────────────────────────────────────────────────────────────────────────
// Company settings: reading and saving
//
// In plain words: a company's preferences — for now, its timezone, which
// decides which day a transaction belongs to and when "today" starts. A new
// company gets the timezone of the person who created it; owners and admins
// can change it in Settings.
//
// For developers: server-only. createCompanySettings() is called from the
// afterCreateOrganization hook (lib/auth.ts), where there's no session to
// check; the others find the company via getFinanceContext().
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { db } from "@/db";
import { companySettings } from "@/db/finance";
import { isValidTimeZone } from "@/lib/dates";
import { DataError, getFinanceContext } from "./common";

/** The current company's settings */
export async function getCompanySettings() {
  const { timeZone } = await getFinanceContext();
  return { timeZone };
}

/** Sets up a new company's settings, e.g. with its creator's timezone. */
export async function createCompanySettings(
  organizationId: string,
  timeZone: unknown,
) {
  await db
    .insert(companySettings)
    .values({
      organizationId,
      // An unknown or missing timezone falls back to the default (UTC)
      ...(typeof timeZone === "string" && isValidTimeZone(timeZone)
        ? { timezone: timeZone }
        : {}),
    })
    .onConflictDoNothing();
}

/** Changes the company's timezone (owners and admins only). */
export async function updateTimeZone(timeZone: string) {
  const { organizationId } = await getFinanceContext({ manage: true });
  if (typeof timeZone !== "string" || !isValidTimeZone(timeZone)) {
    throw new DataError("Choose a timezone from the list.");
  }
  await db
    .insert(companySettings)
    .values({ organizationId, timezone: timeZone })
    .onConflictDoUpdate({
      target: companySettings.organizationId,
      set: { timezone: timeZone, updatedAt: new Date() },
    });
}
