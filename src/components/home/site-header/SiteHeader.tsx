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
import LanguageSwitcher from "@/components/common/language-switcher/LanguageSwitcher";
import { getMessages } from "@/i18n/server";
import styles from "./SiteHeader.module.css";

export default async function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const { home, common } = await getMessages();
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label={common.home}>
        <Logo />
      </Link>

      <nav className={styles.links} aria-label={home.nav.main}>
        <Link className={styles.link} href="/#features">
          {home.nav.features}
        </Link>
        <Link className={styles.link} href="/#pricing">
          {home.nav.pricing}
        </Link>
        <Link className={styles.link} href="/about">
          {home.nav.about}
        </Link>
        <Link className={styles.link} href="/contact">
          {home.nav.contact}
        </Link>
      </nav>

      <div className={styles.actions}>
        <LanguageSwitcher />
        {signedIn ? (
          <Button variant="primary" size="sm" text={common.openDashboard} href="/dashboard" />
        ) : (
          <>
            <Link className={styles.link} href="/login">
              {common.logIn}
            </Link>
            <Button variant="primary" size="sm" text={common.startForFree} href="/signup" />
          </>
        )}
      </div>
    </header>
  );
}
