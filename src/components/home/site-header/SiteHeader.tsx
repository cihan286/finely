// ─────────────────────────────────────────────────────────────────────────────
// Site header
//
// In plain words: the bar at the top of the public pages other than the home
// page (About, Contact) — the logo, links back to the home page's sections,
// and the "Log in" and "Start for free" buttons (or, for someone who is
// logged in, "Open dashboard").
//
// For developers: the home page has its own navigation inside Hero.tsx,
// because there it sits on the hero's background and has a mobile menu.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import Button from "@/components/common/button/Button";
import Logo from "@/components/common/logo/Logo";
import styles from "./SiteHeader.module.css";

export default function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Finely home">
        <Logo />
      </Link>

      <nav className={styles.links} aria-label="Main">
        <Link className={styles.link} href="/#features">
          Features
        </Link>
        <Link className={styles.link} href="/#pricing">
          Pricing
        </Link>
        <Link className={styles.link} href="/about">
          About
        </Link>
        <Link className={styles.link} href="/contact">
          Contact
        </Link>
      </nav>

      <div className={styles.actions}>
        {signedIn ? (
          <Button variant="primary" size="sm" text="Open dashboard" href="/dashboard" />
        ) : (
          <>
            <Link className={styles.link} href="/login">
              Log in
            </Link>
            <Button variant="primary" size="sm" text="Start for free" href="/signup" />
          </>
        )}
      </div>
    </header>
  );
}
