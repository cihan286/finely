"use client";

import styles from "./Pricing.module.css";
import { useState } from "react";
import Button from "@/components/common/button/Button";
import { Check, ArrowRight } from "lucide-react";

interface Plan {
  name: string;
  description: string;
  /** null = custom pricing ("Contact sales") */
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  features: string[];
  cta: string;
  ctaHref?: string;
  variant: "primary" | "secondary";
  featured: boolean;
}

type BillingCycle = "monthly" | "yearly";

const plans: Plan[] = [
  {
    name: "Starter",
    description: "For small teams getting started",
    monthlyPrice: 29,
    yearlyPrice: 24,
    features: [
      "Up to 5 team members",
      "Basic analytics dashboard",
      "Email support",
      "10GB storage",
    ],
    cta: "Get started",
    ctaHref: "/signup",
    variant: "secondary",
    featured: false,
  },
  {
    name: "Growth",
    description: "For growing businesses that need more",
    monthlyPrice: 79,
    yearlyPrice: 65,
    features: [
      "Up to 25 team members",
      "Advanced analytics & reports",
      "Priority support",
      "100GB storage",
      "Custom integrations",
    ],
    cta: "Get started",
    ctaHref: "/signup",
    variant: "primary",
    featured: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs",
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      "Unlimited team members",
      "Enterprise-grade analytics",
      "Dedicated account manager",
      "Unlimited storage",
      "Custom integrations",
      "SLA & uptime guarantee",
    ],
    cta: "Contact sales",
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
          <span>Choose the plan that fits your business. Upgrade,</span>
          <span>downgrade, or cancel anytime — no hidden fees.</span>
        </div>

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
