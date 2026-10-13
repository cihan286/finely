// ─────────────────────────────────────────────────────────────────────────────
// What happens when a button in the Insights page's "Regular payments" is
// pressed
//
// In plain words: hides a payment Finely took for a regular one but isn't
// ("Not regular"), or brings a hidden one back ("Show again"), then reloads
// the page so it's up to date.
//
// For developers: server actions ("use server") used as plain form actions;
// anyone can call these with a POST request, so the checks happen in
// lib/data/recurring.ts, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { refresh } from "next/cache";
import { formField } from "@/lib/action-state";
import { DataError } from "@/lib/data/common";
import { hideRecurring, showRecurring } from "@/lib/data/recurring";

/** Hides one regular payment, or shows it again (when the form says so). */
export async function submitRecurringVisibility(formData: FormData) {
  const key = formField(formData, "key");
  try {
    if (formField(formData, "intent") === "show") await showRecurring(key);
    else await hideRecurring(key, formField(formData, "name"));
  } catch (error) {
    // Something made up by hand: nothing to show, the page just reloads
    if (!(error instanceof DataError)) throw error;
  }
  refresh();
}
