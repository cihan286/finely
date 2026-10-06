// ─────────────────────────────────────────────────────────────────────────────
// Gatekeeper for the dashboard
//
// In plain words: this runs before any dashboard page loads. If the visitor's
// browser has no login cookie (a small "you're logged in" note the browser
// keeps), they're sent straight to the login page.
//
// For developers: an optimistic, fast first check only — it doesn't confirm
// the session is valid. The real check is requireUser() in lib/session.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic check: only looks for the session cookie, without hitting the
// database. Pages still verify the session itself (see lib/session.ts).
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Cookie found: let the request continue to the page
  return NextResponse.next();
}

// Which addresses this check applies to: /dashboard and everything under it,
// and the company setup page
export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
};
