// Inviting a teammate, what members may do, and keeping companies apart

import { expect, test } from "./test";
import { invitationId, verifyEmail } from "./db";
import {
  addBankAccount,
  addTransaction,
  signUp,
  signUpWithCompany,
  transactionRow,
  uniqueEmail,
} from "./helpers";

test("an invited teammate signs up through the link and joins the company as a member", async ({
  browser,
}) => {
  const ownerPage = await browser.newPage();
  const owner = await signUpWithCompany(ownerPage, "Olivia", "Olivia Ventures");
  await addBankAccount(ownerPage, "Operating Account", "500");

  const teammate = { name: "Ethan", email: uniqueEmail("Ethan") };
  await ownerPage.goto("/dashboard/settings");
  await ownerPage.getByLabel("Email address", { exact: true }).fill(teammate.email);
  await ownerPage.getByRole("button", { name: "Send invite" }).click();
  await expect(
    ownerPage.getByRole("listitem").filter({ hasText: teammate.email }),
  ).toBeVisible();

  // The teammate opens the link from their email in their own browser
  const page = await browser.newPage();
  await page.goto(`/accept-invitation/${await invitationId(teammate.email)}`);
  await expect(page.getByRole("heading", { name: "You're invited" })).toBeVisible();
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.waitForURL(/\/signup/);
  await signUp(page, teammate);

  // Joining a team needs a verified email address
  await expect(
    page.getByRole("heading", { name: "Verify your email to join your team" }),
  ).toBeVisible();
  await verifyEmail(teammate.email);
  await page.reload();

  await expect(page.getByRole("heading", { name: `Join ${owner.company}` })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible();
  await expect(page.getByText(`Here is what is happening at ${owner.company}`)).toBeVisible();

  // They see the company's accounts, but members can't change the team
  await page.goto("/dashboard/settings");
  await expect(page.getByText("Operating Account")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send invite" })).toBeHidden();
  await expect(
    page.getByText("Only owners and admins can invite or remove people and change roles."),
  ).toBeVisible();

  // And the owner now has them on the team
  await ownerPage.reload();
  await expect(ownerPage.getByLabel(`Role of ${teammate.name}`)).toHaveValue("member");
});

test("one company never sees another company's money", async ({ browser }) => {
  const first = await browser.newPage();
  await signUpWithCompany(first, "Sofia", "Sofia Labs");
  await addBankAccount(first, "Sofia Secret Account", "9999");
  await addTransaction(first, { direction: "in", amount: "5000", description: "Sofia secret invoice" });
  await first.goto("/dashboard/transactions?q=secret");
  await expect(transactionRow(first, "Sofia secret invoice")).toBeVisible();

  const second = await browser.newPage();
  await signUpWithCompany(second, "Liam", "Liam Logistics");

  await second.goto("/dashboard/settings");
  await expect(second.getByText("No bank accounts yet. Add one above.")).toBeVisible();
  await expect(second.getByText("Sofia Secret Account")).toBeHidden();

  // Not even by searching for it
  await second.goto("/dashboard/transactions?q=secret");
  await expect(second.getByRole("heading", { name: "Add a bank account first" })).toBeVisible();
  await expect(second.getByText("Sofia secret invoice")).toBeHidden();
});
