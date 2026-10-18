// ─────────────────────────────────────────────────────────────────────────────
// Shared steps for the end-to-end tests
//
// In plain words: the steps many tests start with, like signing up a new
// person with their own company, written once.
// ─────────────────────────────────────────────────────────────────────────────

import { expect, type Page } from "@playwright/test";

export const PASSWORD = "correct-horse-battery";

/** A new email address nobody has used yet, so tests never share people */
export function uniqueEmail(name: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${name.toLowerCase()}-${id}@example.com`;
}

/**
 * Fills in and sends the sign-up form; stops on the page it leads to. Opens
 * /signup first, unless the page already shows the form (e.g. reached from
 * an invitation, which comes back to it afterwards).
 */
export async function signUp(page: Page, person: { name: string; email: string }) {
  if (!new URL(page.url()).pathname.startsWith("/signup")) await page.goto("/signup");
  await page.getByLabel("Full name").fill(person.name);
  await page.getByLabel("Work email").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

/** Signs up a new person who sets up their own company; ends on the dashboard */
export async function signUpWithCompany(page: Page, name: string, company: string) {
  const email = uniqueEmail(name);
  await signUp(page, { name, email });
  await expect(page.getByRole("heading", { name: "Set up your company" })).toBeVisible();
  await page.getByLabel("Company name").fill(company);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible();
  return { name, email, company };
}

/** Adds a bank account in Settings */
export async function addBankAccount(page: Page, name: string, openingBalance: string) {
  await page.goto("/dashboard/settings#accounts");
  const form = page.locator("section", {
    has: page.getByRole("heading", { name: "Add a bank account" }),
  });
  await form.getByLabel("Name", { exact: true }).fill(name);
  await form.getByLabel("Opening balance").fill(openingBalance);
  await form.getByRole("button", { name: "Add account" }).click();
  await expect(bankAccountRow(page, name)).toBeVisible();
}

/** Adds a transaction by hand on the Transactions page (into the first account) */
export async function addTransaction(
  page: Page,
  transaction: { direction: "in" | "out"; amount: string; description: string },
) {
  await page.goto("/dashboard/transactions");
  await page.getByRole("link", { name: "Add transaction" }).click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await dialog
    .getByRole("radio", { name: transaction.direction === "in" ? "Money in" : "Money out" })
    .check();
  await dialog.getByLabel(/^Amount/).fill(transaction.amount);
  await dialog.getByRole("textbox", { name: "Description" }).fill(transaction.description);
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog).toBeHidden();
}

/** A transaction's line on the Transactions page */
export function transactionRow(page: Page, description: string) {
  return page.getByRole("row").filter({ hasText: description });
}

/** An account's line in Settings' list of bank accounts */
export function bankAccountRow(page: Page, name: string) {
  return page
    .locator("section", { has: page.getByRole("heading", { name: /^Bank accounts/ }) })
    .getByRole("listitem")
    .filter({ hasText: name });
}
