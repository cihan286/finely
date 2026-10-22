// ─────────────────────────────────────────────────────────────────────────────
// Countries a company can be registered in
//
// In plain words: the list to choose a company's country from (Settings →
// Company details), with each country's name in the reader's language.
//
// For developers: ISO 3166-1 alpha-2 codes, as Intl.DisplayNames
// understands them (old and reserved codes left out). Safe to import from
// client components.
// ─────────────────────────────────────────────────────────────────────────────

export const COUNTRIES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT",
  "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI",
  "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
  "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
  "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK",
  "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL",
  "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR",
  "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
  "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS",
  "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP",
  "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
  "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM",
  "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF",
  "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW",
  "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;
export type CountryCode = (typeof COUNTRIES)[number];

/** Whether a text is one of the country codes, e.g. "TR" */
export function isCountry(value: unknown): value is CountryCode {
  return typeof value === "string" && (COUNTRIES as readonly string[]).includes(value);
}

/** A country's name in a language ("Turkey", in Turkish "Türkiye") */
export function countryName(code: string, intlLocale: string): string {
  try {
    return new Intl.DisplayNames([intlLocale], { type: "region" }).of(code) ?? code;
  } catch {
    // An old system without Intl.DisplayNames
    return code;
  }
}

/** Every country, sorted by its name in a language */
export function countriesByName(intlLocale: string): { code: CountryCode; name: string }[] {
  return COUNTRIES.map((code) => ({ code, name: countryName(code, intlLocale) })).sort(
    (a, b) => a.name.localeCompare(b.name, intlLocale),
  );
}
