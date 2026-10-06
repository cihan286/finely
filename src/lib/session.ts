// ─────────────────────────────────────────────────────────────────────────────
// "Who is logged in?" helpers (server side)
//
// In plain words: before showing private pages like the dashboard, the server
// asks "is someone logged in, and who?". These two helpers answer that
// question, and send visitors who aren't logged in to the login page.
//
// For developers: this is the app's auth gate. Call requireUser() in every
// protected page and before reading user data. Don't rely on proxy.ts (it only
// checks that a cookie exists) or on layouts (they don't re-run when you
// navigate between pages).
// ─────────────────────────────────────────────────────────────────────────────

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Data access layer for auth. Every protected page and data fetch should go
// through these instead of trusting the proxy's cookie check alone.

/**
 * The current session, or null. Cached for the duration of one request:
 * if several parts of one page ask, the database is only checked once.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** The signed-in user; redirects to /login when there is none. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
