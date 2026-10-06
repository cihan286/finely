// ─────────────────────────────────────────────────────────────────────────────
// Hero — the top section of the home page
//
// In plain words: the first thing visitors see. It has the navigation bar
// (logo, links, "Start for free" and "Log in"), the main headline with its
// buttons, and the phone picture on the right. On small screens the links move
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
import Logo from "@/components/common/logo/Logo";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Hero() {
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
            Features
          </Link>
          <Link className={styles.navLink} href="#pricing">
            Pricing
          </Link>
          <Link className={styles.navLink} href={"/"}>
            About
          </Link>
        </div>

        {/* Sign-up / log-in buttons, plus the ☰ button on small screens */}
        <div className={styles.navActions}>
          <div className={`${styles.authCtas} ${styles.desktopAuth}`}>
            <Button variant="primary" text="Start for free" href="/signup" />
            <Button
              variant="secondary"
              text="Log in"
            href="/login"
              icon={<ArrowRight size="1em" />}
              iconPosition="right"
            />
          </div>

          <button
            className={styles.mobileMenuToggle}
            onClick={handleMenuToggle}
            aria-label="Toggle mobile menu"
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
          Features
        </Link>
        <Link
          className={styles.mobileNavLink}
          href="#pricing"
          onClick={handleMenuClose}
        >
          Pricing
        </Link>
        <Link
          className={styles.mobileNavLink}
          href={"/"}
          onClick={handleMenuClose}
        >
          About
        </Link>
        <div className={`${styles.authCtas} ${styles.mobileAuth}`}>
          <Button variant="primary" text="Start for free" href="/signup" />
          <Button
            variant="secondary"
            text="Log in"
            href="/login"
            icon={<ArrowRight size="1em" />}
            iconPosition="right"
          />
        </div>
      </div>

      {/* Headline and buttons on the left, phone picture on the right */}
      <div className={styles.columns}>
        <div className={styles.leftColumn}>
          <h1 className={styles.headline}>
            Financial clarity for modern businesses.
          </h1>
          <p className={styles.subHeadline}>
            Take control of your cash flow. Automate your daily expense tracking
            and turn complex financial data into actionable insights.
          </p>
          <div className={styles.ctas}>
            <Button variant="primary" text="Get Started" href="/signup" />
            <Button
              variant="secondary"
              text="Learn More"
              href="#features"
              icon={<ArrowRight size="1em" />}
              iconPosition="right"
            />
          </div>
        </div>
        <div className={styles.rightColumn}>
          <PhoneMockup />
        </div>
      </div>
    </div>
  );
}
