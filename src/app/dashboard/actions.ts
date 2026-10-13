// ─────────────────────────────────────────────────────────────────────────────
// What happens when something in the dashboard's frame is pressed
//
// In plain words: "Mark all as read" in the notifications panel saves the
// moment it was pressed, so those notifications stay read on every device.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { markNotificationsRead } from "@/lib/data/notifications";

/** Marks the signed-in person's notifications in this company as read. */
export async function markAllNotificationsRead(): Promise<void> {
  await markNotificationsRead();
}
