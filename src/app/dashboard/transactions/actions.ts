// ─────────────────────────────────────────────────────────────────────────────
// What happens when a transaction form is submitted
//
// In plain words: when someone presses Save (or Delete) in the transaction
// window, the browser sends the form here. We turn the form's fields into a
// transaction — "money out" amounts become negative — save it, and go back to
// the list. Importing a bank statement sends all of its lines here at once,
// and ticking several transactions and choosing a category sends those here.
// If something's wrong, we send back a message to show instead.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { formField, type ActionState } from "@/lib/action-state";
import { addAttachment, deleteAttachment } from "@/lib/data/attachments";
import { saveCategoryRule } from "@/lib/data/category-rules";
import { errorMessage } from "@/lib/data/common";
import {
  ATTACHMENT_TYPES,
  detectAttachmentType,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/finance/attachments";
import {
  createTransaction,
  deleteTransaction,
  importTransactions,
  setTransactionsCategory,
  updateTransaction,
  type TransactionInput,
} from "@/lib/data/transactions";
import type { StatementRow } from "@/lib/finance/statement-import";
import type { Attachment, TransactionStatus } from "@/types/finance";

const LIST_PATH = "/dashboard/transactions";

// Where to go after saving: back to the list with the same filters. Only
// addresses on the transactions page are accepted, never another site.
function returnPath(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && /^\/dashboard\/transactions(\?|$)/.test(value)) {
    return value;
  }
  return LIST_PATH;
}

// Builds a transaction from the form's fields
function toTransactionInput(formData: FormData): TransactionInput {
  // The form asks for a positive amount plus "money in" or "money out"
  const amount = Math.abs(Number(formField(formData, "amount")));
  const sign = formField(formData, "direction") === "in" ? 1 : -1;

  return {
    accountId: formField(formData, "accountId"),
    categoryId: formField(formData, "categoryId") || null,
    name: formField(formData, "name"),
    amount: sign * amount,
    // The form asks for a day; when editing, the current moment is sent too
    // so its time is kept if the day stays the same (see lib/data/)
    date: formField(formData, "date"),
    originalDate: formField(formData, "originalDate") || null,
    status: formField(formData, "status") as TransactionStatus,
    notes: formField(formData, "notes"),
    cardId: formField(formData, "cardId") || null,
  };
}

/**
 * Saves a new or changed transaction, or deletes one (when the Delete button
 * was pressed), then returns to the list. With "always use this category"
 * ticked, also saves that as a category rule and applies it to the
 * transactions that have no category yet.
 */
export async function submitTransaction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formField(formData, "id");
  // How many other transactions the new rule categorized, if one was made
  let categorized: number | null = null;
  // A receipt chosen while adding a transaction
  const chosen = formData.get("receipt");
  const receipt =
    !id && chosen instanceof File && chosen.size > 0
      ? { name: chosen.name, bytes: new Uint8Array(await chosen.arrayBuffer()) }
      : null;
  // Checked before anything is saved: if the file were refused afterwards,
  // sending the form again would add the transaction twice
  if (receipt) {
    if (receipt.bytes.length > MAX_ATTACHMENT_BYTES) {
      return {
        error: `A file can be at most ${formatFileSize(MAX_ATTACHMENT_BYTES)}. This one is ${formatFileSize(receipt.bytes.length)}.`,
      };
    }
    if (!detectAttachmentType(receipt.bytes)) {
      return {
        error: `Only ${Object.values(ATTACHMENT_TYPES).join(", ")} files can be attached.`,
      };
    }
  }
  // Set when the transaction was saved but its file wasn't
  let withoutFile: string | null = null;
  try {
    if (formField(formData, "intent") === "delete") {
      await deleteTransaction(id);
    } else {
      const input = toTransactionInput(formData);
      if (formField(formData, "remember")) {
        if (!input.categoryId) {
          return { error: "Choose a category to always use for these descriptions." };
        }
        // Before the transaction: if the rule is refused, nothing was saved
        // yet, so sending the form again can't add the transaction twice
        const rule = await saveCategoryRule({
          // An empty box means the whole description
          matchText: formField(formData, "ruleText").trim() || input.name,
          categoryId: input.categoryId,
        });
        categorized = rule.categorized;
      }
      if (id) {
        await updateTransaction(id, input);
      } else {
        const newId = await createTransaction(input);
        if (receipt) {
          try {
            await addAttachment(newId, receipt);
          } catch {
            withoutFile = newId;
          }
        }
      }
    }
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // The transaction is there; open it so the file can be added again
  if (withoutFile) redirect(`${LIST_PATH}?edit=${withoutFile}`);
  // Outside the try: redirect() works by throwing
  const path = returnPath(formData.get("returnTo"));
  redirect(
    categorized === null
      ? path
      : `${path}${path.includes("?") ? "&" : "?"}categorized=${categorized}`,
  );
}

/**
 * Gives the ticked transactions one category ("none" = uncategorized), then
 * reloads the list.
 */
export async function categorizeSelected(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ids = formData
    .getAll("ids")
    .filter((id): id is string => typeof id === "string");
  const category = formField(formData, "bulkCategory");
  if (!category) return { error: "Choose a category." };
  let changed;
  try {
    changed = await setTransactionsCategory(ids, category === "none" ? null : category);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return {
    error: null,
    success: `${changed} ${changed === 1 ? "transaction was" : "transactions were"} updated.`,
  };
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
  redirect(
    `${LIST_PATH}?imported=${result.imported}&skipped=${result.skipped}${result.billsPaid > 0 ? `&bills=${result.billsPaid}` : ""}${result.billsMerged > 0 ? `&merged=${result.billsMerged}` : ""}`,
  );
}

/** What the attachment actions answer: an error, or the transaction's files */
export interface AttachmentResult {
  error: string | null;
  attachments?: Attachment[];
}

/**
 * Attaches a file (the form's "file") to a transaction and answers with the
 * transaction's files.
 */
export async function uploadAttachment(
  transactionId: string,
  formData: FormData,
): Promise<AttachmentResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to attach." };
  let attachments;
  try {
    attachments = await addAttachment(transactionId, {
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // The list behind the window shows which transactions have files
  refresh();
  return { error: null, attachments };
}

/** Deletes an attached file and answers with what's left on its transaction. */
export async function removeAttachment(id: string): Promise<AttachmentResult> {
  let attachments;
  try {
    attachments = await deleteAttachment(id);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return { error: null, attachments };
}
