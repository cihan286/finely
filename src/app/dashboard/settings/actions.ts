// ─────────────────────────────────────────────────────────────────────────────
// What happens when a bank account form on the Settings page is submitted
//
// In plain words: adds or removes one of the company's bank accounts, then
// reloads the page so the list is up to date. If something's wrong, we send
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
