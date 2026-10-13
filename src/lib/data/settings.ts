// ─────────────────────────────────────────────────────────────────────────────
// Company settings: reading and saving
//
// In plain words: a company's preferences: its timezone, which decides
// which day a transaction belongs to and when "today" starts, and its
// currency, which decides how every amount is shown. A new company gets the
// timezone of the person who created it and US dollars; owners and admins
// can change both in Settings.
//
// For developers: server-only. createCompanySettings() is called from the
// afterCreateOrganization hook (lib/auth.ts), where there's no session to
// check; the others find the company via getFinanceContext().
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companySettings } from "@/db/finance";
import { isValidTimeZone } from "@/lib/dates";
import { CURRENCIES, isCurrency } from "@/lib/finance/currencies";
import { recordAudit } from "./audit";
import { formatCurrency } from "@/lib/format";
import { DataError, getFinanceContext, money } from "./common";

/** The current company's settings */
export async function getCompanySettings() {
  const { organizationId, timeZone, currency } = await getFinanceContext();
  const [row] = await db
    .select({ monthlyBudget: companySettings.monthlyBudget })
    .from(companySettings)
    .where(eq(companySettings.organizationId, organizationId));
  return {
    timeZone,
    currency,
    /** The most to spend per month in total; null without an overall budget */
    monthlyBudget: row?.monthlyBudget ?? null,
  };
}

/**
 * Sets the company's overall monthly budget, or removes it (null). Owners
 * and admins only.
 */
export async function updateOverallBudget(amount: number | null) {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId, currency } = actor;
  const monthlyBudget = amount === null ? null : money(amount, "Monthly budget", currency);
  if (monthlyBudget !== null && monthlyBudget <= 0) {
    throw new DataError("Monthly budget must be more than zero. Leave it empty for no budget.");
  }
  await db
    .insert(companySettings)
    .values({ organizationId, monthlyBudget })
    .onConflictDoUpdate({
      target: companySettings.organizationId,
      set: { monthlyBudget, updatedAt: new Date() },
    });
  await recordAudit(actor, {
    area: "category",
    action: "updated",
    summary:
      monthlyBudget === null
        ? "Removed the company's overall monthly budget"
        : `Set the company's overall monthly budget to ${formatCurrency(monthlyBudget, { currency })}`,
  });
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
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
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
  await recordAudit(actor, {
    area: "settings",
    action: "updated",
    summary: `Changed the company's timezone to ${timeZone}`,
  });
}

/**
 * Changes the currency the company's amounts are shown in (owners and
 * admins only). Nothing is converted: 100.00 stays 100.00.
 */
export async function updateCurrency(currency: string) {
  const actor = await getFinanceContext({ manage: true });
  if (!isCurrency(currency)) throw new DataError("Choose a currency from the list.");
  if (currency === actor.currency) return;
  await db
    .insert(companySettings)
    .values({ organizationId: actor.organizationId, currency })
    .onConflictDoUpdate({
      target: companySettings.organizationId,
      set: { currency, updatedAt: new Date() },
    });
  await recordAudit(actor, {
    area: "settings",
    action: "updated",
    summary: `Changed the company's currency from ${actor.currency} to ${currency} (${CURRENCIES[currency]})`,
  });
}
