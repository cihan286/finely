// ─────────────────────────────────────────────────────────────────────────────
// Currencies a company can work in
//
// In plain words: each company keeps its books in one currency of its
// choice (Settings). This is the list to choose from.
//
// For developers: ISO 4217 codes, as Intl.NumberFormat understands them.
// Amounts are stored as plain numbers with two decimals and are never
// converted: the currency only decides how they're shown. Safe to import
// from client components.
// ─────────────────────────────────────────────────────────────────────────────

export const CURRENCIES = {
  USD: "US dollar",
  EUR: "Euro",
  GBP: "British pound",
  TRY: "Turkish lira",
  CAD: "Canadian dollar",
  AUD: "Australian dollar",
  NZD: "New Zealand dollar",
  CHF: "Swiss franc",
  SEK: "Swedish krona",
  NOK: "Norwegian krone",
  DKK: "Danish krone",
  PLN: "Polish złoty",
  CZK: "Czech koruna",
  HUF: "Hungarian forint",
  RON: "Romanian leu",
  ILS: "Israeli shekel",
  AED: "UAE dirham",
  SAR: "Saudi riyal",
  ZAR: "South African rand",
  INR: "Indian rupee",
  SGD: "Singapore dollar",
  HKD: "Hong Kong dollar",
  JPY: "Japanese yen",
  CNY: "Chinese yuan",
  KRW: "South Korean won",
  BRL: "Brazilian real",
  MXN: "Mexican peso",
} as const;
export type CurrencyCode = keyof typeof CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

/**
 * A currency's name in a language ("Turkish lira", in Turkish "Türk Lirası"),
 * from the browser's or server's own list; the English name above if it
 * has none.
 */
export function currencyName(code: string, intlLocale: string): string {
  try {
    const name = new Intl.DisplayNames([intlLocale], { type: "currency" }).of(code);
    if (name && name !== code) return name;
  } catch {
    // An old system without Intl.DisplayNames
  }
  return CURRENCIES[code as CurrencyCode] ?? code;
}

/** Whether this is a currency a company can choose */
export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && Object.hasOwn(CURRENCIES, value);
}
