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
): { message: ContactMessage } | { error: string } {
  const name = input.name.trim();
  const email = input.email.trim();
  const company = input.company.trim();
  const message = input.message.trim();

  if (!name) return { error: "Please tell us your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address, so we can reply." };
  }
  if (!message) return { error: "Please write a message." };
  for (const [field, label] of [
    ["name", "Your name"],
    ["email", "Your email address"],
    ["company", "The company name"],
    ["message", "Your message"],
  ] as const) {
    const max = CONTACT_LIMITS[field];
    if ({ name, email, company, message }[field].length > max) {
      return { error: `${label} can be at most ${max} characters.` };
    }
  }
  return { message: { name, email, company, message } };
}
