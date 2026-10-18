import { describe, expect, test } from "vitest";
import { decryptToken, encryptToken } from "./crypto";

const secret = "a long random secret for tests";

describe("bank token encryption", () => {
  test("what is encrypted can be read back with the same secret", () => {
    const stored = encryptToken("access-sandbox-123", secret);
    expect(stored).not.toContain("access-sandbox-123");
    expect(stored.startsWith("v1.")).toBe(true);
    expect(decryptToken(stored, secret)).toBe("access-sandbox-123");
  });

  test("the same token is stored differently each time", () => {
    expect(encryptToken("token", secret)).not.toBe(encryptToken("token", secret));
  });

  test("another secret, or a changed token, can't be read", () => {
    const stored = encryptToken("token", secret);
    expect(() => decryptToken(stored, "another secret")).toThrow();
    const [version, iv, tag, data] = stored.split(".");
    // Flip one bit of the encrypted bytes, so the token always really changes
    const bytes = Buffer.from(data, "base64url");
    bytes[0] ^= 1;
    const tampered = [version, iv, tag, bytes.toString("base64url")].join(".");
    expect(() => decryptToken(tampered, secret)).toThrow();
    expect(() => decryptToken("not a token", secret)).toThrow(
      "The stored bank token is not readable.",
    );
  });

  test("refuses to work without a secret", () => {
    expect(() => encryptToken("token", "")).toThrow("The bank encryption secret is not set.");
  });
});
