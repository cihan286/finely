// ─────────────────────────────────────────────────────────────────────────────
// "Download my data" (finely.com/dashboard/settings/my-data)
//
// In plain words: the file behind the "Download my data" button in
// Settings: what Finely holds about the person who is logged in, in a form
// both people and programs can read (JSON).
//
// For developers: a route handler, because it answers with a file instead
// of a page. exportPersonalData() takes the person from the login, never
// from the address, and sends visitors who aren't logged in to /login.
// ─────────────────────────────────────────────────────────────────────────────

import { exportPersonalData } from "@/lib/data/person";

export async function GET() {
  const data = await exportPersonalData();
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="finely-my-data-${data.exportedAt.slice(0, 10)}.json"`,
      // Personal data: never kept by anything in between
      "Cache-Control": "no-store",
    },
  });
}
