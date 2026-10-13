// ─────────────────────────────────────────────────────────────────────────────
// Cash-flow forecast: the calculations
//
// In plain words: starting from what's in the bank today, this adds what is
// expected over the next 30 days — unpaid bills, and the regular payments
// and regular income spotted in the history — to estimate where the balance
// will be, and the lowest it will get on the way.
//
// For developers: pure functions, unit-tested in forecast.test.ts. An
// overdue bill and a late regular payment are expected today. A regular
// payment that is already tracked as an unpaid bill is counted once, as the
// bill. Bills and regular payments that come back within the 30 days are
// counted each time. It's an estimate: one-off income and spending aren't
// in it.
// ─────────────────────────────────────────────────────────────────────────────

import { addDays } from "@/lib/dates";
import { nextDueDate } from "@/lib/finance/bills";
import { billKey, type RecurringPayment } from "@/lib/finance/recurring";
import type { BillRepeat, ISODate } from "@/types/finance";

/** How far ahead the forecast looks, in days */
export const FORECAST_DAYS = 30;

export interface ForecastEvent {
  day: ISODate;
  name: string;
  /** Positive = money in, negative = money out */
  amount: number;
  /** A bill someone entered, or a regular payment spotted in the history */
  source: "bill" | "recurring";
  /** Whether the amount is an estimate (a regular payment whose amount varies) */
  estimated: boolean;
}

export interface Forecast {
  today: ISODate;
  /** The last day looked at */
  until: ISODate;
  /** What's in all accounts today */
  startBalance: number;
  /** The estimate for the last day */
  endBalance: number;
  /** The lowest the balance gets, and the first day it does */
  lowest: { balance: number; day: ISODate };
  /** Expected money in and out (both positive) */
  moneyIn: number;
  moneyOut: number;
  /** Everything expected, soonest first */
  events: ForecastEvent[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Estimates the balance over the next 30 days. */
export function buildForecast({
  today,
  balance,
  bills,
  recurring,
}: {
  today: ISODate;
  /** What's in all accounts today */
  balance: number;
  /** Unpaid bills */
  bills: { name: string; amount: number; dueDate: ISODate; repeat: BillRepeat }[];
  recurring: RecurringPayment[];
}): Forecast {
  const until = addDays(today, FORECAST_DAYS);
  const events: ForecastEvent[] = [];

  // Every time something comes back before the end, starting from `first`
  const eachTime = (first: ISODate, repeat: BillRepeat, add: (day: ISODate) => void) => {
    if (first > until) return;
    // Late: expected right away, once
    add(first < today ? today : first);
    let next = nextDueDate(first, repeat);
    while (next && next <= until) {
      if (next >= today) add(next);
      next = nextDueDate(next, repeat);
    }
  };

  for (const bill of bills) {
    eachTime(bill.dueDate, bill.repeat, (day) =>
      events.push({
        day,
        name: bill.name,
        amount: -bill.amount,
        source: "bill",
        estimated: false,
      }),
    );
  }

  const billed = new Set(bills.map((bill) => billKey(bill.name)));
  for (const payment of recurring) {
    // Already there as a bill
    if (billed.has(payment.key)) continue;
    eachTime(payment.nextDay, payment.cadence, (day) =>
      events.push({
        day,
        name: payment.name,
        amount: payment.direction === "in" ? payment.amount : -payment.amount,
        source: "recurring",
        estimated: payment.variable,
      }),
    );
  }

  // Soonest first; on one day, money out before money in, so the lowest
  // point is the cautious one
  events.sort((a, b) => a.day.localeCompare(b.day) || a.amount - b.amount);

  let running = balance;
  let lowest = { balance, day: today };
  let moneyIn = 0;
  let moneyOut = 0;
  for (const event of events) {
    running = round2(running + event.amount);
    if (event.amount > 0) moneyIn += event.amount;
    else moneyOut -= event.amount;
    if (running < lowest.balance) lowest = { balance: running, day: event.day };
  }

  return {
    today,
    until,
    startBalance: round2(balance),
    endBalance: running,
    lowest,
    moneyIn: round2(moneyIn),
    moneyOut: round2(moneyOut),
    events,
  };
}
