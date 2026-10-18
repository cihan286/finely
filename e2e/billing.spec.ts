// Paid plans: Stripe's messages change a company's plan, forged ones don't

import { createHmac } from "node:crypto";
import { expect, test } from "./test";
import { stripeWebhookSecret } from "../playwright.config";
import { companyId } from "./db";
import { signUpWithCompany } from "./helpers";

/** A subscription message, as Stripe sends it to /api/stripe/webhook */
function subscriptionEvent(
  type: "created" | "deleted",
  organizationId: string,
  created: number,
) {
  return JSON.stringify({
    id: `evt_e2e_${type}_${created}`,
    type: `customer.subscription.${type}`,
    created,
    data: {
      object: {
        id: `sub_e2e_${organizationId}`,
        customer: `cus_e2e_${organizationId}`,
        status: type === "deleted" ? "canceled" : "active",
        metadata: { organization_id: organizationId },
        cancel_at_period_end: false,
        items: {
          data: [
            {
              price: { id: "price_e2e_starter_monthly" },
              current_period_end: created + 30 * 24 * 60 * 60,
            },
          ],
        },
      },
    },
  });
}

/** Stripe's signature header for a message, made with the webhook secret */
function sign(payload: string, secret = stripeWebhookSecret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

test("Stripe's signed messages change the plan; unsigned or forged ones are refused", async ({
  page,
  request,
}) => {
  const owner = await signUpWithCompany(page, "Grace", "Grace Analytics");
  const organizationId = await companyId(owner.company);
  const billing = page.locator("section", {
    has: page.getByRole("heading", { name: "Plan & billing" }),
  });

  await page.goto("/dashboard/settings");
  await expect(billing).toContainText("Free");
  await expect(billing).toContainText("1 of 2 team members");

  const now = Math.floor(Date.now() / 1000);
  const upgrade = subscriptionEvent("created", organizationId, now);

  // Without a signature, or signed with the wrong secret: refused
  const unsigned = await request.post("/api/stripe/webhook", { data: upgrade });
  expect(unsigned.status()).toBe(400);
  const forged = await request.post("/api/stripe/webhook", {
    data: upgrade,
    headers: { "stripe-signature": sign(upgrade, "whsec_someone_else") },
  });
  expect(forged.status()).toBe(400);
  await page.reload();
  await expect(billing).toContainText("1 of 2 team members");

  // Signed by "Stripe": the company is on Starter
  const accepted = await request.post("/api/stripe/webhook", {
    data: upgrade,
    headers: { "stripe-signature": sign(upgrade) },
  });
  expect(accepted.status()).toBe(200);
  await page.reload();
  await expect(billing).toContainText("Starter");
  await expect(billing).toContainText("1 of 5 team members");

  // Cancelled at Stripe: back on Free
  const cancel = subscriptionEvent("deleted", organizationId, now + 60);
  const cancelled = await request.post("/api/stripe/webhook", {
    data: cancel,
    headers: { "stripe-signature": sign(cancel) },
  });
  expect(cancelled.status()).toBe(200);
  await page.reload();
  await expect(billing).toContainText("1 of 2 team members");
});
