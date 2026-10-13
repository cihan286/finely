// ─────────────────────────────────────────────────────────────────────────────
// Activity log export (finely.com/dashboard/settings/activity/export)
//
// In plain words: the file behind the "Export CSV" button on the activity
// log: every line the current filter and search show (not just the page on
// screen), newest first. Owners and admins only, like the log itself.
//
// For developers: a route handler, because it answers with a file instead
// of a page. It takes the same ?area and ?q as the page. exportAuditLog()
// finds the company itself, refuses members, and sends visitors who aren't
// logged in to /login.
// ─────────────────────────────────────────────────────────────────────────────

import { exportAuditLog } from "@/lib/data/audit";
import { DataError } from "@/lib/data/common";
import { activityCsv, exportFileName } from "@/lib/finance/export";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let result;
  try {
    result = await exportAuditLog({
      area: params.get("area") ?? "",
      search: (params.get("q") ?? "").slice(0, 100),
    });
  } catch (error) {
    // A member opened the address by hand
    if (error instanceof DataError) return new Response(error.message, { status: 403 });
    throw error;
  }

  return new Response(activityCsv(result.rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName("activity", result.today)}"`,
      // Who did what in a company: never kept by anything in between
      "Cache-Control": "no-store",
    },
  });
}
