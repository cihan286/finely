# Deploying

Finely runs on [Vercel](https://vercel.com) with a Neon database. Every push
and pull request is checked by GitHub Actions (`.github/workflows/ci.yml`):
types, lint, tests, a production build, and that every schema change has a
committed migration.

One-time setup:

1. **Neon**: in the Vercel project, add the
   [Neon integration](https://vercel.com/integrations/neon). It sets
   `DATABASE_URL` and gives every preview deployment its own copy of the
   database (a Neon "branch"), so previews never touch production data.
2. **Vercel Blob** (optional, for attached files): in the Vercel project,
   create a Blob store (**Storage → Blob**, private access) and connect it:
   it sets `BLOB_READ_WRITE_TOKEN`. Without it, files are kept in the
   database. If the site already has files, run `npm run files:move` once
   with that token and the production `DATABASE_URL`.
3. **Vercel**: import the GitHub repository. Then, under **Settings →
   Environment Variables**:
   - All environments: `BETTER_AUTH_SECRET` (a different one from your
     local one), `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL`,
     `CRON_SECRET` (any long random text), `PLAID_CLIENT_ID`, `PLAID_SECRET`,
     `PLAID_ENV` and `BANK_ENCRYPTION_KEY` (to offer linking banks),
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the four
     `STRIPE_PRICE_*` (to offer paid plans; see [Plans and billing](features.md#plans-and-billing)),
     `GOOGLE_CLIENT_ID`,
     `GOOGLE_CLIENT_SECRET`, and the four `SENTRY_*` values.
   - Production only: `BETTER_AUTH_URL` set to the real address, e.g.
     `https://app.finely.com`. Previews leave it unset and use their own
     branch address.
4. **Google sign-in**: add `https://<your domain>/api/auth/callback/google`
   as a redirect URI in the Google Cloud console. Google sign-in only works
   on addresses listed there, so it won't work on previews.
5. **Sentry**: create a Next.js project at [sentry.io](https://sentry.io),
   then copy its DSN and an auth token into the variables above.

Deploying is then automatic: pushing to `main` deploys to production, and
every pull request gets a preview. Each deployment applies pending database
migrations before building (`vercel.json`), so migrations must keep working
for the version that's still running: add columns as optional first, and
remove old ones in a later release.

**Scheduled jobs** are started by Vercel's scheduler (`crons` in
`vercel.json`, production only), which opens their address with
`CRON_SECRET`: the weekly summary (`/api/cron/weekly-digest`, Mondays at
08:00 UTC) and the bank sync (`/api/cron/bank-sync`, every day at 06:00 UTC), which also
deletes expired demo companies. To try it by hand:
`curl -H "Authorization: Bearer $CRON_SECRET" https://<your domain>/api/cron/weekly-digest`.

**Security headers.** Every page tells the browser not to let other sites
frame it, to use HTTPS only, to keep page addresses private from other
sites, not to guess file types, and that Finely never uses the camera,
microphone or location (`headers()` in `next.config.ts`). It also gets a
strict **Content Security Policy** (`src/lib/csp.ts`, sent by `proxy.ts`):
only scripts carrying that page load's one-time code (a nonce) may run, and
the browser may only talk to Finely, Sentry and Plaid's bank login window.
Next.js puts the nonce on its own scripts, which is why every page is
rendered per request (`connection()` in `app/layout.tsx`); nothing is built
ahead of time. When the browser blocks something, it reports it to Sentry
(with a DSN set). Adding a script, style, font, image or service from
another address means adding it to `lib/csp.ts`; the end-to-end tests fail
if any page breaks the policy.

**In production only**, logins, sign-ups and password resets are rate
limited (too many tries from one IP address get "Too many requests").
The counts are kept in the database's `rate_limit` table.

