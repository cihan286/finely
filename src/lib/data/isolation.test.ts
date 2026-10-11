// Checks the most important rule of the data functions: a company can never
// read or change another company's data, even when it knows the other
// company's IDs. Also checks that members can't do what only owners and
// admins may. Runs the real queries against an in-memory database.

import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { category, companySettings, financialAccount, transaction } from "@/db/finance";
import { todayIn } from "@/lib/dates";
import { actAs, createTestCompany, setUpTestDb, testDb } from "./testing";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "./accounts";
import { createCategory, deleteCategory, listCategories, updateCategory } from "./categories";
import {
  applyCategoryRule,
  createCategoryRule,
  deleteCategoryRule,
  listCategoryRules,
  saveCategoryRule,
  updateCategoryRule,
} from "./category-rules";
import { getDashboardSummary } from "./dashboard";
import { getInsights } from "./insights";
import { updateTimeZone } from "./settings";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  importTransactions,
  listTransactions,
  setTransactionsCategory,
  updateTransaction,
  type TransactionInput,
} from "./transactions";

vi.mock("@/db", async () => ({ db: (await import("./testing")).testDb }));
vi.mock("@/lib/session", async () => ({
  requireOrganization: (await import("./testing")).currentSession,
}));

type Company = Awaited<ReturnType<typeof createTestCompany>>;

// Two companies, each with one account, one category and one transaction
let acme: Company & { accountId: string; categoryId: string; transactionId: string };
let globex: Company & { accountId: string; categoryId: string; transactionId: string };

const today = todayIn("UTC");

const transactionFor = (
  company: { accountId: string; categoryId: string },
  overrides: Partial<TransactionInput> = {},
): TransactionInput => ({
  accountId: company.accountId,
  categoryId: company.categoryId,
  name: "Office rent",
  amount: -500,
  date: today,
  status: "completed",
  ...overrides,
});

async function seed(name: string, amount: number) {
  const company = await createTestCompany(name);
  actAs(company);
  const accountId = await createAccount({
    name: `${name} Checking`,
    type: "checking",
    openingBalance: 1000,
  });
  const categoryId = await createCategory({
    name: `${name} Supplies`,
    kind: "expense",
    color: "#6366f1",
    iconKey: "more",
  });
  const transactionId = await createTransaction(
    transactionFor({ accountId, categoryId }, { name: `${name} purchase`, amount }),
  );
  return { ...company, accountId, categoryId, transactionId };
}

beforeAll(async () => {
  await setUpTestDb();
  acme = await seed("acme", -100);
  globex = await seed("globex", -250);
});

describe("reading", () => {
  it("lists only the company's own transactions, accounts and categories", async () => {
    actAs(acme);
    const { transactions, total } = await listTransactions();
    expect(transactions.map((t) => t.id)).toEqual([acme.transactionId]);
    expect(total).toBe(1);
    expect((await listAccounts()).map((a) => a.id)).toEqual([acme.accountId]);
    expect((await listCategories()).map((c) => c.id)).toEqual([acme.categoryId]);
  });

  it("finds nothing when filtering by another company's account or category", async () => {
    actAs(acme);
    expect((await listTransactions({ accountId: globex.accountId })).total).toBe(0);
    expect((await listTransactions({ categoryId: globex.categoryId })).total).toBe(0);
  });

  it("can't open another company's transaction by its ID", async () => {
    actAs(acme);
    expect(await getTransaction(globex.transactionId)).toBeNull();
    expect(await getTransaction(acme.transactionId)).not.toBeNull();
  });

  it("counts only the company's own money on the dashboard and in Insights", async () => {
    actAs(acme);
    const summary = await getDashboardSummary();
    expect(summary.expensesTotal).toBe(100);
    expect(summary.accounts.map((a) => a.balance)).toEqual([900]);
    expect(summary.recentTransactions.map((t) => t.id)).toEqual([acme.transactionId]);
    expect((await getInsights(3)).totals.expenses).toBe(100);

    actAs(globex);
    expect((await getDashboardSummary()).expensesTotal).toBe(250);
    expect((await getInsights(3)).totals.expenses).toBe(250);
  });
});

describe("changing another company's data", () => {
  it("can't edit or delete its transactions", async () => {
    actAs(acme);
    await expect(
      updateTransaction(globex.transactionId, transactionFor(acme, { name: "Hacked" })),
    ).rejects.toThrow("Transaction not found.");
    await expect(deleteTransaction(globex.transactionId)).rejects.toThrow(
      "Transaction not found.",
    );

    const [row] = await testDb
      .select({ name: transaction.name })
      .from(transaction)
      .where(eq(transaction.id, globex.transactionId));
    expect(row.name).toBe("globex purchase");
  });

  it("can't put a transaction into its account or category", async () => {
    actAs(acme);
    await expect(
      createTransaction(transactionFor(acme, { accountId: globex.accountId })),
    ).rejects.toThrow("Account not found.");
    await expect(
      createTransaction(transactionFor(acme, { categoryId: globex.categoryId })),
    ).rejects.toThrow("Category not found.");
    await expect(
      updateTransaction(
        acme.transactionId,
        transactionFor(acme, { accountId: globex.accountId }),
      ),
    ).rejects.toThrow("Account not found.");
  });

  it("can't import a bank statement into its account", async () => {
    actAs(acme);
    await expect(
      importTransactions(globex.accountId, [
        { date: today, name: "Injected", amount: -1, category: null },
      ]),
    ).rejects.toThrow("Account not found.");
    actAs(globex);
    expect((await listTransactions()).total).toBe(1);
  });

  it("can't edit or delete its accounts and categories", async () => {
    actAs(acme);
    await expect(
      updateAccount(globex.accountId, { name: "Hacked", type: "checking" }),
    ).rejects.toThrow("Account not found.");
    await expect(deleteAccount(globex.accountId)).rejects.toThrow();
    await expect(
      updateCategory(globex.categoryId, {
        name: "Hacked",
        kind: "expense",
        color: "#000000",
        iconKey: "more",
      }),
    ).rejects.toThrow("Category not found.");
    await expect(deleteCategory(globex.categoryId)).rejects.toThrow("Category not found.");

    const [account] = await testDb
      .select({ name: financialAccount.name })
      .from(financialAccount)
      .where(eq(financialAccount.id, globex.accountId));
    const [cat] = await testDb
      .select({ name: category.name })
      .from(category)
      .where(eq(category.id, globex.categoryId));
    expect(account.name).toBe("globex Checking");
    expect(cat.name).toBe("globex Supplies");
  });

  it("changes only its own timezone", async () => {
    actAs(acme);
    await updateTimeZone("Europe/Istanbul");
    const zones = await testDb
      .select({ id: companySettings.organizationId, timezone: companySettings.timezone })
      .from(companySettings);
    expect(Object.fromEntries(zones.map((z) => [z.id, z.timezone]))).toEqual({
      [acme.organizationId]: "Europe/Istanbul",
      [globex.organizationId]: "UTC",
    });
    await updateTimeZone("UTC");
  });
});

describe("importing", () => {
  it("adds a statement's lines to the company's own account, once", async () => {
    actAs(acme);
    const rows = [
      { date: today, name: "Coffee", amount: -4.5, category: "ACME SUPPLIES" },
      { date: today, name: "Refund", amount: 20, category: "globex Supplies" },
    ];
    expect(await importTransactions(acme.accountId, rows)).toEqual({ imported: 2, skipped: 0 });
    // The same file again: nothing new
    expect(await importTransactions(acme.accountId, rows)).toEqual({ imported: 0, skipped: 2 });

    const { transactions } = await listTransactions({ search: "Coffee" });
    // Category names match ignoring case, but never another company's
    expect(transactions[0].categoryId).toBe(acme.categoryId);
    const refund = (await listTransactions({ search: "Refund" })).transactions[0];
    expect(refund.categoryId).toBeNull();
  });
});

describe("category rules", () => {
  it("keeps each company's rules to itself", async () => {
    actAs(globex);
    const globexRule = await createCategoryRule({
      matchText: "Initech",
      categoryId: globex.categoryId,
    });
    actAs(acme);
    const acmeRule = await createCategoryRule({
      // The same text as the other company's rule is fine
      matchText: "  initech   LLC ",
      categoryId: acme.categoryId,
    });

    expect(await listCategoryRules()).toEqual([
      { id: acmeRule, matchText: "initech LLC", categoryId: acme.categoryId },
    ]);
    await expect(
      updateCategoryRule(globexRule, { matchText: "Hacked", categoryId: acme.categoryId }),
    ).rejects.toThrow("Rule not found.");
    await expect(deleteCategoryRule(globexRule)).rejects.toThrow("Rule not found.");

    actAs(globex);
    expect(await listCategoryRules()).toEqual([
      { id: globexRule, matchText: "Initech", categoryId: globex.categoryId },
    ]);

    await deleteCategoryRule(globexRule);
    actAs(acme);
    await deleteCategoryRule(acmeRule);
  });

  it("can't point a rule at another company's category", async () => {
    actAs(acme);
    await expect(
      createCategoryRule({ matchText: "Initech", categoryId: globex.categoryId }),
    ).rejects.toThrow("Category not found.");
    const id = await createCategoryRule({ matchText: "Initech", categoryId: acme.categoryId });
    await expect(
      updateCategoryRule(id, { matchText: "Initech", categoryId: globex.categoryId }),
    ).rejects.toThrow("Category not found.");
    await deleteCategoryRule(id);
  });

  it("refuses texts that are too short or already have a rule", async () => {
    actAs(acme);
    await expect(
      createCategoryRule({ matchText: " a ", categoryId: acme.categoryId }),
    ).rejects.toThrow("Text must be at least 2 characters.");
    const id = await createCategoryRule({ matchText: "Initech", categoryId: acme.categoryId });
    await expect(
      createCategoryRule({ matchText: "INITECH", categoryId: acme.categoryId }),
    ).rejects.toThrow("There is already a rule for this text.");
    await deleteCategoryRule(id);
  });

  it("categorizes new and imported transactions with the company's own rules only", async () => {
    actAs(globex);
    const globexRule = await createCategoryRule({
      matchText: "Hooli",
      categoryId: globex.categoryId,
    });
    actAs(acme);
    const otherCategory = await createCategory({
      name: "acme Travel",
      kind: "expense",
      color: "#0ea5e9",
      iconKey: "plane",
    });
    const acmeRule = await createCategoryRule({
      matchText: "initech",
      categoryId: acme.categoryId,
    });

    // Added by hand without a category: the rule fills it in
    const added = await createTransaction(
      transactionFor(acme, { name: "INITECH  invoice 42", categoryId: null }),
    );
    expect((await getTransaction(added))?.categoryId).toBe(acme.categoryId);
    // A category chosen by hand is kept, and so is removing one later
    const chosen = await createTransaction(
      transactionFor(acme, { name: "Initech flights", categoryId: otherCategory }),
    );
    expect((await getTransaction(chosen))?.categoryId).toBe(otherCategory);
    await updateTransaction(
      added,
      transactionFor(acme, { name: "INITECH invoice 42", categoryId: null }),
    );
    expect((await getTransaction(added))?.categoryId).toBeNull();

    await importTransactions(acme.accountId, [
      { date: today, name: "Initech subscription", amount: -30, category: null },
      // The file's own category wins over the rule
      { date: today, name: "Initech offsite", amount: -31, category: "Acme Travel" },
      // Only the other company has a rule for this one
      { date: today, name: "Hooli hosting", amount: -32, category: null },
    ]);
    const categoryOf = async (search: string) =>
      (await listTransactions({ search })).transactions[0].categoryId;
    expect(await categoryOf("Initech subscription")).toBe(acme.categoryId);
    expect(await categoryOf("Initech offsite")).toBe(otherCategory);
    expect(await categoryOf("Hooli hosting")).toBeNull();

    await deleteCategoryRule(acmeRule);
    await deleteCategory(otherCategory);
    actAs(globex);
    await deleteCategoryRule(globexRule);
  });

  it("applies a rule to uncategorized transactions of its own company only", async () => {
    const uncategorized = (company: typeof acme, name: string) =>
      createTransaction(transactionFor(company, { name, categoryId: null }));
    actAs(globex);
    const theirs = await uncategorized(globex, "Umbrella retainer");
    actAs(acme);
    const plain = await uncategorized(acme, "UMBRELLA   Corp retainer");
    const literal = await uncategorized(acme, "Umbrella 100% cover");
    const travel = await createCategory({
      name: "acme Travel",
      kind: "expense",
      color: "#0ea5e9",
      iconKey: "plane",
    });
    const kept = await createTransaction(
      transactionFor(acme, { name: "Umbrella flights", categoryId: travel }),
    );

    // "Always categorize like this": adds the rule and catches up
    expect(
      await saveCategoryRule({ matchText: "umbrella corp", categoryId: acme.categoryId }),
    ).toEqual({ categorized: 1 });
    expect((await getTransaction(plain))?.categoryId).toBe(acme.categoryId);
    expect((await getTransaction(literal))?.categoryId).toBeNull();
    // The same text again changes that rule instead of adding a second one
    await saveCategoryRule({ matchText: "Umbrella Corp", categoryId: travel });
    expect(await listCategoryRules()).toEqual([
      { id: expect.any(String), matchText: "umbrella corp", categoryId: travel },
    ]);

    // % and _ in a rule's text are ordinary characters
    const percentRule = await createCategoryRule({
      matchText: "100% cover",
      categoryId: travel,
    });
    expect(await applyCategoryRule(percentRule)).toBe(1);
    expect((await getTransaction(literal))?.categoryId).toBe(travel);
    // Nothing left to do, and categories chosen by hand were never touched
    expect(await applyCategoryRule(percentRule)).toBe(0);
    expect((await getTransaction(kept))?.categoryId).toBe(travel);
    expect((await getTransaction(plain))?.categoryId).toBe(acme.categoryId);

    actAs(globex);
    expect((await getTransaction(theirs))?.categoryId).toBeNull();
    await expect(applyCategoryRule(percentRule)).rejects.toThrow("Rule not found.");
    await expect(
      saveCategoryRule({ matchText: "Umbrella", categoryId: acme.categoryId }),
    ).rejects.toThrow("Category not found.");
    expect(await listCategoryRules()).toEqual([]);

    actAs(acme);
    await deleteCategory(travel); // its rules go with it
    expect(await listCategoryRules()).toEqual([]);
  });

  it("changes the category of several transactions at once, in its own company only", async () => {
    actAs(acme);
    const first = await createTransaction(transactionFor(acme, { name: "Bulk one" }));
    const second = await createTransaction(transactionFor(acme, { name: "Bulk two" }));

    // The other company's transaction is ignored, not changed
    expect(
      await setTransactionsCategory([first, second, globex.transactionId], null),
    ).toBe(2);
    expect((await getTransaction(first))?.categoryId).toBeNull();
    expect(await setTransactionsCategory([first], acme.categoryId)).toBe(1);
    expect((await getTransaction(first))?.categoryId).toBe(acme.categoryId);
    expect((await getTransaction(second))?.categoryId).toBeNull();

    await expect(setTransactionsCategory([first], globex.categoryId)).rejects.toThrow(
      "Category not found.",
    );
    await expect(setTransactionsCategory([], acme.categoryId)).rejects.toThrow(
      "Select at least one transaction.",
    );

    actAs(globex);
    expect((await getTransaction(globex.transactionId))?.categoryId).toBe(globex.categoryId);
    // Members can edit transactions, so they can do this too
    actAs(globex, "member");
    expect(await setTransactionsCategory([globex.transactionId], globex.categoryId)).toBe(1);
    await expect(
      saveCategoryRule({ matchText: "Extra", categoryId: globex.categoryId }),
    ).rejects.toThrow("Only owners and admins can do this.");
    await expect(applyCategoryRule("rule_missing")).rejects.toThrow(
      "Only owners and admins can do this.",
    );
  });

  it("lets members see rules, but not change them", async () => {
    actAs(globex);
    const id = await createCategoryRule({ matchText: "Initech", categoryId: globex.categoryId });

    actAs(globex, "member");
    const denied = "Only owners and admins can do this.";
    expect((await listCategoryRules()).map((r) => r.id)).toEqual([id]);
    await expect(
      createCategoryRule({ matchText: "Extra", categoryId: globex.categoryId }),
    ).rejects.toThrow(denied);
    await expect(
      updateCategoryRule(id, { matchText: "Changed", categoryId: globex.categoryId }),
    ).rejects.toThrow(denied);
    await expect(deleteCategoryRule(id)).rejects.toThrow(denied);

    actAs(globex, "admin");
    await deleteCategoryRule(id);
    expect(await listCategoryRules()).toEqual([]);
  });
});

describe("roles", () => {
  it("lets members add and edit transactions, but not delete them", async () => {
    actAs(globex, "member");
    const id = await createTransaction(transactionFor(globex, { name: "Member entry" }));
    await updateTransaction(id, transactionFor(globex, { name: "Member edit" }));
    await expect(deleteTransaction(id)).rejects.toThrow("Only owners and admins can do this.");

    actAs(globex, "admin");
    await deleteTransaction(id);
    expect(await getTransaction(id)).toBeNull();
  });

  it("stops members from managing accounts, categories and settings", async () => {
    actAs(globex, "member");
    const denied = "Only owners and admins can do this.";
    await expect(createAccount({ name: "Extra", type: "savings" })).rejects.toThrow(denied);
    await expect(deleteAccount(globex.accountId)).rejects.toThrow(denied);
    await expect(
      createCategory({ name: "Extra", kind: "expense", color: "#000000", iconKey: "more" }),
    ).rejects.toThrow(denied);
    await expect(deleteCategory(globex.categoryId)).rejects.toThrow(denied);
    await expect(updateTimeZone("Europe/Istanbul")).rejects.toThrow(denied);
  });
});
