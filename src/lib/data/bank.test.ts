// Checks linking and syncing a bank against an in-memory database and a
// pretend bank: accounts and transactions arrive, nothing arrives twice, a
// pending payment that gets booked keeps its category, balances follow the
// bank, and one company can't touch another company's link.

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { bankConnection, transaction } from "@/db/finance";
import { BankError, type BankAccount, type BankChanges, type BankProvider } from "@/lib/bank/types";
import { addDays, todayIn } from "@/lib/dates";
import { actAs, createTestCompany, setUpTestDb, testDb } from "./testing";
import { listAccounts } from "./accounts";
import { listAuditLog } from "./audit";
import {
  connectBank,
  createBankLinkToken,
  disconnectBank,
  listBankConnections,
  syncAllBankConnections,
  syncBankConnection,
} from "./bank";
import { createCategory } from "./categories";
import { createCategoryRule } from "./category-rules";
import { deleteCompany } from "./company";
import { listTransactions, updateTransaction } from "./transactions";

vi.mock("@/db", async () => ({ db: (await import("./testing")).testDb }));
vi.mock("@/lib/session", async () => ({
  requireOrganization: (await import("./testing")).currentSession,
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: async () => true }));

// The pretend bank: what it will answer, and what it was asked
const bank = vi.hoisted(() => ({
  accounts: [] as BankAccount[],
  pages: [] as BankChanges[],
  cursors: [] as (string | null)[],
  tokens: [] as string[],
  removed: [] as string[],
  fail: null as Error | null,
  items: 0,
}));
vi.mock("@/lib/bank/provider", () => {
  const provider: BankProvider = {
    name: "plaid",
    createLinkToken: async (userId) => `link-for-${userId}`,
    exchangePublicToken: async (publicToken) => ({
      accessToken: `access-${publicToken}`,
      externalId: `item-${++bank.items}`,
    }),
    getAccounts: async (accessToken) => {
      bank.tokens.push(accessToken);
      if (bank.fail) throw bank.fail;
      return bank.accounts;
    },
    getChanges: async (_accessToken, cursor) => {
      bank.cursors.push(cursor);
      return (
        bank.pages.shift() ?? {
          added: [],
          modified: [],
          removed: [],
          cursor: cursor ?? "start",
          hasMore: false,
        }
      );
    },
    remove: async (accessToken) => {
      bank.removed.push(accessToken);
    },
  };
  return {
    bankEncryptionKey: "a secret only the tests know",
    isBankEnabled: true,
    getBankProvider: () => provider,
  };
});

const today = todayIn("UTC");
const checking: BankAccount = {
  externalId: "bank_checking",
  name: "Checking",
  mask: "4321",
  type: "depository",
  subtype: "checking",
  balance: 2500,
  currency: "USD",
};
const creditCard: BankAccount = {
  externalId: "bank_card",
  name: "Card",
  mask: "9999",
  type: "credit",
  subtype: "credit card",
  balance: 300,
  currency: "USD",
};
const payment = (externalId: string, amount: number, overrides = {}) => ({
  externalId,
  accountExternalId: "bank_checking",
  amount,
  day: addDays(today, -2),
  name: "Coffee Roasters",
  pending: false,
  replacesExternalId: null,
  ...overrides,
});
const page = (changes: Partial<BankChanges>): BankChanges => ({
  added: [],
  modified: [],
  removed: [],
  cursor: "c1",
  hasMore: false,
  ...changes,
});

beforeAll(setUpTestDb);
beforeEach(() => {
  bank.accounts = [checking, creditCard];
  bank.pages = [];
  bank.cursors = [];
  bank.tokens = [];
  bank.removed = [];
  bank.fail = null;
});

describe("linking a bank", () => {
  it("adds its accounts and transactions, with the bank's balance", async () => {
    const company = await createTestCompany("initrode");
    actAs(company);
    const categoryId = await createCategory({
      name: "Coffee",
      kind: "expense",
      color: "#6366f1",
      iconKey: "more",
    });
    await createCategoryRule({ matchText: "roasters", categoryId });
    expect(await createBankLinkToken()).toBe(`link-for-${company.userId}`);

    bank.pages = [
      page({
        added: [payment("t1", -4.5), payment("t2", 1000, { name: "Client" })],
        cursor: "c1",
        hasMore: true,
      }),
      page({
        added: [
          payment("t3", -20, { pending: true }),
          // A credit card isn't kept, and neither are its payments
          payment("t4", -99, { accountExternalId: "bank_card" }),
        ],
        cursor: "c2",
      }),
    ];
    const result = await connectBank("public-token", "  First Bank  ");
    expect(result).toEqual({
      added: 3,
      updated: 0,
      removed: 0,
      newAccounts: 1,
      institutionName: "First Bank",
    });
    // Asked from the beginning, then from where the first page stopped
    expect(bank.cursors).toEqual([null, "c1"]);

    const accounts = await listAccounts();
    expect(accounts.map((a) => [a.name, a.type, a.last4, a.balance])).toEqual([
      ["First Bank Checking", "checking", "4321", 2500],
    ]);
    const { transactions } = await listTransactions();
    expect(
      transactions.map((t) => [t.name, t.amount, t.status, t.category, t.day]).sort(),
    ).toEqual([
      ["Client", 1000, "completed", "Uncategorized", addDays(today, -2)],
      ["Coffee Roasters", -20, "pending", "Coffee", addDays(today, -2)],
      ["Coffee Roasters", -4.5, "completed", "Coffee", addDays(today, -2)],
    ]);

    const [connection] = await listBankConnections();
    expect(connection).toMatchObject({
      institutionName: "First Bank",
      accountCount: 1,
      lastError: null,
    });
    expect(connection.lastSyncedAt).toBeInstanceOf(Date);

    // The key is stored encrypted, and decrypted only for the bank
    const [stored] = await testDb
      .select({ accessToken: bankConnection.accessToken, cursor: bankConnection.cursor })
      .from(bankConnection)
      .where(eq(bankConnection.id, connection.id));
    expect(stored.accessToken).not.toContain("access-public-token");
    expect(stored.cursor).toBe("c2");
    expect(bank.tokens).toEqual(["access-public-token"]);

    expect((await listAuditLog({ area: "bank" })).entries.map((e) => e.summary)).toEqual([
      "Synced First Bank: 1 new account, 3 transactions added",
      "Connected the bank First Bank",
    ]);
  });

  it("keeps a booked payment's category, follows changes and removals, and never adds twice", async () => {
    const company = await createTestCompany("nakatomi");
    actAs(company);
    const categoryId = await createCategory({
      name: "Travel",
      kind: "expense",
      color: "#6366f1",
      iconKey: "more",
    });
    bank.pages = [
      page({
        added: [
          payment("p1", -80, { pending: true, name: "Hotel" }),
          payment("k1", -10),
          payment("g1", -5),
        ],
      }),
    ];
    await connectBank("token-2", "Second Bank");
    const [connection] = await listBankConnections();
    const [account] = await listAccounts();

    // Someone gives the pending payment a category and a note
    const pending = (await listTransactions({ search: "Hotel" })).transactions[0];
    await updateTransaction(pending.id, {
      accountId: account.id,
      categoryId,
      name: "Hotel",
      amount: -80,
      date: pending.day,
      status: "pending",
      notes: "Conference",
    });

    bank.accounts = [{ ...checking, balance: 2400 }];
    bank.pages = [
      page({
        // Booked for a little more, under a new ID
        added: [payment("p1_posted", -84, { name: "Hotel Grand", replacesExternalId: "p1" })],
        modified: [payment("k1", -12)],
        removed: ["p1", "g1"],
        cursor: "c2",
      }),
    ];
    expect(await syncBankConnection(connection.id)).toEqual({
      added: 0,
      updated: 2,
      removed: 1,
      newAccounts: 0,
    });
    expect(bank.cursors.at(-1)).toBe("c1");

    const after = (await listTransactions()).transactions;
    expect(after.map((t) => [t.name, t.amount, t.status, t.category, t.notes]).sort()).toEqual([
      ["Coffee Roasters", -12, "completed", "Uncategorized", null],
      ["Hotel Grand", -84, "completed", "Travel", "Conference"],
    ]);
    // Same row as before: what was attached to it is still attached
    expect(after.find((t) => t.name === "Hotel Grand")?.id).toBe(pending.id);
    expect((await listAccounts())[0].balance).toBe(2400);

    // The bank repeats itself: nothing changes
    bank.pages = [
      page({
        added: [payment("p1_posted", -84, { name: "Hotel Grand", replacesExternalId: "p1" })],
        cursor: "c3",
      }),
    ];
    await syncBankConnection(connection.id);
    expect((await listTransactions()).total).toBe(2);
  });

  it("notes why a sync failed, and leaves everything as it was", async () => {
    const company = await createTestCompany("cyberdyne");
    actAs(company);
    bank.pages = [page({ added: [payment("x1", -1)] })];
    await connectBank("token-3", "Third Bank");
    const [connection] = await listBankConnections();

    bank.fail = new BankError("bankLoginRequired", "ITEM_LOGIN_REQUIRED");
    await expect(syncBankConnection(connection.id)).rejects.toThrow(
      "The bank asks you to log in again.",
    );
    // Kept as the sentence's key, so Settings shows it in each person's language
    expect((await listBankConnections())[0].lastError).toBe("bankLoginRequired");
    expect((await listTransactions()).total).toBe(1);

    // Working again: the note goes away
    bank.fail = null;
    await syncBankConnection(connection.id);
    expect((await listBankConnections())[0].lastError).toBeNull();
  });
});

describe("other companies and roles", () => {
  it("can't see, sync or disconnect another company's bank", async () => {
    const owner = await createTestCompany("weyland");
    const other = await createTestCompany("yutani");
    actAs(owner);
    bank.pages = [page({ added: [payment("w1", -7)] })];
    await connectBank("token-4", "Fourth Bank");
    const [connection] = await listBankConnections();

    actAs(other);
    expect(await listBankConnections()).toEqual([]);
    await expect(syncBankConnection(connection.id)).rejects.toThrow("Bank connection not found.");
    await expect(disconnectBank(connection.id)).rejects.toThrow("Bank connection not found.");
    expect((await listTransactions()).total).toBe(0);
    expect(bank.removed).toEqual([]);

    actAs(owner);
    expect((await listBankConnections()).length).toBe(1);
  });

  it("only lets owners and admins link, sync and disconnect", async () => {
    const company = await createTestCompany("tessier");
    actAs(company);
    await connectBank("token-5", "Fifth Bank");
    const [connection] = await listBankConnections();

    actAs(company, "member");
    const denied = "Your role in this company doesn't allow this.";
    expect((await listBankConnections()).length).toBe(1);
    await expect(createBankLinkToken()).rejects.toThrow(denied);
    await expect(connectBank("token-6", "Sixth Bank")).rejects.toThrow(denied);
    await expect(syncBankConnection(connection.id)).rejects.toThrow(denied);
    await expect(disconnectBank(connection.id)).rejects.toThrow(denied);
  });

  it("disconnecting ends the link at the bank service and keeps the data", async () => {
    const company = await createTestCompany("soylent");
    actAs(company);
    bank.pages = [page({ added: [payment("s1", -3)] })];
    await connectBank("token-7", "Seventh Bank");
    const [connection] = await listBankConnections();

    await disconnectBank(connection.id);
    expect(bank.removed).toEqual(["access-token-7"]);
    expect(await listBankConnections()).toEqual([]);
    expect((await listAccounts()).map((a) => a.name)).toEqual(["Seventh Bank Checking"]);
    expect((await listTransactions()).total).toBe(1);
  });

  it("the daily job syncs every company's banks, each into its own company", async () => {
    const first = await createTestCompany("umbra");
    const second = await createTestCompany("penumbra");
    actAs(first);
    await connectBank("token-8", "Eighth Bank");
    actAs(second);
    await connectBank("token-9", "Ninth Bank");

    // Every bank the job visits reports one new payment of its own
    let n = 0;
    const visited: string[] = [];
    const original = bank.pages;
    Object.defineProperty(bank, "pages", {
      configurable: true,
      get: () => [page({ added: [payment(`job_${++n}`, -1)], cursor: `job_${n}` })],
    });
    try {
      const result = await syncAllBankConnections();
      expect(result.failed).toBe(0);
      expect(result.synced).toBeGreaterThanOrEqual(2);
      visited.push(...bank.tokens);
    } finally {
      Object.defineProperty(bank, "pages", { configurable: true, writable: true, value: original });
    }
    expect(visited).toContain("access-token-8");
    expect(visited).toContain("access-token-9");

    actAs(first);
    expect((await listTransactions()).total).toBe(1);
    actAs(second);
    expect((await listTransactions()).total).toBe(1);
    // Done by Finely, not by a person
    expect((await listAuditLog({ area: "bank" })).entries[0].actor).toBe("Finely");
  });

  it("deleting a company removes its bank link and synced transactions", async () => {
    const company = await createTestCompany("blackmesa");
    actAs(company);
    bank.pages = [page({ added: [payment("b1", -3)] })];
    await connectBank("token-10", "Tenth Bank");

    await deleteCompany("blackmesa");
    expect(
      await testDb.$count(bankConnection, eq(bankConnection.organizationId, company.organizationId)),
    ).toBe(0);
    expect(
      await testDb.$count(transaction, eq(transaction.organizationId, company.organizationId)),
    ).toBe(0);
  });
});
