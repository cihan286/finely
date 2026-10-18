// ─────────────────────────────────────────────────────────────────────────────
// The daily bank sync job (finely.com/api/cron/bank-sync)
//
// In plain words: once a day (06:00 UTC, see vercel.json) Vercel opens this
// address, and Finely brings every linked bank's transactions up to date.
// It also deletes the demo companies ("Try the demo") whose day is over.
//
// For developers: not for people: like the weekly summary job, it only runs
// for a caller that sends CRON_SECRET ("Authorization: Bearer …"). Opening
// it more often is harmless: each sync continues where the last one stopped.
// ─────────────────────────────────────────────────────────────────────────────

import { timingSafeEqual } from "node:crypto";
import { syncAllBankConnections } from "@/lib/data/bank";
import { deleteExpiredDemos } from "@/lib/data/demo";

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
  const banks = await syncAllBankConnections();
  // Up to 20 a day here; each new demo also clears up to 20 (lib/data/demo.ts)
  const demosDeleted = await deleteExpiredDemos();
  return Response.json({ ...banks, demosDeleted });
}
