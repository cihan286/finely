// ─────────────────────────────────────────────────────────────────────────────
// Next.js settings
//
// In plain words: Next.js is the framework Finely is built with — it turns our
// code into the website. This file holds its project-wide settings.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
  // The React Compiler automatically optimizes components so pages re-draw
  // only what actually changed. It makes the app faster without extra code.
  reactCompiler: true,
};

// Error monitoring (see lib/monitoring.ts). When building with
// SENTRY_AUTH_TOKEN set (on Vercel), this uploads "source maps" to Sentry, so
// its error reports point at our real code instead of the compressed version
// browsers get. Without the token, the upload is simply skipped.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only show upload logs in CI and on Vercel
  silent: !process.env.CI,
  // Upload maps for all browser code, including Next.js's own, for clearer
  // stack traces
  widenClientFileUpload: true,
  telemetry: false,
});
