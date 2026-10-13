// ─────────────────────────────────────────────────────────────────────────────
// Stripe's messages to us (finely.com/api/stripe/webhook)
//
// In plain words: whenever a subscription starts, changes, fails to be paid
// or ends, Stripe calls this address to tell us, and we update the
// company's plan.
//
// For developers: not for people. Anyone can call this address, so a
// message is only believed if it carries a valid signature made with
// STRIPE_WEBHOOK_SECRET (and isn't older than five minutes); the signature
// covers the exact bytes, so the body is read as text, not parsed first.
// Stripe sends a message again if it doesn't get a 2xx answer, and may send
// one twice or out of order: applySubscriptionEvent() copes with both.
// ─────────────────────────────────────────────────────────────────────────────

import { verifyWebhookSignature, type StripeEvent } from "@/lib/billing/stripe";
import { applySubscriptionEvent } from "@/lib/data/billing";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Billing is not set up.", { status: 503 });

  const payload = await request.text();
  if (!verifyWebhookSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("Invalid signature.", { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid body.", { status: 400 });
  }
  // A failure here answers 500, and Stripe tries again later
  const applied = await applySubscriptionEvent(event);
  return Response.json({ received: true, applied });
}
