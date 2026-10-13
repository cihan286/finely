// ─────────────────────────────────────────────────────────────────────────────
// What happens when the contact form is submitted
//
// In plain words: checks the message and emails it to us (the address in
// CONTACT_EMAIL), with the visitor's address as the one to reply to.
//
// For developers: a server action ("use server") on a public page: anyone
// can call it, logged in or not. It can only ever email our own address,
// bots that fill in the hidden "website" box are quietly ignored, and one
// address on the internet can send at most five messages an hour. Without
// RESEND_API_KEY the message is printed in the terminal, like other emails.
// ─────────────────────────────────────────────────────────────────────────────

"use server";

import { formField, type ActionState } from "@/lib/action-state";
import { parseContactMessage } from "@/lib/contact";
import { sendEmail } from "@/lib/email/send";
import { contactMessageEmail } from "@/lib/email/templates";
import { clientIp, withinRateLimit } from "@/lib/rate-limit";

// At most this many messages per visitor (IP address) per hour
const MAX_MESSAGES = 5;
const WINDOW_SECONDS = 60 * 60;

const SENT = "Thanks! Your message is on its way. We'll reply by email.";

export async function submitContactMessage(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // People never see this box; only bots fill it in
  if (formField(formData, "website")) return { error: null, success: SENT };

  const parsed = parseContactMessage({
    name: formField(formData, "name"),
    email: formField(formData, "email"),
    company: formField(formData, "company"),
    message: formField(formData, "message"),
  });
  if ("error" in parsed) return { error: parsed.error };

  // Counted only for messages that would be sent, so typing mistakes don't
  // use up the allowance
  if (!(await withinRateLimit(`contact:${await clientIp()}`, MAX_MESSAGES, WINDOW_SECONDS))) {
    return {
      error: "You've sent several messages in a short time. Please try again in an hour.",
    };
  }

  const to = process.env.CONTACT_EMAIL?.trim();
  // Emails are really sent (Resend is set up) but we have nowhere to send to
  if (!to && process.env.RESEND_API_KEY) {
    console.error("[contact] CONTACT_EMAIL is not set, so a contact message was not sent.");
    return { error: "We couldn't send your message. Please try again later." };
  }

  const sent = await sendEmail(
    contactMessageEmail(to ?? "CONTACT_EMAIL (not set)", parsed.message),
  );
  return sent
    ? { error: null, success: SENT }
    : { error: "We couldn't send your message. Please try again later." };
}
