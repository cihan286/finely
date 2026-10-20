// Signing up, logging out and logging back in

import { expect, test } from "./test";
import { PASSWORD, signUpWithCompany } from "./helpers";

test("a new person signs up, sets up their company and lands on its dashboard", async ({
  page,
}) => {
  const owner = await signUpWithCompany(page, "Maya", "Northpeak Studio");

  await expect(page.getByText(`Here is what is happening at ${owner.company}`)).toBeVisible();
  await expect(page.getByRole("button", { name: `Company: ${owner.company}. Switch company` })).toBeVisible();
  // Until they open the link in their email, a banner reminds them
  await expect(page.getByText("Please verify your email address")).toBeVisible();
});

test("someone logs out and back in, and wrong passwords are refused", async ({ page }) => {
  const owner = await signUpWithCompany(page, "Leo", "Leo Bakery");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).not.toHaveURL(/\/dashboard/);

  // The dashboard is closed to people who aren't logged in
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  const refused = page.getByRole("alertdialog").filter({ hasText: /invalid|incorrect|wrong/i });
  await expect(refused).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  // The notification window covers the page until it's closed
  await refused.getByRole("button", { name: "OK" }).click();
  await expect(refused).toBeHidden();

  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  // Opens the company they were working in
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible();
  await expect(page.getByText(`Here is what is happening at ${owner.company}`)).toBeVisible();
});

test("guessing passwords is stopped after a few tries", async ({ page }) => {
  const owner = await signUpWithCompany(page, "Ivy", "Ivy Imports");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).not.toHaveURL(/\/dashboard/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(owner.email);
  const notice = page.getByRole("alertdialog");
  const tooMany = notice.filter({ hasText: "Too many requests" });
  for (let attempt = 1; attempt <= 5; attempt++) {
    await page.getByLabel("Password", { exact: true }).fill(`wrong-guess-${attempt}`);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(notice).toBeVisible();
    if (await tooMany.isVisible()) break;
    // Closed, to try again
    await notice.getByRole("button", { name: "OK" }).click();
    await expect(notice).toBeHidden();
  }
  await expect(tooMany).toBeVisible();
  await tooMany.getByRole("button", { name: "OK" }).click();
  await expect(tooMany).toBeHidden();

  // Even the right password has to wait
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(tooMany).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
