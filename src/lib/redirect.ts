// ─────────────────────────────────────────────────────────────────────────────
// "Where to go after logging in"
//
// In plain words: when someone opens an invitation link but isn't logged in,
// we send them to log in first and remember where they were going (in a
// "?next=" part of the address), so they come back afterwards.
//
// For developers: only same-site paths are accepted. Anything else could turn
// our login page into a redirect to another website (an "open redirect"),
// which attackers use to make phishing links look trustworthy.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns `next` if it's a safe path on this site, otherwise undefined. */
export function safeNextPath(next: string | undefined | null): string | undefined {
  if (!next) return undefined;
  // Must start with a single "/" — "//evil.com" and "/\evil.com" leave the site
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return undefined;
  }
  return next;
}
