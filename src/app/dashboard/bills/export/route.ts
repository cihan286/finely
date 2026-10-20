// ─────────────────────────────────────────────────────────────────────────────
// Bills export (finely.com/dashboard/bills/export)
//
// In plain words: the file behind the "Export CSV" button on the Bills
// page: every bill, what's still owed first and then the paid ones, ready
// for a spreadsheet or an accountant.
//
// For developers: a route handler, because it answers with a file instead
// of a page. exportBills() finds the company itself and sends visitors who
// aren't logged in to /login, like every data function.
// ─────────────────────────────────────────────────────────────────────────────

import { getMessages } from "@/i18n/server";
import { exportBills } from "@/lib/data/bills";
import { billsCsv, exportFileName } from "@/lib/finance/export";

export async function GET() {
  const { bills, today } = await exportBills();
  return new Response(billsCsv(bills, await getMessages()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName("bills", today)}"`,
      // A company's finances: never kept by anything in between
      "Cache-Control": "no-store",
    },
  });
}
