// ─────────────────────────────────────────────────────────────────────────────
// Authentication helpers for the browser
//
// In plain words: the login and sign-up forms run in the visitor's browser.
// This file gives them simple functions like "sign in", "sign up" and
// "sign out", which send the request to our server.
//
// For developers: only for client components ("use client"). Server code
// should use lib/session.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { createAuthClient } from "better-auth/react";

// Browser-side auth API (sign in, sign up, sign out). Same origin as the app.
export const authClient = createAuthClient();
