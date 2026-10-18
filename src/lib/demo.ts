// ─────────────────────────────────────────────────────────────────────────────
// Telling demo people apart
//
// In plain words: the pretend people in a demo company ("Try the demo") have
// email addresses that end in @demo.finely.invalid. Addresses ending in
// ".invalid" can never receive mail anywhere, so nothing is ever sent to them.
//
// For developers: no imports, so emails, auth and data code can all use it.
// The demo itself is in lib/data/demo.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** How long a demo company lives */
export const DEMO_LIFETIME_HOURS = 24;

/** Demo people's addresses end with this */
export const DEMO_EMAIL_DOMAIN = "demo.finely.invalid";

/** Whether an address belongs to a pretend demo person */
export function isDemoEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}
