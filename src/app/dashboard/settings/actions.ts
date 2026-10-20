// ─────────────────────────────────────────────────────────────────────────────
// What happens when a form on the Settings page is submitted
//
// In plain words: changes the company's timezone, adds or removes one of its
// bank accounts, adds, changes or deletes a category or a category rule,
// links, syncs or unlinks a bank, hands the company over to another member
// or deletes it, saves which emails the person wants, or deletes the
// person's own account, then reloads the page so it's up to date. If
// something's wrong, we send back a message to show instead.
//
// For developers: server actions ("use server"); anyone can call these with a
// POST request, so all checks happen in lib/data/, never only in the form.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { fill, plural } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/server";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formField, type ActionState } from "@/lib/action-state";
import { setFlashNotice } from "@/lib/flash-notice";
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
import { openBillingPortal, startCheckout } from "@/lib/data/billing";
import { errorMessage } from "@/lib/data/common";
import { deleteCompany, transferOwnership } from "@/lib/data/company";
import { updateEmailPreferences } from "@/lib/data/email-notifications";
import { deleteOwnAccount } from "@/lib/data/person";
import {
  updateCurrency,
  updateOverallBudget,
  updateTimeZone,
} from "@/lib/data/settings";
import type { BillingInterval, PaidPlan } from "@/lib/finance/plans";
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
    return { error: await errorMessage(error) };
  }
  refresh();
  const t = (await getMessages()).settings.accounts;
  return { error: null, success: fill(removing ? t.removed : t.added, { name }) };
}

/**
 * Changes the company's timezone, or its currency or overall monthly budget
 * when the form sends one (owners and admins only).
 */
export async function submitCompanySettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currency = formField(formData, "currency");
  const timeZone = formField(formData, "timezone");
  // The budget form sends its box even when it's empty (= no budget)
  if (formData.has("overallBudget")) {
    const typed = formField(formData, "overallBudget").trim();
    try {
      await updateOverallBudget(typed === "" ? null : Number(typed));
    } catch (error) {
      return { error: await errorMessage(error) };
    }
    refresh();
    const t = (await getMessages()).settings.company;
    return { error: null, success: typed === "" ? t.budgetRemoved : t.budgetSaved };
  }
  try {
    if (currency) await updateCurrency(currency);
    else await updateTimeZone(timeZone);
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  refresh();
  const t = (await getMessages()).settings.company;
  return {
    error: null,
    success: currency
      ? fill(t.currencySaved, { currency })
      : fill(t.timezoneSaved, { zone: timeZone.replaceAll("_", " ") }),
  };
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
    return { error: await errorMessage(error) };
  }
  refresh();
  const t = (await getMessages()).settings.categories;
  const done = { delete: t.deleted, update: t.saved }[intent] ?? t.added;
  return { error: null, success: fill(done, { name }) };
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
    return { error: await errorMessage(error) };
  }
  refresh();
  const t = (await getMessages()).settings.rules;
  const done = { delete: t.deleted, update: t.saved }[intent] ?? t.added;
  const caughtUp = categorized === 0 ? "" : ` ${plural(categorized, t.caughtUp)}`;
  return { error: null, success: fill(done, { text: matchText }) + caughtUp };
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
    return { error: await errorMessage(error) };
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
    return { error: await errorMessage(error) };
  }
  // The next page says so (the typed name is the company's, checked above)
  const m = await getMessages();
  await setFlashNotice(
    "success",
    fill(m.settings.owner.deleted, { company: formField(formData, "confirmation").trim() }),
  );
  // Outside the try: redirect() works by throwing
  redirect("/onboarding");
}

/**
 * Deletes the signed-in person's own account (after typing their email
 * address), then shows the login page with a goodbye.
 */
export async function submitAccountDeletion(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await deleteOwnAccount(formField(formData, "confirmation"));
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // The logins are gone from the database; forget their cookies too, so the
  // browser doesn't keep presenting a login that no longer exists
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (name.includes("better-auth")) jar.delete(name);
  }
  // Outside the try: redirect() works by throwing
  redirect("/login?deleted=1");
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
    return { error: await errorMessage(error) };
  }
  refresh();
  return { error: null, success: (await getMessages()).settings.emails.saved };
}

// "3 transactions added, 1 updated" / "Nothing new"
function syncSummary(result: SyncResult, t: Messages["settings"]["banks"]): string {
  const parts = [
    result.newAccounts > 0 && plural(result.newAccounts, t.accountsAdded),
    result.added > 0 && plural(result.added, t.transactionsAdded),
    result.updated > 0 && fill(t.updated, { count: result.updated }),
    result.removed > 0 && fill(t.removed, { count: result.removed }),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : t.nothingNew;
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
    return { token: null, error: await errorMessage(error) };
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
    return { error: await errorMessage(error) };
  }
  refresh();
  const t = (await getMessages()).settings.banks;
  return {
    error: null,
    success:
      result.newAccounts === 0
        ? fill(t.connectedNone, { bank: result.institutionName })
        : fill(t.connected, { bank: result.institutionName, summary: syncSummary(result, t) }),
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
    return { error: await errorMessage(error) };
  }
  refresh();
  const t = (await getMessages()).settings.banks;
  return { error: null, success: fill(t.synced, { summary: syncSummary(result, t) }) };
}

/** Stops syncing a bank; its accounts and transactions stay. */
export async function removeBankConnection(id: string): Promise<ActionState> {
  try {
    await disconnectBank(id);
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  refresh();
  return { error: null, success: (await getMessages()).settings.banks.disconnected };
}

/**
 * Sends the owner to Stripe: to its payment page for the chosen plan, or
 * (intent=portal) to the page where a subscription is changed or cancelled.
 */
export async function submitBilling(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let url;
  try {
    url =
      formField(formData, "intent") === "portal"
        ? await openBillingPortal()
        : await startCheckout(
            formField(formData, "plan") as PaidPlan,
            formField(formData, "interval") as BillingInterval,
          );
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // Outside the try: redirect() works by throwing
  redirect(url);
}
