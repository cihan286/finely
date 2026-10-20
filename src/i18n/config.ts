// ─────────────────────────────────────────────────────────────────────────────
// Languages: which ones there are
//
// In plain words: Finely speaks English and Turkish. This file lists them,
// says which one is used when we can't tell, and fills names and numbers
// into sentences ("Due in {days} days" -> "Due in 3 days").
//
// For developers: safe to import anywhere (server, browser, tests). The
// words themselves are in messages/; the language of a request is decided
// in server.ts, and client components read it with useI18n() (client.tsx).
// ─────────────────────────────────────────────────────────────────────────────

export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

/** Used when the visitor's browser asks for a language Finely doesn't speak */
export const DEFAULT_LOCALE: Locale = "en";

/** The cookie that remembers the language someone picked */
export const LOCALE_COOKIE = "finely-locale";

/** Each language in its own words, for the language switcher */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The locale Intl formats numbers and dates with: "1,234.56" or "1.234,56" */
export function intlLocale(locale: Locale): string {
  return locale === "tr" ? "tr-TR" : "en-US";
}

/**
 * The best language for a browser's Accept-Language header
 * ("tr-TR,tr;q=0.9,en;q=0.8" -> "tr"), or the default.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { language: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((entry) => entry.language && !Number.isNaN(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.map((entry) => entry.language).find(isLocale) ?? DEFAULT_LOCALE;
}

/**
 * Fills {placeholders}: fill("Due in {days} days", { days: 3 }) ->
 * "Due in 3 days". A placeholder without a value stays as it is.
 */
export function fill(
  text: string,
  values: Record<string, string | number | null | undefined>,
): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key] ?? "") : match,
  );
}

/** A sentence with a singular and a plural form ("1 bill", "{count} bills") */
export interface Plural {
  one: string;
  other: string;
}

/**
 * plural(3, { one: "1 bill", other: "{count} bills" }) -> "3 bills".
 * Turkish uses the same form for every number, so its two are the same.
 */
export function plural(
  count: number,
  forms: Plural,
  values: Record<string, string | number | null | undefined> = {},
): string {
  return fill(count === 1 ? forms.one : forms.other, { count, ...values });
}
