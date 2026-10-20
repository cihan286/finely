// ─────────────────────────────────────────────────────────────────────────────
// Unsubscribe links
//
// In plain words: the weekly summary and the alert emails end with a link
// that stops that kind of email for that company, without logging in. The
// link carries a signature only we can make, so nobody can switch off
// someone else's emails by guessing an address.
//
// For developers: the signature is an HMAC of the person, the company and
// the kind of email, keyed with BETTER_AUTH_SECRET. It never expires (an
// old email's link should still work) and can only ever switch one kind of
// email off, which the person can undo in Settings. Without the secret no
// links are made. The page is /unsubscribe; email apps' own "Unsubscribe"
// button posts to /api/email/unsubscribe (RFC 8058).
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "@/lib/app-url";
import type { EmailPreferences } from "@/types/finance";

/** The kinds of email a link can stop */
export const EMAIL_KINDS = ["weeklyDigest", "unusualCharges"] as const satisfies readonly (keyof EmailPreferences)[];
export type EmailKind = (typeof EMAIL_KINDS)[number];

/** Whose emails of which kind, about which company */
export interface UnsubscribeTarget {
  userId: string;
  organizationId: string;
  kind: EmailKind;
}

function sign(target: UnsubscribeTarget, secret: string): string {
  return createHmac("sha256", secret)
    .update(`unsubscribe:${target.userId}:${target.organizationId}:${target.kind}`)
    .digest("base64url");
}

/**
 * The addresses that stop one kind of email for one person and company: the
 * page a person opens, and the one email apps post to. Null when links can't
 * be signed (no secret configured).
 */
export function unsubscribeLinks(
  target: UnsubscribeTarget,
  secret = process.env.BETTER_AUTH_SECRET,
): { pageUrl: string; postUrl: string } | null {
  if (!secret) return null;
  const query = new URLSearchParams({
    u: target.userId,
    o: target.organizationId,
    k: target.kind,
    t: sign(target, secret),
  });
  return {
    pageUrl: `${appUrl}/unsubscribe?${query}`,
    postUrl: `${appUrl}/api/email/unsubscribe?${query}`,
  };
}

/**
 * What a link's query asks for, if its signature is right; null for a link
 * that was changed, cut off or made up.
 */
export function readUnsubscribeLink(
  query: { u?: string | null; o?: string | null; k?: string | null; t?: string | null },
  secret = process.env.BETTER_AUTH_SECRET,
): UnsubscribeTarget | null {
  const { u: userId, o: organizationId, k: kind, t: token } = query;
  if (!secret || !userId || !organizationId || !token) return null;
  if (!(EMAIL_KINDS as readonly string[]).includes(kind ?? "")) return null;
  const target = { userId, organizationId, kind: kind as EmailKind };
  const expected = Buffer.from(sign(target, secret));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? target
    : null;
}
