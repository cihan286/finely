// ─────────────────────────────────────────────────────────────────────────────
// End-to-end test (Playwright) settings
//
// In plain words: end-to-end tests use Finely the way a person would — in a
// real browser, against the real app and a real database — to check that the
// main journeys (signing up, adding money, importing a statement, inviting a
// teammate) keep working. `npm run test:e2e` runs them.
//
// For developers: the tests live in e2e/. They need a Postgres that may be
// wiped (E2E_DATABASE_URL, by default the one `npm run test:e2e:db` starts in
// Docker). The app is built with E2E=1 (see next.config.ts) and served on
// port 3100; the database is emptied and migrated before each run
// (e2e/global-setup.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;
export const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgresql://e2e:e2e@localhost:5433/finely_e2e";
export const stripeWebhookSecret = "whsec_e2e_not_a_real_secret";
// Lets the tests start the scheduled jobs (e.g. demo.spec.ts)
export const cronSecret = "e2e-cron-secret-not-used-anywhere-else";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Every test signs up its own people and company, so tests can run side
  // by side without seeing each other's data
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Lets a machine with its own Chromium use it instead of downloading
        // Playwright's (`npx playwright install chromium`)
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: `npx next build && npx next start --port ${port}`,
    url: baseURL,
    // Building takes a while; locally, an already running copy is reused
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      E2E: "1",
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else",
      BETTER_AUTH_URL: baseURL,
      NEXT_TELEMETRY_DISABLED: "1",
      CRON_SECRET: cronSecret,
      // Paid plans are switched on, but with a pretend Stripe: the tests
      // never reach Stripe, they send the app signed messages as Stripe would
      // (see billing.spec.ts). The plans' team limits apply, as in production.
      STRIPE_SECRET_KEY: "sk_test_e2e_not_a_real_key",
      STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
      STRIPE_PRICE_STARTER_MONTHLY: "price_e2e_starter_monthly",
      STRIPE_PRICE_STARTER_YEARLY: "price_e2e_starter_yearly",
      STRIPE_PRICE_GROWTH_MONTHLY: "price_e2e_growth_monthly",
      STRIPE_PRICE_GROWTH_YEARLY: "price_e2e_growth_yearly",
    },
  },
});
