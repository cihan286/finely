// ─────────────────────────────────────────────────────────────────────────────
// Payment cards: the calculations
//
// In plain words: a company's payment cards (the ones its bank issued) can
// be listed in Finely, each with who carries it and, if wanted, how much it
// may spend per month. This works out how much of that limit is used, and
// recognizes which card a bank's line was paid with from the last four
// digits banks print in the description ("CARD 4821", "**** 4821").
//
// For developers: pure functions, unit-tested in cards.test.ts. Finely
// doesn't issue or block cards: a limit is something to be warned about,
// not something that stops a payment. The spending is fetched by
// lib/data/cards.ts (completed money out this month, like the budgets).
// ─────────────────────────────────────────────────────────────────────────────

import { budgetStatus, type BudgetStatus } from "@/lib/finance/budgets";
import type { Card } from "@/types/finance";

/** A card with what was paid with it this month */
export interface CardSpending extends Card {
  /** Spent with it so far this month (a positive number) */
  spent: number;
  /** How many payments that was */
  payments: number;
}

export interface CardProgress extends CardSpending {
  /** What's left of the limit; negative once over; null without a limit */
  remaining: number | null;
  /** spent ÷ limit, e.g. 1.2 when 20% over; null without a limit */
  ratio: number | null;
  /** Where it stands against its limit; null without a limit */
  status: BudgetStatus | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Each card's progress against its monthly limit: cards in use first (the
 * most used up first, then by name), archived ones last.
 */
export function buildCards(cards: CardSpending[]): CardProgress[] {
  return cards
    .map((card) => {
      const limit = card.monthlyLimit;
      return {
        ...card,
        spent: round2(card.spent),
        remaining: limit === null ? null : round2(limit - card.spent),
        ratio: limit === null ? null : card.spent / limit,
        status: limit === null ? null : budgetStatus(card.spent, limit),
      };
    })
    .sort(
      (a, b) =>
        Number(a.archived) - Number(b.archived) ||
        (b.ratio ?? -1) - (a.ratio ?? -1) ||
        a.name.localeCompare(b.name),
    );
}

// Four digits that a description presents as a card's: after "card", after
// "ending (in)", or after the stars or x's that hide the rest of the number
const CARD_DIGITS =
  /(?:card(?:\s*(?:no\.?|number))?(?:\s+ending(?:\s+in)?)?\s*[#*x.\s]*|ending(?:\s+in)?\s+[#*x.\s]*|[*x•]{2,}[\s-]*|\*)(\d{4})(?!\d)/gi;

/**
 * The card a description was paid with, going by the last four digits in
 * it ("AMAZON CARD 4821", "UBER **** 4821", "Visa ending in 4821"); null if
 * it names none of these cards. Four digits that aren't presented as a
 * card's (a year, an invoice number) don't count.
 */
export function cardFromDescription(
  description: string,
  cards: { id: string; last4: string }[],
): string | null {
  if (cards.length === 0) return null;
  for (const match of description.matchAll(CARD_DIGITS)) {
    const card = cards.find((c) => c.last4 === match[1]);
    if (card) return card.id;
  }
  return null;
}
