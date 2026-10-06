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
// ?edit=<id> or ?import=1 for the windows, and ?imported=&skipped= for the
// message after an import. Values from the address are tidied here before
// they reach lib/data/, which checks them again.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import TransactionsView, {
  type TransactionsQuery,
} from "@/components/dashboard/transactions/TransactionsView";
import { todayIn } from "@/lib/dates";
import { listAccounts } from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";
import { getCompanyTimeZone } from "@/lib/data/common";
import { getTransaction, listTransactions } from "@/lib/data/transactions";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";

// Browser tab title: "Transactions | Finely"
export const metadata: Metadata = {
  title: "Transactions",
};

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
  const params = await searchParams;

  const query: TransactionsQuery = {
    q: single(params.q).slice(0, 100),
    account: single(params.account),
    category: single(params.category),
    from: isoDay(single(params.from)),
    to: isoDay(single(params.to)),
    page: Math.max(Math.trunc(Number(single(params.page))) || 1, 1),
  };
  const editId = single(params.edit);
  // After an import: how many were added and how many skipped
  const imported = single(params.imported);
  const importResult = /^\d+$/.test(imported)
    ? { imported: Number(imported), skipped: Number(single(params.skipped)) || 0 }
    : null;

  const [{ transactions, total }, accounts, categories, editing, timeZone] =
    await Promise.all([
      listTransactions({
        search: query.q,
        accountId: query.account,
        categoryId: query.category,
        from: query.from,
        to: query.to,
        limit: PAGE_SIZE,
        offset: (query.page - 1) * PAGE_SIZE,
      }),
      listAccounts(),
      listCategories(),
      editId ? getTransaction(editId) : null,
      getCompanyTimeZone(organization.id),
    ]);

  return (
    <TransactionsView
      organizationName={organization.name}
      today={todayIn(timeZone)}
      canManage={canManageFinances(role)}
      query={query}
      pageSize={PAGE_SIZE}
      transactions={transactions}
      total={total}
      accounts={accounts}
      categories={categories}
      importResult={importResult}
      // ?new=1 opens an empty form; ?edit=<id> opens that transaction;
      // ?import=1 opens the import window
      dialog={
        editing
          ? { mode: "edit", transaction: editing }
          : accounts.length === 0
            ? null
            : single(params.new)
              ? { mode: "new" }
              : single(params.import)
                ? { mode: "import" }
                : null
      }
    />
  );
}
