// ─────────────────────────────────────────────────────────────────────────────
// Error monitoring settings (Sentry)
//
// In plain words: when something breaks for a user — on their screen or on
// our server — Sentry records the error so we hear about it and can fix it,
// instead of waiting for someone to complain. These are the settings both
// sides share. Without NEXT_PUBLIC_SENTRY_DSN (e.g. on your own computer),
// nothing is sent anywhere.
//
// For developers: used by src/instrumentation.ts (server) and
// src/instrumentation-client.ts (browser). Finely holds financial data and
// Sentry collects a lot by default, so `dataCollection` switches off
// everything that could carry personal or financial details: IP addresses,
// cookies (login sessions), headers, form contents (passwords, amounts),
// query strings (the password reset link's token, search terms), database
// values and variables inside the code. We don't use Session Replay either,
// which would record the screens people see. Error messages and stack traces
// are still sent: don't put customer data in error messages.
// ─────────────────────────────────────────────────────────────────────────────

import type { BrowserOptions } from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // "production" or "preview" on Vercel, "development" on your computer
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Share of page loads and requests whose timing is recorded (10% in
  // production keeps us within Sentry's free plan)
  tracesSampleRate: isProduction ? 0.1 : 1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
} satisfies BrowserOptions;
