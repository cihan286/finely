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
import { fill } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

export default async function Footer({ signedIn = false }: { signedIn?: boolean }) {
  const { home, common } = await getMessages();
  const t = home.footer;
  // Keeps the copyright year current automatically
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footerContainer}>
      <div className={styles.topSection}>
        <div className={styles.brandSection}>
          <Link href="/" className={styles.brandLink}>
            <Logo />
          </Link>
          <p className={styles.description}>{t.description}</p>
        </div>

        {/* Four columns of links */}
        <div className={styles.linksGrid}>
          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>{t.product}</span>
            <Link href="/#features" className={styles.link}>
              {home.nav.features}
            </Link>
            <Link href="/#pricing" className={styles.link}>
              {home.nav.pricing}
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>{t.company}</span>
            <Link href="/about" className={styles.link}>
              {home.nav.about}
            </Link>
            <Link href="/contact" className={styles.link}>
              {home.nav.contact}
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>{t.legal}</span>
            <Link href="/terms" className={styles.link}>
              {t.terms}
            </Link>
            <Link href="/privacy" className={styles.link}>
              {t.privacy}
            </Link>
          </div>

          <div className={styles.linkColumn}>
            <span className={styles.columnTitle}>{t.account}</span>
            {signedIn ? (
              <>
                <Link href="/dashboard" className={styles.link}>
                  {t.yourDashboard}
                </Link>
                <Link href="/your-account" className={styles.link}>
                  {t.yourAccount}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.link}>
                  {common.logIn}
                </Link>
                <Link href="/signup" className={styles.link}>
                  {common.startForFree}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Copyright line */}
      <div className={styles.bottomSection}>
        <p>{fill(t.copyright, { year: currentYear })}</p>
        {/* Finely is a portfolio project: say so, and point to the code */}
        <p>
          {t.portfolioBy}{" "}
          <a
            href="https://www.linkedin.com/in/cihan-i%C5%9F%C4%B1k-1490b33a7"
            className={styles.sourceLink}
          >
            Cihan Işık
          </a>
          .{" "}
          <a href="https://github.com/cihan286/finely" className={styles.sourceLink}>
            {t.sourceCode}
          </a>
        </p>
      </div>
    </footer>
  );
}
