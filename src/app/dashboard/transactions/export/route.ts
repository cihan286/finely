// ─────────────────────────────────────────────────────────────────────────────
// Transactions export (finely.com/dashboard/transactions/export)
//
// In plain words: the file behind the "Export CSV" button on the
// Transactions page: every transaction the current search and filters show
// (not just the page on screen), ready for a spreadsheet or an accountant.
//
// For developers: a route handler, because it answers with a file instead
// of a page. It takes the same ?q, account, category, card, from and to as the
// page. exportTransactions() finds the company itself and sends visitors who
// aren't logged in to /login, like every data function.
// ─────────────────────────────────────────────────────────────────────────────

import { DataError } from "@/lib/data/common";
import { exportTransactions } from "@/lib/data/transactions";
import { exportFileName, transactionsCsv } from "@/lib/finance/export";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let result;
  try {
    result = await exportTransactions({
      search: (params.get("q") ?? "").slice(0, 100),
      accountId: params.get("account") ?? "",
      categoryId: params.get("category") ?? "",
      cardId: params.get("card") ?? "",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
    });
  } catch (error) {
    // E.g. a date in the address that isn't a date
    if (error instanceof DataError) return new Response(error.message, { status: 400 });
    throw error;
  }

  return new Response(transactionsCsv(result.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName("transactions", result.today)}"`,
      // A company's finances: never kept by anything in between
      "Cache-Control": "no-store",
    },
  });
}
