import { TODAY } from "@/data/mockData";
import type { ISODate, ISODateTime, Metric } from "@/types/finance";

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

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Month-over-month delta label + whether it counts as "good" (green). */
export function getMetricChange({
  value,
  previousValue,
  higherIsBetter = true,
}: Pick<Metric, "value" | "previousValue" | "higherIsBetter">): {
  text: string;
  isPositive: boolean;
} {
  if (value === previousValue) return { text: "No change", isPositive: true };
  const pct = ((value - previousValue) / previousValue) * 100;
  return {
    text: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% from last month`,
    isPositive: higherIsBetter ? pct > 0 : pct < 0,
  };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (from: Date, to: Date) =>
  Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000,
  );
const today = () => new Date(`${TODAY}T00:00:00`);

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

/** "Today, 2:41 PM" / "Yesterday" / "Sep 28" */
export function formatRelativeDate(iso: ISODateTime): string {
  const d = new Date(iso);
  const diff = dayDiff(d, today());
  if (diff === 0) return `Today, ${formatTime(d)}`;
  if (diff === 1) return "Yesterday";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "today" / "tomorrow" / "in 3 days" */
export function formatDueLabel(isoDate: ISODate): string {
  const diff = dayDiff(today(), new Date(`${isoDate}T00:00:00`));
  if (diff <= 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
}
