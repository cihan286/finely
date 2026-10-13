// ─────────────────────────────────────────────────────────────────────────────
// What happens when a form on the Cards page is submitted
//
// In plain words: adds, changes, archives, restores or deletes a payment
// card, then returns to the list. If something's wrong, we send back a
// message to show instead.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { redirect } from "next/navigation";
import { formField, type ActionState } from "@/lib/action-state";
import {
  createCard,
  deleteCard,
  setCardArchived,
  updateCard,
} from "@/lib/data/cards";
import { errorMessage } from "@/lib/data/common";

const LIST_PATH = "/dashboard/cards";

/**
 * Saves a new or changed card, or archives, restores or deletes one (when
 * the button pressed says so), then returns to the list.
 */
export async function submitCard(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formField(formData, "id");
  const intent = formField(formData, "intent");
  try {
    if (intent === "delete") {
      await deleteCard(id);
    } else if (intent === "archive" || intent === "restore") {
      await setCardArchived(id, intent === "archive");
    } else {
      const limit = formField(formData, "monthlyLimit").trim();
      const input = {
        name: formField(formData, "name"),
        last4: formField(formData, "last4").trim(),
        holderId: formField(formData, "holderId") || null,
        // An empty box means no limit
        monthlyLimit: limit === "" ? null : Number(limit),
      };
      if (id) await updateCard(id, input);
      else await createCard(input);
    }
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect() works by throwing
  redirect(LIST_PATH);
}
