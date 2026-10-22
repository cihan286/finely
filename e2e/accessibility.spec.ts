// Accessibility: every page passes axe's WCAG 2.1 AA checks, in light and dark
//
// axe (axe-core) looks for problems people using screen readers, keyboards
// or poor eyesight run into: text too faint to read, buttons and fields
// without a name, headings out of order, and so on. A failure lists each
// problem with the elements it found it on.

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { signUp, uniqueEmail } from "./helpers";
import { expect, test } from "./test";

const PUBLIC_PAGES = ["/", "/login", "/signup", "/forgot-password", "/about", "/contact", "/terms", "/privacy"];
const DEMO_PAGES = [
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/bills",
  "/dashboard/cards",
  "/dashboard/insights",
  "/dashboard/settings",
  "/dashboard/settings/activity",
  "/your-account",
];

/** The problems axe finds on the page as it is now, one line each */
async function problems(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // Pictures (role="img", with a description for screen readers) are
    // skipped: text that's part of a picture, like the made-up figures on
    // the home page's phone, isn't held to the contrast rules (WCAG 1.4.3)
    .exclude('[role="img"]')
    .analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((node) => `${v.id} (${v.impact}): ${v.help} — ${node.target.join(" ")}`),
  );
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test("public pages", async ({ page }) => {
      const found: string[] = [];
      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        found.push(...(await problems(page)).map((p) => `${path}: ${p}`));
      }
      // Where every new person lands: setting up their company
      await signUp(page, { name: "Robin", email: uniqueEmail("Robin") });
      await expect(page.getByRole("heading", { name: "Set up your company" })).toBeVisible();
      found.push(...(await problems(page)).map((p) => `/onboarding: ${p}`));
      expect(found).toEqual([]);
    });

    test("the demo's pages, dialogs and notifications", async ({ page }) => {
      // It checks every page of the demo and several windows, one after
      // another: more than the usual 30 seconds
      test.setTimeout(60_000);
      await page.goto("/");
      await page.getByRole("button", { name: "Try the demo" }).click();
      await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible({
        timeout: 15_000,
      });

      const found: string[] = [];
      const check = async (label: string) =>
        found.push(...(await problems(page)).map((p) => `${label}: ${p}`));

      for (const path of DEMO_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await check(path);
      }

      await page.goto("/dashboard/transactions?new=1");
      await expect(page.getByRole("dialog")).toBeVisible();
      await check("add transaction dialog");

      await page.goto("/dashboard/transactions");
      await page.getByRole("link", { name: "Import CSV" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await check("import dialog");

      for (const [label, path] of [
        ["add bill dialog", "/dashboard/bills?new=1"],
        ["add card dialog", "/dashboard/cards?new=1"],
      ]) {
        await page.goto(path);
        await expect(page.getByRole("dialog")).toBeVisible();
        await check(label);
      }

      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Notifications" }).click();
      await check("notifications");

      expect(found).toEqual([]);
    });
  });
}
