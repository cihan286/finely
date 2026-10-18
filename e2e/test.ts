// ─────────────────────────────────────────────────────────────────────────────
// The `test` every end-to-end test file uses
//
// In plain words: the app limits how many logins and sign-ups one internet
// address may try in a row (lib/auth.ts). All tests run from the same
// machine, so each test pretends to come from its own address; otherwise
// they'd soon be refused with "Too many requests".
//
// For developers: Playwright's own test with a per-test X-Forwarded-For
// header, which Better Auth reads for the address (as it does on Vercel).
// ─────────────────────────────────────────────────────────────────────────────

import { test as base } from "@playwright/test";

export { expect } from "@playwright/test";

let counter = 0;

export const test = base.extend({
  // (`provide` is what Playwright calls `use`; that name would look like a
  // React hook to the code checker)
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide, testInfo) => {
    counter += 1;
    const address = `10.${testInfo.workerIndex % 256}.${Math.floor(counter / 256) % 256}.${counter % 256}`;
    await provide({ ...extraHTTPHeaders, "x-forwarded-for": address });
  },
});
