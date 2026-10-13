// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
//
// In plain words: the data stores plain numbers and dates (like 2400 and
// 2026-10-01). These helpers turn them into friendly text for the screen,
// like "$2,400.00", "$12k", "Yesterday" or "Oct 1, 2026".
//
// For developers: the only place display formatting should happen.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from "@/lib/dates";
import type { ISODate, Metric } from "@/types/finance";

// Short month names for dates like "Sep 28"
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// One formatter per currency: they're slow to create. Fixed "en-US" locale
// so server and client render the same string.
const currencyFormatters = new Map<string, Intl.NumberFormat>();
function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        // "$", "€", "CA$": short, but never ambiguous between dollars
        currencyDisplay: "symbol",
      });
    } catch {
      // Not a currency this system knows: show it as dollars rather than fail
      formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    }
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

/** "USD" -> "$", "EUR" -> "€", "CAD" -> "CA$" */
export function currencySymbol(currency: string): string {
  return (
    currencyFormatter(currency)
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

/** How many decimals a currency's amounts have: 2 for dollars, 0 for yen */
export function currencyDecimals(currency: string): number {
  return currencyFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
}

/**
 * What an amount field needs to know about a currency: yen and won have no
 * cents, so their fields take whole numbers ("1500", not "1500.00").
 * Spread it onto a number input next to its `name`.
 */
export function amountInputProps(currency: string): {
  step: string;
  min: string;
  placeholder: string;
  inputMode: "decimal" | "numeric";
} {
  return currencyDecimals(currency) === 0
    ? { step: "1", min: "1", placeholder: "0", inputMode: "numeric" }
    : { step: "0.01", min: "0.01", placeholder: "0.00", inputMode: "decimal" };
}

/**
 * formatCurrency(2400, { signed: true }) -> "+$2,400.00";
 * formatCurrency(2400, { currency: "EUR" }) -> "€2,400.00". Without a
 * currency, US dollars.
 */
export function formatCurrency(
  value: number,
  { signed = false, currency = "USD" }: { signed?: boolean; currency?: string } = {},
): string {
  const text = currencyFormatter(currency).format(Math.abs(value));
  if (!signed) return value < 0 ? `-${text}` : text;
  return `${value < 0 ? "-" : "+"}${text}`;
}

/** 12400 -> "$12.4k" (chart axis labels) */
export function formatCompactCurrency(value: number, currency = "USD"): string {
  const symbol = currencySymbol(currency);
  if (Math.abs(value) >= 1000)
    return `${symbol}${Math.round(value / 100) / 10}k`.replace(".0k", "k");
  return `${symbol}${value}`;
}

/** "Maya Carter" -> "MC", "maya" -> "M" */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// 1234 -> "1,234"
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/**
 * The change against the previous 30 days, e.g. "+12.4% vs. previous 30
 * days", and whether it counts as "good" (green).
 */
export function getMetricChange({
  value,
  previousValue,
  higherIsBetter = true,
}: Pick<Metric, "value" | "previousValue" | "higherIsBetter">): {
  text: string;
  isPositive: boolean;
} {
  if (value === previousValue) return { text: "No change", isPositive: true };
  // Nothing to compare with: a percentage of zero is meaningless
  if (previousValue === 0) {
    return { text: "No activity in the previous 30 days", isPositive: true };
  }
  // Math.abs, so going from -100 to -50 counts as +50% (an improvement)
  const pct = ((value - previousValue) / Math.abs(previousValue)) * 100;
  return {
    text: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs. previous 30 days`,
    isPositive: higherIsBetter ? pct > 0 : pct < 0,
  };
}

/**
 * "Today" / "Yesterday" / "Sep 28" / "Sep 28, 2025" (in an earlier year).
 * Both are calendar days in the company's timezone; the server provides
 * `today`, so the browser's own clock and timezone don't matter.
 */
export function formatRelativeDate(day: ISODate, today: ISODate): string {
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  if (day.slice(0, 4) !== today.slice(0, 4)) return formatDate(day);
  const [, month, date] = day.split("-").map(Number);
  return `${MONTHS[month - 1]} ${date}`;
}

/** Date -> "Oct 8" */
export function formatShortDate(date: Date | string): string {
  const d = new Date(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "2026-10-08" -> "Oct 8, 2026" (a calendar day; no timezone involved) */
export function formatDate(day: ISODate): string {
  const [year, month, date] = day.slice(0, 10).split("-").map(Number);
  return `${MONTHS[month - 1]} ${date}, ${year}`;
}

// One formatter per timezone: they're slow to create
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A moment in a timezone: "Oct 13, 2026, 2:05 PM". For the server (which
 * knows the company's timezone); the browser only formats day strings.
 */
export function formatDateTime(date: Date, timeZone: string): string {
  let formatter = dateTimeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    });
    dateTimeFormatters.set(timeZone, formatter);
  }
  // Some systems put a narrow space before AM/PM; a plain one everywhere
  return formatter.format(date).replace(/\u202f/g, " ");
}
