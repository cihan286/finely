// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks for reading and saving company data
//
// In plain words: before any financial data is read or changed, we check who
// is asking, which company they're working in, and whether their role allows
// it. We also check what people typed (a name isn't empty, an amount is a real
// number, a date is a real date) before anything is saved. When something is
// wrong, we stop with a short message that can be shown on screen.
//
// For developers: server-only. getFinanceContext() is the one place the
// company ID (and its timezone) comes from — never accept an organization ID
// from the browser.
// DataError messages are safe to show to users; any other error is a bug.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companySettings } from "@/db/finance";
import { requireOrganization } from "@/lib/session";
import { currencyDecimals } from "@/lib/format";
import { canManageFinances } from "@/lib/roles";
import type { ISODate } from "@/types/finance";
import { DEFAULT_LOCALE, fill, type Locale } from "@/i18n/config";
import { messagesFor, type Messages } from "@/i18n/messages";
import { getLocale } from "@/i18n/server";

/** Which sentence of i18n/messages/<language>/errors.ts a DataError is */
export type ErrorKey = keyof Messages["errors"];
/** The name of a form field, in i18n/messages/<language>/errors.ts */
export type FieldKey = keyof Messages["fields"];
/**
 * What fills an error's {placeholders}. `field` is a FieldKey, translated
 * too; a function is called with the language (for numbers like "1.5 MB").
 */
export type ErrorValues = Record<string, string | number | ((locale: Locale) => string)>;

/**
 * A problem the person can fix, with a message that's safe to show them.
 * Its `message` is in English (for logs and tests); message(locale) gives
 * it in the person's language.
 */
export class DataError extends Error {
  constructor(
    readonly key: ErrorKey,
    readonly values: ErrorValues = {},
  ) {
    super("");
    this.name = "DataError";
    this.message = this.in(DEFAULT_LOCALE);
  }

  /** The message in a language */
  in(locale: Locale): string {
    const m = messagesFor(locale);
    const filled: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(this.values)) {
      filled[name] = typeof value === "function" ? value(locale) : value;
    }
    if (typeof filled.field === "string" && filled.field in m.fields) {
      filled.field = m.fields[filled.field as FieldKey];
    }
    return fill(m.errors[this.key], filled);
  }
}

/**
 * For server actions and routes: the message to show for a DataError, in
 * the person's language. Any other error (a bug, or Next.js redirecting to
 * /login) is passed on unchanged.
 */
export async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof DataError) return error.in(await getLocale());
  throw error;
}

/**
 * A company's timezone and currency ("UTC" and "USD" until set), and whether
 * it's a demo company (lib/data/demo.ts). Read once per request.
 */
export const getCompanyLocale = cache(async (organizationId: string) => {
  const [row] = await db
    .select({
      timezone: companySettings.timezone,
      currency: companySettings.currency,
      demoExpiresAt: companySettings.demoExpiresAt,
    })
    .from(companySettings)
    .where(eq(companySettings.organizationId, organizationId));
  return {
    timeZone: row?.timezone ?? "UTC",
    currency: row?.currency ?? "USD",
    isDemo: Boolean(row?.demoExpiresAt),
    /** When a demo company is deleted; null for real companies */
    demoExpiresAt: row?.demoExpiresAt ?? null,
  };
});

/**
 * Stops what a demo company may not do (anything that reaches outside
 * Finely, like a bank or Stripe), with a message that can be shown.
 */
export async function refuseInDemo(organizationId: string) {
  if ((await getCompanyLocale(organizationId)).isDemo) {
    throw new DataError("notInDemo");
  }
}

/** A company's timezone ("UTC" until set) */
export async function getCompanyTimeZone(organizationId: string): Promise<string> {
  return (await getCompanyLocale(organizationId)).timeZone;
}

/**
 * The signed-in user, the company whose data they may use, and its timezone
 * and currency.
 * With `manage: true`, also requires the owner or admin role.
 */
export async function getFinanceContext({ manage = false } = {}) {
  const { user, organization, role } = await requireOrganization();
  if (manage && !canManageFinances(role)) {
    throw new DataError("ownersAndAdminsOnly");
  }
  return {
    userId: user.id,
    // For the activity log: who did it, as they're called now
    userName: user.name,
    organizationId: organization.id,
    role,
    // timeZone and currency
    ...(await getCompanyLocale(organization.id)),
  };
}

/** "50%_off" -> "50\%\_off", so text is matched literally by LIKE / ILIKE */
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

/** Whether a database error means "this value already exists" */
export function isUniqueViolation(error: unknown): boolean {
  // The database's code can sit on the error itself or on its cause
  const codeOf = (e: unknown) =>
    e && typeof e === "object" && "code" in e ? e.code : undefined;
  return (
    codeOf(error) === "23505" ||
    (error instanceof Error && codeOf(error.cause) === "23505")
  );
}

/* ------------------------------------------------------------------ */
/* Checking what people typed                                          */
/* ------------------------------------------------------------------ */

/** Trimmed text of at most `max` characters; empty text is an error. */
export function requiredText(value: unknown, field: FieldKey, max = 120): string {
  const text = optionalText(value, field, max);
  if (!text) throw new DataError("required", { field });
  return text;
}

/** Trimmed text of at most `max` characters, or null when empty. */
export function optionalText(
  value: unknown,
  field: FieldKey,
  max = 1000,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new DataError("invalid", { field });
  const text = value.trim();
  if (text.length > max) {
    throw new DataError("tooLong", { field, max });
  }
  return text || null;
}

/** One of a fixed list of values, e.g. "checking" from ACCOUNT_TYPES */
export function oneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: FieldKey,
): T[number] {
  if (typeof value === "string" && allowed.includes(value)) return value;
  throw new DataError("invalid", { field });
}

// The largest amount a money column can hold (numeric(14,2))
const MAX_AMOUNT = 999_999_999_999.99;

/**
 * An amount of money, rounded to what the currency can express: whole cents,
 * or whole units for currencies without cents (yen, won)
 */
export function money(value: unknown, field: FieldKey, currency = "USD"): number {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new DataError("notANumber", { field });
  }
  if (Math.abs(amount) > MAX_AMOUNT) {
    throw new DataError("tooLarge", { field });
  }
  const factor = 10 ** Math.min(currencyDecimals(currency), 2);
  return Math.round(amount * factor) / factor;
}

/** A calendar day, e.g. "2026-10-01" */
export function isoDay(value: unknown, field: FieldKey): ISODate {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    // Real days only: "2026-13-01" is invalid, "2026-02-30" becomes March 2
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new DataError("notADate", { field });
  }
  return value;
}

/** A date (and optional time) in ISO format, e.g. "2026-10-01T14:41:00" */
export function dateTime(value: unknown, field: FieldKey): Date {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new DataError("notADate", { field });
  }
  return date;
}
