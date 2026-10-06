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
import { canManageFinances } from "@/lib/roles";
import type { ISODate } from "@/types/finance";

/** A problem the person can fix, with a message that's safe to show them. */
export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

/**
 * For server actions: the message to show for a DataError. Any other error
 * (a bug, or Next.js redirecting to /login) is passed on unchanged.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof DataError) return error.message;
  throw error;
}

/** A company's timezone ("UTC" until set). Read once per request. */
export const getCompanyTimeZone = cache(async (organizationId: string) => {
  const [row] = await db
    .select({ timezone: companySettings.timezone })
    .from(companySettings)
    .where(eq(companySettings.organizationId, organizationId));
  return row?.timezone ?? "UTC";
});

/**
 * The signed-in user, the company whose data they may use and its timezone.
 * With `manage: true`, also requires the owner or admin role.
 */
export async function getFinanceContext({ manage = false } = {}) {
  const { user, organization, role } = await requireOrganization();
  if (manage && !canManageFinances(role)) {
    throw new DataError("Only owners and admins can do this.");
  }
  return {
    userId: user.id,
    organizationId: organization.id,
    role,
    timeZone: await getCompanyTimeZone(organization.id),
  };
}

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
export function requiredText(value: unknown, field: string, max = 120): string {
  const text = optionalText(value, field, max);
  if (!text) throw new DataError(`${field} is required.`);
  return text;
}

/** Trimmed text of at most `max` characters, or null when empty. */
export function optionalText(
  value: unknown,
  field: string,
  max = 1000,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new DataError(`${field} is invalid.`);
  const text = value.trim();
  if (text.length > max) {
    throw new DataError(`${field} can be at most ${max} characters.`);
  }
  return text || null;
}

/** One of a fixed list of values, e.g. "checking" from ACCOUNT_TYPES */
export function oneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (typeof value === "string" && allowed.includes(value)) return value;
  throw new DataError(`${field} is invalid.`);
}

// The largest amount a money column can hold (numeric(14,2))
const MAX_AMOUNT = 999_999_999_999.99;

/** An amount of money, rounded to whole cents */
export function money(value: unknown, field: string): number {
  const amount = typeof value === "string" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new DataError(`${field} must be a number.`);
  }
  if (Math.abs(amount) > MAX_AMOUNT) {
    throw new DataError(`${field} is too large.`);
  }
  return Math.round(amount * 100) / 100;
}

/** A calendar day, e.g. "2026-10-01" */
export function isoDay(value: unknown, field: string): ISODate {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    // Real days only: "2026-13-01" is invalid, "2026-02-30" becomes March 2
    Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new DataError(`${field} must be a valid date.`);
  }
  return value;
}

/** A date (and optional time) in ISO format, e.g. "2026-10-01T14:41:00" */
export function dateTime(value: unknown, field: string): Date {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new DataError(`${field} must be a valid date.`);
  }
  return date;
}
