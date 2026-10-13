// ─────────────────────────────────────────────────────────────────────────────
// Slowing down repeated requests
//
// In plain words: some things anyone on the internet can do, like sending us
// a message through the contact form. To stop one visitor (or a program)
// from doing it hundreds of times, we count how often each one did it
// recently and refuse once it's too much.
//
// For developers: server-only. A fixed window per key, counted in the
// `rate_limit` table that Better Auth also uses for logins (the server runs
// as many short-lived copies, so counting in memory wouldn't work). Keys
// here start with "finely:" so they can't collide with Better Auth's. If the
// database can't be reached, the request is let through: a broken counter
// mustn't break the form.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { rateLimit } from "@/db/schema";

/** The visitor's IP address, as the hosting platform reports it */
export async function clientIp(): Promise<string> {
  const list = await headers();
  // Vercel puts the real address first in x-forwarded-for
  return (
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Counts one more request for `key` and says whether it's still within
 * `max` requests per `windowSeconds`.
 */
export async function withinRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  now = Date.now(),
): Promise<boolean> {
  const windowStart = now - windowSeconds * 1000;
  try {
    // One statement, so two requests at the same moment can't both slip
    // through: a new window starts at 1, a running one counts up
    const [row] = await db
      .insert(rateLimit)
      .values({ id: crypto.randomUUID(), key: `finely:${key}`, count: 1, lastRequest: now })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: {
          count: sql`case when ${rateLimit.lastRequest} < ${windowStart} then 1 else ${rateLimit.count} + 1 end`,
          // The window's start: only moved when a new window begins
          lastRequest: sql`case when ${rateLimit.lastRequest} < ${windowStart} then ${now} else ${rateLimit.lastRequest} end`,
        },
      })
      .returning({ count: rateLimit.count });
    return row.count <= max;
  } catch (error) {
    console.error("[rate-limit] Could not count a request:", error);
    return true;
  }
}
