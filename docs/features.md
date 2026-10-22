# Features in detail

How each part of Finely works, for anyone changing it. For setting up a
copy and the code conventions, see [Development](development.md).

## How accounts work

Finely is for businesses, so everyone works inside a **company**
(an "organization" in the code). After signing up, people name their company
and become its **owner**. Owners and **admins** can invite teammates by email
from **Settings**, give them a role, remove them, and rename the company.
The roles, from most to least allowed:

| Role | What it may do |
| --- | --- |
| **Owner** | Everything; only the owner can pay for a plan, hand the company over or delete it |
| **Admin** | Manage the team, and everything an accountant may |
| **Accountant** | Manage the finances (accounts, categories, rules, cards, budgets, linked banks, the company's currency and timezone), delete transactions and bills, and read the activity log; not the team. For a bookkeeper or an outside advisor |
| **Member** | Add and edit transactions and bills, pay bills, attach files |
| **Viewer** | See everything, change nothing: the buttons to add, import, pay or save aren't shown, and windows open read-only |
 Everyone
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
category someone chose. Owners, admins and accountants manage rules, in Settings or by
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

## Company details and branches

**Settings → Company details** holds who the company officially is, as it
will appear on invoices: its registered name, country, tax number and tax
office, MERSİS and trade registry numbers, address, phone, email and
website. Everything is optional. For a company in Turkey, the tax number
must be a valid 10-digit VKN or a sole proprietor's 11-digit TCKN: their
check digits are verified, so a typo is caught when it's saved. Spaces,
dots and dashes typed inside numbers are taken out. Other countries' tax
numbers are kept as typed (letters and digits).

**Settings → Branches** lists the places the company works from, each with
a name, an optional short code ("IST", shown in capitals), address, city
and phone. One can be the **head office**; marking another one moves it
there. Names and codes are unique within a company, ignoring upper/lower
case. Warehouses and cost centers will belong to a branch (see the
[ERP roadmap](erp-roadmap.md)).

Owners and admins change both, as they rename the company; everyone else
sees them. Changes go in the activity log.

For developers: `lib/data/company-profile.ts` and `lib/data/branches.ts`;
the checksums are in `lib/finance/company-identity.ts` and the countries
(ISO 3166 codes, named in the reader's language) in
`lib/finance/countries.ts`.

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

Owners, admins and accountants can **Connect a bank** in Settings. A window from
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

## Languages

Finely speaks English and Turkish. A first visit follows the browser's
language (Turkish for a browser that prefers it, English for everything
else). The **EN / TR** switch in the header of the public pages, on the login
and sign-up pages and in the dashboard's top bar (on phones: **Settings →
Your account → Language**) changes it; the choice is kept in a cookie for a
year, and for someone who is logged in also on their account.

Everything is translated: the public pages (including the terms and the
privacy policy), signing up and logging in, the whole dashboard, error
messages, the bell, the CSV exports' column names and every email. Numbers
and dates follow the language too: `$1,234.56` and `Oct 8, 2026` in
English, `$1.234,56` and `8 Eki 2026` in Turkish. The company's currency
doesn't change with the language.

Some things are written in whoever's language was in use when they were
made, and stay that way: the default categories a new company starts with
(in its creator's language), and the names and notes of the demo company (in
the visitor's). The demo's transactions keep their English descriptions,
as a bank statement writes them. Emails go out in their recipient's
language: the one saved on their account, or for someone without one yet
(an invitation), the language of whoever sent it. The activity log is shown
in each reader's language (see [Activity log](#activity-log)).

For developers: see [Languages](development.md#languages) in the
development guide.

## Activity log

Every change in a company adds a line to its activity log: who did it, when,
and what ("Changed the transaction “Office rent”: amount from -$500.00 to
-$550.00"). It covers transactions (also imports and bulk categorizing),
bills, bank accounts and linked banks, categories and budgets, category
rules, attached files, the company's settings and the team (the company
being created, invitations, roles, removals, someone leaving, handing over).
A bank sync run by the daily job is recorded as done by "Finely". Owners,
admins and accountants read it under **Settings → See who changed what**, newest first, and
can narrow it down to one kind of thing, search it (part of what happened or
of a person's name) and download what's shown with **Export CSV** (up to
20,000 lines).

Lines are only ever added (`recordAudit()` in `lib/data/audit.ts`, called by
the data functions right after a change succeeded). **When you add a data
function that changes something, record it.** A line is kept as what
happened rather than as text: a sentence's key from
`i18n/messages/<language>/audit.ts` and what fills it in (names, amounts with
their currency, days, roles, a list of what changed), in the `details`
column. `renderAudit()` in `lib/finance/audit.ts` writes it out when the log
is read, so everyone reads the whole log in their own language. The English
sentence is saved too, in `summary`, for searching (and lines from before
`details` existed only have that). Team changes go through Better
Auth, so they're recorded from its hooks in `lib/auth.ts` (leaving has no
hook of its own there: it's caught by the `hooks.after` that looks at
`/organization/leave`).

## Receipts and attachments

When editing a transaction, **Add file** attaches a receipt or invoice: a
PDF, JPEG, PNG or WebP of at most 4 MB, up to 10 per transaction. Files are
saved as soon as they're chosen, and a paperclip in the list marks
transactions that have some. Everyone on the team can add and open files; the
person who added one, and owners, admins and accountants, can delete it. One file can be
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
deleting the payment leaves the bill paid. Owners, admins and accountants can **Undo** a
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
once per month. Owners, admins and accountants add, edit, archive and delete cards;
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
owners, admins and accountants). The dashboard then shows a **Budgets** card with, for each
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

