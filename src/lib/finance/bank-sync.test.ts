import { describe, expect, test } from "vitest";
import type { BankAccount, BankTransaction } from "@/lib/bank/types";
import { finelyAccountType, last4From, planSync } from "./bank-sync";

const account = (overrides: Partial<BankAccount>): BankAccount => ({
  externalId: "acc_1",
  name: "Checking",
  mask: "0000",
  type: "depository",
  subtype: "checking",
  balance: 100,
  currency: "USD",
  ...overrides,
});

const payment = (externalId: string, overrides: Partial<BankTransaction> = {}): BankTransaction => ({
  externalId,
  accountExternalId: "acc_1",
  amount: -10,
  day: "2026-10-13",
  name: "Coffee",
  pending: false,
  replacesExternalId: null,
  ...overrides,
});

const accounts = new Set(["acc_1"]);

describe("finelyAccountType", () => {
  test("everyday and savings accounts in dollars are kept", () => {
    expect(finelyAccountType(account({}))).toBe("checking");
    expect(finelyAccountType(account({ subtype: "savings" }))).toBe("savings");
    expect(finelyAccountType(account({ subtype: "money market" }))).toBe("savings");
    expect(finelyAccountType(account({ subtype: null, currency: null }))).toBe("checking");
  });

  test("credit cards, loans, investments and other currencies aren't", () => {
    expect(finelyAccountType(account({ type: "credit", subtype: "credit card" }))).toBeNull();
    expect(finelyAccountType(account({ type: "loan" }))).toBeNull();
    expect(finelyAccountType(account({ type: "investment" }))).toBeNull();
    expect(finelyAccountType(account({ currency: "EUR" }))).toBeNull();
  });
});

test("last4From: only four digits are kept", () => {
  expect(last4From("1234")).toBe("1234");
  expect(last4From("12")).toBeNull();
  expect(last4From("12a4")).toBeNull();
  expect(last4From(null)).toBeNull();
});

describe("planSync", () => {
  test("new payments are added, known ones changed, gone ones removed", () => {
    const plan = planSync(
      {
        added: [payment("t_new")],
        modified: [payment("t_known", { amount: -12 })],
        removed: ["t_gone", "t_never_had"],
      },
      new Set(["t_known", "t_gone"]),
      accounts,
    );
    expect(plan.insert.map((t) => t.externalId)).toEqual(["t_new"]);
    expect(plan.update.map((t) => [t.currentExternalId, t.externalId, t.amount])).toEqual([
      ["t_known", "t_known", -12],
    ]);
    expect(plan.remove).toEqual(["t_gone"]);
  });

  test("a pending payment that got booked keeps its row under the new ID", () => {
    const plan = planSync(
      {
        added: [payment("t_posted", { replacesExternalId: "t_pending" })],
        modified: [],
        // The bank also says the pending one is gone: it mustn't be deleted
        removed: ["t_pending"],
      },
      new Set(["t_pending"]),
      accounts,
    );
    expect(plan.insert).toEqual([]);
    expect(plan.update.map((t) => [t.currentExternalId, t.externalId])).toEqual([
      ["t_pending", "t_posted"],
    ]);
    expect(plan.remove).toEqual([]);
  });

  test("a booked payment whose pending version we never had is simply new", () => {
    const plan = planSync(
      { added: [payment("t_posted", { replacesExternalId: "t_unknown" })], modified: [], removed: [] },
      new Set(),
      accounts,
    );
    expect(plan.insert.map((t) => t.externalId)).toEqual(["t_posted"]);
  });

  test("running the same changes again adds nothing twice", () => {
    const changes = { added: [payment("t_1"), payment("t_1")], modified: [], removed: [] };
    expect(planSync(changes, new Set(), accounts).insert).toHaveLength(1);
    const again = planSync(changes, new Set(["t_1"]), accounts);
    expect(again.insert).toEqual([]);
    expect(again.update).toHaveLength(1);
  });

  test("payments of accounts Finely doesn't keep, and zero amounts, are left out", () => {
    const plan = planSync(
      {
        added: [payment("t_card", { accountExternalId: "acc_credit" }), payment("t_zero", { amount: 0 })],
        modified: [],
        removed: [],
      },
      new Set(),
      accounts,
    );
    expect(plan).toEqual({ insert: [], update: [], remove: [] });
  });
});
