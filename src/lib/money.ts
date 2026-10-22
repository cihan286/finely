// ─────────────────────────────────────────────────────────────────────────────
// Money arithmetic
//
// In plain words: computers can't add most decimal numbers exactly (in
// JavaScript 0.1 + 0.2 is 0.30000000000000004, and 1.005 rounds down to
// 1.00). These helpers do every sum, difference and rounding of money as
// exact decimals, so totals are right to the cent and a half cent always
// rounds away from zero (1.005 → 1.01, -1.005 → -1.01).
//
// For developers: amounts stay plain numbers in and out (see "Data" in
// docs/development.md), the arithmetic in between is exact (decimal.js).
// Never add, subtract or round amounts with + and Math.round: use these. They
// also take the strings Postgres returns for numeric columns.
// ─────────────────────────────────────────────────────────────────────────────

import Decimal from "decimal.js";

/** An amount as a number or as Postgres returns a numeric ("12.30") */
export type MoneyInput = number | string;

// Half a cent goes away from zero, as in accounting
const Exact = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

const exact = (value: MoneyInput) => new Exact(value);

// Back to a number; "+ 0" turns -0 (from rounding -0.004) into 0, which
// would otherwise show as "-$0.00"
const toNumber = (value: Decimal, decimals = 2) =>
  value.toDecimalPlaces(decimals).toNumber() + 0;

/** An amount rounded to whole cents (or `decimals` places), e.g. 1.005 → 1.01 */
export function roundMoney(value: MoneyInput, decimals = 2): number {
  return toNumber(exact(value), decimals);
}

/** The exact sum of amounts, rounded to whole cents */
export function sumMoney(values: Iterable<MoneyInput>): number {
  let total = new Exact(0);
  for (const value of values) total = total.plus(value);
  return toNumber(total);
}

/** a + b + …, exactly, rounded to whole cents */
export function addMoney(...values: MoneyInput[]): number {
  return sumMoney(values);
}

/** a − b, exactly, rounded to whole cents */
export function subtractMoney(a: MoneyInput, b: MoneyInput): number {
  return toNumber(exact(a).minus(b));
}

/**
 * An amount times a factor (a quantity, a rate, "per month"), exactly,
 * rounded to whole cents: multiplyMoney(19.99, 3) → 59.97
 */
export function multiplyMoney(amount: MoneyInput, factor: MoneyInput): number {
  return toNumber(exact(amount).times(factor));
}

/** An amount in whole cents, e.g. 12.3 → 1230 */
export function toCents(value: MoneyInput): number {
  return toNumber(exact(value).times(100), 0);
}

/** Whether two amounts are the same to the cent */
export function sameAmount(a: MoneyInput, b: MoneyInput): boolean {
  return toCents(a) === toCents(b);
}
