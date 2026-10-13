import { describe, expect, test } from "vitest";
import { buildNotifications, type NotificationFacts } from "./notifications";

const nothing: NotificationFacts = {
  unusualCharges: [],
  overdrawnAccounts: [],
  cashShortfall: null,
  overBudget: [],
  overdueBills: { count: 0, amount: 0, at: null },
  billsDueSoon: { count: 0, amount: 0, at: null },
  stalePending: { count: 0, at: null },
  uncategorized: { count: 0, at: null },
};

const at = (iso: string) => new Date(iso);

describe("buildNotifications", () => {
  test("nothing to report: no notifications", () => {
    expect(buildNotifications(nothing, null, "UTC", "2026-10-06")).toEqual([]);
  });

  test("one notification per fact, newest first, linking to where to fix it", () => {
    const result = buildNotifications(
      {
        unusualCharges: [
          {
            id: "tx_1",
            name: "AWS",
            day: "2026-10-01",
            amount: 400,
            usual: 250,
            percentAbove: 60,
            at: at("2026-10-01T09:00:00Z"),
          },
        ],
        overdrawnAccounts: [
          { id: "acc_1", name: "Checking", balance: -120.5, at: at("2026-10-03T09:00:00Z") },
        ],
        cashShortfall: null,
        overBudget: [],
        overdueBills: { count: 0, amount: 0, at: null },
        billsDueSoon: { count: 0, amount: 0, at: null },
        stalePending: { count: 2, at: at("2026-10-02T09:00:00Z") },
        uncategorized: { count: 1, at: at("2026-09-30T09:00:00Z") },
      },
      null,
      "UTC",
      "2026-10-06",
    );
    expect(result.map((n) => [n.id, n.type, n.day, n.href])).toEqual([
      ["overdrawn-acc_1", "alert", "2026-10-03", "/dashboard/transactions?account=acc_1"],
      ["stale-pending", "reminder", "2026-10-02", "/dashboard/transactions"],
      ["unusual-tx_1", "alert", "2026-10-01", "/dashboard/transactions?edit=tx_1"],
      ["uncategorized", "reminder", "2026-09-30", "/dashboard/transactions?category=none"],
    ]);
    expect(result[0].description).toBe("Checking is at -$120.50.");
    expect(result[1].description).toContain("2 payments have been pending");
    expect(result[2].description).toBe("AWS charged $400.00, 60% above its usual $250.00.");
    expect(result[3].description).toContain("1 transaction has no category");
  });

  test("reports overdue bills as an alert and bills due soon as a reminder", () => {
    const result = buildNotifications(
      {
        ...nothing,
        overdueBills: { count: 1, amount: 1200, at: at("2026-10-05T00:00:00Z") },
        billsDueSoon: { count: 2, amount: 310.5, at: at("2026-10-04T00:00:00Z") },
      },
      null,
      "UTC",
      "2026-10-06",
    );
    expect(result.map((n) => [n.id, n.type, n.title, n.href])).toEqual([
      ["bills-overdue", "alert", "Bill overdue", "/dashboard/bills"],
      ["bills-due-soon", "reminder", "Bills due soon", "/dashboard/bills"],
    ]);
    expect(result[0].description).toBe("1 bill is past its due date, $1,200.00 in total.");
    expect(result[1].description).toBe("2 bills are due within a week, $310.50 in total.");
  });

  test("reports each category that went over its budget this month", () => {
    const result = buildNotifications(
      {
        ...nothing,
        overBudget: [
          {
            categoryId: "cat_1",
            name: "Marketing",
            budget: 500,
            spent: 620.5,
            at: at("2026-10-05T09:00:00Z"),
          },
        ],
      },
      null,
      "UTC",
      "2026-10-06",
    );
    expect(result).toEqual([
      {
        id: "budget-cat_1-2026-10",
        type: "alert",
        title: "Over budget",
        description: "Marketing is $120.50 over its $500.00 budget for October.",
        href: "/dashboard/transactions?category=cat_1&from=2026-10-01",
        day: "2026-10-05",
        read: false,
      },
    ]);
  });

  test("warns when the forecast expects the balance to drop below zero", () => {
    const [warning] = buildNotifications(
      {
        ...nothing,
        cashShortfall: { balance: -200, day: "2026-10-20", at: at("2026-10-05T09:00:00Z") },
      },
      null,
      "UTC",
      "2026-10-06",
    );
    expect(warning).toMatchObject({
      id: "cash-shortfall",
      type: "alert",
      href: "/dashboard#forecast",
      description:
        "With the bills and regular payments expected, your balance could drop to -$200.00 by Oct 20, 2026.",
    });
  });

  test("unread until marked as read, and unread again when something new happens", () => {
    const facts = { ...nothing, uncategorized: { count: 3, at: at("2026-10-02T09:00:00Z") } };
    expect(buildNotifications(facts, null, "UTC", "2026-10-06")[0].read).toBe(false);
    expect(buildNotifications(facts, at("2026-10-02T10:00:00Z"), "UTC", "2026-10-06")[0].read).toBe(true);
    expect(buildNotifications(facts, at("2026-10-01T10:00:00Z"), "UTC", "2026-10-06")[0].read).toBe(false);
  });

  test("the day follows the company's timezone", () => {
    const facts = { ...nothing, uncategorized: { count: 1, at: at("2026-10-02T02:00:00Z") } };
    expect(buildNotifications(facts, null, "America/New_York", "2026-10-06")[0].day).toBe("2026-10-01");
  });
});
