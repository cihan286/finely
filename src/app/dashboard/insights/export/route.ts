// ─────────────────────────────────────────────────────────────────────────────
// Insights export (finely.com/dashboard/insights/export)
//
// In plain words: the file behind the "Export CSV" button on the Insights
// page: the totals, the month-by-month figures, spending by category and
// vendor, regular payments and unusual charges for the chosen period.
//
// For developers: a route handler, because it answers with a file instead
// of a page. Takes the page's ?months (3, 6 or 12; anything else is 6). The
// data functions find the company themselves and send visitors who aren't
// logged in to /login.
// ─────────────────────────────────────────────────────────────────────────────

import { getMessages } from "@/i18n/server";
import { getCompanyLocale } from "@/lib/data/common";
import { getInsights } from "@/lib/data/insights";
import { getRecurring } from "@/lib/data/recurring";
import { exportFileName, insightsCsv } from "@/lib/finance/export";
import { INSIGHT_PERIODS, type InsightPeriod } from "@/lib/finance/insights";
import { requireOrganization } from "@/lib/session";

export async function GET(request: Request) {
  const { organization } = await requireOrganization();
  const requested = Number(new URL(request.url).searchParams.get("months"));
  const period: InsightPeriod = INSIGHT_PERIODS.includes(requested as InsightPeriod)
    ? (requested as InsightPeriod)
    : 6;

  const [insights, { payments }, { currency }] = await Promise.all([
    getInsights(period),
    getRecurring(),
    getCompanyLocale(organization.id),
  ]);

  return new Response(insightsCsv(organization.name, insights, payments, currency, await getMessages()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(`insights-${period}-months`, insights.today)}"`,
      // A company's finances: never kept by anything in between
      "Cache-Control": "no-store",
    },
  });
}
