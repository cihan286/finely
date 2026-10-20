// ─────────────────────────────────────────────────────────────────────────────
// What happens when a form on the Bills page is submitted
//
// In plain words: adds, changes or deletes a bill, marks one as paid (which
// records the payment as a transaction, or uses one that's already there),
// or undoes a payment, then returns to the list. If something's wrong, we
// send back a message to show instead.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { redirect } from "next/navigation";
import { formField, type ActionState } from "@/lib/action-state";
import {
  createBill,
  deleteBill,
  payBill,
  undoBillPayment,
  updateBill,
} from "@/lib/data/bills";
import { errorMessage } from "@/lib/data/common";
import type { BillRepeat } from "@/types/finance";

const LIST_PATH = "/dashboard/bills";

/**
 * Saves a new or changed bill, or deletes one (when the Delete button was
 * pressed), then returns to the list.
 */
export async function submitBill(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formField(formData, "id");
  try {
    if (formField(formData, "intent") === "delete") {
      await deleteBill(id);
    } else {
      const input = {
        name: formField(formData, "name"),
        amount: Number(formField(formData, "amount")),
        dueDate: formField(formData, "dueDate"),
        repeat: formField(formData, "repeat") as BillRepeat,
        categoryId: formField(formData, "categoryId") || null,
        notes: formField(formData, "notes"),
      };
      if (id) await updateBill(id, input);
      else await createBill(input);
    }
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // Outside the try: redirect() works by throwing
  redirect(LIST_PATH);
}

/**
 * Marks a bill as paid — from the chosen account, or with the chosen
 * transaction that's already there — then shows the list with a message
 * (and the next due date, for a bill that repeats).
 */
export async function submitBillPayment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // "" = record a new payment
  const transactionId = formField(formData, "transactionId");
  let result;
  try {
    result = await payBill(
      formField(formData, "id"),
      transactionId
        ? { transactionId }
        : {
            accountId: formField(formData, "accountId"),
            date: formField(formData, "date"),
          },
    );
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  redirect(
    `${LIST_PATH}?paid=${transactionId ? "linked" : "1"}${result.nextDueDate ? `&next=${result.nextDueDate}` : ""}`,
  );
}

/** Undoes a bill's payment, then shows the list with a message. */
export async function submitUndoBillPayment(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await undoBillPayment(formField(formData, "id"));
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  redirect(`${LIST_PATH}?undone=1`);
}
