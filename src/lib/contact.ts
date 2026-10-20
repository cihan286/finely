// ─────────────────────────────────────────────────────────────────────────────
// The contact form: checking what was typed
//
// In plain words: before a message from the Contact page is emailed to us, we
// check it has a name, a real-looking email address and a message that isn't
// empty or enormous.
//
// For developers: a pure function, unit-tested in contact.test.ts. The form
// is public, so everything here is untrusted text; the email template
// escapes it.
// ─────────────────────────────────────────────────────────────────────────────

import { fill } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";

export interface ContactMessage {
  name: string;
  email: string;
  /** "" when left empty */
  company: string;
  message: string;
}

export const CONTACT_LIMITS = { name: 100, email: 254, company: 100, message: 4000 };

/** The tidied message, or the problem to show the person. */
export function parseContactMessage(
  input: Record<keyof ContactMessage, string>,
  /** The words of the page's language: m.site.contact */
  t: Messages["site"]["contact"],
): { message: ContactMessage } | { error: string } {
  const name = input.name.trim();
  const email = input.email.trim();
  const company = input.company.trim();
  const message = input.message.trim();

  if (!name) return { error: t.nameMissing };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: t.emailInvalid };
  }
  if (!message) return { error: t.messageMissing };
  for (const [field, label] of [
    ["name", t.fieldName],
    ["email", t.fieldEmail],
    ["company", t.fieldCompany],
    ["message", t.fieldMessage],
  ] as const) {
    const max = CONTACT_LIMITS[field];
    if ({ name, email, company, message }[field].length > max) {
      return { error: fill(t.tooLong, { field: label, max }) };
    }
  }
  return { message: { name, email, company, message } };
}
