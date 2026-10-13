// ─────────────────────────────────────────────────────────────────────────────
// The weekly summary job (finely.com/api/cron/weekly-digest)
//
// In plain words: once a week (Mondays at 08:00 UTC, see vercel.json) Vercel
// opens this address, and Finely emails each company's team the summary of
// its week.
//
// For developers: not for people: it only runs for a caller that sends the
// secret in CRON_SECRET ("Authorization: Bearer …"), which Vercel's
// scheduler does by itself once that variable is set. Without the variable
// it refuses everyone. Opening it twice is harmless: a company gets at most
// one summary every six days (see sendWeeklyDigests()).
// ─────────────────────────────────────────────────────────────────────────────

import { timingSafeEqual } from "node:crypto";
import { sendWeeklyDigests } from "@/lib/data/email-notifications";

// Compares in constant time, so the answer's timing doesn't leak the secret
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await sendWeeklyDigests());
}
