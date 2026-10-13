// ─────────────────────────────────────────────────────────────────────────────
// Cards page (finely.com/dashboard/cards)
//
// In plain words: the company's payment cards — who carries each, its last
// four digits, and how much was paid with it this month against its limit.
// "Add card" and "Edit" open a window to add or change one. Finely keeps
// track of cards the company's bank issued; it doesn't issue cards itself.
//
// For developers: the open window lives in the address (search params), so
// it can be linked to and the back button works: ?new=1 or ?edit=<id>.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import CardsView from "@/components/dashboard/cards/CardsView";
import { getCard, listCards } from "@/lib/data/cards";
import { getCompanyLocale } from "@/lib/data/common";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";

// Browser tab title: "Cards | Finely"
export const metadata: Metadata = {
  title: "Cards",
};

// One value from the address: the first if repeated, "" if missing
const single = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Protects the page: visitors who aren't logged in are sent to /login, and
  // people without a company to /onboarding
  const { organization, role } = await requireOrganization();
  const params = await searchParams;
  const editId = single(params.edit);
  const canManage = canManageFinances(role);

  const [{ cards, today }, opened, { currency }] = await Promise.all([
    listCards(),
    editId ? getCard(editId) : null,
    getCompanyLocale(organization.id),
  ]);

  return (
    <CardsView
      organizationName={organization.name}
      currency={currency}
      today={today}
      canManage={canManage}
      cards={cards}
      // Whoever is on the team can carry a card
      members={organization.members
        .map((m) => ({ id: m.userId, name: m.user.name }))
        .sort((a, b) => a.name.localeCompare(b.name))}
      // Only owners and admins get the windows
      dialog={
        !canManage
          ? null
          : opened
            ? { mode: "edit", card: opened }
            : single(params.new)
              ? { mode: "new" }
              : null
      }
    />
  );
}
