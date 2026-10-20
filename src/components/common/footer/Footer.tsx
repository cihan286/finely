// ─────────────────────────────────────────────────────────────────────────────
// Footer
//
// In plain words: the bottom section of the public pages — the logo and a
// short description, link columns (Product, Company, Legal, Account) and
// the copyright line.
//
// For developers: every link here leads somewhere real. Add a link (Blog,
// social media…) only once its page or account exists.
// ─────────────────────────────────────────────────────────────────────────────

import styles from "./Footer.module.css";
import Link from "next/link";
import Logo from "../logo/Logo";

export default function Footer({ signedIn = false }: { signedIn?: boolean }) {
  // Keeps the copyright year current automatically
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footerContainer}>
      <div className={styles.topSection}>
        <div className={styles.brandSection}>
          <Link href="/" className={styles.brandLink}>
            <Logo />
          </Link>
          <p className={styles.description}>
            Expense tracking, cash flow and insights for growing businesses,
            all in one place.
          </p>
        </div>

        {/* Four columns of links */}
        <div className={styles.linksGrid}>
          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Product</span>
            <Link href="/#features" className={styles.link}>
              Features
            </Link>
            <Link href="/#pricing" className={styles.link}>
              Pricing
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Company</span>
            <Link href="/about" className={styles.link}>
              About
            </Link>
            <Link href="/contact" className={styles.link}>
              Contact
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Legal</span>
            <Link href="/terms" className={styles.link}>
              Terms of service
            </Link>
            <Link href="/privacy" className={styles.link}>
              Privacy policy
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>Account</span>
            {signedIn ? (
              <>
                <Link href="/dashboard" className={styles.link}>
                  Your dashboard
                </Link>
                <Link href="/your-account" className={styles.link}>
                  Your account
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.link}>
                  Log in
                </Link>
                <Link href="/signup" className={styles.link}>
                  Start for free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Copyright line */}
      <div className={styles.bottomSection}>
        <p>© {currentYear} Finely, Inc. All rights reserved.</p>
        {/* Finely is a portfolio project: say so, and point to the code */}
        <p>
          A portfolio project by cihan286.{" "}
          <a href="https://github.com/cihan286/finely" className={styles.sourceLink}>
            Source code on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
