// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
//
// In plain words: the data stores plain numbers and dates (like 2400 and
// 2026-10-01). These helpers turn them into friendly text for the screen,
// like "$2,400.00", "$12K", "Yesterday" or "Oct 1, 2026" — or, in Turkish,
// "$2.400,00", "12 B $", "Dün" and "1 Eki 2026".
//
// For developers: the only place display formatting should happen. Every
// helper takes the language last (English when it's left out): server code
// gets it from getI18n(), client components from useI18n(). Its few words
// are kept here rather than in i18n/messages, because browser code uses
// these helpers and shouldn't download every sentence of both languages.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from "@/lib/dates";
import { DEFAULT_LOCALE, intlLocale, type Locale } from "@/i18n/config";
import type { ISODate, Metric } from "@/types/finance";

// The words these helpers write, in each language
const WORDS: Record<
  Locale,
  { today: string; yesterday: string; noChange: string; noPreviousActivity: string; vsPrevious: string }
> = {
  en: {
    today: "Today",
    yesterday: "Yesterday",
    noChange: "No change",
    noPreviousActivity: "No activity in the previous 30 days",
    vsPrevious: "{change} vs. previous 30 days",
  },
  tr: {
    today: "Bugün",
    yesterday: "Dün",
    noChange: "Değişiklik yok",
    noPreviousActivity: "Önceki 30 günde hareket yok",
    vsPrevious: "Önceki 30 güne göre {change}",
  },
};

/** "Today" in a language */
export const todayWord = (locale: Locale = DEFAULT_LOCALE) => WORDS[locale].today;

// Formatters are slow to create, so each one is kept. The language is
// always given, so server and browser render the same string.
const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  let formatter = formatters.get(key) as T | undefined;
  if (!formatter) {
    formatter = make();
    formatters.set(key, formatter);
  }
  return formatter;
}

function currencyFormatter(currency: string, locale: Locale, compact = false): Intl.NumberFormat {
  return cached(`currency:${currency}:${locale}:${compact}`, () => {
    const options: Intl.NumberFormatOptions = {
      style: "currency",
      // "$", "€", "CA$": short, but never ambiguous between dollars
      currencyDisplay: "symbol",
      ...(compact ? { notation: "compact", maximumFractionDigits: 1 } : {}),
    };
    try {
      return new Intl.NumberFormat(intlLocale(locale), { ...options, currency });
    } catch {
      // Not a currency this system knows: show it as dollars rather than fail
      return new Intl.NumberFormat(intlLocale(locale), { ...options, currency: "USD" });
    }
  });
}

/** "USD" -> "$", "EUR" -> "€", "CAD" -> "CA$" */
export function currencySymbol(currency: string, locale: Locale = DEFAULT_LOCALE): string {
  return (
    currencyFormatter(currency, locale)
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

/** How many decimals a currency's amounts have: 2 for dollars, 0 for yen */
export function currencyDecimals(currency: string): number {
  return currencyFormatter(currency, DEFAULT_LOCALE).resolvedOptions().maximumFractionDigits ?? 2;
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
 * formatCurrency(2400, { currency: "EUR" }) -> "€2,400.00", in Turkish
 * "€2.400,00". Without a currency, US dollars.
 */
export function formatCurrency(
  value: number,
  { signed = false, currency = "USD" }: { signed?: boolean; currency?: string } = {},
  locale: Locale = DEFAULT_LOCALE,
): string {
  const text = currencyFormatter(currency, locale).format(Math.abs(value));
  if (!signed) return value < 0 ? `-${text}` : text;
  return `${value < 0 ? "-" : "+"}${text}`;
}

/** 12400 -> "$12.4K", in Turkish "$12,4 B" (chart axis labels) */
export function formatCompactCurrency(
  value: number,
  currency = "USD",
  locale: Locale = DEFAULT_LOCALE,
): string {
  return currencyFormatter(currency, locale, true).format(value);
}

/** "Maya Carter" -> "MC", "maya" -> "M" */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// 1234 -> "1,234", in Turkish "1.234"
export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return cached(`number:${locale}`, () => new Intl.NumberFormat(intlLocale(locale))).format(value);
}

/**
 * The change against the previous 30 days, e.g. "+12.4% vs. previous 30
 * days", and whether it counts as "good" (green).
 */
export function getMetricChange(
  {
    value,
    previousValue,
    higherIsBetter = true,
  }: Pick<Metric, "value" | "previousValue" | "higherIsBetter">,
  locale: Locale = DEFAULT_LOCALE,
): {
  text: string;
  isPositive: boolean;
} {
  const m = WORDS[locale];
  if (value === previousValue) return { text: m.noChange, isPositive: true };
  // Nothing to compare with: a percentage of zero is meaningless
  if (previousValue === 0) {
    return { text: m.noPreviousActivity, isPositive: true };
  }
  // Math.abs, so going from -100 to -50 counts as +50% (an improvement)
  const pct = ((value - previousValue) / Math.abs(previousValue)) * 100;
  const percent = cached(
    `percent:${locale}`,
    () =>
      new Intl.NumberFormat(intlLocale(locale), {
        style: "percent",
        signDisplay: "exceptZero",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
  );
  return {
    text: m.vsPrevious.replace("{change}", percent.format(pct / 100)),
    isPositive: higherIsBetter ? pct > 0 : pct < 0,
  };
}

// A calendar day as a moment Intl can format: midnight UTC, formatted in UTC
const asUtc = (day: ISODate) => new Date(`${day.slice(0, 10)}T00:00:00Z`);

// "Oct 8", in Turkish "8 Eki"
const monthDay = (locale: Locale, timeZone?: string) =>
  cached(
    `monthDay:${locale}:${timeZone}`,
    () => new Intl.DateTimeFormat(intlLocale(locale), { month: "short", day: "numeric", timeZone }),
  );

/**
 * "Today" / "Yesterday" / "Sep 28" / "Sep 28, 2025" (in an earlier year).
 * Both are calendar days in the company's timezone; the server provides
 * `today`, so the browser's own clock and timezone don't matter.
 */
export function formatRelativeDate(
  day: ISODate,
  today: ISODate,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const m = WORDS[locale];
  if (day === today) return m.today;
  if (day === addDays(today, -1)) return m.yesterday;
  if (day.slice(0, 4) !== today.slice(0, 4)) return formatDate(day, locale);
  return monthDay(locale, "UTC").format(asUtc(day));
}

/** Date -> "Oct 8" */
export function formatShortDate(date: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  return monthDay(locale).format(new Date(date));
}

/** "2026-10-08" -> "Oct 8, 2026", in Turkish "8 Eki 2026" (a calendar day; no timezone involved) */
export function formatDate(day: ISODate, locale: Locale = DEFAULT_LOCALE): string {
  return cached(
    `date:${locale}`,
    () => new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "UTC" }),
  ).format(asUtc(day));
}

/**
 * A moment in a timezone: "Oct 13, 2026, 2:05 PM", in Turkish
 * "13 Eki 2026 14:05". For the server (which knows the company's timezone);
 * the browser only formats day strings.
 */
export function formatDateTime(
  date: Date,
  timeZone: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const formatter = cached(
    `dateTime:${timeZone}:${locale}`,
    () =>
      new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone,
        dateStyle: "medium",
        timeStyle: "short",
      }),
  );
  // Some systems put a narrow space before AM/PM; a plain one everywhere
  return formatter.format(date).replace(/ /g, " ");
}
