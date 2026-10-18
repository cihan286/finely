// Things a person browsing Finely would notice if they broke: the page
// layout, the way back from a wrong address, errors that can be seen,
// and a header that knows who's logged in

import type { Page } from "@playwright/test";
import { expect, test } from "./test";
import { signUpWithCompany } from "./helpers";

async function startDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible({
    timeout: 15_000,
  });
}

test("dashboard pages scroll inside their panel, never the whole page", async ({ page }) => {
  await startDemo(page);
  for (const path of [
    "/dashboard",
    "/dashboard/transactions",
    "/dashboard/bills",
    "/dashboard/cards",
    "/dashboard/insights",
    "/dashboard/settings",
    "/dashboard/settings/activity",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Otherwise the top bar and sidebar slide away with the page
    const extra = await page.evaluate(
      () => document.scrollingElement!.scrollHeight - document.scrollingElement!.clientHeight,
    );
    expect(extra, `${path} scrolls behind its panel`).toBeLessThanOrEqual(0);
  }
});

test("a wrong address shows a page with a way back", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
  await page.getByRole("link", { name: "Go to the home page" }).click();
  await expect(page.getByRole("heading", { name: /Financial clarity/ })).toBeVisible();
});

test("someone logged in is offered their dashboard, not \"Log in\"", async ({ page }) => {
  await signUpWithCompany(page, "Kai", "Kai Coffee");
  for (const path of ["/", "/about", "/no-such-page"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: /Open (your )?dashboard/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeHidden();
  }
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("an error in a long dialog comes into view", async ({ page }) => {
    await startDemo(page);
    await page.goto("/dashboard/transactions?new=1");
    const dialog = page.getByRole("dialog", { name: "Add transaction" });
    await dialog.getByLabel(/^Amount/).fill("12");
    // A blank description (a space gets past the browser's own check): the
    // button is at the bottom, Finely's error at the top
    await dialog.getByRole("textbox", { name: "Description" }).fill(" ");
    await dialog.getByRole("button", { name: "Add transaction" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Description is required.");
    await expect(dialog.getByRole("alert")).toBeInViewport();
  });

  test("names in the settings lists aren't cut short", async ({ page }) => {
    await startDemo(page);
    await page.goto("/dashboard/settings");
    for (const name of ["Marketing", "Office & Rent", "Business Checking", "Jordan Lee"]) {
      const element = page.getByRole("listitem").getByText(name, { exact: true }).first();
      await element.scrollIntoViewIfNeeded();
      const cut = await element.evaluate((e) => e.scrollWidth > e.clientWidth + 1);
      expect(cut, `"${name}" is cut short`).toBe(false);
    }
  });
});
