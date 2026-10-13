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

// The plans shown on the page, in order
const plans: Plan[] = [
  {
    name: "Starter",
    description: "For small teams",
    monthlyPrice: PLANS.starter.monthlyPrice,
    yearlyPrice: PLANS.starter.yearlyPrice,
    features: [
      `Up to ${PLANS.starter.members} team members`,
      "Statement import and linked US banks",
      "Bills, budgets and a 30-day forecast",
      "Insights, exports and an activity log",
    ],
    cta: "Get started",
    ctaHref: "/signup",
    variant: "secondary",
    featured: false,
  },
  {
    name: "Growth",
    description: "For growing teams",
    monthlyPrice: PLANS.growth.monthlyPrice,
    yearlyPrice: PLANS.growth.yearlyPrice,
    features: [
      `Up to ${PLANS.growth.members} team members`,
      "Everything in Starter",
    ],
    cta: "Get started",
    ctaHref: "/signup",
    variant: "primary",
    featured: true,
  },
  {
    name: "Enterprise",
    description: `For teams of more than ${PLANS.growth.members}`,
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      "Unlimited team members",
      "Everything in Growth",
      "Set up together with our team",
    ],
    cta: "Contact sales",
    ctaHref: "/contact",
    variant: "secondary",
    featured: false,
  },
];

// Lowest yearly discount among paid plans, so the badge holds for every plan
const yearlySavings = Math.min(
  ...plans.flatMap(({ monthlyPrice, yearlyPrice }) =>
    monthlyPrice !== null && yearlyPrice !== null
      ? [Math.floor((1 - yearlyPrice / monthlyPrice) * 100)]
      : [],
  ),
);

export default function Pricing() {
  // Which prices are shown right now: monthly or yearly
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  return (
    <section id="pricing" className={styles.mainContainer}>
      <div className={styles.backgroundLayer} aria-hidden="true" />
      <div className={styles.headlineContainer}>
        <span className={styles.title}>Pricing</span>
        <div className={styles.headline}>
          <span>Simple Pricing That </span>
          <span>Scales With You</span>
        </div>
        <div className={styles.subHeadline}>
          <span>Every plan includes all of Finely: you pay for the size of your team.</span>
          <span>
            Free for teams of up to {PLANS.free.members}. Upgrade, downgrade or
            cancel anytime.
          </span>
        </div>

        {/* Monthly / Yearly switch */}
        <div className={styles.billingToggle}>
          <button
            className={`${styles.toggleOption} ${
              billingCycle === "monthly" ? styles.toggleActive : ""
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>
          <button
            className={`${styles.toggleOption} ${
              billingCycle === "yearly" ? styles.toggleActive : ""
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly
            <span className={styles.savingsBadge}>Save {yearlySavings}%</span>
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
              <span className={styles.popularBadge}>Most popular</span>
            )}

            <div className={styles.cardHeader}>
              <span className={styles.planName}>{plan.name}</span>
              <span className={styles.planDescription}>{plan.description}</span>
            </div>

            <div className={styles.priceRow}>
              {plan.monthlyPrice === null ? (
                <span className={styles.priceCustom}>Custom</span>
              ) : (
                <>
                  <span className={styles.priceCurrency}>$</span>
                  <span className={styles.priceValue}>
                    {billingCycle === "yearly"
                      ? plan.yearlyPrice
                      : plan.monthlyPrice}
                  </span>
                  <span className={styles.pricePeriod}>/mo</span>
                </>
              )}
            </div>
            {plan.monthlyPrice !== null && billingCycle === "yearly" && (
              <span className={styles.billedNote}>billed annually</span>
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
