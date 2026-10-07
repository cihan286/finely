// ─────────────────────────────────────────────────────────────────────────────
// Server start-up: error monitoring
//
// In plain words: runs once when the server starts. It switches on Sentry so
// errors on the server (a page that fails to load, a save that crashes) are
// reported to us.
//
// For developers: Next.js calls register() on start-up and onRequestError()
// for every uncaught error in pages, server actions, route handlers and the
// proxy. Expected problems (DataError, redirects) never reach it. Settings
// live in lib/monitoring.ts.
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring";

export function register() {
  Sentry.init(sentryOptions);
}

export const onRequestError = Sentry.captureRequestError;
