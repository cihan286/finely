// ─────────────────────────────────────────────────────────────────────────────
// What happens when a form on the Settings page is submitted
//
// In plain words: changes the company's timezone, adds or removes one of its
// bank accounts, adds, changes or deletes a category or a category rule,
// links, syncs or unlinks a bank, hands the company over to another member
// or deletes it, or saves which emails the person wants, then reloads the page so it's up to date. If something's wrong, we send
// back a message to show instead.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { formField, type ActionState } from "@/lib/action-state";
import { createAccount, deleteAccount } from "@/lib/data/accounts";
import {
  connectBank,
  createBankLinkToken,
  disconnectBank,
  syncBankConnection,
  type SyncResult,
} from "@/lib/data/bank";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/data/categories";
import {
  applyCategoryRule,
  createCategoryRule,
  deleteCategoryRule,
  updateCategoryRule,
} from "@/lib/data/category-rules";
import { errorMessage } from "@/lib/data/common";
import { deleteCompany, transferOwnership } from "@/lib/data/company";
import { updateEmailPreferences } from "@/lib/data/email-notifications";
import { updateTimeZone } from "@/lib/data/settings";
import type {
  AccountType,
  CategoryIconKey,
  CategoryKind,
} from "@/types/finance";

/**
 * Adds a bank account, or removes one that has no transactions (when the form
 * says intent=remove). Owners and admins only.
 */
export async function submitAccount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = formField(formData, "name").trim();
  const removing = formField(formData, "intent") === "remove";
  try {
    if (removing) {
      await deleteAccount(formField(formData, "id"));
    } else {
      await createAccount({
        name,
        type: formField(formData, "type") as AccountType,
        last4: formField(formData, "last4"),
        // An empty box means the account starts at zero
        openingBalance: Number(formField(formData, "openingBalance") || 0),
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
  const timeZone = formField(formData, "timezone");
  try {
    await updateTimeZone(timeZone);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return { error: null, success: `The company's timezone is now ${timeZone}.` };
}

/**
 * Adds a category, changes one (intent=update) or deletes one
 * (intent=delete). Owners and admins only.
 */
export async function submitCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const intent = formField(formData, "intent");
  const id = formField(formData, "id");
  const name = formField(formData, "name").trim();
  const budget = formField(formData, "budget").trim();
  const input = {
    name,
    kind: formField(formData, "kind") as CategoryKind,
    color: formField(formData, "color"),
    iconKey: formField(formData, "iconKey") as CategoryIconKey,
    // An empty box means no budget
    budget: budget === "" ? null : Number(budget),
  };
  try {
    if (intent === "delete") await deleteCategory(id);
    else if (intent === "update") await updateCategory(id, input);
    else await createCategory(input);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  const done = { delete: "deleted", update: "saved" }[intent] ?? "added";
  return { error: null, success: `${name} was ${done}.` };
}

/**
 * Adds a category rule, changes one (intent=update) or deletes one
 * (intent=delete). Owners and admins only.
 */
export async function submitCategoryRule(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const intent = formField(formData, "intent");
  const id = formField(formData, "id");
  const matchText = formField(formData, "matchText").trim();
  const input = { matchText, categoryId: formField(formData, "categoryId") };
  // A new or changed rule also catches up on transactions without a category
  let categorized = 0;
  try {
    if (intent === "delete") {
      await deleteCategoryRule(id);
    } else if (intent === "update") {
      await updateCategoryRule(id, input);
      categorized = await applyCategoryRule(id);
    } else {
      categorized = await applyCategoryRule(await createCategoryRule(input));
    }
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  const done = { delete: "deleted", update: "saved" }[intent] ?? "added";
  const caughtUp =
    categorized === 0
      ? ""
      : ` It categorized ${categorized} ${categorized === 1 ? "transaction" : "transactions"} that had no category.`;
  return {
    error: null,
    success: `The rule for “${matchText}” was ${done}.${caughtUp}`,
  };
}

/**
 * Makes another member the owner; the current owner becomes an admin. The
 * owner's section then disappears for them, so the page is opened again
 * with a message instead (?handedOver=1).
 */
export async function submitOwnershipTransfer(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await transferOwnership(formField(formData, "memberId"));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect() works by throwing
  redirect("/dashboard/settings?handedOver=1");
}

/**
 * Deletes the company for everyone (owner only, after typing its name),
 * then continues to another company the person belongs to, or to setting
 * one up.
 */
export async function submitCompanyDeletion(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await deleteCompany(formField(formData, "confirmation"));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect() works by throwing
  redirect("/onboarding");
}

/** Saves which emails the signed-in person gets about this company. */
export async function submitEmailPreferences(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    // A tick box is only sent when it's ticked
    await updateEmailPreferences({
      weeklyDigest: formData.has("weeklyDigest"),
      unusualCharges: formData.has("unusualCharges"),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return { error: null, success: "Your email preferences were saved." };
}

// "3 transactions added, 1 updated" / "Nothing new"
function syncSummary(result: SyncResult): string {
  const parts = [
    result.newAccounts > 0 &&
      `${result.newAccounts} ${result.newAccounts === 1 ? "account" : "accounts"} added`,
    result.added > 0 &&
      `${result.added} ${result.added === 1 ? "transaction" : "transactions"} added`,
    result.updated > 0 && `${result.updated} updated`,
    result.removed > 0 && `${result.removed} removed`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "nothing new";
}

/**
 * Starts linking a bank: the one-time token for the "log in at your bank"
 * window (owners and admins only).
 */
export async function createBankLink(): Promise<
  { token: string; error: null } | { token: null; error: string }
> {
  try {
    return { token: await createBankLinkToken(), error: null };
  } catch (error) {
    return { token: null, error: errorMessage(error) };
  }
}

/** Finishes linking a bank and brings in its accounts and transactions. */
export async function completeBankLink(
  publicToken: string,
  institutionName: string,
): Promise<ActionState> {
  let result;
  try {
    result = await connectBank(publicToken, institutionName);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return {
    error: null,
    success:
      result.newAccounts === 0
        ? `${result.institutionName} is connected, but it has no everyday or savings account in US dollars that Finely can keep.`
        : `${result.institutionName} is connected: ${syncSummary(result)}. Transactions can take a few minutes to arrive the first time; press “Sync now” to check.`,
  };
}

/** Brings one linked bank up to date now. */
export async function syncBank(id: string): Promise<ActionState> {
  let result;
  try {
    result = await syncBankConnection(id);
  } catch (error) {
    // The reason is also kept on the connection: show it there too
    refresh();
    return { error: errorMessage(error) };
  }
  refresh();
  return { error: null, success: `Synced: ${syncSummary(result)}.` };
}

/** Stops syncing a bank; its accounts and transactions stay. */
export async function removeBankConnection(id: string): Promise<ActionState> {
  try {
    await disconnectBank(id);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  refresh();
  return {
    error: null,
    success: "The bank was disconnected. Its accounts and transactions are still here.",
  };
}
