import { describe, expect, test } from "vitest";
import { contentSecurityPolicy, sentryEndpoints } from "./csp";

const directive = (policy: string, name: string) =>
  policy.split("; ").find((d) => d.startsWith(`${name} `));

describe("contentSecurityPolicy", () => {
  test("only runs scripts carrying this request's nonce", () => {
    const policy = contentSecurityPolicy({ nonce: "abc123", isDev: false });
    expect(directive(policy, "script-src")).toContain("'nonce-abc123'");
    expect(directive(policy, "script-src")).toContain("'strict-dynamic'");
    expect(directive(policy, "script-src")).not.toContain("unsafe-eval");
    expect(directive(policy, "style-src")).toBe("style-src 'self' 'nonce-abc123'");
  });

  test("never lets another site frame Finely, or load plugins", () => {
    const policy = contentSecurityPolicy({ nonce: "n", isDev: false });
    expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(policy, "object-src")).toBe("object-src 'none'");
    expect(directive(policy, "base-uri")).toBe("base-uri 'self'");
  });

  test("allows eval and inline styles in development only", () => {
    const policy = contentSecurityPolicy({ nonce: "n", isDev: true });
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  test("lets the browser reach Sentry and report violations there when a DSN is set", () => {
    const policy = contentSecurityPolicy({
      nonce: "n",
      isDev: false,
      sentryDsn: "https://publickey@o123.ingest.us.sentry.io/4567",
    });
    expect(directive(policy, "connect-src")).toContain("https://o123.ingest.us.sentry.io");
    expect(directive(policy, "report-uri")).toBe(
      "report-uri https://o123.ingest.us.sentry.io/api/4567/security/?sentry_key=publickey",
    );
  });

  test("leaves Sentry out without a DSN, or with one it can't read", () => {
    for (const sentryDsn of [undefined, "", "not a url", "http://key@host/1", "https://host/1"]) {
      const policy = contentSecurityPolicy({ nonce: "n", isDev: false, sentryDsn });
      expect(policy).not.toContain("sentry");
      expect(policy).not.toContain("report-uri");
    }
    expect(sentryEndpoints("https://key@o1.ingest.sentry.io/notanumber")).toBeNull();
  });
});
