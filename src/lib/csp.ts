// ─────────────────────────────────────────────────────────────────────────────
// The Content Security Policy
//
// In plain words: a list of rules every page sends the browser about what
// it may load and run. The most important one: only scripts Finely itself
// put on the page may run, each marked with a one-time code (a "nonce") that
// changes on every page load. If someone ever managed to slip a script into
// a page (say, through a transaction's description), the browser would
// refuse to run it. The other rules name the few outside services the
// browser talks to: Sentry for error reports and Plaid's bank login window.
//
// For developers: no imports, so it can be tested on its own (csp.test.ts).
// proxy.ts makes a nonce per request and sends this; Next.js reads the
// nonce from the header and puts it on its own scripts. Inline style
// attributes stay allowed (React and the charts use them). Violations are
// reported to Sentry when a DSN is set.
// ─────────────────────────────────────────────────────────────────────────────

interface CspOptions {
  /** This request's one-time code */
  nonce: string;
  /** Development mode: React needs eval() there for its error overlay */
  isDev: boolean;
  /** The browser's Sentry DSN, if errors are reported (NEXT_PUBLIC_SENTRY_DSN) */
  sentryDsn?: string;
}

// Plaid's "log in at your bank" window: its script and the frame it opens
const PLAID = "https://cdn.plaid.com https://*.plaid.com";

/** Where Sentry receives reports, read from its DSN; null without a valid one */
export function sentryEndpoints(dsn: string | undefined) {
  if (!dsn) return null;
  try {
    // https://<key>@<host>/<project>
    const url = new URL(dsn);
    const project = url.pathname.replace(/^\//, "");
    if (url.protocol !== "https:" || !url.username || !/^\d+$/.test(project)) return null;
    return {
      origin: url.origin,
      report: `${url.origin}/api/${project}/security/?sentry_key=${url.username}`,
    };
  } catch {
    return null;
  }
}

/** The Content-Security-Policy header's value, on one line */
export function contentSecurityPolicy({ nonce, isDev, sentryDsn }: CspOptions): string {
  const sentry = sentryEndpoints(sentryDsn);
  const directives = [
    "default-src 'self'",
    // Only scripts with this page's nonce, and the scripts those load (Plaid's
    // is added by our code). The last two are fallbacks for old browsers;
    // browsers that understand nonces and strict-dynamic ignore them.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https: 'unsafe-inline'`,
    // Style sheets from Finely (and Next.js's own <style> tags, which get the
    // nonce); style="" attributes are used by React and the charts
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    // Receipts are shown from Finely itself; data: and blob: for previews
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${sentry ? ` ${sentry.origin}` : ""} ${PLAID}`,
    `frame-src ${PLAID}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ...(sentry ? [`report-uri ${sentry.report}`] : []),
  ];
  return directives.join("; ");
}
