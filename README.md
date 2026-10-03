# Finely

Financial clarity for modern businesses. Finely is a SaaS app that helps
businesses track expenses, follow their cash flow and turn financial data into
actionable insights.

**Status:** early development. The landing page and the dashboard UI are built;
the dashboard runs on mock data. Authentication, a database and the remaining
dashboard pages are next.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19 and the React Compiler
- TypeScript (strict mode)
- CSS Modules with shared design tokens
- [Recharts](https://recharts.org) for charts
- [Lucide](https://lucide.dev) for icons ([react-icons](https://react-icons.github.io/react-icons/) for brand logos)

## Getting started

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). The dashboard is at
[/dashboard](http://localhost:3000/dashboard).

### Scripts

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the development server                 |
| `npm run build`     | Create a production build (includes a type check) |
| `npm run start`     | Serve the production build                   |
| `npm run lint`      | Run ESLint                                   |
| `npm run typecheck` | Check types without building                 |

## Project structure

```
src/
├── app/                    Routes (Next.js App Router)
│   ├── layout.tsx          Root layout: fonts, site metadata
│   ├── page.tsx            Landing page
│   ├── globals.css         Design tokens and base styles
│   └── dashboard/
│       ├── layout.tsx      Dashboard frame: sidebar + top bar
│       └── page.tsx        Dashboard overview
├── components/
│   ├── common/             Shared across the app (Button, Logo, Footer)
│   ├── home/               Landing page sections
│   └── dashboard/          Dashboard UI
├── data/mockData.ts        Mock data, shaped like the future API
├── types/finance.ts        Types for accounts, transactions, bills, …
└── utils/format.ts         Currency, number and date formatting
```

Each component lives in its own folder next to its `.module.css` file.

## Conventions

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

**Server vs. client components.** Components are Server Components by default.
Add `"use client"` only to components that need state, effects or browser
APIs, and keep those as small as possible (see `CashFlowChart.tsx`).

## Known limitations

- "Today" is fixed to 2026-10-01 in `mockData.ts` so the mock data's relative
  dates stay stable. This has to become the real current date once real data
  is connected.
- Several footer links, "About" and "Contact sales" have no destination yet.
- Sign-up and log-in buttons point to `/dashboard` until authentication exists.
