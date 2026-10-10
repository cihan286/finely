// ─────────────────────────────────────────────────────────────────────────────
// Sending emails
//
// In plain words: the one place that actually sends emails, through a service
// called Resend. If Resend isn't set up (no API key in .env.local), the email
// is printed in the terminal instead, so development still works.
//
// For developers: use queueEmail() from auth callbacks. It sends after the
// response is finished (Next.js `after`), so responses don't wait for Resend
// and their timing doesn't reveal whether an account exists.
// ─────────────────────────────────────────────────────────────────────────────

import { after } from "next/server";
import { Resend } from "resend";

export interface Email {
  to: string;
  subject: string;
  html: string;
  /** Plain-text version for email apps that don't show HTML */
  text: string;
}

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

// Who emails come from. Must use a domain verified in Resend; the fallback is
// Resend's test sender, which can only deliver to your own Resend account.
// Quotes around the value are dropped: .env files remove them, but hosting
// dashboards (Vercel) keep them as typed, and Resend then rejects the sender.
const from =
  process.env.EMAIL_FROM?.trim().replace(/^(["'])(.*)\1$/, "$2") ||
  "Finely <onboarding@resend.dev>";

/** Sends an email now and waits for the result. Never throws. */
export async function sendEmail(email: Email): Promise<void> {
  if (!resend) {
    console.info(
      `\n[email not sent: RESEND_API_KEY missing] to ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`,
    );
    return;
  }
  try {
    const { error } = await resend.emails.send({ from, ...email });
    if (error) console.error(`[email] Resend refused "${email.subject}" to ${email.to}: ${error.message}`);
  } catch (err) {
    console.error(`[email] Could not reach Resend for "${email.subject}" to ${email.to}:`, err);
  }
}

/** Sends an email after the current response has been sent. */
export function queueEmail(email: Email): void {
  try {
    after(() => sendEmail(email));
  } catch {
    // Outside a request (e.g. a script): just send it in the background
    void sendEmail(email);
  }
}
