// ─────────────────────────────────────────────────────────────────────────────
// What happens when someone picks a language
//
// In plain words: remembers the language in the browser (a cookie, for a
// year), and for someone who is logged in also on their account, so the
// emails Finely sends them later are in that language too.
//
// For developers: a server action ("use server"); the switcher calls
// router.refresh() afterwards, so the page is drawn again in the new
// language.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isLocale, LOCALE_COOKIE } from "./config";

export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const session = await getSession();
  if (session) {
    await db.update(user).set({ locale }).where(eq(user.id, session.user.id));
  }
}
