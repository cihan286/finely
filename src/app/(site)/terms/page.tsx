// ─────────────────────────────────────────────────────────────────────────────
// Terms of service (finely.com/terms)
//
// In plain words: the agreement between Finely and the people and companies
// using it — what Finely is, what you may and may not do with it, who owns
// the data, and what happens when things go wrong.
//
// For developers: plain text, no data. Update "Last updated" with every
// change. The text was not written by a lawyer, and it leaves out what only
// the business can decide (the governing law and courts, refunds, a
// liability cap in figures): have a lawyer review and complete it before
// relying on it.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The agreement between Finely and the people and companies using it.",
};

export default function TermsPage() {
  return (
    <>
      <span className={styles.label}>Legal</span>
      <h1 className={styles.title}>Terms of service</h1>
      <p className={styles.intro}>
        These terms are the agreement between you and Finely, Inc. when you
        use the Finely website and app. By creating an account you accept
        them.
      </p>
      <p className={styles.updated}>Last updated: October 13, 2026</p>

      <section className={styles.section}>
        <h2 className={styles.heading}>1. What Finely is</h2>
        <p className={styles.text}>
          Finely helps businesses keep track of their money: transactions,
          bills, budgets and what they add up to. It shows you your own
          records in a clearer way. It is not a bank, it doesn&apos;t move
          money, and it doesn&apos;t give accounting, tax, legal or investment
          advice. Forecasts and other estimates are just that: estimates.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>2. Your account</h2>
        <ul className={styles.list}>
          <li>Give us a real name and an email address you can read.</li>
          <li>
            Keep your password to yourself. You&apos;re responsible for what
            happens under your account; tell us right away if someone else
            got in.
          </li>
          <li>
            You must be old enough to enter into a contract, and allowed to
            act for the company you set up or join.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>3. Companies and teams</h2>
        <p className={styles.text}>
          Everyone works inside a company. The person who sets a company up
          is its owner. Owners and admins decide who is invited, what role
          each person has and who is removed. The owner can hand the company
          over to another member, or delete it with all its data. The company
          is responsible for what its team does in Finely.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>4. Your data</h2>
        <p className={styles.text}>
          The data you and your team put into Finely stays yours. You give us
          permission to store and process it only to provide Finely to you.
          You&apos;re responsible for having the right to put it there, and
          for its accuracy. How we handle personal data is described in our{" "}
          <Link href="/privacy" className={styles.inlineLink}>Privacy policy</Link>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>5. What you may not do</h2>
        <ul className={styles.list}>
          <li>Use Finely for anything unlawful, or to deceive anyone.</li>
          <li>
            Try to reach another company&apos;s data, or get around
            Finely&apos;s security.
          </li>
          <li>
            Overload or disrupt Finely, or use automated tools against it
            without our agreement.
          </li>
          <li>Copy, resell or reverse-engineer Finely.</li>
        </ul>
        <p className={styles.text}>
          We may suspend an account that does any of this.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>6. Plans and payment</h2>
        <p className={styles.text}>
          Finely has a free plan and paid plans, which differ in how many
          people can be on a company&apos;s team. A paid plan is a
          subscription that the company&apos;s owner starts and pays for
          through Stripe; it renews each month or year until it&apos;s
          cancelled, which the owner can do at any time under Settings. A
          cancelled plan stays active until the end of the period already
          paid for. The price is shown before you commit to it, and nothing
          is charged without your agreement. If we change prices, we&apos;ll
          tell you in advance, and you can stop before the new price applies.
          Deleting a company ends its subscription.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>7. Availability and changes</h2>
        <p className={styles.text}>
          We work to keep Finely running and your data safe, but we
          don&apos;t promise that it will always be available or free of
          errors. We may add, change or remove features. Keep your own copies
          of records you can&apos;t afford to lose; you can export your
          transactions at any time.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>8. Ending</h2>
        <p className={styles.text}>
          You can stop using Finely whenever you like. A company&apos;s owner
          can delete the company and its data in Settings, and you can ask us
          to delete your account. We may end or suspend your access if you
          break these terms, or if we stop offering Finely; where we
          reasonably can, we&apos;ll warn you first so you can export your
          data.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>9. Our responsibility</h2>
        <p className={styles.text}>
          Finely is provided as it is. As far as the law allows, we
          aren&apos;t liable for indirect losses, such as lost profit, lost
          business or decisions made on the basis of figures shown in Finely.
          Nothing in these terms limits liability that can&apos;t be limited
          by law.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>10. Changes to these terms</h2>
        <p className={styles.text}>
          If we change these terms, we&apos;ll update this page and its date,
          and tell you by email or in the app before a change that matters
          takes effect. Using Finely after that means you accept the new
          terms.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>11. Contact</h2>
        <p className={styles.text}>
          Questions about these terms?{" "}
          <Link href="/contact" className={styles.inlineLink}>Send us a message</Link>.
        </p>
      </section>
    </>
  );
}
