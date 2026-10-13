import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { verifyWebhookSignature } from "./stripe";

const secret = "whsec_test";
const payload = '{"id":"evt_1","type":"customer.subscription.updated"}';
const now = 1_800_000_000_000;
const sign = (body: string, timestamp: number, key = secret) =>
  createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex");
const header = (timestamp: number, ...signatures: string[]) =>
  [`t=${timestamp}`, ...signatures.map((s) => `v1=${s}`)].join(",");

describe("verifyWebhookSignature", () => {
  const t = now / 1000;

  test("accepts a message signed with our secret", () => {
    expect(verifyWebhookSignature(payload, header(t, sign(payload, t)), secret, now)).toBe(true);
  });

  test("accepts when one of several signatures matches (Stripe rolling its secret)", () => {
    expect(
      verifyWebhookSignature(payload, header(t, "0".repeat(64), sign(payload, t)), secret, now),
    ).toBe(true);
  });

  test("refuses a changed body, another secret or a missing header", () => {
    expect(
      verifyWebhookSignature(`${payload} `, header(t, sign(payload, t)), secret, now),
    ).toBe(false);
    expect(
      verifyWebhookSignature(payload, header(t, sign(payload, t, "whsec_other")), secret, now),
    ).toBe(false);
    expect(verifyWebhookSignature(payload, null, secret, now)).toBe(false);
    expect(verifyWebhookSignature(payload, "t=abc,v1=def", secret, now)).toBe(false);
    expect(verifyWebhookSignature(payload, header(t, sign(payload, t)), "", now)).toBe(false);
  });

  test("refuses an old message, even with a valid signature", () => {
    const old = t - 6 * 60;
    expect(verifyWebhookSignature(payload, header(old, sign(payload, old)), secret, now)).toBe(
      false,
    );
  });
});
