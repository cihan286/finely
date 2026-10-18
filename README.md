# Finely

Financial clarity for modern businesses. Finely is a SaaS app that helps
businesses track expenses, follow their cash flow and turn financial data into
actionable insights.

**Status:** a portfolio project, in active development. The landing page, sign-up/login, business
accounts (companies with teams and invitations), bank accounts, transactions
(added by hand, imported from a bank's CSV or synced from a linked bank),
categories, the dashboard,
with receipts attached, bills, budgets, the Insights page (with the regular
payments it spots), a 30-day forecast, exports, search, notifications and
email notifications (a weekly summary and alerts), an activity log, a
currency per company, payment cards and paid plans through Stripe all work
with real data. **Try the demo** on the home page opens a company full of
sample data without signing up (see "The demo").

## How accounts work

Finely is for businesses, so everyone works inside a **company**
(an "organization" in the code). After signing up, people name their company
and become its **owner**. Owners and **admins** can invite teammates by email
from **Settings**, make them an admin or a member, remove them, and rename
the company; **members** can use Finely but can't change the team. Everyone
except the owner can leave a company (the **Leave** button next to their own
name). The owner can **hand the company over** to another member (and
becomes an admin, who can then leave) or **delete it** for everyone, with
all its data, after typing its name (both at the bottom of Settings). Someone who signs up through an invitation link joins that company
instead of creating their own.

Someone can belong to several companies (their own, plus ones they were
invited to). The company name in the top bar is a switcher with a **New
company** entry for setting up another one, and Finely remembers the last
company used, so the next login opens it.

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
   - `CONTACT_EMAIL`: your own inbox, where messages from the Contact page
     are sent. Needed once `RESEND_API_KEY` is set.
   - `CRON_SECRET`: any long random text; protects the scheduled jobs.
     Optional in development (without it the jobs refuse to run).
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the four
     `STRIPE_PRICE_*`: optional, for paid plans. Until all six are set,
     nothing can be bought and no plan limit applies. To get Stripe's
     messages in development, run
     `stripe listen --events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3000/api/stripe/webhook`
     (Stripe CLI; newer versions refuse to listen without `--events`) and
     use the webhook secret it prints.
   - `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` / `BANK_ENCRYPTION_KEY`:
     optional, for linking banks. "Connect a bank" stays hidden until the
     two Plaid keys and the encryption key are set. With `PLAID_ENV=sandbox`
     (the default) Plaid offers pretend banks: log in with `user_good` /
     `pass_good`.
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
| `npm run test:e2e:db` | Start a throwaway Postgres for the end-to-end tests (Docker) |
| `npm run test:e2e`  | Use the app in a real browser (Playwright); see "Tests" below |
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
│   ├── (site)/             /about, /contact, /terms, /privacy, /unsubscribe and
│   │                       /your-account, with the shared header and footer
│   ├── api/auth/           Better Auth's API endpoints
│   ├── api/cron/           The scheduled jobs Vercel runs: the weekly summary
│   │                       and the daily bank sync
│   ├── api/stripe/         Where Stripe tells us about subscriptions (webhook)
│   ├── api/email/          Where email apps' own "Unsubscribe" button calls
│   └── dashboard/
│       ├── layout.tsx      Dashboard frame: sidebar + top bar
│       ├── actions.ts      "Mark all as read" for the notifications
│       ├── loading.tsx     Placeholder shown while a dashboard page loads
│       ├── page.tsx        Dashboard overview
│       ├── transactions/   Transactions list, filters, add/edit, CSV import and
│       │                   export (export/route.ts answers with the file),
│       │                   attached files (attachments/[id]/route.ts)
│       ├── bills/          Bills to pay, add/edit, "Mark as paid", undoing a
│       │                   payment, and CSV export
│       ├── cards/          The company's payment cards and what each spent
│       ├── budgets/        This month's budgets as a CSV file (no page)
│       ├── insights/       Trends over 3/6/12 months, vendors, unusual charges,
│       │                   regular payments; CSV export and printing
│       └── settings/       Company name, timezone, team, linked banks, bank
│                           accounts, categories, category rules, emails;
│                           activity/ is the activity log, with its search
│                           and CSV export
├── components/
│   ├── common/             Shared across the app (Button, form fields, Dialog,
│   │                       Spinner, Logo, Footer)
│   ├── home/               Landing page sections, the other public pages' header
│   │                       and the contact form
│   ├── auth/               Login/sign-up forms
│   └── dashboard/          Dashboard UI
├── db/                     Database connection and tables (Drizzle)
│   ├── schema.ts           Accounts and companies (generated by Better Auth)
│   ├── e2e.ts              The connection the end-to-end tests use instead
│   └── finance.ts          Bank accounts and linked banks, categories, category
│                           rules, transactions and their attached files, bills,
│                           the activity log, when notifications were last read
│                           and which emails people want
├── lib/
│   ├── data/               Reading and saving company data (always use these);
│   │                       company.ts hands a company over or deletes it,
│   │                       person.ts is a person's own data and account,
│   │                       demo.ts starts and deletes demo companies
│   ├── finance/            Calculations, with no database or screen (tested)
│   │   ├── dashboard-summary.ts  The dashboard's numbers
│   │   ├── insights.ts           The Insights page's numbers
│   │   ├── bills.ts              When bills are due, and when they come back
│   │   ├── cards.ts              Card limits, and which card a line names
│   │   ├── budgets.ts            How much of each monthly budget is used
│   │   ├── recurring.ts          Spotting payments that come back regularly
│   │   ├── forecast.ts           Where the balance is heading in 30 days
│   │   ├── vendors.ts            Which descriptions are the same vendor
│   │   ├── notifications.ts      What the bell reports
│   │   ├── digest.ts             What the weekly summary email says
│   │   ├── attachments.ts        Which files can be attached
│   │   ├── bank-sync.ts          What to do with what a linked bank reports
│   │   ├── audit.ts              The activity log's wording
│   │   ├── plans.ts              What each plan includes
│   │   ├── currencies.ts         The currencies a company can work in
│   │   ├── search.ts             Telling an amount from text in a search
│   │   ├── category-rules.ts     Choosing a category from a description
│   │   ├── statement-import.ts   Reading bank statements (dates, amounts, columns)
│   │   ├── export.ts             The export files' rows and columns
│   │   ├── demo-data.ts          The demo company's made-up finances
│   │   └── csv.ts                Turning CSV text into rows and cells, and back
│   ├── bank/               Talking to banks through Plaid, and encrypting
│   │                       the banks' keys
│   ├── billing/            Talking to Stripe, and checking its messages
│   ├── rate-limit.ts       Slowing down repeated requests (the contact form)
│   ├── email/              Sending emails (Resend), their templates and
│   │                       their unsubscribe links
│   ├── after-response.ts   Doing work after the answer was sent
│   ├── app-url.ts          The site's own address, for links in emails
│   ├── auth.ts             Better Auth server config
│   ├── auth-client.ts      Auth functions for client components
│   ├── session.ts          getSession() / requireUser() / requireOrganization()
│   ├── roles.ts            Team roles (owner, admin, member) and their labels
│   ├── action-state.ts     What server actions read from forms and answer
│   ├── contact.ts          Checking a message from the Contact page (tested)
│   ├── demo.ts             Telling the demo's pretend people apart
│   ├── dates.ts            Calendar days in a company's timezone
│   ├── format.ts           Currency, number and date formatting
│   ├── monitoring.ts       Sentry settings (what is and isn't sent)
│   └── redirect.ts         Safe "return here after logging in" addresses
├── types/finance.ts        Types for accounts, categories, transactions, …
├── proxy.ts                Redirects logged-out visitors away from /dashboard
├── instrumentation.ts      Starts Sentry on the server
└── instrumentation-client.ts Starts Sentry in the browser
```

**Where new code goes.** Something that reads or saves company data goes in
`lib/data/`. A calculation on data that's already loaded goes in
`lib/finance/` with a test next to it. Anything shown on screen is a
component. There is no mock data: everything on screen comes from the
database.

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
     local one), `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL`,
     `CRON_SECRET` (any long random text), `PLAID_CLIENT_ID`, `PLAID_SECRET`,
     `PLAID_ENV` and `BANK_ENCRYPTION_KEY` (to offer linking banks),
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and the four
     `STRIPE_PRICE_*` (to offer paid plans; see "Plans and billing"),
     `GOOGLE_CLIENT_ID`,
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

**Scheduled jobs** are started by Vercel's scheduler (`crons` in
`vercel.json`, production only), which opens their address with
`CRON_SECRET`: the weekly summary (`/api/cron/weekly-digest`, Mondays at
08:00 UTC) and the bank sync (`/api/cron/bank-sync`, every day at 06:00 UTC), which also
deletes expired demo companies. To try it by hand:
`curl -H "Authorization: Bearer $CRON_SECRET" https://<your domain>/api/cron/weekly-digest`.

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
`<button>`. Pass `href` to render a link (with `download` when it's a file,
such as an export) and `action` for a click handler.
`variant` is `primary`, `secondary` or `outline`; `size="sm"` gives the compact
style used in the dashboard. While its action runs, pass `loading` and a text
like "Saving" (no "…"): the button shows a spinner and can't be clicked again.
Other buttons use `components/common/spinner/Spinner` for the same look.

**Data.** Components read data that has the types in `src/types/finance.ts`.
Amounts are plain numbers and dates are ISO strings; formatting happens only in
`src/lib/format.ts`. The functions in `src/lib/data/` return these shapes.

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
sidebar already links to `transactions`, `bills`, `insights` and `settings`;
add new pages to `NAV_LINKS` in `Sidebar.tsx`.

**Protecting pages and data.** Call `requireOrganization()` from
`src/lib/session.ts` in every dashboard page and before reading company data.
It returns the user, their active company and their role, and redirects to
`/login` without a session or to `/onboarding` without a company. Use
`requireUser()` only for pages that don't belong to a company. `proxy.ts` only does a quick cookie check, and
layouts don't re-run when navigating between pages, so neither is enough on
its own.

**Company data.** Every table that holds business data (transactions, bills,
cards…) needs an `organization_id` column, and every query must filter by the
active company. **Add each new table to `companyDeletionSteps()` in
`src/lib/data/company.ts`** (used by `deleteCompany()` and for expired demos), in an order its foreign keys allow, and to its
test. Never take the company ID from the browser. Read and save
company data through the functions in `src/lib/data/` (`listTransactions()`,
`createAccount()`, …): each one looks up the active company and checks the
person's role itself, and checks what was typed. They throw a `DataError`
whose message is safe to show on screen. Members can add and edit
transactions and bills (and mark bills as paid); owners and admins can also
delete them and manage accounts,
categories and category rules (`canManageFinances()` in `src/lib/roles.ts`).

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

**Emptying a database.** To delete all data, empty the tables in the `public`
schema only. Leave `drizzle.__drizzle_migrations` alone: it records which
migrations have run. If it's emptied while the tables still exist,
`npm run db:migrate` tries to create every table again and fails with
"relation … already exists" (on Vercel, the deploy fails). To start
completely fresh instead, drop both the `public` and `drizzle` schemas and
run `npm run db:migrate`.

**Changing the database.** Edit `src/db/finance.ts` (or add a new file and
list it in `drizzle.config.ts` and `src/db/index.ts`), run
`npm run db:generate` and commit the new file in `drizzle/`, then
`npm run db:migrate`. The auth tables in `src/db/schema.ts` are generated by
Better Auth: after changing auth plugins, run
`npx auth generate --config src/lib/auth.ts --output src/db/schema.ts`
instead of editing them by hand; it overwrites the file, so re-add the
comments afterwards. For the command to work, `auth.ts` must not import
`server-only` code at the top of the file (load it inside the hook that
needs it, as `afterCreateOrganization` does). CI fails if the schema changed without a committed migration.

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
`src/lib/finance/statement-import.test.ts`) and run `npm test`. The data
functions are tested against an in-memory Postgres with the real migrations
(`src/lib/data/isolation.test.ts`, helpers in `src/lib/data/testing.ts`):
they check that a company can't read or change another company's data and
that members can't do what only owners and admins may. **When you add a
function to `lib/data/`, add its "other company" case there.**

The end-to-end tests (`e2e/`, Playwright) use the real app in a real
browser against a real Postgres: signing up and logging in (and being
stopped after a few wrong passwords), adding transactions and importing a
CSV statement, inviting a teammate who joins as a member, one company not
seeing another's money, Stripe's signed messages changing the plan
(Stripe itself is never called: the tests sign the messages with a pretend
secret), the demo (its sample data, what it refuses, and its deletion), and
the security headers. To run them:

```bash
npm run test:e2e:db   # once: a throwaway Postgres in Docker, on port 5433
npm run test:e2e      # builds the app, then runs the tests
```

The database is wiped and migrated at the start of every run, so never
point `E2E_DATABASE_URL` at one whose data you want. The app is built with
`E2E=1` into `.next-e2e/`: it then talks to that Postgres with node-postgres
(`src/db/e2e.ts`) instead of Neon's driver, which only talks to Neon. A
local copy of the app that's already running on port 3100 is reused, so stop
it after changing code. Every test signs up its own people, so tests never
depend on each other. Things a browser can't do, like opening the link in
an email, are done in the database (`e2e/db.ts`). Linked banks (Plaid) and
Stripe's payment page aren't covered: both need the real services.

**Server vs. client components.** Components are Server Components by default.
Add `"use client"` only to components that need state, effects or browser
APIs, and keep those as small as possible (see `CashFlowChart.tsx`).

## The demo

**Try the demo** on the home page lets anyone look around without signing
up. Each press makes a fresh copy of a pretend design studio, Northpeak
Studio, and logs the visitor in as its owner, Maya Carter. The copy is full
of made-up data (`lib/finance/demo-data.ts`): half a year of transactions
(a client on a retainer, invoices, card payouts, payroll every two weeks,
rent, subscriptions, ads, coffee and taxis on a card), two accounts, two
cards (one over its limit), budgets (one exceeded), three bills (one
overdue), a teammate, a pending payment, a few uncategorized ones and one
unusually large cloud bill, so every page and the bell have something to
show. Dates are relative to the day the demo starts, in the visitor's
timezone.

Visitors can change anything: nobody else sees their copy. A banner under
the top bar says it's a demo and when it's deleted, with **Sign up for
real**, which logs out of it and opens the sign-up page.

- **It can't reach the outside world.** The pretend people's addresses end in
  `@demo.finely.invalid` (`lib/demo.ts`); `.invalid` can never receive mail,
  and `sendEmail()` doesn't even try. Inviting people, changing the email
  address and setting up another company are refused for them (`auth.ts`),
  and so are linking a bank and paying for a plan (`refuseInDemo()` in
  `lib/data/common.ts`). Use `refuseInDemo()` for anything new that reaches
  outside Finely.
- **It's deleted after a day**, with its pretend people and so their logins
  (`deleteExpiredDemos()` in `lib/data/demo.ts`): whenever a new demo starts,
  and by the daily bank-sync job. A demo company is one whose
  `company_settings.demo_expires_at` is set.
- **It's limited** to 5 new demos per IP address per hour.

## Importing bank statements

On the Transactions page, **Import CSV** reads a bank's CSV export in the
browser, guesses which columns hold the date, description and amount (one
signed column, or separate money in / money out columns), and shows a
preview before anything is saved. Dates can be year-month-day,
month/day/year or day/month/year; amounts can use `1,234.56` or `1.234,56`.
On import, lines already in the account (same day, amount and description)
are skipped, so importing the same statement twice is harmless. Category
names in the file are matched to the company's categories, ignoring case.
Lines without a known category get one from the company's category rules
("descriptions containing AWS are Software & IT"; the longest matching text
wins), and so do transactions added by hand without a category. Editing a
transaction never applies rules. Up to 2,000 lines per file.

## Categorizing transactions

A **category rule** says "descriptions containing this text get this
category" (Settings → Category rules; upper/lower case and extra spaces
don't matter, and the longest matching text wins). Rules fill in the category
of transactions that have none: imported ones, ones added by hand, and the
ones already there when a rule is added or changed. They never replace a
category someone chose. Owners and admins manage rules, in Settings or by
ticking **Always use this category** when adding or editing a transaction.

Everyone can also tick several transactions in the list and give them all
one category at once (up to 200).

## Currency

Each company keeps its books in one currency, chosen by an owner or admin in
Settings (US dollars until then; 27 to choose from, in
`lib/finance/currencies.ts`). Every amount on screen, in emails,
notifications and the activity log is shown in it. Nothing is converted:
changing the currency of a company that already has transactions relabels
them (100.00 USD becomes 100.00 EUR), so it's meant to be chosen once, at the
start. For currencies without cents (yen, won) the amount fields take whole
numbers (`amountInputProps()` in `lib/format.ts`), and what is typed or
imported is rounded to whole numbers when it's saved (`money()` in
`lib/data/common.ts`).

For developers: amounts stay plain numbers. `formatCurrency(amount, {
currency })` and `formatCompactCurrency(amount, currency)` format them; the
data functions get the currency from `getFinanceContext()`, pages from
`getCompanyLocale(organization.id)`, and components as a `currency` prop.
Without a currency both format US dollars, so a forgotten one shows the
wrong sign rather than failing: pass it everywhere.

## Plans and billing

Plans differ in how many people can be on a company's team
(`lib/finance/plans.ts`): Free 2, Starter 5, Growth 25, Enterprise no limit.
The prices and team sizes in that file are the ones both Settings and the
pricing section of the home page show.
A company without a subscription is on Free. That is the only limit that is
enforced: Better Auth refuses an invitation or a new member once the team is
full. Nobody is ever removed: a team that's already bigger than its plan
allows stays, it just can't grow.

The owner subscribes under **Settings → Plan & billing**. "Choose Starter"
or "Choose Growth" opens a payment page from Stripe (Finely never sees card
numbers); afterwards **Manage billing** opens Stripe's own page to change
plan or payment method, cancel, and find invoices. The plan only changes
when Stripe tells us so: it calls `/api/stripe/webhook` with
`customer.subscription.created`, `.updated` and `.deleted`, each signed
with `STRIPE_WEBHOOK_SECRET`. A message that isn't signed, or is older than
five minutes, is refused; late and repeated ones change nothing. While a
failed payment is being retried (`past_due`) the plan stays; once Stripe
gives up or the subscription is cancelled, the company is on Free again.
When a payment first fails, the company's owner gets an email saying so,
and another when the paid plan ends.
Deleting a company cancels its subscription at Stripe first, and handing one
over makes the new owner's address the one Stripe sends receipts to.

Two things keep a late or lost message from costing anyone money
(`settleCheckout()` in `lib/data/billing.ts`). The payment page that was last
opened for a company is remembered (`subscription.checkout_session_id`), and
whenever Settings is opened or a plan is chosen again, Finely asks Stripe how
that page ended: once it's paid, the plan is there right away, without
waiting for the message. And while that page is still open, choosing the
same plan again leads back to it, and choosing another plan closes it first,
so there is never more than one page that can be paid.

Setting it up: create two products with a monthly and a yearly recurring
price each in Stripe, add the webhook endpoint, switch on the customer
portal (Settings → Billing → Customer portal) with "switch plans" allowed
for those prices, and set the six `STRIPE_*` variables. Until all six are
set, the Plan & billing section is hidden and **no limit applies**, exactly
as before. **The moment they are set, every existing company is on Free**
with room for two people.

Enterprise isn't sold online: set `plan = 'enterprise'`, `status = 'active'`
in the company's `subscription` row by hand.

**Before relying on it:** this was built from Stripe's API documentation.
The automated tests use a pretend Stripe; subscribing was also tried by hand
in Stripe's test mode, but never in live mode. Go through subscribing,
switching plan and cancelling in test mode with your own Stripe account
first.

## Linked banks

Owners and admins can **Connect a bank** in Settings. A window from
[Plaid](https://plaid.com) lets them pick their bank and log in there;
Finely never sees that login. Finely then adds the bank's everyday and
savings accounts (those in the company's currency) and keeps their transactions up to date:
when the bank is linked, on **Sync now**, and once a day.

- New transactions get a category from the company's category rules.
- A pending payment that gets booked stays the same transaction, with the
  category, notes and receipts people added to it.
- Each sync continues where the last one stopped and is safe to repeat:
  nothing is added twice (`transaction.external_id`).
- The account's balance always follows the bank: its "opening balance" is
  set so that it plus the completed transactions equals what the bank says.
- A sync that fails says why next to the bank (for example "The bank asks
  you to log in again").
- **Disconnect** ends the link at Plaid; the accounts and transactions stay.

The key Plaid gives us to read a bank is stored encrypted with
`BANK_ENCRYPTION_KEY` (AES-256-GCM, `lib/bank/crypto.ts`), decrypted only in
`lib/data/bank.ts` right before a call, and never sent to the browser,
logged or put in an error message. `lib/bank/plaid.ts` is the only file that
knows Plaid; the rest uses the `BankProvider` interface in
`lib/bank/types.ts`, which the tests replace with a pretend bank.

**Before relying on it:** this was built from Plaid's API documentation and
tested against a pretend bank, not against Plaid itself. Try it in Plaid's
sandbox first, and apply for production access with Plaid (which includes
their security questionnaire) before real banks will work.

## Activity log

Every change in a company adds a line to its activity log: who did it, when,
and what ("Changed the transaction “Office rent”: amount from -$500.00 to
-$550.00"). It covers transactions (also imports and bulk categorizing),
bills, bank accounts and linked banks, categories and budgets, category
rules, attached files, the company's settings and the team (the company
being created, invitations, roles, removals, someone leaving, handing over).
A bank sync run by the daily job is recorded as done by "Finely". Owners and
admins read it under **Settings → See who changed what**, newest first, and
can narrow it down to one kind of thing, search it (part of what happened or
of a person's name) and download what's shown with **Export CSV** (up to
20,000 lines).

Lines are only ever added (`recordAudit()` in `lib/data/audit.ts`, called by
the data functions right after a change succeeded). **When you add a data
function that changes something, record it.** Team changes go through Better
Auth, so they're recorded from its hooks in `lib/auth.ts` (leaving has no
hook of its own there: it's caught by the `hooks.after` that looks at
`/organization/leave`).

## Receipts and attachments

When editing a transaction, **Add file** attaches a receipt or invoice: a
PDF, JPEG, PNG or WebP of at most 4 MB, up to 10 per transaction. Files are
saved as soon as they're chosen, and a paperclip in the list marks
transactions that have some. Everyone on the team can add and open files; the
person who added one, and owners and admins, can delete it. One file can be
chosen while adding a transaction; more are added by opening it afterwards.
Pictures are shown small in the list.

What kind a file is comes from its content, not its name, so a web page
called `receipt.pdf` is refused. Files are kept in the database, in the
`attachment` table (base64 text), not in a storage service: they're exactly
as private as the rest of the company's data, served only through
`/dashboard/transactions/attachments/<id>` after the usual company check,
and need no extra setup. The price is a database that grows with every
file; see the limitations.

## Email notifications

Two emails keep a team informed without opening Finely
(`lib/data/email-notifications.ts`):

- **Unusual charges.** When a transaction is added or imported and is at
  least 50% above what its vendor usually charges (the same rule as on the
  Insights page), the team is emailed right away, once per import.
- **Weekly summary.** Every Monday: the last seven days' money in, out and
  net, what's in the bank, the top spending categories, and what needs a
  look (overdue bills, bills due this week, exceeded budgets, unusual
  charges). A company gets none in a week when nothing happened and nothing
  is due, and never two within six days.

The person a company is handed over to gets an email saying so, and when an
owner deletes a company, everyone else on its team is told
(`lib/data/company.ts`). These two can't be switched off.

Each person chooses in **Settings → Email notifications** which of the
first two they get, per company. Both also end with an **Unsubscribe** link
that stops that kind of email for that company without logging in: it opens
`/unsubscribe`, which asks to confirm with one button (mail scanners open
every link, so opening it changes nothing). Email apps that show their own
"Unsubscribe" button call `/api/email/unsubscribe` instead
(`List-Unsubscribe` headers). The link is signed with `BETTER_AUTH_SECRET`
(`lib/email/unsubscribe.ts`), so changing that secret breaks the links in
emails already sent. Until they choose, they get both
(`DEFAULT_EMAIL_PREFERENCES` in `lib/finance/digest.ts`). Only verified
email addresses get these emails. Without `RESEND_API_KEY` they're printed
in the terminal, like every other email.

## Bills

A **bill** is a payment the company owes: who to, how much, when it's due and
whether it repeats (every week, 2 weeks, month, 3 months or year). The Bills page
lists what's still owed, soonest first, with what's overdue and due in the
next 7 days added up at the top.

**Mark as paid** asks which account the money left and on which day, and
then records the payment as a completed transaction in that account (with the
bill's name and category; without a category, the category rules apply). If
a transaction of exactly the bill's amount is already there within 45 days
of the due date — it came with a bank statement or a linked bank — the
window offers it as the payment instead, and choosing it adds nothing: the
bill points at that transaction, so the payment isn't counted twice. A
bill that repeats gets its next one at the same moment, due one period after
the paid bill's due date (not after the payment day). A day the next month
doesn't have becomes its last day (Jan 31 → Feb 28), and the bill after that
continues from there (Mar 28).

A payment that arrives by itself pays its bill too. When transactions come
in — an imported statement, a linked bank's sync, or one typed in — each
unpaid bill is checked against the new money-out lines
(`matchBillPayments()` in `lib/finance/bills.ts`), and marked as paid with
that line when three things agree: the amount is exactly the bill's, the
description names the same vendor (the bill's name appears in it word for
word, or the other way round: "Figma" and "FIGMA INC. INV-1004"), and the
day is close to the due date (up to 10 days early and 17 late for a monthly
bill, 45 late for one that doesn't repeat, a few days for weekly ones). The
transaction itself isn't changed, the import says how many bills it paid,
and the activity log has a line for each. A statement covering several
months pays each month's bill in turn. When only the amount and the date
fit, nothing is decided: the bill gets a note on the Bills page ("A payment
of this amount is already in your transactions") and the bell says so, for
a person to check with "Mark as paid".

The same check covers a bill someone already marked as paid by hand. If
its payment then arrives with an import or a bank sync, the transaction
that "Mark as paid" recorded would be a second copy: it's removed, its
notes, category and files move to the arrived one, and the bill points at
that. A transaction typed in by hand never removes anything.

Paid bills can't be edited; the last 20 are listed (**Show all paid bills**
lists up to 500) with a link to their payment. Deleting a paid bill leaves its payment in the transactions, and
deleting the payment leaves the bill paid. Owners and admins can **Undo** a
payment: the bill is owed again, the transaction that "Mark as paid" recorded
is deleted (one that was already there stays), and the next bill of a
repeating one is removed unless someone changed or paid it since.

## Payment cards

The **Cards** page lists the company's payment cards: the ones its bank
issued. Finely doesn't issue cards and can't block one; it keeps track of
who spends what. A card has a name, the last four digits of its number (the
full number is never asked for), optionally the team member who carries it,
and optionally a **monthly limit**. Each card shows what was paid with it
this month against that limit (blue, amber from 80%, red once it's over),
and links to its payments. When a card goes over its limit, the bell says so
once per month. Owners and admins add, edit, archive and delete cards;
everyone on the team sees them.

A transaction can say which card paid it ("Paid with" in its window, and a
**Card** filter on the Transactions page). For money out that arrives without
one — typed in, imported or synced from a bank — the card is taken from the
description when it names one the way banks do: "CARD 4821", "**** 4821",
"ending in 4821" (`cardFromDescription()` in `lib/finance/cards.ts`). Four
digits that aren't presented as a card's, like an invoice number, don't
count.

An **archived** card (cancelled or expired) keeps its past payments but
can't be chosen or recognized any more. Deleting a card leaves its
transactions in place, without a card. Like the budgets, only completed
money out counts, in the calendar month of the company's timezone.

## Budgets

A "Money out" category can have a **monthly budget** (Settings → Categories,
owners and admins). The dashboard then shows a **Budgets** card with, for each
one, what was spent since the first of the month and what's left: blue while
it's fine, amber from 80% used, red once it's exceeded. Clicking one opens
that category's transactions of the month.

Only completed money out counts (pending payments and refunds don't), and the
month is the calendar month in the company's timezone. A budget is the same
every month and unused money doesn't carry over. The bell says so once per
month when a category has used 80% of its budget, and again when it goes
over.

A company can also have one **overall monthly budget** (Settings → Overall
monthly budget) for everything it spends, whatever the category. It's the
first line of the Budgets card, "All spending", and gets the same warnings.

## Exports

**Export CSV** on the Transactions page downloads every transaction the
current search and filters show (all pages of them, newest first, up to
20,000): date, description, category, account, amount, status and notes.
**Export CSV** on the Insights page downloads that period's figures: totals,
month by month, spending by category, top vendors, regular payments and
unusual charges, as small tables in one file. **Export CSV** on the Bills
page downloads every bill, unpaid and paid, and the one on the dashboard's
Budgets card this month's budgets with what was spent and what's left. The
activity log has its own (see above). In all of them, amounts are plain
numbers with a dot (`-1234.50`) and dates are year-month-day, so any
spreadsheet or accounting program reads them the same way, and text that a
spreadsheet would run as a formula is made harmless.

**Print / Save as PDF** on the Insights page opens the browser's print
window, where every browser can save a PDF. The printout leaves out the
menu, the top bar and the buttons.

## Your own account

At the bottom of Settings, everyone has a few things for themselves
(`lib/data/person.ts`). Someone who has no company, and so no Settings,
finds the same at `/your-account` (linked from the company setup page).

- **Your name** can be corrected; teammates see the new one everywhere
  except in what the activity logs already recorded.
- **Your email address** can be changed: Finely sends a link to the new
  address, and the address only changes once that link is opened.
- **Your password** can be changed by typing the current one (for people
  who sign in with a password); every other device is logged out.
- **Download my data** saves a JSON file with what Finely holds about the
  person: profile, how they sign in, where they're logged in, their
  companies with their email choices, the invitations they sent, and what
  the activity logs say they did. Passwords and sign-in tokens are never in
  it, and neither are a company's transactions, bills or files: those belong
  to the company.
- **Delete my account** removes the person for good, after they typed their
  email address. Their memberships, logins, sign-in methods, email choices
  and invitations (sent, and sent to them) go right away, each company's
  activity log gets a line saying they left, and they get a last email.
  What they entered for a company stays, with "entered by" emptied. Someone
  who owns a company has to hand it over or delete it first.

## Terms and privacy

`/terms` and `/privacy` (linked from the footer and the sign-up page)
describe what Finely really does: what it stores, the services it relies on
(Vercel, Neon, Resend, Sentry, Google sign-in) and that its only cookies are
the login ones. **Keep the privacy policy true:** when a service, a cookie
or a kind of stored data is added, change the page and its "Last updated"
date in the same commit. They're plain descriptions, not legal documents.

## Regular payments and the forecast

Finely looks through the last 400 days of completed transactions for
payments that come back like clockwork: subscriptions, rent, payroll, a
customer who pays every month (`lib/finance/recurring.ts`). A payment counts
as regular when the same vendor was paid on at least three different days, at
least three quarters of the gaps between them fit one rhythm (every week, 2
weeks, month or 3 months, give or take a few days), the latest gap fits too,
and the next one isn't long overdue (then it was probably cancelled). Yearly
payments (insurance, a domain name) are looked for in the last 800 days: two
payments about a year apart are enough, if their amounts are within 10% of
each other and no shorter rhythm fits.
Several payments to one vendor on the same day count as one, so payroll for
five people is one regular payment. Money in and money out are looked at
separately.

The Insights page lists them under **Regular payments** with the usual
amount ("~" when it varies), what it adds up to per month and when the next
one is expected. **Not regular** on a line hides a payment that only looks
regular (three unrelated purchases from one shop): it's left out of the
list, the forecast and the Bills page's suggestions until someone presses
**Show again** under the list. **Add as bill** opens the Bills page with the form filled
in; the Bills page also says how many regular payments aren't bills yet.

The dashboard's **Forecast** starts from today's balances and adds what's
expected in the next 30 days: unpaid bills (an overdue one counts today),
payments that are still pending (they aren't in the balance yet; one dated in
the past counts today), and regular payments and regular income. A regular
payment that is already an unpaid bill is counted once, as the bill, and so
is a pending payment of a bill's amount whose description names the bill. It shows the expected balance, the
lowest point on the way, and what's coming up. If the balance is expected to
drop below zero, the bell warns. It's an estimate: one-off income and
spending that nobody entered yet aren't in it.

## Search and notifications

The Bills page has its own search (name, notes or category), and when the
top bar's search also matches bills, the Transactions page says how many and
links to them. The search box in the top bar opens the Transactions page with what matches
(the same search as that page's own filter): part of a description, of the
notes, of a category's name or of a bank account's name, or the exact amount ("45", "$1,234.50"),
whether money in or out.

The bell reports what deserves a look in the company's books: a charge at
least 50% above what that vendor usually charges, an account below zero, a
balance expected to drop below zero within 30 days,
a category over its monthly budget or at 80% of it, bills that are overdue or due within a
week or that a payment already there may have paid, payments pending for more than a week, and transactions without a category.
Clicking one opens the place to deal with it. Notifications aren't stored:
they're worked out from the data each time (`lib/finance/notifications.ts`)
and disappear once the cause is gone. Only the moment each person pressed
**Mark all as read** is saved, per company; anything newer is unread. While
a page sits open, the bell asks again every two minutes and whenever the tab
comes back into view.

## Known limitations

Finely is a portfolio project. It aims to have what a SaaS app for
businesses needs, and it isn't meant to be run for paying customers as it
is. What's missing at that level:

- **Payment cards** are for keeping track of cards the company's bank
  issued: Finely doesn't issue cards, and a limit warns but can't stop a
  payment. A card is only recognized in a description that shows its last
  four digits.
- **Currencies:** one per company. There are no accounts in other
  currencies and nothing is converted.
- **Bills** can't be paid in parts. A payment that arrives pays its bill by
  itself only when the amount is exact and the description contains the
  bill's name; otherwise it's pointed out for a person to confirm.
- **Budgets** are the same every month: unused money doesn't carry over and
  one month can't have a different amount.
- **Vendors and regular payments** are recognized by description. Different
  spellings of one vendor ("AMZN", "Amazon") count as different vendors and
  can't be merged by hand, and a regular payment's rhythm or amount can't be
  corrected (only hidden).
- **The forecast** knows unpaid bills, pending payments and regular
  payments, not one-off income or day-to-day spending.
- **Notifications:** only unusual charges are emailed right away, and the
  weekly summary goes out at the same moment whatever the company's
  timezone.
- **Linked banks** were only tried in Plaid's sandbox: US banks, everyday
  and savings accounts. A bank that asks to log in again has to be linked
  again, and syncing is once a day or on demand.
- **Plans** were only tried in Stripe's test mode. They differ in team size
  only, are priced in US dollars and have no free trial.
- **Attached files** are kept in the database, and PDFs have no preview.
- **Your account:** someone who signs in with Google can't add a password.
- **Exports** are CSV files, plus the browser's "Save as PDF" on the
  Insights page.
- **Deleting a company** is immediate: there's no grace period.
- **Terms and privacy** describe what the app really does in plain words;
  they aren't legal documents.
