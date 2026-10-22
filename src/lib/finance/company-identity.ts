// ─────────────────────────────────────────────────────────────────────────────
// Checking a company's official numbers
//
// In plain words: Turkish tax numbers carry their own check digits, so a
// mistyped one can be caught before it ends up on an invoice:
//
//   VKN   10 digits, the tax number of a company ("vergi kimlik numarası")
//   TCKN  11 digits, the citizen number a sole proprietor is taxed under
//   MERSİS 16 digits, the central registration number (only its length and
//         digits can be checked)
//
// Other countries' numbers are kept as typed.
//
// For developers: pure functions, used by lib/data/company-profile.ts and
// usable in the browser. The checksums are the ones the Turkish Revenue
// Administration (GİB) and the population registry publish.
// ─────────────────────────────────────────────────────────────────────────────

const digitsOf = (text: string) => [...text].map(Number);

/** Spaces, dots and dashes people type inside numbers taken out */
export function compactNumber(text: string): string {
  return text.replace(/[\s.\-]/g, "");
}

/** Whether a text is a valid 10-digit VKN (check digit included) */
export function isValidVkn(text: string): boolean {
  if (!/^\d{10}$/.test(text)) return false;
  const d = digitsOf(text);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const shifted = (d[i] + 9 - i) % 10;
    let value = (shifted * 2 ** (9 - i)) % 9;
    if (shifted !== 0 && value === 0) value = 9;
    sum += value;
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

/** Whether a text is a valid 11-digit TCKN (both check digits included) */
export function isValidTckn(text: string): boolean {
  if (!/^[1-9]\d{10}$/.test(text)) return false;
  const d = digitsOf(text);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = d.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10;
  return d[9] === tenth && d[10] === eleventh;
}

/**
 * Whether a tax number is valid for a country: in Turkey a VKN or a TCKN,
 * elsewhere anything of up to 30 letters and digits
 */
export function isValidTaxId(text: string, country: string | null): boolean {
  if (country === "TR") return isValidVkn(text) || isValidTckn(text);
  return /^[A-Za-z0-9]{1,30}$/.test(text);
}

/** Whether a text is a 16-digit MERSİS number */
export function isValidMersis(text: string): boolean {
  return /^\d{16}$/.test(text);
}
