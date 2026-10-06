# Finely

Financial clarity for modern businesses. Finely is a SaaS app that helps
businesses track expenses, follow their cash flow and turn financial data into
actionable insights.

**Status:** early development. The landing page, sign-up/login, business
accounts (companies with teams and invitations) and the dashboard UI are built.
Accounts and companies are real; the dashboard's financial figures are still
mock data.

## How accounts work

Finely is for businesses, so everyone works inside a **company**
(an "organization" in the code). After signing up, people name their company
and become its **owner**. Owners and **admins** can invite teammates by email
from **Settings** and remove them; **members** can use Finely but can't change
the team. Someone who signs up through an invitation link joins that company
instead of creating their own.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19 and the React Compiler
- TypeScript (strict mode)
- [Better Auth](https://www.better-auth.com) for authentication (email + password, Google)
- [Neon](https://neon.tech) Postgres with [Drizzle ORM](https://orm.drizzle.team)
- CSS Modules with shared design tokens
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
| `npm run db:generate` | Create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the database    |
| `npm run db:studio` | Browse the database in Drizzle Studio        |

## Project structure

```
src/
├── app/                    Routes (Next.js App Router)
│   ├── layout.tsx          Root layout: fonts, site metadata
│   ├── page.tsx            Landing page
│   ├── globals.css         Design tokens and base styles
│   ├── (auth)/             /login, /signup, password reset, /onboarding
│   │                       (company setup) and /accept-invitation/[id]
│   ├── api/auth/           Better Auth's API endpoints
│   └── dashboard/
│       ├── layout.tsx      Dashboard frame: sidebar + top bar
│       ├── page.tsx        Dashboard overview
│       └── settings/       Team settings: members and invitations
├── components/
│   ├── common/             Shared across the app (Button, Logo, Footer)
│   ├── home/               Landing page sections
│   ├── auth/               Login/sign-up forms
│   └── dashboard/          Dashboard UI
├── db/                     Database connection and schema (Drizzle)
├── lib/
│   ├── auth.ts             Better Auth server config
│   ├── auth-client.ts      Auth functions for client components
│   ├── session.ts          getSession() / requireUser() / requireOrganization()
│   ├── roles.ts            Team roles (owner, admin, member) and their labels
│   └── redirect.ts         Safe "return here after logging in" addresses
├── proxy.ts                Redirects logged-out visitors away from /dashboard
├── data/mockData.ts        Mock data, shaped like the future API
├── types/finance.ts        Types for accounts, transactions, bills, …
└── utils/format.ts         Currency, number and date formatting
```

Each component lives in its own folder next to its `.module.css` file.

## Conventions

**File headers.** Every file starts with a short header explaining what it is
"in plain words" (for anyone, including non-developers) and, where useful,
notes "for developers". Keep these up to date, and add one to new files.

**Colors and styling.** Don't hard-code colors in components. Use the tokens in
`src/app/globals.css` (`--primary`, `--text-muted`, `--border`, `--success`, …).
Dark mode is defined once there, so components using tokens get it for free.
The only exceptions are decorative backgrounds and the phone mockup
illustration.

**Buttons.** Use `components/common/button/Button` instead of styling a new
`<button>`. Pass `href` to render a link and `action` for a click handler.
`variant` is `primary`, `secondary` or `outline`; `size="sm"` gives the compact
style used in the dashboard.

**Data.** Components read data that has the types in `src/types/finance.ts`.
Amounts are plain numbers and dates are ISO strings; formatting happens only in
`src/utils/format.ts`. When the real backend arrives, it should return the same
shapes, so components don't need to change.

**Adding a dashboard page.** Create `src/app/dashboard/<name>/page.tsx`. It
automatically gets the sidebar and top bar from `dashboard/layout.tsx`. The
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
active company from `requireOrganization()`. Never take the company ID from
the browser.

**Changing the database.** Edit `src/db/schema.ts`, run `npm run db:generate`
and commit the new file in `drizzle/`, then `npm run db:migrate`. The auth
tables are generated by Better Auth: after changing auth plugins, run
`npx auth generate --config src/lib/auth.ts --output src/db/schema.ts`
instead of editing them by hand.

**Server vs. client components.** Components are Server Components by default.
Add `"use client"` only to components that need state, effects or browser
APIs, and keep those as small as possible (see `CashFlowChart.tsx`).

## Known limitations

- "Today" is fixed to 2026-10-01 in `mockData.ts` so the mock data's relative
  dates stay stable. This has to become the real current date once real data
  is connected.
- Several footer links, "About" and "Contact sales" have no destination yet.
- Password reset emails aren't sent yet: the reset link is printed in the
  terminal running the server. An email service (e.g. Resend) is needed
  before launch.
- Invitation emails aren't sent yet either: the invitation link is printed in
  the terminal too.
- Email addresses aren't verified on sign-up yet. Once they are, set
  `requireEmailVerificationOnInvitation: true` in `src/lib/auth.ts`.
- Every company sees the same mock financial data for now.
- Not built yet: changing a member's role, leaving or renaming a company,
  and switching between several companies.
