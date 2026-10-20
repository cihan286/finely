// ─────────────────────────────────────────────────────────────────────────────
// Dashboard overview page (finely.com/dashboard)
//
// In plain words: the first screen people see after logging in — balances,
// income and expenses, the cash flow chart, recent activity and the bank
// accounts. It checks who's logged in, greets them by their first name, and
// shows their company's real figures.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import DashboardHome from "@/components/dashboard/home/DashboardHome";
import { getBudgets } from "@/lib/data/budgets";
import { getCompanyLocale } from "@/lib/data/common";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { getForecast } from "@/lib/data/recurring";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";
import { getMessages } from "@/i18n/server";

// Browser tab title: "Dashboard | Finely"
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).dashboard.title };
}

export default async function DashboardPage() {
  // Protects the page: visitors who aren't logged in are sent to /login, and
  // people without a company to /onboarding
  const { user, organization, role } = await requireOrganization();
  const { currency } = await getCompanyLocale(organization.id);
  const [summary, { budgets }, forecast] = await Promise.all([
    getDashboardSummary(),
    getBudgets(),
    getForecast(),
  ]);
  return (
    <DashboardHome
      firstName={user.name.split(" ")[0]}
      organizationName={organization.name}
      currency={currency}
      canManage={canManageFinances(role)}
      summary={summary}
      budgets={budgets}
      forecast={forecast}
    />
  );
}
