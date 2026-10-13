// ─────────────────────────────────────────────────────────────────────────────
// The site's own address
//
// In plain words: where this copy of Finely lives on the internet, e.g.
// https://app.finely.com. Used to build the links in emails.
//
// For developers: no imports, so it also loads in the Better Auth CLI and in
// tests. In production, set BETTER_AUTH_URL to the real address (https://…).
// Preview deployments leave it unset and use their branch address.
// ─────────────────────────────────────────────────────────────────────────────

// Addresses of this deployment on Vercel: a stable one per git branch and
// one per deployment. Vercel sets these itself.
export const vercelUrls = [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const appUrl =
  process.env.BETTER_AUTH_URL ?? vercelUrls[0] ?? "http://localhost:3000";
