// ─────────────────────────────────────────────────────────────────────────────
// Bills page (finely.com/dashboard/bills)
//
// In plain words: what the company still has to pay — soonest first, with
// what's overdue and due this week added up at the top — and what it paid
// recently. "Add bill" and clicking a bill open a window to add or edit one;
// "Mark as paid" opens a window to record the payment.
//
// For developers: the open window lives in the address (search params), so
// it can be linked to and the back button works: ?new=1, ?edit=<id> or
// ?pay=<id>, plus ?paid=1&next=<day> for the message after a payment.
// "Add as bill" on the Insights page opens ?new=1 with name, amount, due,
// repeat and category filled in; they only pre-fill the form, and are
// checked like anything typed when it's saved.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import BillsView from "@/components/dashboard/bills/BillsView";
import { todayIn } from "@/lib/dates";
import { listAccounts } from "@/lib/data/accounts";
import { getBill, listBills } from "@/lib/data/bills";
import { listCategories } from "@/lib/data/categories";
import { getCompanyTimeZone } from "@/lib/data/common";
import { getRecurring } from "@/lib/data/recurring";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";
import { BILL_REPEATS, type BillRepeat } from "@/types/finance";

// Browser tab title: "Bills | Finely"
export const metadata: Metadata = {
  title: "Bills",
};

// One value from the address: the first if repeated, "" if missing
const single = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Protects the page: visitors who aren't logged in are sent to /login, and
  // people without a company to /onboarding
  const { organization, role } = await requireOrganization();
  const params = await searchParams;
  const editId = single(params.edit);
  const payId = single(params.pay);

  const [{ unpaid, paid }, accounts, categories, opened, timeZone, recurring] =
    await Promise.all([
      listBills(),
      listAccounts(),
      listCategories(),
      editId || payId ? getBill(editId || payId) : null,
      getCompanyTimeZone(organization.id),
      getRecurring(),
    ]);

  // A new bill suggested by a regular payment: what to put in the form
  const amount = Number(single(params.amount));
  const due = single(params.due);
  const repeat = single(params.repeat) as BillRepeat;
  const prefill = {
    name: single(params.name).slice(0, 120),
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
    repeat: BILL_REPEATS.includes(repeat) ? repeat : null,
    categoryId: categories.some((c) => c.id === single(params.category))
      ? single(params.category)
      : null,
  };

  // After a payment: the next due date, for a bill that repeats
  const next = single(params.next);
  const paidResult = single(params.paid)
    ? { nextDueDate: /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : null }
    : null;

  return (
    <BillsView
      organizationName={organization.name}
      today={todayIn(timeZone)}
      canManage={canManageFinances(role)}
      unpaid={unpaid}
      paid={paid}
      accounts={accounts}
      categories={categories}
      paidResult={paidResult}
      // Regular payments (money out) that no unpaid bill covers yet
      suggestions={
        recurring.payments.filter((p) => p.direction === "out" && !p.billed).length
      }
      // Only bills that are still owed can be edited or paid
      dialog={
        opened && opened.paidDay === null
          ? { mode: editId ? "edit" : "pay", bill: opened }
          : single(params.new)
            ? { mode: "new", prefill }
            : null
      }
    />
  );
}
