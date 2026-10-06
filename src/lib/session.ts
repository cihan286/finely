// ─────────────────────────────────────────────────────────────────────────────
// "Who is logged in?" helpers (server side)
//
// In plain words: before showing private pages like the dashboard, the server
// asks "is someone logged in, who are they, and which company are they working
// in?". These helpers answer that, send visitors who aren't logged in to the
// login page, and send people without a company to set one up.
//
// For developers: this is the app's auth gate. Call requireUser() in every
// protected page and before reading user data (requireOrganization() for
// anything that belongs to a company). Don't rely on proxy.ts (it only
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

/**
 * The company the current login is working in, with its members and pending
 * invitations, or null. Cached for the duration of one request.
 */
export const getActiveOrganization = cache(async () => {
  const session = await getSession();
  if (!session?.session.activeOrganizationId) return null;
  try {
    return await auth.api.getFullOrganization({ headers: await headers() });
  } catch {
    // E.g. the user was removed from that company since logging in
    return null;
  }
});

/**
 * The signed-in user, their active company and their role in it. Redirects to
 * /login without a session, and to /onboarding without a company.
 */
export async function requireOrganization() {
  const user = await requireUser();
  const organization = await getActiveOrganization();
  const membership = organization?.members.find((m) => m.userId === user.id);
  if (!organization || !membership) redirect("/onboarding");
  return { user, organization, role: membership.role };
}
