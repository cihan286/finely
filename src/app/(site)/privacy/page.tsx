// ─────────────────────────────────────────────────────────────────────────────
// Privacy policy (finely.com/privacy)
//
// In plain words: what Finely knows about the people and companies using
// it, why, who else handles that information, and what people can do about
// it.
//
// For developers: every statement here describes what the code really does
// (sessions keep the IP address and browser, Sentry gets no personal or
// financial data, the only cookies are the login ones…). When that changes —
// a new service, analytics, a new kind of data — change this page and its
// "Last updated" date in the same commit. The text was not written by a
// lawyer: have one review it before relying on it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Finely collects, why, who else handles it, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <>
      <span className={styles.label}>Legal</span>
      <h1 className={styles.title}>Privacy policy</h1>
      <p className={styles.intro}>
        Finely holds your company&apos;s financial records, so here is plainly
        what we collect, what we do with it, and what we don&apos;t.
      </p>
      <p className={styles.updated}>Last updated: October 13, 2026</p>

      <section className={styles.section}>
        <h2 className={styles.heading}>Who this is about</h2>
        <p className={styles.text}>
          &ldquo;Finely&rdquo;, &ldquo;we&rdquo; and &ldquo;us&rdquo; mean
          Finely, Inc., which runs this website and the Finely app. This policy
          covers both. When a company uses Finely, that company decides what
          financial data goes in and who on its team can see it; we handle
          that data on the company&apos;s behalf.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>What we collect</h2>
        <ul className={styles.list}>
          <li>
            <strong>Your account.</strong> Your name, your email address and
            your password. The password is stored only in scrambled (hashed)
            form, so nobody, including us, can read it. If you sign in with
            Google, we receive your name, email address and profile picture
            from Google instead of a password.
          </li>
          <li>
            <strong>Your company&apos;s data.</strong> What you and your team
            enter or import: the company&apos;s name and timezone, bank account
            names with their last four digits and balances, transactions,
            the receipts and invoices attached to them, bills, categories,
            budgets and rules, and who is on the team with which role.
          </li>
          <li>
            <strong>Your bank&apos;s data, if you link a bank.</strong> When an
            owner or admin links the company&apos;s bank, we receive that
            bank&apos;s account names, the last digits of the account numbers,
            balances and transactions, and keep them up to date. You log in
            at your bank in a window from Plaid; we never see or store your
            bank login, and we can&apos;t move money. We do store a key that
            lets us read that data, encrypted, until the bank is
            disconnected.
          </li>
          <li>
            <strong>A record of changes.</strong> Who added, changed or
            deleted what in a company, and when, so its owners and admins can
            look it up.
          </li>
          <li>
            <strong>Your logins.</strong> For each login we keep when it
            started, the IP address and the browser it came from. In
            production we also count sign-in attempts per IP address for a
            short time, to stop people guessing passwords.
          </li>
          <li>
            <strong>Messages you send us.</strong> What you write in the
            contact form, with your name and email address. To stop abuse of
            the form, we count for an hour how many messages came from an IP
            address.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>What we use it for</h2>
        <ul className={styles.list}>
          <li>To show you and your team your company&apos;s finances.</li>
          <li>
            To send the emails the app needs: verifying your address,
            resetting your password, and team invitations.
          </li>
          <li>
            To email you about your company&apos;s money, if you want it: a
            weekly summary, and an alert when a charge is unusually high.
            These only go to verified addresses, and you can switch each off
            in Settings.
          </li>
          <li>To keep accounts secure and to find and fix errors.</li>
          <li>To answer you when you write to us.</li>
        </ul>
        <p className={styles.text}>
          We don&apos;t sell your data, we don&apos;t use it for advertising,
          and we don&apos;t look at your company&apos;s finances except when
          you ask us for help or when the law requires it.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Who else handles it</h2>
        <p className={styles.text}>
          We use a few companies to run Finely. They only get what they need
          for their part:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Vercel</strong> hosts the website and the app.
          </li>
          <li>
            <strong>Neon</strong> hosts the database where accounts and
            company data are stored.
          </li>
          <li>
            <strong>Resend</strong> delivers our emails, so it sees the
            recipient&apos;s address and the email&apos;s content (for the
            weekly summary and alerts, that includes the figures in them).
          </li>
          <li>
            <strong>Sentry</strong> receives reports when something breaks.
            We set it up to send no personal or financial data: no cookies,
            no form contents, no database values.
          </li>
          <li>
            <strong>Stripe</strong>, only if your company pays for a plan.
            Stripe takes the payment on its own pages: we never see card
            numbers. We keep which plan the company is on and Stripe&apos;s
            IDs for the customer and the subscription.
          </li>
          <li>
            <strong>Plaid</strong>, only if you link a bank. Plaid connects to
            your bank with the login you give it and passes us the accounts
            and transactions. Its own privacy policy applies to what it
            collects.
          </li>
          <li>
            <strong>Google</strong>, only if you choose &ldquo;Continue with
            Google&rdquo; to sign in.
          </li>
        </ul>
        <p className={styles.text}>
          Within your company, your teammates can see the company&apos;s data
          and each other&apos;s names, email addresses and roles.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Cookies</h2>
        <p className={styles.text}>
          Finely only uses the cookies needed to keep you logged in. There are
          no advertising cookies and no analytics that follow you around the
          web.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>How long we keep it</h2>
        <p className={styles.text}>
          We keep your account and your company&apos;s data for as long as
          they exist in Finely. A company&apos;s owner can delete the company
          in Settings, which removes its accounts, transactions, attached
          files, bills, categories, rules, bank links and record of changes
          right away. Disconnecting a bank ends our access to it; what was
          already imported stays until you delete it. Logins expire by themselves.
          Copies in backups disappear as those backups are replaced.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Your choices</h2>
        <p className={styles.text}>
          In Settings, under &quot;Your data&quot;, you can download a copy of
          what we hold about you, and delete your account yourself. Deleting
          it removes your profile, your logins and your place in every
          company right away; what you entered for a company stays with that
          company, and its record of changes keeps your name next to what you
          did. If you own a company, hand it over or delete it first.
          Depending on where you live, the law may give you further rights,
          such as having your data corrected, objecting to how we use it or
          complaining to your data protection authority. For those, or if you
          can&apos;t log in, <Link href="/contact" className={styles.inlineLink}>write to us</Link>.
          If the data belongs to a company you work for, we may point you to
          that company&apos;s owner.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Security</h2>
        <p className={styles.text}>
          Connections to Finely are encrypted, passwords are stored hashed,
          and every request for company data checks that you belong to that
          company. No system is perfectly safe, so please use a strong
          password and tell us right away if you think someone else got into
          your account.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Changes</h2>
        <p className={styles.text}>
          If we change this policy, we&apos;ll update this page and its date.
          If a change matters for how your data is used, we&apos;ll tell you
          by email or in the app first.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Contact</h2>
        <p className={styles.text}>
          Questions about this policy or your data?{" "}
          <Link href="/contact" className={styles.inlineLink}>Send us a message</Link>.
          See also our{" "}
          <Link href="/terms" className={styles.inlineLink}>Terms of service</Link>.
        </p>
      </section>
    </>
  );
}
