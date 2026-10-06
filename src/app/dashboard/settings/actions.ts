// ─────────────────────────────────────────────────────────────────────────────
// What happens when a form on the Settings page is submitted
//
// In plain words: changes the company's timezone, or adds or removes one of
// its bank accounts, then reloads the page so it's up to date. If something's wrong, we send
// back a message to show instead.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { createAccount, deleteAccount } from "@/lib/data/accounts";
import { errorMessage } from "@/lib/data/common";
import { updateTimeZone } from "@/lib/data/settings";
import type { AccountType } from "@/types/finance";

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/**
 * Adds a bank account, or removes one that has no transactions (when the form
 * says intent=remove). Owners and admins only.
 */
export async function submitAccount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = field(formData, "name").trim();
  const removing = field(formData, "intent") === "remove";
  try {
    if (removing) {
      await deleteAccount(field(formData, "id"));
    } else {
      await createAccount({
        name,
        type: field(formData, "type") as AccountType,
        last4: field(formData, "last4"),
        // An empty box means the account starts at zero
        openingBalance: Number(field(formData, "openingBalance") || 0),
      });
    }
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return { error: null, success: `${name} was ${removing ? "removed" : "added"}.` };
}

/** Changes the company's timezone (owners and admins only). */
export async function submitCompanySettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const timeZone = field(formData, "timezone");
  try {
    await updateTimeZone(timeZone);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return { error: null, success: `The company's timezone is now ${timeZone}.` };
}
