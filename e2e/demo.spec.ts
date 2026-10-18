// "Try the demo": a ready-made company to look around in, deleted a day later

import { expect, test } from "./test";
import { cronSecret } from "../playwright.config";
import { query } from "./db";

/** Presses "Try the demo" on the home page; ends on the demo's dashboard */
async function startDemo(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible({
    timeout: 15_000,
  });
}

test("a visitor opens the demo and finds a company full of sample data", async ({ page }) => {
  await startDemo(page);
  await expect(page.getByText("Here is what is happening at Northpeak Studio")).toBeVisible();
  await expect(page.getByText("You're exploring a demo.")).toBeVisible();
  // Its pretend owner never has to verify an email address
  await expect(page.getByText("Please verify your email address")).toBeHidden();

  await page.goto("/dashboard/transactions?q=Acme");
  await expect(page.getByRole("row").filter({ hasText: "Acme Corp retainer" }).first()).toBeVisible();

  await page.goto("/dashboard/insights");
  const unusual = page.locator("section", {
    has: page.getByRole("heading", { name: "Unusual charges" }),
  });
  await expect(unusual).toContainText("Amazon Web Services");
  const regular = page.locator("section", {
    has: page.getByRole("heading", { name: "Regular payments" }),
  });
  await expect(regular).toContainText(/WeWork office rent/i);

  await page.goto("/dashboard/bills");
  await expect(page.getByText("Hiscox business insurance")).toBeVisible();
  await page.goto("/dashboard/cards");
  await expect(page.getByText("Jordan's card")).toBeVisible();
});

test("the demo can't reach the outside world", async ({ page }) => {
  await startDemo(page);
  await page.goto("/dashboard/settings");

  // No inviting real people
  await page.getByLabel("Email address", { exact: true }).fill("someone@example.com");
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText("This isn't available in the demo.")).toBeVisible();
  const [{ count }] = await query<{ count: string }>(
    `select count(*) from invitation where email = 'someone@example.com'`,
  );
  expect(Number(count)).toBe(0);
});

test("each visitor gets their own copy, and leaving it leads to signing up", async ({
  browser,
}) => {
  const first = await browser.newPage();
  await startDemo(first);
  const second = await browser.newPage();
  await startDemo(second);

  // A change in one copy doesn't show in the other
  await first.goto("/dashboard/settings");
  const name = first.getByRole("textbox", { name: "Company name" });
  await name.fill("Maya's Renamed Studio");
  await first.getByRole("button", { name: "Save" }).first().click();
  await expect(first.getByRole("button", { name: /Company: Maya's Renamed Studio/ })).toBeVisible();
  await second.reload();
  await expect(second.getByRole("button", { name: "Company: Northpeak Studio. Switch company" })).toBeVisible();

  await second.getByRole("button", { name: "Sign up for real" }).click();
  await expect(second.getByRole("heading", { name: "Create your account" })).toBeVisible();
});

test("a demo is deleted, with its people, once its day is over", async ({ page, request }) => {
  await startDemo(page);
  // This visitor's own demo (others run at the same time): found by the
  // pretend owner's address in the top bar
  const email = (await page.getByRole("banner").textContent())?.match(
    /maya\.[a-z0-9]+@demo\.finely\.invalid/,
  )?.[0];
  expect(email).toBeTruthy();
  const [demo] = await query<{ organization_id: string }>(
    `select m.organization_id from member m join "user" u on u.id = m.user_id
     where u.email = $1`,
    [email],
  );
  await query(
    `update company_settings set demo_expires_at = now() - interval '1 minute'
     where organization_id = $1`,
    [demo.organization_id],
  );

  const response = await request.get("/api/cron/bank-sync", {
    headers: { authorization: `Bearer ${cronSecret}` },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).demosDeleted).toBeGreaterThanOrEqual(1);

  const left = await query(`select id from organization where id = $1`, [demo.organization_id]);
  expect(left).toHaveLength(0);
  const people = await query(
    `select id from "user" where email like '%@demo.finely.invalid' and id in
       (select user_id from member where organization_id = $1)`,
    [demo.organization_id],
  );
  expect(people).toHaveLength(0);

  // Its login went with it
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
