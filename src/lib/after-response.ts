// ─────────────────────────────────────────────────────────────────────────────
// Doing something after the answer was sent
//
// In plain words: some work shouldn't make people wait — for example,
// checking whether a charge that was just saved is unusual, and emailing the
// team about it. This runs such work once the page has its answer.
//
// For developers: Next.js's `after` only works while a request is being
// handled. Outside of one (the automated tests, a script) the work runs
// right away instead, and the returned promise waits for it, so tests can
// check its result. The work must catch its own errors.
// ─────────────────────────────────────────────────────────────────────────────

import { after } from "next/server";

/** Runs `task` after the current response, or right away outside a request. */
export async function afterResponse(task: () => Promise<void>): Promise<void> {
  try {
    after(task);
  } catch {
    await task();
  }
}
