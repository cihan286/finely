// ─────────────────────────────────────────────────────────────────────────────
// Browser start-up: error monitoring
//
// In plain words: runs in the visitor's browser before the page becomes
// interactive. It switches on Sentry so errors on people's screens (a button
// that crashes, a chart that fails to draw) are reported to us.
//
// For developers: a Next.js file convention. onRouterTransitionStart lets
// Sentry time navigations between pages. Settings live in lib/monitoring.ts.
// ─────────────────────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring";

Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
