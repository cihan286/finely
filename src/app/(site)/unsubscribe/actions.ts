// ─────────────────────────────────────────────────────────────────────────────
// What happens when the button on the Unsubscribe page is pressed
//
// In plain words: stops the kind of email the link was about, then shows the
// page again with a confirmation.
//
// For developers: a server action ("use server"); anyone can call it with a
// POST request, and nobody is logged in. The link's signature is checked
// again here (lib/email/unsubscribe.ts): it's the only proof there is.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { redirect } from "next/navigation";
import { formField } from "@/lib/action-state";
import { unsubscribe } from "@/lib/data/email-notifications";
import { readUnsubscribeLink } from "@/lib/email/unsubscribe";

export async function confirmUnsubscribe(formData: FormData) {
  const query = {
    u: formField(formData, "u"),
    o: formField(formData, "o"),
    k: formField(formData, "k"),
    t: formField(formData, "t"),
  };
  const target = readUnsubscribeLink(query);
  // A link that isn't valid: the page says so
  if (target) await unsubscribe(target);
  redirect(`/unsubscribe?${new URLSearchParams({ ...query, done: "1" })}`);
}
