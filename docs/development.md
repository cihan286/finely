# Development

Running Finely locally, how the code is organized, and the conventions to
follow. How each feature works is in [Features in detail](features.md);
putting it online is in [Deploying](deploying.md).

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
| `npm run test:e2e`  | Use the app in a real browser (Playwright); see [Tests](#tests) |
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
│   ├── format.ts           Currency, number and date formatting, in either language
│   ├── money.ts            Exact sums, differences and rounding of money (tested)
│   ├── monitoring.ts       Sentry settings (what is and isn't sent)
│   └── redirect.ts         Safe "return here after logging in" addresses
├── i18n/                   English and Turkish (see Languages below)
│   ├── config.ts           The languages, fill() and plural()
│   ├── server.ts           getI18n(): the language of the request and its words
│   ├── client.tsx          useI18n(): the same, in client components
│   ├── actions.ts          setLocale(): what the EN / TR switch calls
│   ├── rich.tsx            Links and bold words inside a translated sentence
│   ├── auth-errors.ts      Better Auth's errors in the page's language
│   └── messages/           Every sentence: en/ and tr/, one file per area
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

## Conventions

**File headers.** Every file starts with a short header explaining what it is
"in plain words" (for anyone, including non-developers) and, where useful,
notes "for developers". Keep these up to date, and add one to new files.

**Colors and styling.** Don't hard-code colors in components. Use the tokens in
`src/app/globals.css` (`--primary`, `--text-muted`, `--border`, `--success`, …).
Every token used for text has at least 4.5:1 contrast (WCAG AA) on the
backgrounds it's used on; words in the warning color use `--warning-text`,
since amber itself is too light. A new text color has to pass the
accessibility test (see [Tests](#tests)).
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

<a id="languages"></a>
**Languages.** No sentence is written in a component: every word on screen
is in `src/i18n/messages/en/` (the source) and `src/i18n/messages/tr/`,
one file per area. `tr/` is typed with `en/`'s shape, so a sentence missing
in Turkish doesn't compile, and `i18n/messages.test.ts` checks that every
translation keeps its `{placeholders}` and `<tags>`. Server components and
server actions get the words with `const { locale, m } = await getI18n()`;
client components with `const { locale, m } = useI18n()`, which only has
the parts client components need (`clientMessages()` in
`i18n/messages/index.ts`: add a part there before using it in the
browser). Values go into sentences with `fill(m.bills.dueIn, { days })`, and
counts with `plural(count, m.bills.billCount)` (`{ one, other }`; Turkish
uses the same form for both). A link or bold words inside a sentence are
tags (`"Read our <privacy>Privacy policy</privacy>"`) that `rich()` in
`i18n/rich.tsx` fills in. Every formatting helper in `lib/format.ts` takes
the language last; pass it. Code that runs in the browser must not import
`@/i18n/messages` (it holds every sentence of both languages): take the
words as a parameter instead. The data functions report problems as
`new DataError("billNotFound")` with a key of `errors.ts`;
`errorMessage()` turns it into the person's language. Emails take their
recipient's language (`user.locale`), and the activity log stores what
happened rather than text (see [Activity log](features.md#activity-log)).

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
as plain numbers. Add, subtract, multiply and round them only with the
helpers in `src/lib/money.ts` (`sumMoney()`, `subtractMoney()`,
`roundMoney()`, `sameAmount()`…), never with `+` and `Math.round`: they
work in exact decimals, so 0.1 + 0.2 is 0.3 and half a cent goes away from
zero (1.005 → 1.01, -1.005 → -1.01). Totals over many rows are best summed
by Postgres (`sum()` is exact). An account's balance is its opening balance
plus its completed transactions; pending ones don't count yet.

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

**Server vs. client components.** Components are Server Components by default.
Add `"use client"` only to components that need state, effects or browser
APIs, and keep those as small as possible (see `CashFlowChart.tsx`).

## Tests

Calculations live in pure functions (no database, no React) so
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
secret), the demo (its sample data, what it refuses, and its deletion), the
security headers, phone-sized screens, what a person browsing would notice
(`e2e/ui.spec.ts`: dashboard pages scroll inside their panel, the 404 page,
a header that knows who's logged in, errors that come into view, list names
that fit on a phone), and accessibility: the public pages,
company setup and the demo's pages, dialogs and notifications panel are checked with axe
(WCAG 2.1 AA) in light and dark mode (`e2e/accessibility.spec.ts`; pages
that need a link from an email, like resetting a password, aren't). If it fails, it names the rule and the
element; most failures are text colors with too little contrast. To run them:

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
