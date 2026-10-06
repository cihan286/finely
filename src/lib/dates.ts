// ─────────────────────────────────────────────────────────────────────────────
// Calendar days in a company's timezone
//
// In plain words: a payment made at 11 pm in New York is already "tomorrow"
// in London. So that every date in Finely matches the company's own
// calendar, each company has a timezone (Settings), and these helpers answer
// "which day was this moment, over there?" and "when did that day start,
// over there?".
//
// For developers: pure functions on top of Intl; no dependencies. Days are
// ISO strings ("2026-10-06"); moments are Date objects (stored in the
// database as UTC). The server converts moments to days with localDay(), so
// browser code only ever formats day strings.
// ─────────────────────────────────────────────────────────────────────────────

import type { ISODate } from "@/types/finance";

/** Whether the browser/server knows this timezone, e.g. "Europe/Istanbul" */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Formatters are slow to create, so each timezone's is kept
const formatters = new Map<string, Intl.DateTimeFormat>();
function partsIn(date: Date, timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  const parts: Record<string, string> = {};
  for (const { type, value } of formatter.formatToParts(date)) parts[type] = value;
  return parts;
}

/** The calendar day a moment falls on in a timezone */
export function localDay(date: Date, timeZone: string): ISODate {
  const { year, month, day } = partsIn(date, timeZone);
  return `${year}-${month}-${day}`;
}

/** Today's date in a timezone */
export function todayIn(timeZone: string, now = new Date()): ISODate {
  return localDay(now, timeZone);
}

/** "2026-10-06" + 1 -> "2026-10-07" (works across months and years) */
export function addDays(day: ISODate, days: number): ISODate {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from one day to another ("2026-10-01" -> "2026-10-06" = 5) */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

// How far a timezone is ahead of UTC at a moment, in milliseconds
function offsetAt(date: Date, timeZone: string): number {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The moment a local day and time happen in a timezone, e.g. noon on
 * 2026-10-06 in New York -> 2026-10-06T16:00:00Z.
 */
export function zonedTime(day: ISODate, time: string, timeZone: string): Date {
  const guess = Date.parse(`${day}T${time}:00Z`);
  // The offset can differ on either side of a daylight-saving change, so
  // check it again at the corrected moment
  const first = guess - offsetAt(new Date(guess), timeZone);
  return new Date(guess - offsetAt(new Date(first), timeZone));
}

/** The moment a day starts (midnight) in a timezone */
export function startOfDay(day: ISODate, timeZone: string): Date {
  return zonedTime(day, "00:00", timeZone);
}
