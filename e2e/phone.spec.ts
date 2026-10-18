// On the smallest phones (320px wide): nothing sticks out sideways

import { expect, test } from "./test";

test.use({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });

test("pages fit a small phone, and the transactions' amounts stay visible", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible({
    timeout: 15_000,
  });

  for (const path of [
    "/dashboard",
    "/dashboard/transactions",
    "/dashboard/bills",
    "/dashboard/cards",
    "/dashboard/insights",
    "/dashboard/settings",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { pageWidth, screenWidth } = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      screenWidth: window.innerWidth,
    }));
    expect(pageWidth, `${path} scrolls sideways`).toBeLessThanOrEqual(screenWidth);
  }

  // The table fits its card, so the amount column is never cut off
  await page.goto("/dashboard/transactions");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  const { tableRight, cardRight } = await table.evaluate((element) => ({
    tableRight: element.getBoundingClientRect().right,
    cardRight: element.parentElement!.getBoundingClientRect().right,
  }));
  expect(tableRight).toBeLessThanOrEqual(cardRight + 1);

  // The demo banner is one short line here
  await expect(page.getByText("Made-up data, deleted in")).toBeVisible();
});
