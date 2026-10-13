import { describe, expect, test } from "vitest";
import {
  billStatus,
  matchBillPayments,
  nextDueDate,
  summarizeBills,
  type ArrivedPayment,
  type OwedBill,
} from "./bills";

describe("nextDueDate", () => {
  test("moves on by the bill's repeat", () => {
    expect(nextDueDate("2026-10-15", "weekly")).toBe("2026-10-22");
    expect(nextDueDate("2026-10-15", "biweekly")).toBe("2026-10-29");
    expect(nextDueDate("2026-10-15", "monthly")).toBe("2026-11-15");
    expect(nextDueDate("2026-10-15", "quarterly")).toBe("2027-01-15");
    expect(nextDueDate("2026-10-15", "yearly")).toBe("2027-10-15");
  });

  test("a bill that doesn't repeat has no next date", () => {
    expect(nextDueDate("2026-10-15", "none")).toBeNull();
  });

  test("a day the next month doesn't have becomes its last day", () => {
    expect(nextDueDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextDueDate("2028-01-31", "monthly")).toBe("2028-02-29");
    expect(nextDueDate("2026-11-30", "quarterly")).toBe("2027-02-28");
    expect(nextDueDate("2028-02-29", "yearly")).toBe("2029-02-28");
  });

  test("crosses the end of the year", () => {
    expect(nextDueDate("2026-12-28", "weekly")).toBe("2027-01-04");
    expect(nextDueDate("2026-12-15", "monthly")).toBe("2027-01-15");
  });
});

describe("billStatus", () => {
  const today = "2026-10-13";

  test("overdue from the day after it was due", () => {
    expect(billStatus("2026-10-12", today)).toBe("overdue");
    expect(billStatus("2026-10-13", today)).toBe("dueSoon");
  });

  test("due soon for a week, today included", () => {
    expect(billStatus("2026-10-19", today)).toBe("dueSoon");
    expect(billStatus("2026-10-20", today)).toBe("upcoming");
  });
});

describe("matchBillPayments", () => {
  const bill = (overrides: Partial<OwedBill> = {}): OwedBill => ({
    id: "bill_1",
    name: "Figma",
    amount: 45,
    dueDate: "2026-10-15",
    repeat: "monthly",
    ...overrides,
  });
  const payment = (overrides: Partial<ArrivedPayment> = {}): ArrivedPayment => ({
    id: "tx_1",
    name: "FIGMA INC. INV-1004",
    amount: -45,
    day: "2026-10-14",
    ...overrides,
  });

  test("the same vendor, the exact amount, close to the due date", () => {
    expect(matchBillPayments([bill()], [payment()])).toEqual([
      { billId: "bill_1", paymentId: "tx_1" },
    ]);
  });

  test("not another amount, money in, another vendor, or too far from the due date", () => {
    for (const other of [
      payment({ amount: -45.01 }),
      payment({ amount: 45 }),
      payment({ name: "NOTION LABS" }),
      payment({ day: "2026-10-04" }), // 11 days early
      payment({ day: "2026-11-02" }), // 18 days late: nearer to the next one
    ]) {
      expect(matchBillPayments([bill()], [other])).toEqual([]);
    }
    expect(matchBillPayments([bill()], [payment({ day: "2026-10-05" })])).toHaveLength(1);
    expect(matchBillPayments([bill()], [payment({ day: "2026-11-01" })])).toHaveLength(1);
  });

  test("last week's payment isn't taken for this week's bill", () => {
    const weekly = bill({ repeat: "weekly", dueDate: "2026-10-15" });
    expect(matchBillPayments([weekly], [payment({ day: "2026-10-08" })])).toEqual([]);
    expect(matchBillPayments([weekly], [payment({ day: "2026-10-16" })])).toHaveLength(1);
  });

  test("a bill that doesn't repeat can be paid a good while late", () => {
    const once = bill({ repeat: "none" });
    expect(matchBillPayments([once], [payment({ day: "2026-11-29" })])).toHaveLength(1);
    expect(matchBillPayments([once], [payment({ day: "2026-11-30" })])).toEqual([]);
  });

  test("one payment pays one bill: the one due first, with the closest payment", () => {
    const matches = matchBillPayments(
      [
        bill({ id: "bill_late", dueDate: "2026-10-20" }),
        bill({ id: "bill_early", dueDate: "2026-10-12" }),
      ],
      [
        payment({ id: "tx_far", day: "2026-10-18" }),
        payment({ id: "tx_near", day: "2026-10-13" }),
      ],
    );
    expect(matches).toEqual([
      { billId: "bill_early", paymentId: "tx_near" },
      { billId: "bill_late", paymentId: "tx_far" },
    ]);
    // Only one payment for two bills: the later bill stays unpaid
    expect(
      matchBillPayments(
        [bill({ id: "a", dueDate: "2026-10-12" }), bill({ id: "b", dueDate: "2026-10-14" })],
        [payment()],
      ),
    ).toEqual([{ billId: "a", paymentId: "tx_1" }]);
  });
});

describe("summarizeBills", () => {
  test("adds up what's overdue, due soon and owed in total", () => {
    const summary = summarizeBills(
      [
        { amount: 100.1, dueDate: "2026-10-01" },
        { amount: 200.2, dueDate: "2026-10-10" },
        { amount: 50, dueDate: "2026-10-15" },
        { amount: 1000, dueDate: "2026-12-01" },
      ],
      "2026-10-13",
    );
    expect(summary).toEqual({
      overdue: { count: 2, amount: 300.3 },
      dueSoon: { count: 1, amount: 50 },
      unpaid: { count: 4, amount: 1350.3 },
    });
  });

  test("no bills: all zero", () => {
    expect(summarizeBills([], "2026-10-13").unpaid).toEqual({ count: 0, amount: 0 });
  });
});
