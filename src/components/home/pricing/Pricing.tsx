// ─────────────────────────────────────────────────────────────────────────────
// Pricing section of the home page
//
// In plain words: shows the three paid plans (Starter, Growth, Enterprise)
// with their prices and what's included, and says that small teams use
// Finely for free. A switch at the top toggles between monthly and yearly
// prices; yearly is cheaper, and the "Save X%" badge is calculated from the
// actual prices so it's always correct.
//
// Every plan includes all of Finely: the plans only differ in how many
// people can be on the team (that's the one limit the app enforces). So the
// cards must not promise anything a plan doesn't really add: no storage
// sizes, support levels or extras that don't exist.
//
// For developers: a client component ("use client") because of the billing
// toggle. The prices and team sizes come from lib/finance/plans.ts, the
// same ones Settings → Plan & billing shows; the rest of each card is in
// the `plans` list below. What is actually charged is set on the prices in
// Stripe. id="pricing" is the target of the "#pricing" links.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import styles from "./Pricing.module.css";
import { useState } from "react";
import Button from "@/components/common/button/Button";
import { Check, ArrowRight } from "lucide-react";
import { PLANS } from "@/lib/finance/plans";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";

// What every plan needs: name, prices, features list and button
interface Plan {
  name: string;
  description: string;
  /** null = custom pricing ("Contact sales") */
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: string[];
  cta: string;
  ctaHref: string;
  variant: "primary" | "secondary";
  featured: boolean;
}

type BillingCycle = "monthly" | "yearly";

// The plans shown on the page, in order, in the page's language
const plansIn = (t: Messages["home"]["pricing"]): Plan[] => [
  {
    name: "Starter",
    description: t.starterDescription,
    monthlyPrice: PLANS.starter.monthlyPrice,
    yearlyPrice: PLANS.starter.yearlyPrice,
    features: [
      fill(t.upToMembers, { members: PLANS.starter.members }),
      t.starterImports,
      t.starterPlanning,
      t.starterInsights,
    ],
    cta: t.getStarted,
    ctaHref: "/signup",
    variant: "secondary",
    featured: false,
  },
  {
    name: "Growth",
    description: t.growthDescription,
    monthlyPrice: PLANS.growth.monthlyPrice,
    yearlyPrice: PLANS.growth.yearlyPrice,
    features: [
      fill(t.upToMembers, { members: PLANS.growth.members }),
      t.everythingInStarter,
    ],
    cta: t.getStarted,
    ctaHref: "/signup",
    variant: "primary",
    featured: true,
  },
  {
    name: "Enterprise",
    description: fill(t.enterpriseDescription, { members: PLANS.growth.members }),
    monthlyPrice: null,
    yearlyPrice: null,
    features: [t.unlimitedMembers, t.everythingInGrowth, t.setUpTogether],
    cta: t.contactSales,
    ctaHref: "/contact",
    variant: "secondary",
    featured: false,
  },
];

// Lowest yearly discount among paid plans, so the badge holds for every plan
const yearlySavings = Math.min(
  ...Object.values(PLANS).flatMap(({ monthlyPrice, yearlyPrice }) =>
    monthlyPrice && yearlyPrice !== null
      ? [Math.floor((1 - yearlyPrice / monthlyPrice) * 100)]
      : [],
  ),
);

export default function Pricing() {
  const t = useI18n().m.home.pricing;
  const plans = plansIn(t);
  // Which prices are shown right now: monthly or yearly
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  return (
    <section id="pricing" className={styles.mainContainer}>
      <div className={styles.backgroundLayer} aria-hidden="true" />
      <div className={styles.headlineContainer}>
        <span className={styles.title}>{t.title}</span>
        <div className={styles.headline}>
          <span>{t.headline1} </span>
          <span>{t.headline2}</span>
        </div>
        <div className={styles.subHeadline}>
          <span>{t.sub1}</span>
          <span>{fill(t.sub2, { members: PLANS.free.members })}</span>
        </div>

        {/* Monthly / Yearly switch */}
        <div className={styles.billingToggle}>
          <button
            className={`${styles.toggleOption} ${
              billingCycle === "monthly" ? styles.toggleActive : ""
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            {t.monthly}
          </button>
          <button
            className={`${styles.toggleOption} ${
              billingCycle === "yearly" ? styles.toggleActive : ""
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            {t.yearly}
            <span className={styles.savingsBadge}>
              {fill(t.save, { percent: yearlySavings })}
            </span>
          </button>
        </div>
      </div>

      {/* One card per plan */}
      <div className={styles.pricingGrid}>
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`${styles.pricingCard} ${
              plan.featured ? styles.featuredCard : ""
            }`}
          >
            {plan.featured && (
              <span className={styles.popularBadge}>{t.mostPopular}</span>
            )}

            <div className={styles.cardHeader}>
              <span className={styles.planName}>{plan.name}</span>
              <span className={styles.planDescription}>{plan.description}</span>
            </div>

            <div className={styles.priceRow}>
              {plan.monthlyPrice === null ? (
                <span className={styles.priceCustom}>{t.custom}</span>
              ) : (
                <>
                  <span className={styles.priceCurrency}>$</span>
                  <span className={styles.priceValue}>
                    {billingCycle === "yearly"
                      ? plan.yearlyPrice
                      : plan.monthlyPrice}
                  </span>
                  <span className={styles.pricePeriod}>{t.perMonth}</span>
                </>
              )}
            </div>
            {plan.monthlyPrice !== null && billingCycle === "yearly" && (
              <span className={styles.billedNote}>{t.billedAnnually}</span>
            )}

            <div className={styles.divider} />

            <div className={styles.featureList}>
              {plan.features.map((feature) => (
                <div className={styles.featureItem} key={feature}>
                  <Check size={18} className={styles.checkIcon} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className={styles.cardCta}>
              <Button
                variant={plan.variant}
                text={plan.cta}
                href={plan.ctaHref}
                icon={<ArrowRight size="1em" />}
                iconPosition="right"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
