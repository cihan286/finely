// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
//
// In plain words: the data stores plain numbers and dates (like 2400 and
// 2026-10-01). These helpers turn them into friendly text for the screen,
// like "$2,400.00", "$12k", "Yesterday" or "Oct 1, 2026".
//
// For developers: the only place display formatting should happen.
// ─────────────────────────────────────────────────────────────────────────────

import type { ISODateTime, Metric } from "@/types/finance";

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

// Fixed "en-US" locale so server and client render the same string.
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** formatCurrency(2400, { signed: true }) -> "+$2,400.00" */
export function formatCurrency(
  value: number,
  { signed = false }: { signed?: boolean } = {},
): string {
  const text = currency.format(Math.abs(value));
  if (!signed) return value < 0 ? `-${text}` : text;
  return `${value < 0 ? "-" : "+"}${text}`;
}

/** 12400 -> "$12k" (chart axis labels) */
export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000)
    return `$${Math.round(value / 100) / 10}k`.replace(".0k", "k");
  return `$${value}`;
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

/** "Today" / "Yesterday" / "Sep 28" / "Sep 28, 2025" (in an earlier year) */
export function formatRelativeDate(iso: ISODateTime): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, now)) return "Today";
  if (sameDay(date, new Date(now.getTime() - 86_400_000))) return "Yesterday";
  if (date.getFullYear() !== now.getFullYear()) return formatDate(date);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Date -> "Oct 8" */
export function formatShortDate(date: Date | string): string {
  const d = new Date(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Date -> "Oct 8, 2026" */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
