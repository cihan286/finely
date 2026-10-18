// ─────────────────────────────────────────────────────────────────────────────
// Next.js settings
//
// In plain words: Next.js is the framework Finely is built with — it turns our
// code into the website. This file holds its project-wide settings.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// End-to-end tests (e2e/) build the app with E2E=1: it then talks to a local
// Postgres instead of Neon (src/db/e2e.ts), and the build goes to its own
// folder so it never mixes with a normal build.
const isE2E = process.env.E2E === "1";

const nextConfig: NextConfig = {
  ...(isE2E && {
    distDir: ".next-e2e",
    turbopack: { resolveAlias: { "@/db": "./src/db/e2e.ts" } },
  }),
  /* config options here */
  // The React Compiler automatically optimizes components so pages re-draw
  // only what actually changed. It makes the app faster without extra code.
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Attached receipts are sent through a server action. Files can be
      // 4 MB (lib/finance/attachments.ts), plus room for the form around
      // them; Vercel itself refuses requests over 4.5 MB.
      bodySizeLimit: "4500kb",
    },
  },
  // Safety instructions every page sends the browser. The Content Security
  // Policy isn't here: it needs a new one-time code per page, so proxy.ts
  // adds it (lib/csp.ts).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No other site may show Finely inside a frame, where it could
          // trick someone into clicking buttons they can't see
          { key: "X-Frame-Options", value: "DENY" },
          // Only ever over HTTPS, for two years (browsers ignore this on
          // plain http://localhost)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Other sites learn only that a visitor came from Finely, never
          // which page (addresses can name a transaction or a search)
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Files are only ever treated as what they say they are
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Finely never needs the camera, microphone or location
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
