"use client";

import { useState } from "react";
import styles from "./Hero.module.css";
import Button from "@/components/common/button/Button";
import Link from "next/link";
import PhoneMockup from "../phone-mockup/PhoneMockup";
import Logo from "@/components/common/logo/Logo";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Hero() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      <div className={styles.navigationMenu}>
        <Link className={styles.brand} href={"/"}>
          <Logo />
        </Link>

        <div className={styles.navigationLinks}>
          <Link className={styles.navLink} href={"/"}>
            Features
          </Link>
          <Link className={styles.navLink} href={"/"}>
            Pricing
          </Link>
          <Link className={styles.navLink} href={"/"}>
            About
          </Link>
        </div>

        <div className={styles.navActions}>
          <div className={`${styles.authCtas} ${styles.desktopAuth}`}>
            <Button style="base" text="Start for free" />
            <Button
              style="secondary"
              text="Log in"
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
          href={"/"}
          onClick={handleMenuClose}
        >
          Features
        </Link>
        <Link
          className={styles.mobileNavLink}
          href={"/"}
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
          <Button style="base" text="Start for free" />
          <Button
            style="secondary"
            text="Log in"
            icon={<ArrowRight size="1em" />}
            iconPosition="right"
          />
        </div>
      </div>

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
            <Button style="base" text="Get Started" />
            <Button
              style="secondary"
              text="Learn More"
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
