// ─────────────────────────────────────────────────────────────────────────────
// About page (finely.com/about)
//
// In plain words: what Finely is, who it's for, and how it treats a
// company's financial data.
//
// For developers: plain text, no data. Keep the claims in step with what the
// app really does (see the README).
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Button from "@/components/common/button/Button";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Finely gives a business one clear view of its money: what came in, what went out, and where it's heading.",
};

export default function AboutPage() {
  return (
    <>
      <span className={styles.label}>About</span>
      <h1 className={styles.title}>One clear view of your company&apos;s money</h1>
      <p className={styles.intro}>
        Finely is for businesses that want to know where they stand without
        living in spreadsheets. Bring in your bank statements, and Finely shows
        what came in, what went out, and what deserves a second look.
      </p>

      <section className={styles.section}>
        <h2 className={styles.heading}>What Finely does</h2>
        <ul className={styles.points}>
          <li className={styles.point}>
            <strong>Keeps every payment in one place.</strong> Add transactions
            by hand or import your bank&apos;s CSV export. Importing the same
            statement twice is harmless: lines you already have are skipped.
          </li>
          <li className={styles.point}>
            <strong>Sorts spending for you.</strong> Tell Finely once that
            &ldquo;AWS&rdquo; is Software &amp; IT, and it categorizes those
            payments from then on.
          </li>
          <li className={styles.point}>
            <strong>Shows where the money goes.</strong> Cash flow, spending by
            category and by vendor, and how much of your income you kept, over
            the last 3, 6 or 12 months.
          </li>
          <li className={styles.point}>
            <strong>Points out what&apos;s unusual.</strong> A charge well above
            what that vendor normally bills, an account below zero, a payment
            that has been pending for too long.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Built for teams</h2>
        <p className={styles.text}>
          Everyone works inside their company. Owners and admins invite
          teammates, decide who can manage accounts and categories, and can
          remove access at any time. If you work with several businesses, you
          can switch between them without logging out.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>How we treat your data</h2>
        <p className={styles.text}>
          A company&apos;s data is only ever shown to the people in that
          company. Finely never asks for your bank login: you choose what to
          bring in. Amounts are stored to the exact cent, and dates follow your
          company&apos;s own timezone, so the numbers match your bank&apos;s.
        </p>
      </section>

      <div className={styles.cta}>
        <Button variant="primary" text="Start for free" href="/signup" />
        <Button variant="secondary" text="Contact us" href="/contact" />
      </div>
    </>
  );
}
