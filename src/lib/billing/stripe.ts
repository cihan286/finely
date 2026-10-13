// ─────────────────────────────────────────────────────────────────────────────
// Stripe: taking payment for plans
//
// In plain words: Stripe is the service that charges a company's card for
// its plan. We send the owner to a payment page that Stripe hosts (we never
// see card numbers), and Stripe tells us afterwards, and whenever something
// changes, what the company's subscription looks like. This file is the only
// place that knows how to talk to Stripe.
//
// For developers: plain HTTPS calls to Stripe's API (no SDK), authenticated
// with STRIPE_SECRET_KEY. Stripe's messages to us ("webhooks") are only
// believed if their signature matches STRIPE_WEBHOOK_SECRET
// (verifyWebhookSignature, unit-tested). Billing is offered only once the
// secret key, the webhook secret and the four price IDs are set. Stripe's
// own error texts are logged, never shown. Docs: https://docs.stripe.com/api
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingInterval, PaidPlan } from "@/lib/finance/plans";

const API = "https://api.stripe.com/v1";

// Stripe's ID of the price of each plan and interval (Stripe dashboard →
// Product catalog). Empty until configured.
const PRICE_IDS: Record<PaidPlan, Record<BillingInterval, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY ?? "",
  },
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? "",
    yearly: process.env.STRIPE_PRICE_GROWTH_YEARLY ?? "",
  },
};

/** Paying for a plan is offered only once everything it needs is configured. */
export const isBillingEnabled = Boolean(
  process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    Object.values(PRICE_IDS).every((prices) => prices.monthly && prices.yearly),
);

/** Stripe's price for a plan and interval */
export function priceIdFor(plan: PaidPlan, interval: BillingInterval): string {
  return PRICE_IDS[plan][interval];
}

/** The plan a Stripe price belongs to; null for a price that isn't ours */
export function planForPrice(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  for (const plan of Object.keys(PRICE_IDS) as PaidPlan[]) {
    if (Object.values(PRICE_IDS[plan]).includes(priceId)) return plan;
  }
  return null;
}

/** Something Stripe refused. The message is for us, not for the screen. */
export class StripeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "StripeError";
  }
}

// Stripe takes form fields; nested values are written "a[b][c]=…"
function toForm(params: Record<string, unknown>, prefix = ""): [string, string][] {
  return Object.entries(params).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) return [];
    if (typeof value === "object") return toForm(value as Record<string, unknown>, name);
    return [[name, String(value)] as [string, string]];
  });
}

// One call to Stripe's API
async function stripe<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: method === "POST" ? new URLSearchParams(toForm(params)) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new StripeError("Could not reach Stripe.", "network");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const code = data?.error?.code ?? data?.error?.type ?? `http_${response.status}`;
    // Stripe's own explanation says what to fix (a setting, a parameter)
    console.error(
      `[stripe] ${method} ${path} failed: ${code}${data?.error?.message ? `: ${data.error.message}` : ""}`,
    );
    throw new StripeError(`Stripe refused ${method} ${path}.`, String(code));
  }
  return data as T;
}

/**
 * Starts a subscription purchase: the address of Stripe's payment page for
 * one plan. The company's ID travels with the subscription, so Stripe's
 * later messages say which company they're about.
 */
export async function createCheckoutSession(input: {
  organizationId: string;
  plan: PaidPlan;
  interval: BillingInterval;
  /** Stripe's customer for this company, if it has one already */
  customerId: string | null;
  /** Where the receipt goes, for a company that isn't a customer yet */
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string }> {
  const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
    mode: "subscription",
    line_items: { 0: { price: priceIdFor(input.plan, input.interval), quantity: 1 } },
    client_reference_id: input.organizationId,
    ...(input.customerId
      ? { customer: input.customerId }
      : { customer_email: input.email }),
    subscription_data: { metadata: { organization_id: input.organizationId } },
    allow_promotion_codes: true,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  return { id: session.id, url: session.url };
}

/** A payment page that was opened earlier, and how it ended (if it has) */
export interface StripeCheckoutSession {
  id: string;
  /** "open" = not paid yet, "complete" = paid, "expired" = given up on */
  status: "open" | "complete" | "expired";
  /** The page's address while it's open */
  url: string | null;
  /** The company it was opened for (our ID) */
  client_reference_id: string | null;
  /** The subscription the payment started; null until it's paid */
  subscription: (StripeSubscription & { created: number }) | null;
  line_items?: { data: { price: { id: string } | null }[] };
}

/** Looks up a payment page, with the subscription it led to and its price. */
export async function getCheckoutSession(id: string): Promise<StripeCheckoutSession> {
  return stripe<StripeCheckoutSession>(
    "GET",
    `/checkout/sessions/${encodeURIComponent(id)}?expand%5B%5D=subscription&expand%5B%5D=line_items`,
  );
}

/** Closes a payment page that is still open, so it can't be paid any more. */
export async function expireCheckoutSession(id: string): Promise<void> {
  await stripe("POST", `/checkout/sessions/${encodeURIComponent(id)}/expire`);
}

/**
 * The address of Stripe's page where a customer changes plan, payment
 * method or cancels, and finds their invoices.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/** Changes where Stripe sends a customer's receipts and payment notices. */
export async function updateCustomerEmail(customerId: string, email: string): Promise<void> {
  await stripe("POST", `/customers/${encodeURIComponent(customerId)}`, { email });
}

/** Ends a subscription right away (when its company is deleted). */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await stripe("DELETE", `/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

/** The parts of Stripe's subscription we use */
export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  metadata: Record<string, string> | null;
  // Older API versions keep the period on the subscription, newer on its item
  current_period_end?: number | null;
  items: { data: { price: { id: string }; current_period_end?: number | null }[] };
}

/** One of Stripe's messages to us */
export interface StripeEvent {
  id: string;
  type: string;
  /** When it happened (seconds since 1970) */
  created: number;
  data: { object: unknown };
}

// How old a message may be: stops someone replaying a captured one later
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Whether a message really comes from Stripe: its "Stripe-Signature" header
 * must hold a signature of "<time>.<body>" made with our webhook secret,
 * and be recent.
 */
export function verifyWebhookSignature(
  payload: string,
  header: string | null,
  secret: string,
  now = Date.now(),
): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim().split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex"),
  );
  return signatures.some((signature) => {
    const given = Buffer.from(signature ?? "");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
