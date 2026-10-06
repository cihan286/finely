// ─────────────────────────────────────────────────────────────────────────────
// Features section of the home page
//
// In plain words: explains what Finely does in four short blocks — automatic
// expense tracking, real-time cash flow, insights, and security — each with an
// icon. Visitors reach it via the "Features" link at the top.
//
// For developers: id="features" is the target of the "#features" links.
// ─────────────────────────────────────────────────────────────────────────────

import styles from "./Features.module.css";
import { RefreshCw, LineChart, PieChart, ShieldCheck } from "lucide-react";

export default function Features() {
  return (
    <section id="features" className={styles.mainContainer}>
      {/* Soft blue glow behind the section (decoration only) */}
      <div className={styles.backgroundLayer} aria-hidden="true" />
      <div className={styles.headlineContainer}>
        <span className={styles.title}>Features</span>
        <div className={styles.headline}>
          <span>Everything You Need to </span>
          <span>Scale Your Operations</span>
        </div>
        <div className={styles.subHeadline}>
          <span>Automate workflows, gain actionable insights, and</span>
          {/* One line on wide screens, split in two below 650px (see CSS) */}
          <span className={styles.lastLine}>
            <span>empower your team with tools designed for</span>{" "}
            <span>modern, fast-growing businesses.</span>
          </span>
        </div>
      </div>
      {/* The four feature blocks: two columns on wide screens, one on phones */}
      <div className={styles.featuresGrid}>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <RefreshCw />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>
              Automatic expense tracking
            </span>
            <span className={styles.featureDescription}>
              Connect your accounts and cards once. Every transaction is
              imported and categorized for you, so your books stay current
              without manual entry.
            </span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <LineChart />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>Real-time cash flow</span>
            <span className={styles.featureDescription}>
              See money coming in and going out as it happens. Spot shortfalls
              early and plan payroll, bills and spending with confidence.
            </span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <PieChart />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>Actionable insights</span>
            <span className={styles.featureDescription}>
              Understand where your money goes by category and vendor, and get
              alerted when spending spikes or a bill is about to come due.
            </span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <ShieldCheck />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>Secure by default</span>
            <span className={styles.featureDescription}>
              Your financial data is encrypted, and role-based access means
              each team member sees only what they need.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
