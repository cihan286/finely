// ─────────────────────────────────────────────────────────────────────────────
// Understanding bank statement files (CSV)
//
// In plain words: every bank exports its statements a little differently.
// Dates can be written 2026-10-31, 10/31/2026 or 31.10.2026; amounts can be
// "-1,234.56", "1.234,56", "(45.00)" or "$12"; some banks have one amount
// column (negative = money out), others separate "money in" and "money out"
// columns. This file guesses which column is which, turns each line of the
// statement into a transaction — or explains why a line can't be used — and
// recognizes lines that were already imported.
//
// For developers: pure functions, used in the browser (to preview an import)
// and the shapes it produces are checked again on the server by
// importTransactions() in lib/data/transactions.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { ISODate } from "@/types/finance";

/** The most lines one import may contain */
export const MAX_IMPORT_ROWS = 2000;

// Longer descriptions are shortened to this (the database limit for names)
const MAX_NAME_LENGTH = 120;

/** The order of day, month and year in a statement's dates */
export const DATE_FORMATS = {
  YMD: "2026-10-31",
  MDY: "10/31/2026",
  DMY: "31/10/2026 or 31.10.2026",
} as const;
export type DateFormat = keyof typeof DATE_FORMATS;

/** Which column holds what. Column numbers start at 0; -1 = not used. */
export interface ColumnMapping {
  /** Whether the first line holds column names rather than a transaction */
  hasHeader: boolean;
  date: number;
  dateFormat: DateFormat;
  name: number;
  /** "single": one amount column; "split": separate money in / money out */
  amountMode: "single" | "split";
  amount: number;
  moneyIn: number;
  moneyOut: number;
  category: number;
  /** For statements where money out is shown as a positive number */
  flipSign: boolean;
}

/** One line of the statement, ready to import */
export interface StatementRow {
  date: ISODate;
  name: string;
  /** Positive = money in, negative = money out */
  amount: number;
  /** The category's name as written in the file, if mapped */
  category: string | null;
}

/** A line that can't be imported, and why */
export interface RowProblem {
  /** The line's number in the file (counting the column names line) */
  line: number;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Dates and amounts                                                   */
/* ------------------------------------------------------------------ */

/** "31.10.2026" + "DMY" -> "2026-10-31"; null if it isn't a real date */
export function parseStatementDate(
  value: string,
  format: DateFormat,
): ISODate | null {
  // Ignore a time after the date ("2026-10-31 14:02" / "2026-10-31T14:02")
  const parts = value.trim().split(/[ T]/)[0].split(/[-/.]/);
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;

  const order = { YMD: [0, 1, 2], MDY: [2, 0, 1], DMY: [2, 1, 0] }[format];
  let year = Number(parts[order[0]]);
  const month = Number(parts[order[1]]);
  const day = Number(parts[order[2]]);
  if (parts[order[0]].length === 2) year += 2000; // "26" -> 2026
  if (year < 1900 || year > 2100) return null;

  // Rejects dates that don't exist, such as February 30
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** The first date format that every value fits, or null if none does */
export function detectDateFormat(values: string[]): DateFormat | null {
  const filled = values.filter(Boolean);
  if (filled.length === 0) return null;
  const formats = Object.keys(DATE_FORMATS) as DateFormat[];
  return (
    formats.find((format) =>
      filled.every((v) => parseStatementDate(v, format) !== null),
    ) ?? null
  );
}

/**
 * "-$1,234.56", "1.234,56", "(45.00)", "45.00-" -> a number; null when the
 * text isn't an amount. Empty text is null too.
 */
export function parseStatementAmount(value: string): number | null {
  let text = value.trim();
  if (!text) return null;

  // Negative: "-12", "12-" or "(12)"
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-") || text.endsWith("-")) {
    negative = !negative;
    text = text.replace(/^-|-$/g, "");
  }
  // Drop currency signs and codes, spaces and ' (as in Swiss 1'234.50)
  text = text.replace(/[^\d.,-]/g, "");
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  }
  if (!/^[\d.,]*\d[\d.,]*$/.test(text)) return null;

  // The last . or , is the decimal point if 1–2 digits follow it;
  // every other . or , separates thousands
  const lastSeparator = Math.max(text.lastIndexOf("."), text.lastIndexOf(","));
  const decimals = lastSeparator === -1 ? 0 : text.length - lastSeparator - 1;
  const hasDecimals = decimals === 1 || decimals === 2;
  const whole = hasDecimals ? text.slice(0, lastSeparator) : text;
  // Thousands come in groups of three digits ("1,234,567"); "12.3.4" isn't
  // an amount
  if (!/^\d+$|^\d{1,3}([.,]\d{3})+$/.test(whole)) return null;
  const number = Number(
    whole.replace(/[.,]/g, "") +
      (hasDecimals ? `.${text.slice(lastSeparator + 1)}` : ""),
  );
  return negative ? -number : number;
}

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

/** 0 -> "Column A", 26 -> "Column AA" */
export function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return `Column ${letters}`;
}

// Common column names in bank exports (English and a few other languages)
const COLUMN_NAMES = {
  date: /date|datum|fecha|tarih|posted|booking/i,
  name: /desc|payee|merchant|memo|detail|narrative|name|text|reference|açıklama/i,
  moneyIn: /credit|deposit|money in|paid in|incoming|eingang/i,
  moneyOut: /debit|withdrawal|money out|paid out|outgoing|ausgang/i,
  amount: /amount|betrag|value|importe|tutar/i,
  category: /categor|kategor/i,
};

/** A first guess of which column holds what, from the names and contents */
export function guessMapping(rows: string[][]): ColumnMapping {
  const first = rows[0] ?? [];
  const columnCount = Math.max(...rows.slice(0, 20).map((r) => r.length), 0);
  const columns = Array.from({ length: columnCount }, (_, i) => i);
  const formats = Object.keys(DATE_FORMATS) as DateFormat[];

  // A first line without any date in it is a line of column names
  const hasHeader = !first.some((cell) =>
    formats.some((f) => parseStatementDate(cell, f) !== null),
  );
  const headers = hasHeader ? first : [];
  const sample = rows.slice(hasHeader ? 1 : 0, 50);
  const values = (column: number) => sample.map((r) => r[column] ?? "");

  // A column by its name, among the columns not taken yet
  const taken = new Set<number>();
  const byName = (pattern: RegExp) => {
    const found = columns.find(
      (c) => !taken.has(c) && pattern.test(headers[c] ?? ""),
    );
    if (found !== undefined) taken.add(found);
    return found ?? -1;
  };
  // A column by its contents, among the columns not taken yet
  const byContent = (test: (values: string[]) => boolean) => {
    const found = columns.find((c) => !taken.has(c) && test(values(c)));
    if (found !== undefined) taken.add(found);
    return found ?? -1;
  };

  // By name first, otherwise by contents
  const pick = (pattern: RegExp, test: (values: string[]) => boolean) => {
    const named = byName(pattern);
    return named !== -1 ? named : byContent(test);
  };

  const isDates = (v: string[]) => detectDateFormat(v) !== null;
  const isAmounts = (v: string[]) =>
    v.some(Boolean) && v.every((x) => !x || parseStatementAmount(x) !== null);

  const date = pick(COLUMN_NAMES.date, isDates);
  const moneyIn = byName(COLUMN_NAMES.moneyIn);
  const moneyOut = byName(COLUMN_NAMES.moneyOut);
  const split = moneyIn !== -1 && moneyOut !== -1;
  if (!split) {
    taken.delete(moneyIn);
    taken.delete(moneyOut);
  }
  const amount = split ? -1 : pick(COLUMN_NAMES.amount, isAmounts);
  const category = byName(COLUMN_NAMES.category);
  const named = byName(COLUMN_NAMES.name);
  // Otherwise the description is the remaining column with the longest text
  const name =
    named !== -1
      ? named
      : columns
          .filter((c) => !taken.has(c))
          .sort(
            (a, b) =>
              values(b).join("").length - values(a).join("").length,
          )[0] ?? -1;

  return {
    hasHeader,
    date,
    dateFormat: (date !== -1 && detectDateFormat(values(date))) || "MDY",
    name,
    amountMode: split ? "split" : "single",
    amount,
    moneyIn: split ? moneyIn : -1,
    moneyOut: split ? moneyOut : -1,
    category,
    flipSign: false,
  };
}

/* ------------------------------------------------------------------ */
/* Lines -> transactions                                               */
/* ------------------------------------------------------------------ */

/**
 * Turns the statement's lines into transactions using the column mapping.
 * Lines that can't be used are listed in `problems` instead.
 */
export function interpretRows(
  rows: string[][],
  mapping: ColumnMapping,
): { rows: StatementRow[]; problems: RowProblem[] } {
  const result: StatementRow[] = [];
  const problems: RowProblem[] = [];
  const start = mapping.hasHeader ? 1 : 0;

  for (let i = start; i < rows.length; i++) {
    const cells = rows[i];
    const cell = (column: number) => (column >= 0 ? (cells[column] ?? "") : "");
    const problem = (message: string) => problems.push({ line: i + 1, message });

    const date = parseStatementDate(cell(mapping.date), mapping.dateFormat);
    if (!date) {
      problem(`“${cell(mapping.date)}” isn't a date in the chosen format.`);
      continue;
    }

    let amount: number | null;
    if (mapping.amountMode === "split") {
      const moneyIn = parseStatementAmount(cell(mapping.moneyIn));
      const moneyOut = parseStatementAmount(cell(mapping.moneyOut));
      // Money out may be written with or without a minus sign
      amount =
        moneyIn === null && moneyOut === null
          ? null
          : Math.abs(moneyIn ?? 0) - Math.abs(moneyOut ?? 0);
    } else {
      amount = parseStatementAmount(cell(mapping.amount));
    }
    if (amount === null) {
      problem("No amount.");
      continue;
    }
    amount = Math.round(amount * 100) / 100;
    if (amount === 0) {
      problem("The amount is zero.");
      continue;
    }

    // Collapse runs of spaces, common in bank descriptions
    const name = cell(mapping.name).replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
    if (!name) {
      problem("No description.");
      continue;
    }

    result.push({
      date,
      name,
      amount: mapping.flipSign ? -amount : amount,
      category: cell(mapping.category) || null,
    });
  }
  return { rows: result, problems };
}

/* ------------------------------------------------------------------ */
/* Skipping lines that were imported before                            */
/* ------------------------------------------------------------------ */

/**
 * What makes two transactions "the same" when importing: same day, amount
 * and description (ignoring upper/lower case).
 */
export const duplicateKey = (day: ISODate, amount: number, name: string) =>
  `${day}|${amount.toFixed(2)}|${name.toLowerCase()}`;

/**
 * The incoming lines, minus the ones already there. A statement can contain
 * two identical lines (two coffees on one day), so for each key only as many
 * lines are dropped as already exist.
 */
export function removeExisting<T>(
  incoming: T[],
  existingKeys: string[],
  keyOf: (item: T) => string,
): T[] {
  const remaining = new Map<string, number>();
  for (const key of existingKeys) remaining.set(key, (remaining.get(key) ?? 0) + 1);
  return incoming.filter((item) => {
    const key = keyOf(item);
    const left = remaining.get(key) ?? 0;
    if (left === 0) return true;
    remaining.set(key, left - 1);
    return false;
  });
}
