// Checks the most important rule of the data functions: a company can never
// read or change another company's data, even when it knows the other
// company's IDs. Also checks that members can't do what only owners and
// admins may. Runs the real queries against an in-memory database.

import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  attachment,
  bill,
  category,
  companySettings,
  financialAccount,
  transaction,
} from "@/db/finance";
import { member, organization, user } from "@/db/schema";
import { addDays, todayIn } from "@/lib/dates";
import { actAs, addTestMember, createTestCompany, setUpTestDb, testDb } from "./testing";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "./accounts";
import {
  createBill,
  deleteBill,
  getBill,
  listBills,
  payBill,
  updateBill,
  type BillInput,
} from "./bills";
import { listAuditLog } from "./audit";
import { getBudgets } from "./budgets";
import { createCategory, deleteCategory, listCategories, updateCategory } from "./categories";
import {
  applyCategoryRule,
  createCategoryRule,
  deleteCategoryRule,
  listCategoryRules,
  saveCategoryRule,
  updateCategoryRule,
} from "./category-rules";
import {
  addAttachment,
  deleteAttachment,
  getAttachmentFile,
  listAttachments,
} from "./attachments";
import { deleteCompany, transferOwnership } from "./company";
import {
  getEmailPreferences,
  sendWeeklyDigests,
  updateEmailPreferences,
} from "./email-notifications";
import { getDashboardSummary } from "./dashboard";
import { getInsights } from "./insights";
import { listNotifications, markNotificationsRead } from "./notifications";
import { getForecast, getRecurring } from "./recurring";
import { withinRateLimit } from "@/lib/rate-limit";
import { getCompanySettings, updateCurrency, updateTimeZone } from "./settings";
import {
  createTransaction,
  deleteTransaction,
  exportTransactions,
  getTransaction,
  importTransactions,
  listTransactions,
  setTransactionsCategory,
  updateTransaction,
  type TransactionInput,
} from "./transactions";

vi.mock("@/db", async () => ({ db: (await import("./testing")).testDb }));
// Emails aren't sent in tests: they're collected here to look at
const sentEmails: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/email/send", () => ({
  sendEmail: async (email: { to: string; subject: string; text: string }) => {
    sentEmails.push(email);
    return true;
  },
}));
vi.mock("@/lib/session", async () => ({
  requireOrganization: (await import("./testing")).currentSession,
}));

type Company = Awaited<ReturnType<typeof createTestCompany>>;

// The smallest things that count as a PDF and as a PNG
const PDF = new TextEncoder().encode("%PDF-1.4 test");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

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

describe("notifications", () => {
  it("reports only the company's own data, and is marked read per company", async () => {
    // Two new companies, each with an account below zero
    const seedOverdrawn = async (name: string) => {
      const company = await createTestCompany(name);
      actAs(company);
      const accountId = await createAccount({
        name: `${name} Checking`,
        type: "checking",
        openingBalance: -50,
      });
      return { ...company, accountId };
    };
    const initech = await seedOverdrawn("initech");
    const hooli = await seedOverdrawn("hooli");

    actAs(initech);
    expect((await listNotifications()).map((n) => [n.id, n.read])).toEqual([
      [`overdrawn-${initech.accountId}`, false],
    ]);
    await markNotificationsRead();
    expect((await listNotifications()).map((n) => n.read)).toEqual([true]);

    actAs(hooli);
    expect((await listNotifications()).map((n) => [n.id, n.read])).toEqual([
      [`overdrawn-${hooli.accountId}`, false],
    ]);
  });

  it("counts transactions without a category and late pending payments", async () => {
    const company = await createTestCompany("umbrella");
    actAs(company);
    const accountId = await createAccount({ name: "Checking", type: "checking" });
    await createTransaction({
      accountId,
      categoryId: null,
      name: "Mystery",
      amount: 10,
      date: addDays(today, -30),
      status: "pending",
    });
    expect((await listNotifications()).map((n) => n.id).sort()).toEqual([
      "stale-pending",
      "uncategorized",
    ]);
  });
});

describe("bills", () => {
  const billFor = (
    company: { categoryId: string },
    overrides: Partial<BillInput> = {},
  ): BillInput => ({
    name: "Office rent",
    amount: 1200,
    dueDate: addDays(today, 3),
    repeat: "none",
    categoryId: company.categoryId,
    ...overrides,
  });

  it("can't see, change, pay or delete another company's bills", async () => {
    actAs(globex);
    const globexBill = await createBill(billFor(globex, { name: "Globex rent" }));

    actAs(acme);
    expect((await listBills()).unpaid).toEqual([]);
    expect(await getBill(globexBill)).toBeNull();
    await expect(updateBill(globexBill, billFor(acme, { name: "Hacked" }))).rejects.toThrow(
      "Bill not found.",
    );
    await expect(
      payBill(globexBill, { accountId: acme.accountId, date: today }),
    ).rejects.toThrow("Bill not found.");
    await expect(deleteBill(globexBill)).rejects.toThrow("Bill not found.");

    const [row] = await testDb
      .select({ name: bill.name, paidAt: bill.paidAt })
      .from(bill)
      .where(eq(bill.id, globexBill));
    expect(row).toEqual({ name: "Globex rent", paidAt: null });

    actAs(globex);
    await deleteBill(globexBill);
  });

  it("can't use another company's category or pay from its account", async () => {
    actAs(acme);
    await expect(
      createBill(billFor(acme, { categoryId: globex.categoryId })),
    ).rejects.toThrow("Category not found.");
    const id = await createBill(billFor(acme));
    await expect(
      payBill(id, { accountId: globex.accountId, date: today }),
    ).rejects.toThrow("Account not found.");
    expect((await getBill(id))?.paidDay).toBeNull();
    await deleteBill(id);
  });

  it("paying records the payment and adds the next bill when it repeats", async () => {
    const company = await createTestCompany("stark");
    actAs(company);
    const accountId = await createAccount({
      name: "Checking",
      type: "checking",
      openingBalance: 5000,
    });
    const id = await createBill({
      name: "Rent",
      amount: 1200,
      dueDate: "2026-01-31",
      repeat: "monthly",
      categoryId: null,
    });

    const result = await payBill(id, { accountId, date: "2026-01-30" });
    expect(result.nextDueDate).toBe("2026-02-28");

    const { unpaid, paid } = await listBills();
    expect(paid.map((b) => [b.id, b.paidDay, b.transactionId])).toEqual([
      [id, "2026-01-30", result.transactionId],
    ]);
    expect(unpaid.map((b) => [b.name, b.amount, b.dueDate, b.repeat])).toEqual([
      ["Rent", 1200, "2026-02-28", "monthly"],
    ]);

    const payment = await getTransaction(result.transactionId);
    expect(payment).toMatchObject({
      name: "Rent",
      amount: -1200,
      day: "2026-01-30",
      status: "completed",
      account: accountId,
    });
    expect((await listAccounts())[0].balance).toBe(3800);

    // A paid bill can't be paid again or changed
    await expect(payBill(id, { accountId, date: "2026-01-30" })).rejects.toThrow(
      "This bill is already paid.",
    );
    await expect(
      updateBill(id, { name: "Rent", amount: 1, dueDate: today, repeat: "none", categoryId: null }),
    ).rejects.toThrow("This bill is already paid and can't be changed.");
    expect((await listTransactions()).total).toBe(1);
  });

  it("checks what was typed", async () => {
    actAs(acme);
    await expect(createBill(billFor(acme, { amount: 0 }))).rejects.toThrow(
      "Amount must be more than zero.",
    );
    await expect(createBill(billFor(acme, { amount: -5 }))).rejects.toThrow(
      "Amount must be more than zero.",
    );
    await expect(createBill(billFor(acme, { dueDate: "2026-02-30" }))).rejects.toThrow(
      "Due date must be a valid date.",
    );
    await expect(
      createBill(billFor(acme, { repeat: "daily" as BillInput["repeat"] })),
    ).rejects.toThrow("Repeat is invalid.");
  });

  it("lets members add, edit and pay bills, but not delete them", async () => {
    actAs(globex, "member");
    const id = await createBill(billFor(globex));
    await updateBill(id, billFor(globex, { name: "Member edit" }));
    await expect(deleteBill(id)).rejects.toThrow("Only owners and admins can do this.");

    actAs(globex, "admin");
    await deleteBill(id);
    expect(await getBill(id)).toBeNull();
  });

  it("shows up in the notifications when overdue or due soon", async () => {
    const company = await createTestCompany("wayne");
    actAs(company);
    await createBill({ name: "Late", amount: 100, dueDate: addDays(today, -2), repeat: "none", categoryId: null });
    await createBill({ name: "Soon", amount: 50, dueDate: addDays(today, 2), repeat: "none", categoryId: null });
    await createBill({ name: "Far", amount: 10, dueDate: addDays(today, 60), repeat: "none", categoryId: null });
    const ids = (await listNotifications()).map((n) => n.id).sort();
    expect(ids).toEqual(["bills-due-soon", "bills-overdue"]);
  });
});

describe("budgets", () => {
  const budgetCategory = (name: string, budget: number | null) =>
    createCategory({ name, kind: "expense", color: "#6366f1", iconKey: "more", budget });

  // A company with one account, and a way to spend from it
  async function seedBudgetCompany(name: string) {
    const company = await createTestCompany(name);
    actAs(company);
    const accountId = await createAccount({ name: "Checking", type: "checking" });
    const spend = (categoryId: string, amount: number, overrides: Partial<TransactionInput> = {}) =>
      createTransaction({
        accountId,
        categoryId,
        name: "Purchase",
        amount: -amount,
        date: today,
        status: "completed",
        ...overrides,
      });
    return { company, spend };
  }

  it("counts only this month's completed spending in the company's own categories", async () => {
    const pied = await seedBudgetCompany("piedpiper");
    const marketing = await budgetCategory("Marketing", 500);
    const travel = await budgetCategory("Travel", 1000);
    const noBudget = await budgetCategory("Misc", null);
    await pied.spend(marketing, 300);
    await pied.spend(marketing, 320.5);
    await pied.spend(marketing, 999, { status: "pending" });
    await pied.spend(marketing, 999, { date: addDays(today, -45) });
    await pied.spend(marketing, -50); // money in doesn't reduce what was spent
    await pied.spend(noBudget, 70);

    const other = await seedBudgetCompany("raviga");
    const otherMarketing = await budgetCategory("Marketing", 100);
    await other.spend(otherMarketing, 40);

    actAs(pied.company);
    expect((await getBudgets()).budgets.map((b) => [b.name, b.spent, b.remaining, b.status])).toEqual([
      ["Marketing", 620.5, -120.5, "over"],
      ["Travel", 0, 1000, "ok"],
    ]);
    expect(travel).toBeTruthy();
    // Over budget: the bell says so, with a link to this month's payments
    const alert = (await listNotifications()).find((n) => n.id.startsWith("budget-"));
    expect(alert?.id).toBe(`budget-${marketing}-${today.slice(0, 7)}`);
    expect(alert?.description).toContain("Marketing is $120.50 over its $500.00 budget");

    actAs(other.company);
    expect((await getBudgets()).budgets.map((b) => [b.name, b.spent, b.status])).toEqual([
      ["Marketing", 40, "ok"],
    ]);
    expect((await listNotifications()).some((n) => n.id.startsWith("budget-"))).toBe(false);
  });

  it("only accepts a positive budget, on money-out categories, from owners and admins", async () => {
    actAs(globex);
    await expect(budgetCategory("Zero", 0)).rejects.toThrow("Monthly budget must be more than zero.");
    await expect(
      createCategory({ name: "Grants", kind: "income", color: "#6366f1", iconKey: "income", budget: 100 }),
    ).rejects.toThrow("Only “Money out” categories can have a budget.");

    const id = await budgetCategory("Snacks", 50);
    expect((await listCategories()).find((c) => c.id === id)?.budget).toBe(50);
    // Saving without a budget removes it
    await updateCategory(id, { name: "Snacks", kind: "expense", color: "#6366f1", iconKey: "more" });
    expect((await listCategories()).find((c) => c.id === id)?.budget).toBeNull();

    actAs(globex, "member");
    await expect(
      updateCategory(id, { name: "Snacks", kind: "expense", color: "#6366f1", iconKey: "more", budget: 9 }),
    ).rejects.toThrow("Only owners and admins can do this.");
    actAs(globex);
    await deleteCategory(id);
  });
});

describe("regular payments and the forecast", () => {
  // A company that paid the same vendor every month, last time yesterday
  async function seedSubscriber(name: string, vendor: string, amount: number, balance: number) {
    const company = await createTestCompany(name);
    actAs(company);
    const accountId = await createAccount({
      name: "Checking",
      type: "checking",
      openingBalance: balance + amount * 4,
    });
    for (const daysAgo of [92, 61, 31, 1]) {
      await createTransaction({
        accountId,
        categoryId: null,
        name: `${vendor} INV-${daysAgo}00`,
        amount: -amount,
        date: addDays(today, -daysAgo),
        status: "completed",
      });
    }
    return company;
  }

  it("spots only the company's own regular payments", async () => {
    const hooli = await seedSubscriber("hooli2", "Figma", 45, 1000);
    const aviato = await seedSubscriber("aviato", "Notion", 20, 1000);

    actAs(hooli);
    expect(
      (await getRecurring()).payments.map((p) => [p.name, p.cadence, p.amount, p.count, p.billed]),
    ).toEqual([["Figma", "monthly", 45, 4, false]]);

    actAs(aviato);
    expect((await getRecurring()).payments.map((p) => p.name)).toEqual(["Notion"]);
  });

  it("forecasts from the company's own balance, bills and regular payments", async () => {
    const company = await seedSubscriber("bachmanity", "Slack", 100, 500);
    const other = await seedSubscriber("endframe", "Zoom", 999, 50);
    actAs(other);
    await createBill({ name: "Huge", amount: 9000, dueDate: addDays(today, 2), repeat: "none", categoryId: null });

    actAs(company);
    await createBill({ name: "Rent", amount: 300, dueDate: addDays(today, 5), repeat: "none", categoryId: null });
    const forecast = await getForecast();
    expect(forecast.startBalance).toBe(500);
    expect(forecast.events.map((e) => [e.name, e.amount, e.source])).toEqual([
      ["Rent", -300, "bill"],
      ["Slack", -100, "recurring"],
    ]);
    expect(forecast.endBalance).toBe(100);
    expect((await listNotifications()).some((n) => n.id === "cash-shortfall")).toBe(false);

    // Once the regular payment is a bill, it's counted once, as the bill
    await createBill({ name: "Slack", amount: 100, dueDate: addDays(today, 20), repeat: "monthly", categoryId: null });
    expect((await getRecurring()).payments.map((p) => p.billed)).toEqual([true]);
    expect((await getForecast()).events.map((e) => [e.name, e.source])).toEqual([
      ["Rent", "bill"],
      ["Slack", "bill"],
    ]);

    // More bills than money: the bell warns
    await createBill({ name: "Tax", amount: 400, dueDate: addDays(today, 10), repeat: "none", categoryId: null });
    expect((await getForecast()).lowest.balance).toBe(-300);
    expect((await listNotifications()).some((n) => n.id === "cash-shortfall")).toBe(true);
  });
});

describe("handing over and deleting a company", () => {
  const rolesIn = async (organizationId: string) =>
    Object.fromEntries(
      (
        await testDb
          .select({ userId: member.userId, role: member.role })
          .from(member)
          .where(eq(member.organizationId, organizationId))
      ).map((m) => [m.userId, m.role]),
    );

  it("lets only the owner hand the company over, and only to its own members", async () => {
    const company = await createTestCompany("dunder");
    const other = await createTestCompany("sabre");
    // A second person in dunder
    await testDb.insert(user).values({ id: "user_jim", name: "Jim", email: "jim@example.com" });
    const jim = await addTestMember(company, "user_jim", "member");
    const outsider = `member_${other.organizationId}_${other.userId}`;

    actAs(company, "admin");
    await expect(transferOwnership(jim)).rejects.toThrow("Only the company's owner can do this.");

    actAs(company);
    await expect(transferOwnership(outsider)).rejects.toThrow("That person isn't in this company.");
    await expect(
      transferOwnership(`member_${company.organizationId}_${company.userId}`),
    ).rejects.toThrow("You already own this company.");
    expect(await rolesIn(other.organizationId)).toEqual({ [other.userId]: "owner" });

    await transferOwnership(jim);
    expect(await rolesIn(company.organizationId)).toEqual({
      [company.userId]: "admin",
      user_jim: "owner",
    });
  });

  it("deletes only the owner's own company, after its name was typed", async () => {
    const doomed = await createTestCompany("vandelay");
    const kept = await createTestCompany("kramerica");
    for (const company of [doomed, kept]) {
      actAs(company);
      const accountId = await createAccount({ name: "Checking", type: "checking" });
      const categoryId = await createCategory({
        name: "Supplies",
        kind: "expense",
        color: "#6366f1",
        iconKey: "more",
        budget: 100,
      });
      await createCategoryRule({ matchText: "Latex", categoryId });
      await createTransaction(transactionFor({ accountId, categoryId }));
      const billId = await createBill({
        name: "Rent",
        amount: 10,
        dueDate: today,
        repeat: "monthly",
        categoryId,
      });
      const paid = await payBill(billId, { accountId, date: today });
      await addAttachment(paid.transactionId, { name: "receipt.pdf", bytes: PDF });
      await updateEmailPreferences({ weeklyDigest: false, unusualCharges: true });
      await markNotificationsRead();
    }

    actAs(doomed, "admin");
    await expect(deleteCompany("vandelay")).rejects.toThrow(
      "Only the company's owner can do this.",
    );
    actAs(doomed);
    await expect(deleteCompany("kramerica")).rejects.toThrow(
      "Type the company's name exactly to confirm.",
    );
    await expect(deleteCompany("")).rejects.toThrow("Type the company's name exactly to confirm.");

    await deleteCompany(" vandelay ");
    const organizations = await testDb
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, doomed.organizationId));
    expect(organizations).toEqual([]);
    for (const table of [transaction, bill, category, financialAccount, attachment]) {
      expect(
        await testDb.$count(table, eq(table.organizationId, doomed.organizationId)),
      ).toBe(0);
    }
    expect(await rolesIn(doomed.organizationId)).toEqual({});

    // The other company is untouched
    actAs(kept);
    expect((await listTransactions()).total).toBe(2);
    expect((await listAccounts()).length).toBe(1);
    expect((await listBills()).unpaid.length).toBe(1);
    expect((await listCategoryRules()).length).toBe(1);
    expect(
      await testDb.$count(attachment, eq(attachment.organizationId, kept.organizationId)),
    ).toBe(1);
    expect(await getEmailPreferences()).toEqual({ weeklyDigest: false, unusualCharges: true });
    expect(await rolesIn(kept.organizationId)).toEqual({ [kept.userId]: "owner" });
  });
});

describe("searching transactions", () => {
  it("looks in descriptions, notes, category names and amounts of the company's own", async () => {
    const company = await createTestCompany("sirius");
    const other = await createTestCompany("cybersys");
    actAs(other);
    const otherAccount = await createAccount({ name: "Other", type: "checking" });
    const otherCategory = await createCategory({
      name: "Gadgets",
      kind: "expense",
      color: "#6366f1",
      iconKey: "more",
    });
    await createTransaction(
      transactionFor({ accountId: otherAccount, categoryId: otherCategory }, { name: "Robot", amount: -42, notes: "towel" }),
    );

    actAs(company);
    const accountId = await createAccount({ name: "Main", type: "checking" });
    const gadgets = await createCategory({
      name: "Gadgets",
      kind: "expense",
      color: "#6366f1",
      iconKey: "more",
    });
    const add = (name: string, amount: number, extra: Partial<TransactionInput> = {}) =>
      createTransaction(transactionFor({ accountId, categoryId: "" }, { name, amount, categoryId: null, ...extra }));
    await add("Nutrimatic", -42, { notes: "Almost, but not quite, tea" });
    await add("Babel fish", -7.5, { categoryId: gadgets });
    await add("Refund", 42);
    await add("Office 42 rent", -900);

    const found = async (search: string) =>
      (await listTransactions({ search })).transactions.map((t) => t.name).sort();
    expect(await found("nutri")).toEqual(["Nutrimatic"]);
    expect(await found("NOT QUITE")).toEqual(["Nutrimatic"]);
    expect(await found("gadget")).toEqual(["Babel fish"]);
    // The amount in or out, and descriptions containing the number
    expect(await found("42")).toEqual(["Nutrimatic", "Office 42 rent", "Refund"]);
    expect(await found("$7.50")).toEqual(["Babel fish"]);
    expect(await found("towel")).toEqual([]);
    expect(await found("50%_")).toEqual([]);
  });
});

describe("exporting transactions", () => {
  it("exports only the company's own transactions, with the same filters as the list", async () => {
    const company = await createTestCompany("oscorp");
    const other = await createTestCompany("lexcorp");
    actAs(other);
    const otherAccount = await createAccount({ name: "Lex Checking", type: "checking" });
    await createTransaction(
      transactionFor({ accountId: otherAccount, categoryId: "" }, { categoryId: null }),
    );

    actAs(company);
    const accountId = await createAccount({ name: "Main", type: "checking" });
    const categoryId = await createCategory({
      name: "Lab",
      kind: "expense",
      color: "#6366f1",
      iconKey: "more",
    });
    await createTransaction(
      transactionFor({ accountId, categoryId }, { name: "Spider feed", amount: -80, notes: "Weekly" }),
    );
    await createTransaction(
      transactionFor(
        { accountId, categoryId },
        { name: "Grant", amount: 5000, categoryId: null, date: addDays(today, -3), status: "pending" },
      ),
    );

    const all = await exportTransactions();
    expect(all.truncated).toBe(false);
    expect(all.rows).toEqual([
      {
        day: today,
        name: "Spider feed",
        category: "Lab",
        account: "Main",
        amount: -80,
        status: "completed",
        notes: "Weekly",
      },
      {
        day: addDays(today, -3),
        name: "Grant",
        category: null,
        account: "Main",
        amount: 5000,
        status: "pending",
        notes: null,
      },
    ]);

    expect((await exportTransactions({ search: "grant" })).rows.map((r) => r.name)).toEqual(["Grant"]);
    expect((await exportTransactions({ from: today })).rows.map((r) => r.name)).toEqual(["Spider feed"]);
    // Another company's account as a filter finds nothing
    expect((await exportTransactions({ accountId: otherAccount })).rows).toEqual([]);
  });
});

describe("attachments", () => {
  it("keeps a company's files to itself", async () => {
    actAs(globex);
    const [file] = await addAttachment(globex.transactionId, {
      name: "C:\\Users\\me\\globex receipt.pdf",
      bytes: PDF,
    });
    expect(file).toMatchObject({
      name: "globex receipt.pdf",
      contentType: "application/pdf",
      size: PDF.length,
      canDelete: true,
    });
    expect((await getAttachmentFile(file.id))?.bytes).toEqual(PDF);
    expect((await getTransaction(globex.transactionId))?.attachmentCount).toBe(1);

    actAs(acme);
    expect(await listAttachments(globex.transactionId)).toEqual([]);
    expect(await getAttachmentFile(file.id)).toBeNull();
    await expect(deleteAttachment(file.id)).rejects.toThrow("File not found.");
    await expect(
      addAttachment(globex.transactionId, { name: "x.pdf", bytes: PDF }),
    ).rejects.toThrow("Transaction not found.");

    actAs(globex);
    expect((await listAttachments(globex.transactionId)).map((a) => a.id)).toEqual([file.id]);
    expect(await deleteAttachment(file.id)).toEqual([]);
  });

  it("accepts only PDFs and pictures, by their content, up to 4 MB and 10 per transaction", async () => {
    actAs(acme);
    const add = (name: string, bytes: Uint8Array) =>
      addAttachment(acme.transactionId, { name, bytes });

    await expect(
      add("receipt.pdf", new TextEncoder().encode("<html><script>alert(1)</script>")),
    ).rejects.toThrow("Only PDF, JPEG, PNG, WebP files can be attached.");
    await expect(add("empty.pdf", new Uint8Array())).rejects.toThrow("Choose a file to attach.");
    const tooBig = new Uint8Array(4 * 1024 * 1024 + 1);
    tooBig.set(PDF);
    await expect(add("big.pdf", tooBig)).rejects.toThrow("A file can be at most 4.0 MB.");

    // Called .txt, but really a picture: stored as what it is
    const [picture] = await add("photo.txt", PNG);
    expect(picture.contentType).toBe("image/png");
    for (let i = 1; i < 10; i++) await add(`receipt-${i}.pdf`, PDF);
    await expect(add("one-too-many.pdf", PDF)).rejects.toThrow(
      "A transaction can have at most 10 files.",
    );

    // Deleting the transaction deletes its files
    const id = await createTransaction(transactionFor(acme, { name: "With a file" }));
    await addAttachment(id, { name: "r.pdf", bytes: PDF });
    await deleteTransaction(id);
    expect(await testDb.$count(attachment, eq(attachment.transactionId, id))).toBe(0);
    for (const file of await listAttachments(acme.transactionId)) await deleteAttachment(file.id);
  });

  it("lets members delete their own files only", async () => {
    actAs(globex);
    const [ownersFile] = await addAttachment(globex.transactionId, { name: "a.pdf", bytes: PDF });
    await testDb.insert(user).values({ id: "user_pam", name: "Pam", email: "pam@example.com" });
    const pam = { ...globex, userId: "user_pam" };

    actAs(pam, "member");
    const files = await addAttachment(globex.transactionId, { name: "b.pdf", bytes: PDF });
    expect(files.map((f) => [f.name, f.canDelete])).toEqual([
      ["a.pdf", false],
      ["b.pdf", true],
    ]);
    await expect(deleteAttachment(ownersFile.id)).rejects.toThrow(
      "Only the person who added this file, an owner or an admin can delete it.",
    );
    await deleteAttachment(files[1].id);

    actAs(globex);
    expect(await deleteAttachment(ownersFile.id)).toEqual([]);
  });
});

describe("email notifications", () => {
  // A company whose owner and a second person have verified addresses, and
  // that paid one vendor the same amount for three months
  async function seedTeam(name: string) {
    const company = await createTestCompany(name);
    await testDb.update(user).set({ emailVerified: true }).where(eq(user.id, company.userId));
    const mateId = `user_${name}_mate`;
    await testDb.insert(user).values({
      id: mateId,
      name: `${name} mate`,
      email: `${name}-mate@example.com`,
      emailVerified: true,
    });
    await addTestMember(company, mateId, "member");
    // Someone who never verified their address gets no emails
    const unverifiedId = `user_${name}_new`;
    await testDb.insert(user).values({
      id: unverifiedId,
      name: `${name} new`,
      email: `${name}-new@example.com`,
    });
    await addTestMember(company, unverifiedId, "member");

    actAs(company);
    const accountId = await createAccount({
      name: "Checking",
      type: "checking",
      openingBalance: 10_000,
    });
    for (const daysAgo of [120, 90, 60]) {
      await createTransaction({
        accountId,
        categoryId: null,
        name: "CloudHost",
        amount: -100,
        date: addDays(today, -daysAgo),
        status: "completed",
      });
    }
    return { ...company, accountId, mate: { ...company, userId: mateId } };
  }
  const charge = (accountId: string, amount: number, name = "CloudHost"): TransactionInput => ({
    accountId,
    categoryId: null,
    name,
    amount: -amount,
    date: addDays(today, -1),
    status: "completed",
  });

  it("emails the company's own team right away about an unusually high charge", async () => {
    const team = await seedTeam("wonka");
    await seedTeam("slugworth");

    actAs(team);
    sentEmails.length = 0;
    await createTransaction(charge(team.accountId, 105));
    expect(sentEmails).toEqual([]);

    await createTransaction(charge(team.accountId, 400));
    expect(sentEmails.map((e) => e.to).sort()).toEqual([
      "wonka-mate@example.com",
      "wonka@example.com",
    ]);
    expect(sentEmails[0].subject).toBe("Unusually high charge from CloudHost at wonka");
    expect(sentEmails[0].text).toContain("CloudHost charged $400.00");
  });

  it("respects each person's choice, per company", async () => {
    const team = await seedTeam("gringotts");
    expect(await getEmailPreferences()).toEqual({ weeklyDigest: true, unusualCharges: true });

    actAs(team.mate, "member");
    await updateEmailPreferences({ weeklyDigest: true, unusualCharges: false });
    expect(await getEmailPreferences()).toEqual({ weeklyDigest: true, unusualCharges: false });
    actAs(team);
    expect(await getEmailPreferences()).toEqual({ weeklyDigest: true, unusualCharges: true });

    sentEmails.length = 0;
    await createTransaction(charge(team.accountId, 400));
    expect(sentEmails.map((e) => e.to)).toEqual(["gringotts@example.com"]);
  });

  it("alerts once about the unusual charges of an imported statement", async () => {
    const team = await seedTeam("monarch");
    sentEmails.length = 0;
    await importTransactions(team.accountId, [
      { date: addDays(today, -2), name: "CloudHost", amount: -450, category: null },
      { date: addDays(today, -3), name: "Coffee", amount: -4, category: null },
      { date: addDays(today, -4), name: "Client payment", amount: 900, category: null },
    ]);
    expect(sentEmails.map((e) => e.to).sort()).toEqual([
      "monarch-mate@example.com",
      "monarch@example.com",
    ]);
    expect(sentEmails[0].text).toContain("CloudHost charged $450.00");
    expect(sentEmails[0].text).not.toContain("Coffee");
  });

  it("sends each company its own weekly summary, once, to those who want it", async () => {
    const team = await seedTeam("tyrell");
    await createTransaction(charge(team.accountId, 80, "Paper"));
    await createTransaction({ ...charge(team.accountId, 0, "Sale"), amount: 500 });
    await createBill({ name: "Rent", amount: 300, dueDate: addDays(today, -1), repeat: "none", categoryId: null });
    actAs(team.mate, "member");
    await updateEmailPreferences({ weeklyDigest: false, unusualCharges: true });

    sentEmails.length = 0;
    const result = await sendWeeklyDigests();
    expect(result.companies).toBeGreaterThan(0);
    const mine = sentEmails.filter((e) => e.to.startsWith("tyrell"));
    expect(mine.map((e) => e.to)).toEqual(["tyrell@example.com"]);
    expect(mine[0].subject).toBe("tyrell's week: +$420.00 net");
    expect(mine[0].text).toContain("Money in: $500.00");
    expect(mine[0].text).toContain("Money out: $80.00");
    expect(mine[0].text).toContain("In the bank now: $10,120.00");
    expect(mine[0].text).toContain("1 bill overdue, $300.00 in total.");
    // Nothing of any other company in it
    expect(mine[0].text).not.toContain("globex");

    // Run again (a retry, or by mistake): nobody gets it twice
    sentEmails.length = 0;
    expect(await sendWeeklyDigests()).toEqual({ companies: 0, emails: 0 });
    expect(sentEmails).toEqual([]);
  });
});

describe("activity log", () => {
  it("records who did what, in the company it happened in only", async () => {
    const company = await createTestCompany("hogwarts");
    const other = await createTestCompany("durmstrang");
    actAs(other);
    await createAccount({ name: "Other Checking", type: "checking" });

    actAs(company);
    const accountId = await createAccount({ name: "Vault", type: "checking" });
    const categoryId = await createCategory({
      name: "Potions",
      kind: "expense",
      color: "#6366f1",
      iconKey: "more",
    });
    const id = await createTransaction({
      accountId,
      categoryId: null,
      name: "Cauldron",
      amount: -40,
      date: today,
      status: "completed",
    });
    await updateTransaction(id, {
      accountId,
      categoryId,
      name: "Cauldron",
      amount: -45,
      date: today,
      status: "completed",
    });
    // Saving again without changing anything isn't worth a line
    await updateTransaction(id, {
      accountId,
      categoryId,
      name: "Cauldron",
      amount: -45,
      date: today,
      status: "completed",
    });
    await deleteTransaction(id);

    const { entries, total } = await listAuditLog();
    expect(total).toBe(5);
    expect(entries.map((e) => [e.area, e.action, e.summary])).toEqual([
      ["transaction", "deleted", expect.stringContaining("Deleted the transaction “Cauldron” (-$45.00")],
      [
        "transaction",
        "updated",
        "Changed the transaction “Cauldron”: amount from -$40.00 to -$45.00, category from none to Potions",
      ],
      ["transaction", "created", "Added the transaction “Cauldron” (-$40.00)"],
      ["category", "created", "Added the category “Potions”"],
      ["account", "created", "Added the bank account “Vault”"],
    ]);
    expect(entries.every((e) => e.actor === `Name of ${company.userId}`)).toBe(true);

    expect((await listAuditLog({ area: "transaction" })).total).toBe(3);
    expect((await listAuditLog({ limit: 2, offset: 2 })).entries.map((e) => e.action)).toEqual([
      "created",
      "created",
    ]);

    actAs(other);
    expect((await listAuditLog()).entries.map((e) => e.summary)).toEqual([
      "Added the bank account “Other Checking”",
    ]);
  });

  it("can only be read by owners and admins", async () => {
    actAs(globex, "member");
    await expect(listAuditLog()).rejects.toThrow("Only owners and admins can do this.");
    actAs(globex, "admin");
    expect((await listAuditLog()).total).toBeGreaterThan(0);
  });
});

describe("currency", () => {
  it("is the company's own, and shows up in what Finely writes about its money", async () => {
    const company = await createTestCompany("lutece");
    const other = await createTestCompany("columbia");
    actAs(company);
    expect((await getCompanySettings()).currency).toBe("USD");
    await updateCurrency("EUR");
    await expect(updateCurrency("BTC")).rejects.toThrow("Choose a currency from the list.");

    const accountId = await createAccount({ name: "Compte", type: "checking", openingBalance: -50 });
    await createTransaction({
      accountId,
      categoryId: null,
      name: "Loyer",
      amount: -900,
      date: today,
      status: "completed",
    });
    expect((await getCompanySettings()).currency).toBe("EUR");
    // The bell and the activity log speak euros
    expect((await listNotifications()).find((n) => n.id.startsWith("overdrawn"))?.description).toBe(
      "Compte is at -€950.00.",
    );
    expect((await listAuditLog({ area: "transaction" })).entries[0].summary).toBe(
      "Added the transaction “Loyer” (-€900.00)",
    );
    expect((await listAuditLog({ area: "settings" })).entries[0].summary).toBe(
      "Changed the company's currency from USD to EUR (Euro)",
    );

    actAs(company, "member");
    await expect(updateCurrency("GBP")).rejects.toThrow("Only owners and admins can do this.");
    actAs(other);
    expect((await getCompanySettings()).currency).toBe("USD");
  });
});

describe("rate limiting", () => {
  it("allows a number of requests per window and key, then refuses until the window is over", async () => {
    const start = 1_800_000_000_000;
    for (let i = 0; i < 5; i++) {
      expect(await withinRateLimit("test:1.2.3.4", 5, 3600, start + i * 1000)).toBe(true);
    }
    expect(await withinRateLimit("test:1.2.3.4", 5, 3600, start + 6000)).toBe(false);
    expect(await withinRateLimit("test:1.2.3.4", 5, 3600, start + 3_599_000)).toBe(false);
    // Someone else isn't affected
    expect(await withinRateLimit("test:5.6.7.8", 5, 3600, start + 6000)).toBe(true);
    // An hour after the first request, a new window starts
    expect(await withinRateLimit("test:1.2.3.4", 5, 3600, start + 3_601_000)).toBe(true);
  });
});
