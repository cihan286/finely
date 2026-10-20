// ─────────────────────────────────────────────────────────────────────────────
// Hero — the top section of the home page
//
// In plain words: the first thing visitors see. It has the navigation bar
// (logo, links, "Start for free" and "Log in", or "Open dashboard" for
// someone logged in), the main headline with its
// buttons ("Get Started" and "Try the demo"), and the phone picture on the right. On small screens the links move
// into a menu that opens with the ☰ button.
//
// For developers: a client component ("use client") because the mobile menu
// opens and closes in the browser.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import styles from "./Hero.module.css";
import Button from "@/components/common/button/Button";
import Link from "next/link";
import PhoneMockup from "../phone-mockup/PhoneMockup";
import DemoButton from "../demo-button/DemoButton";
import Logo from "@/components/common/logo/Logo";
import LanguageSwitcher from "@/components/common/language-switcher/LanguageSwitcher";
import { useI18n } from "@/i18n/client";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Hero({ signedIn = false }: { signedIn?: boolean }) {
  const { m } = useI18n();
  const t = m.home;
  // Whether the mobile menu is open
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Whether the menu has been used yet. Until then it has no open/close
  // animation, so it doesn't flash closed when the page first loads.
  const [hasToggled, setHasToggled] = useState(false);

  const handleMenuToggle = () => {
    setHasToggled(true);
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={styles.mainContainer}>
      {/* Top navigation bar */}
      <div className={styles.navigationMenu}>
        <Link className={styles.brand} href={"/"}>
          <Logo />
        </Link>

        {/* Section links, shown on wide screens only */}
        <div className={styles.navigationLinks}>
          <Link className={styles.navLink} href="#features">
            {t.nav.features}
          </Link>
          <Link className={styles.navLink} href="#pricing">
            {t.nav.pricing}
          </Link>
          <Link className={styles.navLink} href="/about">
            {t.nav.about}
          </Link>
        </div>

        {/* Sign-up / log-in buttons, plus the ☰ button on small screens */}
        <div className={styles.navActions}>
          {/* EN / TR: on every screen size, next to the menu button on phones */}
          <LanguageSwitcher />
          <div className={`${styles.authCtas} ${styles.desktopAuth}`}>
            <AuthButtons signedIn={signedIn} />
          </div>

          <button
            className={styles.mobileMenuToggle}
            onClick={handleMenuToggle}
            aria-label={t.nav.toggleMenu}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div
        // The menu that drops down on small screens
        className={`${styles.mobileMenu} ${
          hasToggled
            ? isMobileMenuOpen
              ? styles.menuOpen
              : styles.menuClosed
            : ""
        }`}
      >
        <Link
          className={styles.mobileNavLink}
          href="#features"
          onClick={handleMenuClose}
        >
          {t.nav.features}
        </Link>
        <Link
          className={styles.mobileNavLink}
          href="#pricing"
          onClick={handleMenuClose}
        >
          {t.nav.pricing}
        </Link>
        <Link
          className={styles.mobileNavLink}
          href="/about"
          onClick={handleMenuClose}
        >
          {t.nav.about}
        </Link>
        <div className={`${styles.authCtas} ${styles.mobileAuth}`}>
          <AuthButtons signedIn={signedIn} />
        </div>
      </div>

      {/* Headline and buttons on the left, phone picture on the right */}
      <div className={styles.columns}>
        <div className={styles.leftColumn}>
          <h1 className={styles.headline}>{t.hero.headline}</h1>
          <p className={styles.subHeadline}>{t.hero.subHeadline}</p>
          <div className={styles.ctas}>
            <Button variant="primary" text={t.hero.getStarted} href="/signup" />
            {/* A ready-made company to look around in, no sign-up needed */}
            <DemoButton />
          </div>
        </div>
        <div className={styles.rightColumn}>
          <PhoneMockup />
        </div>
      </div>
    </div>
  );
}

// "Start for free" and "Log in", or, for someone already logged in, a way
// back to their dashboard
function AuthButtons({ signedIn }: { signedIn: boolean }) {
  const { m } = useI18n();
  if (signedIn) {
    return (
      <Button
        variant="primary"
        text={m.common.openDashboard}
        href="/dashboard"
        icon={<ArrowRight size="1em" />}
        iconPosition="right"
      />
    );
  }
  return (
    <>
      <Button variant="primary" text={m.common.startForFree} href="/signup" />
      <Button
        variant="secondary"
        text={m.common.logIn}
        href="/login"
        icon={<ArrowRight size="1em" />}
        iconPosition="right"
      />
    </>
  );
}
