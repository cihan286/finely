import { describe, expect, test } from "vitest";
import { buildCards, cardFromDescription, type CardSpending } from "./cards";

const card = (overrides: Partial<CardSpending>): CardSpending => ({
  id: "card_1",
  name: "Marketing",
  last4: "4821",
  holderId: null,
  holder: null,
  monthlyLimit: null,
  archived: false,
  spent: 0,
  payments: 0,
  ...overrides,
});

describe("buildCards", () => {
  test("says how much of each limit is used", () => {
    const [over, near, free] = buildCards([
      card({ id: "a", name: "Travel", monthlyLimit: 1000, spent: 850 }),
      card({ id: "b", name: "Ads", monthlyLimit: 500, spent: 620.5 }),
      card({ id: "c", name: "Office", spent: 99.999 }),
    ]);
    expect(over).toMatchObject({ id: "b", remaining: -120.5, status: "over" });
    expect(over.ratio).toBeCloseTo(1.241);
    expect(near).toMatchObject({ id: "a", remaining: 150, ratio: 0.85, status: "near" });
    // Without a limit there's nothing to measure against
    expect(free).toMatchObject({ id: "c", spent: 100, remaining: null, ratio: null, status: null });
  });

  test("archived cards come last", () => {
    const cards = buildCards([
      card({ id: "old", name: "Aaa", archived: true, monthlyLimit: 10, spent: 100 }),
      card({ id: "b", name: "Bbb" }),
      card({ id: "a", name: "Abc" }),
    ]);
    expect(cards.map((c) => c.id)).toEqual(["a", "b", "old"]);
  });
});

describe("cardFromDescription", () => {
  const cards = [
    { id: "card_1", last4: "4821" },
    { id: "card_2", last4: "0007" },
  ];

  test("recognizes the last four digits the way banks print them", () => {
    for (const description of [
      "AMAZON MKTP CARD 4821",
      "UBER TRIP **** 4821",
      "FIGMA INC XXXX4821",
      "Visa ending in 4821 NOTION",
      "Card no. 4821 GITHUB",
      "SLACK *4821",
      "card ending 4821",
    ]) {
      expect(cardFromDescription(description, cards)).toBe("card_1");
    }
    expect(cardFromDescription("COFFEE CARD 0007", cards)).toBe("card_2");
  });

  test("four digits that aren't presented as a card's don't count", () => {
    for (const description of [
      "INVOICE 4821",
      "AWS EMEA 2026 4821 EUR",
      "REF-4821",
      "CARD 48213", // five digits
      "CARD 9999", // a card we don't have
      "",
    ]) {
      expect(cardFromDescription(description, cards)).toBeNull();
    }
    expect(cardFromDescription("CARD 4821", [])).toBeNull();
  });
});
