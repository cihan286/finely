// ─────────────────────────────────────────────────────────────────────────────
// Authentication helpers for the browser
//
// In plain words: the login and sign-up forms run in the visitor's browser.
// This file gives them simple functions like "sign in", "sign up" and
// "sign out", which send the request to our server, plus the business account
// functions (create a company, invite someone, accept an invitation…).
//
// For developers: only for client components ("use client"). Server code
// should use lib/session.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

// Browser-side auth API (sign in, sign up, sign out). Same origin as the app.
// organizationClient adds authClient.organization.* (must match lib/auth.ts).
export const authClient = createAuthClient({
  plugins: [organizationClient()],
});
