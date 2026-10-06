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
import { getDashboardSummary } from "@/lib/data/dashboard";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";

// Browser tab title: "Dashboard | Finely"
export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Protects the page: visitors who aren't logged in are sent to /login, and
  // people without a company to /onboarding
  const { user, organization, role } = await requireOrganization();
  const summary = await getDashboardSummary();
  return (
    <DashboardHome
      firstName={user.name.split(" ")[0]}
      organizationName={organization.name}
      canManage={canManageFinances(role)}
      summary={summary}
    />
  );
}
