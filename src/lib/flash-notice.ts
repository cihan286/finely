// ─────────────────────────────────────────────────────────────────────────────
// A notice for the next page
//
// In plain words: some actions end on another page, like deleting a company,
// which goes on to the next company or to setting one up. This leaves the
// sentence to show ("Northpeak Studio was deleted.") for that page to pick
// up, once.
//
// For developers: server only (server actions). The sentence is kept in a
// short-lived cookie the browser can read; NoticeProvider
// (components/common/notice) shows it in the notification window and
// deletes it. Call it before redirect().
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { cookies } from "next/headers";
import { FLASH_COOKIE, type NoticeType } from "@/components/common/notice/flash";

export async function setFlashNotice(type: NoticeType, text: string) {
  const jar = await cookies();
  jar.set(FLASH_COOKIE, JSON.stringify({ type, text }), {
    path: "/",
    // Long enough to survive a redirect or two, not to show up days later
    maxAge: 60,
    sameSite: "lax",
  });
}
