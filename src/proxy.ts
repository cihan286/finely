// ─────────────────────────────────────────────────────────────────────────────
// Runs before every page
//
// In plain words: two jobs. First, it gives every page its safety rules (the
// Content Security Policy, lib/csp.ts) with a fresh one-time code, so only
// Finely's own scripts can run on it. Second, it guards the dashboard: if
// the visitor's browser has no login cookie (a small "you're logged in" note
// the browser keeps), they're sent straight to the login page.
//
// For developers: the login check is an optimistic, fast first check only —
// it doesn't confirm the session is valid. The real check is requireUser()
// in lib/session.ts. Next.js reads the nonce from the request's
// Content-Security-Policy header and puts it on its own scripts, which is
// why pages are rendered per request (see app/layout.tsx).
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { contentSecurityPolicy } from "@/lib/csp";

// Pages only for logged-in people: the dashboard and the company setup page
const needsLogin = (path: string) =>
  path === "/onboarding" || path === "/dashboard" || path.startsWith("/dashboard/");

// Attached files are served with their own, stricter policy
// (dashboard/transactions/attachments/[id]/route.ts)
const hasOwnPolicy = (path: string) => path.startsWith("/dashboard/transactions/attachments/");

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Optimistic check: only looks for the session cookie, without hitting the
  // database. Pages still verify the session itself (see lib/session.ts).
  if (needsLogin(path) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasOwnPolicy(path)) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  // On the request, so Next.js finds the nonce while rendering; on the
  // response, so the browser enforces it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

// Which addresses this runs for: every page, but not the API, Next.js's own
// files, the icons, or link prefetches (they get the policy when opened)
export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
