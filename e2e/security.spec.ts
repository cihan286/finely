// The safety instructions every page sends the browser (next.config.ts, and
// the Content Security Policy from proxy.ts / lib/csp.ts)

import { expect, test } from "./test";

test("pages tell the browser not to be framed, to use HTTPS and to keep addresses private", async ({
  request,
}) => {
  for (const path of ["/", "/login", "/dashboard"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const headers = response.headers();
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["strict-transport-security"], path).toContain("max-age=");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["permissions-policy"], path).toContain("camera=()");
  }
});

test("every page load gets its own one-time code for its scripts", async ({ request }) => {
  const nonceOf = async () => {
    const policy = (await request.get("/")).headers()["content-security-policy"];
    expect(policy).toContain("'strict-dynamic'");
    return policy.match(/'nonce-([^']+)'/)?.[1];
  };
  const [first, second] = [await nonceOf(), await nonceOf()];
  expect(first).toBeTruthy();
  expect(first).not.toBe(second);
});

test("the Content Security Policy blocks nothing Finely itself uses", async ({ page }) => {
  // Every time the browser blocks something, it fires this event: collect them
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener("securitypolicyviolation", (e) =>
      seen.push(`${e.violatedDirective} blocked ${e.blockedURI || "inline"} (${e.sourceFile}:${e.lineNumber})`),
    );
  });
  const found: string[] = [];
  const collect = async (label: string) => {
    // Let late scripts and styles load first
    await page.waitForLoadState("networkidle");
    const seen = await page.evaluate(
      () => (window as unknown as { cspViolations?: string[] }).cspViolations ?? [],
    );
    found.push(...seen.map((v) => `${label}: ${v}`));
  };

  for (const path of ["/", "/login", "/signup", "/about", "/contact", "/terms", "/privacy"]) {
    await page.goto(path);
    await collect(path);
  }

  // The demo exercises every dashboard page, the charts and the dialogs
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard Overview" })).toBeVisible({
    timeout: 15_000,
  });
  await collect("demo start");
  for (const path of [
    "/dashboard",
    "/dashboard/transactions",
    "/dashboard/transactions?new=1",
    "/dashboard/bills",
    "/dashboard/cards",
    "/dashboard/insights",
    "/dashboard/settings",
    "/dashboard/settings/activity",
    "/your-account",
  ]) {
    await page.goto(path);
    await collect(path);
  }
  // Moving between pages inside the app, as people do
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Transactions" }).first().click();
  await expect(page.getByRole("heading", { name: "Transactions", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Notifications" }).click();
  await collect("in-app navigation");

  expect(found).toEqual([]);
});
