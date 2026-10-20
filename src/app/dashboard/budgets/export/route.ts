// ─────────────────────────────────────────────────────────────────────────────
// Budgets export (finely.com/dashboard/budgets/export)
//
// In plain words: the file behind "Export CSV" on the dashboard's Budgets
// card: for every category with a budget, what was budgeted, spent and left
// this month.
//
// For developers: a route handler, because it answers with a file instead
// of a page (there is no /dashboard/budgets page). getBudgets() finds the
// company itself and sends visitors who aren't logged in to /login, like
// every data function.
// ─────────────────────────────────────────────────────────────────────────────

import { getMessages } from "@/i18n/server";
import { getBudgets } from "@/lib/data/budgets";
import { budgetsCsv, exportFileName } from "@/lib/finance/export";

export async function GET() {
  const { budgets, today } = await getBudgets();
  return new Response(budgetsCsv(today, budgets, await getMessages()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(`budgets-${today.slice(0, 7)}`, today)}"`,
      // A company's finances: never kept by anything in between
      "Cache-Control": "no-store",
    },
  });
}
