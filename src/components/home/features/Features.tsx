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
import { getMessages } from "@/i18n/server";
import { RefreshCw, LineChart, PieChart, ShieldCheck } from "lucide-react";

export default async function Features() {
  const t = (await getMessages()).home.features;
  return (
    <section id="features" className={styles.mainContainer}>
      {/* Soft blue glow behind the section (decoration only) */}
      <div className={styles.backgroundLayer} aria-hidden="true" />
      <div className={styles.headlineContainer}>
        <span className={styles.title}>{t.title}</span>
        <div className={styles.headline}>
          <span>{t.headline1} </span>
          <span>{t.headline2}</span>
        </div>
        <div className={styles.subHeadline}>
          <span>{t.sub1}</span>{" "}
          {/* One line on wide screens, split in two below 650px (see CSS) */}
          <span className={styles.lastLine}>
            <span>{t.sub2}</span>{" "}
            <span>{t.sub3}</span>
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
            <span className={styles.featureTitle}>{t.trackingTitle}</span>
            <span className={styles.featureDescription}>{t.trackingText}</span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <LineChart />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>{t.cashFlowTitle}</span>
            <span className={styles.featureDescription}>{t.cashFlowText}</span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <PieChart />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>{t.insightsTitle}</span>
            <span className={styles.featureDescription}>{t.insightsText}</span>
          </div>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.iconContainer}>
            <ShieldCheck />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.featureTitle}>{t.secureTitle}</span>
            <span className={styles.featureDescription}>{t.secureText}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
