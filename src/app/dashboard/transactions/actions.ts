// ─────────────────────────────────────────────────────────────────────────────
// What happens when a transaction form is submitted
//
// In plain words: when someone presses Save (or Delete) in the transaction
// window, the browser sends the form here. We turn the form's fields into a
// transaction — "money out" amounts become negative — save it, and go back to
// the list. Importing a bank statement sends all of its lines here at once.
// If something's wrong, we send back a message to show instead.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { errorMessage } from "@/lib/data/common";
import {
  createTransaction,
  deleteTransaction,
  importTransactions,
  updateTransaction,
  type TransactionInput,
} from "@/lib/data/transactions";
import type { StatementRow } from "@/lib/statement-import";
import type { TransactionStatus } from "@/types/finance";

const LIST_PATH = "/dashboard/transactions";

// Where to go after saving: back to the list with the same filters. Only
// addresses on the transactions page are accepted, never another site.
function returnPath(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && /^\/dashboard\/transactions(\?|$)/.test(value)) {
    return value;
  }
  return LIST_PATH;
}

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

// Builds a transaction from the form's fields
function toTransactionInput(formData: FormData): TransactionInput {
  // The form asks for a positive amount plus "money in" or "money out"
  const amount = Math.abs(Number(field(formData, "amount")));
  const sign = field(formData, "direction") === "in" ? 1 : -1;

  return {
    accountId: field(formData, "accountId"),
    categoryId: field(formData, "categoryId") || null,
    name: field(formData, "name"),
    amount: sign * amount,
    // The form asks for a day; when editing, the current moment is sent too
    // so its time is kept if the day stays the same (see lib/data/)
    date: field(formData, "date"),
    originalDate: field(formData, "originalDate") || null,
    status: field(formData, "status") as TransactionStatus,
    notes: field(formData, "notes"),
  };
}

/**
 * Saves a new or changed transaction, or deletes one (when the Delete button
 * was pressed), then returns to the list.
 */
export async function submitTransaction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = field(formData, "id");
  try {
    if (field(formData, "intent") === "delete") {
      await deleteTransaction(id);
    } else if (id) {
      await updateTransaction(id, toTransactionInput(formData));
    } else {
      await createTransaction(toTransactionInput(formData));
    }
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect() works by throwing
  redirect(returnPath(formData.get("returnTo")));
}

/**
 * Imports a bank statement's lines into one account, then shows the list
 * with a message saying how many were added and skipped.
 */
export async function importStatement(
  accountId: string,
  rows: StatementRow[],
): Promise<ActionState> {
  let result;
  try {
    result = await importTransactions(accountId, rows);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect(`${LIST_PATH}?imported=${result.imported}&skipped=${result.skipped}`);
}
