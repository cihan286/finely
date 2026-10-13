import { describe, expect, test } from "vitest";
import { billStatus, nextDueDate, summarizeBills } from "./bills";

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
