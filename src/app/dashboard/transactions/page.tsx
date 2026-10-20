// ─────────────────────────────────────────────────────────────────────────────
// Transactions page (finely.com/dashboard/transactions)
//
// In plain words: the full list of the company's payments in and out, with
// search, filters and pages of 25. "Add transaction" and clicking a row open
// a window to add or edit one; "Import CSV" opens a window to import a bank
// statement.
//
// For developers: everything the page shows lives in the address (search
// params), so filtered views and open edit windows can be linked to and the
// back button works: ?q, account, category, from, to, page, plus ?new=1,
// ?edit=<id> or ?import=1 for the windows, ?imported=&skipped= for the
// message after an import, and ?categorized= for the one after saving a
// category rule from the edit window. Values from the address are tidied here before
// they reach lib/data/, which checks them again.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import TransactionsView, {
  type TransactionsQuery,
} from "@/components/dashboard/transactions/TransactionsView";
import { todayIn } from "@/lib/dates";
import { listAccounts } from "@/lib/data/accounts";
import { listAttachments } from "@/lib/data/attachments";
import { listCategories } from "@/lib/data/categories";
import { listCategoryRules } from "@/lib/data/category-rules";
import { getCompanyLocale, getCompanyTimeZone } from "@/lib/data/common";
import { countBillsMatching } from "@/lib/data/bills";
import { listCards } from "@/lib/data/cards";
import { getTransaction, listTransactions } from "@/lib/data/transactions";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";
import { getMessages } from "@/i18n/server";

// Browser tab title: "Transactions | Finely"
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).transactions.title };
}

const PAGE_SIZE = 25;

// One value from the address: the first if repeated, "" if missing
const single = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

// "2026-10-01" style dates only; anything else is ignored
const isoDay = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "");

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Protects the page: visitors who aren't logged in are sent to /login, and
  // people without a company to /onboarding
  const { organization, role } = await requireOrganization();
  const { currency } = await getCompanyLocale(organization.id);
  const params = await searchParams;

  const query: TransactionsQuery = {
    q: single(params.q).slice(0, 100),
    account: single(params.account),
    category: single(params.category),
    card: single(params.card),
    from: isoDay(single(params.from)),
    to: isoDay(single(params.to)),
    page: Math.max(Math.trunc(Number(single(params.page))) || 1, 1),
  };
  const editId = single(params.edit);
  // After an import: how many were added and how many skipped
  const imported = single(params.imported);
  const importResult = /^\d+$/.test(imported)
    ? {
        imported: Number(imported),
        skipped: Number(single(params.skipped)) || 0,
        // Bills that were marked as paid by the import's lines
        billsPaid: Number(single(params.bills)) || 0,
        // Payments recorded by hand for a bill that the import replaced
        billsMerged: Number(single(params.merged)) || 0,
      }
    : null;
  // After saving with "always use this category": how many the rule caught
  const categorized = single(params.categorized);
  const ruleResult = /^\d+$/.test(categorized) ? Number(categorized) : null;

  const importing = Boolean(single(params.import));
  const [
    { transactions, total },
    accounts,
    categories,
    rules,
    editing,
    attachments,
    timeZone,
    matchingBills,
    { cards },
  ] = await Promise.all([
      listTransactions({
        search: query.q,
        accountId: query.account,
        categoryId: query.category,
        cardId: query.card,
        from: query.from,
        to: query.to,
        limit: PAGE_SIZE,
        offset: (query.page - 1) * PAGE_SIZE,
      }),
      listAccounts(),
      listCategories(),
      // Only the import window needs the rules
      importing ? listCategoryRules() : [],
      editId ? getTransaction(editId) : null,
      // The files of the transaction being edited
      editId ? listAttachments(editId) : [],
      getCompanyTimeZone(organization.id),
      // The top bar's search lands here; bills with that text are a click away
      query.q ? countBillsMatching(query.q) : 0,
      listCards(),
    ]);

  return (
    <TransactionsView
      organizationName={organization.name}
      currency={currency}
      today={todayIn(timeZone)}
      canManage={canManageFinances(role)}
      query={query}
      pageSize={PAGE_SIZE}
      transactions={transactions}
      total={total}
      accounts={accounts}
      categories={categories}
      rules={rules}
      importResult={importResult}
      matchingBills={matchingBills}
      cards={cards}
      ruleResult={ruleResult}
      // ?new=1 opens an empty form; ?edit=<id> opens that transaction;
      // ?import=1 opens the import window
      dialog={
        editing
          ? { mode: "edit", transaction: editing, attachments }
          : accounts.length === 0
            ? null
            : single(params.new)
              ? { mode: "new" }
              : importing
                ? { mode: "import" }
                : null
      }
    />
  );
}
