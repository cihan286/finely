// ─────────────────────────────────────────────────────────────────────────────
// One-click unsubscribe (finely.com/api/email/unsubscribe)
//
// In plain words: email apps like Gmail show their own "Unsubscribe" button
// next to our weekly summary and alert emails. Pressing it calls this
// address, which stops that kind of email for that person and company.
//
// For developers: the target of the List-Unsubscribe header (RFC 8058),
// which email apps POST to without cookies. Nobody is logged in: the
// signature in the address is the proof (lib/email/unsubscribe.ts). Only
// POST changes anything, so a mail scanner that merely opens links doesn't
// unsubscribe people; someone opening the address themselves is sent to the
// /unsubscribe page, which asks first.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/data/email-notifications";
import { readUnsubscribeLink } from "@/lib/email/unsubscribe";

const queryOf = (request: Request) =>
  Object.fromEntries(new URL(request.url).searchParams);

export async function POST(request: Request) {
  const target = readUnsubscribeLink(queryOf(request));
  if (!target) return new Response("This link isn't valid.", { status: 400 });
  await unsubscribe(target);
  return new Response("Unsubscribed.");
}

export function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(`/unsubscribe${url.search}`, url));
}
