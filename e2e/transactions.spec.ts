// Bank accounts, adding transactions by hand and importing a bank statement

import { expect, test } from "./test";
import {
  addBankAccount,
  addTransaction,
  bankAccountRow,
  signUpWithCompany,
  transactionRow,
} from "./helpers";

test("adding transactions by hand updates the account's balance", async ({ page }) => {
  await signUpWithCompany(page, "Ava", "Ava Design");
  await addBankAccount(page, "Business Checking", "1000");
  await expect(bankAccountRow(page, "Business Checking")).toContainText("$1,000.00");

  await addTransaction(page, { direction: "out", amount: "250", description: "Office rent" });
  await addTransaction(page, { direction: "in", amount: "400", description: "Client payment" });

  await expect(transactionRow(page, "Office rent")).toContainText("250.00");
  await expect(transactionRow(page, "Client payment")).toContainText("400.00");

  // 1,000 − 250 + 400
  await page.goto("/dashboard/settings#accounts");
  await expect(bankAccountRow(page, "Business Checking")).toContainText("$1,150.00");
});

test("a bank statement (CSV) is previewed, then imported into an account", async ({ page }) => {
  await signUpWithCompany(page, "Noah", "Noah Consulting");
  await addBankAccount(page, "Main Account", "0");

  await page.goto("/dashboard/transactions");
  await page.getByRole("link", { name: "Import CSV" }).click();
  const dialog = page.getByRole("dialog", { name: "Import a bank statement" });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "Date,Description,Amount",
        "2026-09-01,Stripe payout,1200.00",
        "2026-09-03,Figma subscription,-45.00",
        "2026-09-05,Coffee beans,-18.50",
      ].join("\n"),
    ),
  });

  // The preview names the file and offers to import every line
  await expect(dialog.getByText("statement.csv")).toBeVisible();
  await dialog.getByRole("button", { name: "Import 3 transactions" }).click();
  await expect(dialog).toBeHidden();

  await expect(transactionRow(page, "Stripe payout")).toContainText("1,200.00");
  await expect(transactionRow(page, "Figma subscription")).toContainText("45.00");
  await expect(transactionRow(page, "Coffee beans")).toContainText("18.50");

  // 1,200 − 45 − 18.50
  await page.goto("/dashboard/settings#accounts");
  await expect(bankAccountRow(page, "Main Account")).toContainText("$1,136.50");
});
