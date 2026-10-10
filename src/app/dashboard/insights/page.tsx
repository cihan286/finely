// ─────────────────────────────────────────────────────────────────────────────
// Insights page (finely.com/dashboard/insights)
//
// In plain words: trends in the company's money over the last 3, 6 or 12
// months — totals, money in and out per month, spending by category and
// vendor, and unusually high charges.
//
// For developers: the period comes from ?months=3|6|12 (6 if missing or
// invalid). Figures come from getInsights() in lib/data/insights.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import InsightsView from "@/components/dashboard/insights/InsightsView";
import { listAccounts } from "@/lib/data/accounts";
import { getInsights } from "@/lib/data/insights";
import { INSIGHT_PERIODS, type InsightPeriod } from "@/lib/finance/insights";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";

// Browser tab title: "Insights | Finely"
export const metadata: Metadata = {
  title: "Insights",
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Protects the page: visitors who aren't logged in are sent to /login, and
  // people without a company to /onboarding
  const { organization, role } = await requireOrganization();
  const requested = Number((await searchParams).months);
  const period: InsightPeriod = INSIGHT_PERIODS.includes(requested as InsightPeriod)
    ? (requested as InsightPeriod)
    : 6;

  const [insights, accounts] = await Promise.all([getInsights(period), listAccounts()]);
  return (
    <InsightsView
      organizationName={organization.name}
      hasAccounts={accounts.length > 0}
      canManage={canManageFinances(role)}
      insights={insights}
    />
  );
}
