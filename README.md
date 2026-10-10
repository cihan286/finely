# Finely

Financial clarity for modern businesses. Finely is a SaaS app that helps
businesses track expenses, follow their cash flow and turn financial data into
actionable insights.

**Status:** early development. The landing page, sign-up/login, business
accounts (companies with teams and invitations), bank accounts, transactions
(added by hand or imported from a bank's CSV), categories, the dashboard
and the Insights page all work with real data. Notifications in the top bar are still mock
data.

## How accounts work

Finely is for businesses, so everyone works inside a **company**
(an "organization" in the code). After signing up, people name their company
and become its **owner**. Owners and **admins** can invite teammates by email
from **Settings** and remove them; **members** can use Finely but can't change
the team. Someone who signs up through an invitation link joins that company
instead of creating their own.

New users get a "verify your email" email. They can use Finely right away (a
banner reminds them), but need a verified email to accept a team invitation.
Google sign-ins are verified automatically.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19 and the React Compiler
- TypeScript (strict mode)
- [Better Auth](https://www.better-auth.com) for authentication (email + password, Google)
- [Neon](https://neon.tech) Postgres with [Drizzle ORM](https://orm.drizzle.team)
- [Resend](https://resend.com) for emails (verification, password reset, invitations)
- CSS Modules with shared design tokens
- [Sentry](https://sentry.io) for error monitoring
- [Vercel](https://vercel.com) for hosting, GitHub Actions for CI
- [Recharts](https://recharts.org) for charts
- [Lucide](https://lucide.dev) for icons ([react-icons](https://react-icons.github.io/react-icons/) for brand logos)

## Getting started

Requirements: Node.js 20.9 or newer and a [Neon](https://neon.tech) database
(the free plan is enough).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill it in:
   - `DATABASE_URL`: your Neon connection string (Neon dashboard → **Connect**)
   - `BETTER_AUTH_SECRET`: a random secret; the file shows a command that makes one
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: optional, for "Continue with
     Google". The button stays hidden until both are set.
   - `RESEND_API_KEY` / `EMAIL_FROM`: optional in development. Without a key,
     emails (with their links) are printed in the terminal instead of sent.
     `EMAIL_FROM` must use a domain verified in Resend.
   - `NEXT_PUBLIC_SENTRY_DSN` and the other `SENTRY_*` values: optional.
     Without them, errors are only logged in the terminal.

3. Create the database tables:

   ```bash
   npm run db:migrate
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000), create an account at
[/signup](http://localhost:3000/signup), and you'll land on the dashboard.

### Scripts

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the development server                 |
| `npm run build`     | Create a production build (includes a type check) |
| `npm run start`     | Serve the production build                   |
| `npm run lint`      | Run ESLint                                   |
| `npm run typecheck` | Check types without building                 |
| `npm test`          | Run the automated tests once (Vitest)        |
| `npm run test:watch` | Re-run the tests on every change            |
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the database    |
| `npm run db:studio` | Browse the database in Drizzle Studio        |

## Project structure

```
src/
├── app/                    Routes (Next.js App Router)
│   ├── layout.tsx          Root layout: fonts, site metadata
│   ├── global-error.tsx    "Something went wrong" page (reports to Sentry)
│   ├── page.tsx            Landing page
│   ├── globals.css         Design tokens and base styles
│   ├── (auth)/             /login, /signup, password reset, /onboarding
│   │                       (company setup) and /accept-invitation/[id]
│   ├── api/auth/           Better Auth's API endpoints
│   └── dashboard/
│       ├── layout.tsx      Dashboard frame: sidebar + top bar
│       ├── loading.tsx     Placeholder shown while a dashboard page loads
│       ├── page.tsx        Dashboard overview
│       ├── transactions/   Transactions list, filters, add/edit and CSV import
│       ├── insights/       Trends over 3/6/12 months, vendors, unusual charges
│       └── settings/       Timezone, team, bank accounts and categories
├── components/
│   ├── common/             Shared across the app (Button, form fields, Dialog,
│   │                       Spinner, Logo, Footer)
│   ├── home/               Landing page sections
│   ├── auth/               Login/sign-up forms
│   └── dashboard/          Dashboard UI
├── db/                     Database connection and tables (Drizzle)
│   ├── schema.ts           Accounts and companies (generated by Better Auth)
│   └── finance.ts          Bank accounts, categories and transactions
├── lib/
│   ├── data/               Reading and saving company data (always use these)
│   ├── auth.ts             Better Auth server config
│   ├── email/              Sending emails (Resend) and their templates
│   ├── auth-client.ts      Auth functions for client components
│   ├── session.ts          getSession() / requireUser() / requireOrganization()
│   ├── roles.ts            Team roles (owner, admin, member) and their labels
│   ├── monitoring.ts       Sentry settings (what is and isn't sent)
│   ├── statement-import.ts Reading bank statement CSVs (dates, amounts, columns)
│   ├── dates.ts            Calendar days in a company's timezone
│   ├── dashboard-summary.ts The dashboard's calculations (tested)
│   ├── insights.ts         The Insights page's calculations (tested)
│   └── redirect.ts         Safe "return here after logging in" addresses
├── proxy.ts                Redirects logged-out visitors away from /dashboard
├── instrumentation.ts      Starts Sentry on the server
├── instrumentation-client.ts Starts Sentry in the browser
├── data/mockData.ts        Mock notifications (the only mock data left)
├── types/finance.ts        Types for accounts, categories, transactions, …
└── utils/
    ├── format.ts           Currency, number and date formatting
    └── csv.ts              Turning CSV text into rows and cells
```

Each component lives in its own folder next to its `.module.css` file.

## Deploying

Finely runs on [Vercel](https://vercel.com) with a Neon database. Every push
and pull request is checked by GitHub Actions (`.github/workflows/ci.yml`):
types, lint, tests, a production build, and that every schema change has a
committed migration.

One-time setup:

1. **Neon**: in the Vercel project, add the
   [Neon integration](https://vercel.com/integrations/neon). It sets
   `DATABASE_URL` and gives every preview deployment its own copy of the
   database (a Neon "branch"), so previews never touch production data.
2. **Vercel**: import the GitHub repository. Then, under **Settings →
   Environment Variables**:
   - All environments: `BETTER_AUTH_SECRET` (a different one from your
     local one), `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`,
     `GOOGLE_CLIENT_SECRET`, and the four `SENTRY_*` values.
   - Production only: `BETTER_AUTH_URL` set to the real address, e.g.
     `https://app.finely.com`. Previews leave it unset and use their own
     branch address.
3. **Google sign-in**: add `https://<your domain>/api/auth/callback/google`
   as a redirect URI in the Google Cloud console. Google sign-in only works
   on addresses listed there, so it won't work on previews.
4. **Sentry**: create a Next.js project at [sentry.io](https://sentry.io),
   then copy its DSN and an auth token into the variables above.

Deploying is then automatic: pushing to `main` deploys to production, and
every pull request gets a preview. Each deployment applies pending database
migrations before building (`vercel.json`), so migrations must keep working
for the version that's still running: add columns as optional first, and
remove old ones in a later release.

**In production only**, logins, sign-ups and password resets are rate
limited (too many tries from one IP address get "Too many requests").
The counts are kept in the database's `rate_limit` table.

## Conventions

**File headers.** Every file starts with a short header explaining what it is
"in plain words" (for anyone, including non-developers) and, where useful,
notes "for developers". Keep these up to date, and add one to new files.

**Colors and styling.** Don't hard-code colors in components. Use the tokens in
`src/app/globals.css` (`--primary`, `--text-muted`, `--border`, `--success`, …).
Charts use `--series-income` and `--series-expenses` for money in and out on
every page; `--success`/`--danger` mean good/bad and aren't series colors.
Dark mode is defined once there, so components using tokens get it for free.
The only exceptions are decorative backgrounds and the phone mockup
illustration.

**Buttons.** Use `components/common/button/Button` instead of styling a new
`<button>`. Pass `href` to render a link and `action` for a click handler.
`variant` is `primary`, `secondary` or `outline`; `size="sm"` gives the compact
style used in the dashboard. While its action runs, pass `loading` and a text
like "Saving" (no "…"): the button shows a spinner and can't be clicked again.
Other buttons use `components/common/spinner/Spinner` for the same look.

**Data.** Components read data that has the types in `src/types/finance.ts`.
Amounts are plain numbers and dates are ISO strings; formatting happens only in
`src/utils/format.ts`. The functions in `src/lib/data/` return these shapes.

**Form fields.** Use the components in `components/common/form/` instead of
styling a new `<input>`, `<select>` or `<textarea>`: wrap an `Input`,
`Select`, `Textarea` or `PasswordInput` in a `Field` for its label
(`<Field label="Email"><Input name="email" type="email" /></Field>`), and
show results with `Message` (`type` is `error`, `success` or `info`). A
component's own CSS only arranges fields (rows, widths); it never restyles
the boxes.

**Adding a dashboard page.** Create `src/app/dashboard/<name>/page.tsx`. It
automatically gets the sidebar and top bar from `dashboard/layout.tsx`, and
the loading placeholder from `dashboard/loading.tsx` while its data loads. The
sidebar already links to `transactions`, `insights` and `settings`.

**Protecting pages and data.** Call `requireOrganization()` from
`src/lib/session.ts` in every dashboard page and before reading company data.
It returns the user, their active company and their role, and redirects to
`/login` without a session or to `/onboarding` without a company. Use
`requireUser()` only for pages that don't belong to a company. `proxy.ts` only does a quick cookie check, and
layouts don't re-run when navigating between pages, so neither is enough on
its own.

**Company data.** Every table that holds business data (transactions, bills,
cards…) needs an `organization_id` column, and every query must filter by the
active company. Never take the company ID from the browser. Read and save
company data through the functions in `src/lib/data/` (`listTransactions()`,
`createAccount()`, …): each one looks up the active company and checks the
person's role itself, and checks what was typed. They throw a `DataError`
whose message is safe to show on screen. Members can add and edit
transactions; owners and admins can also delete them and manage accounts and
categories (`canManageFinances()` in `src/lib/roles.ts`).

**Dates and timezones.** Each company has a timezone (Settings; new
companies get their creator's). Moments are stored in UTC; a transaction's
calendar day is its moment in the company's timezone, worked out on the
server (`day` on every transaction, `localDay()` in `src/lib/dates.ts`). A
date entered without a time is stored as noon that day in the company's
timezone. Browser code only formats day strings (`formatDate`,
`formatRelativeDate` with the server's `today`), so the viewer's own
timezone never shifts a date.

**Money.** Amounts are stored as `numeric(14,2)` (exact cents) and come back
as plain numbers. An account's balance is its opening balance plus its
completed transactions; pending ones don't count yet.

**Changing the database.** Edit `src/db/finance.ts` (or add a new file and
list it in `drizzle.config.ts` and `src/db/index.ts`), run
`npm run db:generate` and commit the new file in `drizzle/`, then
`npm run db:migrate`. The auth tables in `src/db/schema.ts` are generated by
Better Auth: after changing auth plugins, run
`npx auth generate --config src/lib/auth.ts --output src/db/schema.ts`
instead of editing them by hand. (That command currently fails because
`auth.ts` imports `server-only` code, which only loads inside Next.js. Until
that's fixed, the `rate_limit` table was added by hand, matching what the
CLI generates.) CI fails if the schema changed without a committed migration.

**Errors and monitoring.** Uncaught errors on the server and in the browser
go to Sentry (`src/lib/monitoring.ts`). Expected problems are `DataError`s
shown on screen and aren't reported. Sentry is set up to send no personal or
financial data (no cookies, headers, form contents, query strings, database
values or variables), but error messages are sent, so never put customer
data such as names, emails or amounts in an error message.

**Forms.** Forms save through server actions (`actions.ts` next to the page)
that call `src/lib/data/` and return an `ActionState` (`src/lib/action-state.ts`)
with an error or success message. Submit them with `onSubmit` +
`startTransition` rather than `<form action>`: React clears `<form action>`
fields after every submit, which would wipe what was typed when the server
returns an error (see `TransactionDialog.tsx`).

**Tests.** Calculations live in pure functions (no database, no React) so
they can be tested: put a `*.test.ts` file next to the code (e.g.
`src/lib/statement-import.test.ts`) and run `npm test`. Pages and database
queries are checked by running the app.

**Server vs. client components.** Components are Server Components by default.
Add `"use client"` only to components that need state, effects or browser
APIs, and keep those as small as possible (see `CashFlowChart.tsx`).

## Importing bank statements

On the Transactions page, **Import CSV** reads a bank's CSV export in the
browser, guesses which columns hold the date, description and amount (one
signed column, or separate money in / money out columns), and shows a
preview before anything is saved. Dates can be year-month-day,
month/day/year or day/month/year; amounts can use `1,234.56` or `1.234,56`.
On import, lines already in the account (same day, amount and description)
are skipped, so importing the same statement twice is harmless. Category
names in the file are matched to the company's categories, ignoring case.
Up to 2,000 lines per file.

## Known limitations

- The top bar's notifications and search are placeholders. Bills and payment
  cards aren't built.
- Vendors (Insights) are transactions with the same description, ignoring
  case. Bank descriptions with changing reference numbers ("STRIPE ST-ABC1",
  "STRIPE ST-XYZ2") count as different vendors.
- Several footer links, "About" and "Contact sales" have no destination yet.
- Not built yet: changing a member's role, leaving or renaming a company,
  and switching between several companies.
