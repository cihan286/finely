// ─────────────────────────────────────────────────────────────────────────────
// Footer
//
// In plain words: the bottom section of the public pages — the logo and a
// short description, link columns (Product, Company, Account) and the
// copyright line.
//
// For developers: every link here leads somewhere real. Add a link (Blog,
// Terms of service, social media…) only once its page or account exists.
// ─────────────────────────────────────────────────────────────────────────────

import styles from "./Footer.module.css";
import Link from "next/link";
import Logo from "../logo/Logo";

export default function Footer() {
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

        {/* Three columns of links */}
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
            <span className={styles.columnTitle}>Account</span>
            <Link href="/login" className={styles.link}>
              Log in
            </Link>
            <Link href="/signup" className={styles.link}>
              Start for free
            </Link>
          </div>
        </div>
      </div>

      {/* Copyright line */}
      <div className={styles.bottomSection}>
        <p>© {currentYear} Finely, Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
