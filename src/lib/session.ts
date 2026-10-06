import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Data access layer for auth. Every protected page and data fetch should go
// through these instead of trusting the proxy's cookie check alone.

/** The current session, or null. Cached for the duration of one request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** The signed-in user; redirects to /login when there is none. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
