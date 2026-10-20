// ─────────────────────────────────────────────────────────────────────────────
// Plan and billing (Settings)
//
// In plain words: which plan the company is on and how many of the people
// it allows are already on the team. The owner can subscribe to a bigger
// plan (the payment happens on a page from Stripe; Finely never sees card
// numbers), and later change or cancel it and find the invoices on Stripe's
// "Manage billing" page. Everyone else can see the plan but not change it.
//
// For developers: a client component ("use client") for the forms. Both
// buttons go to the submitBilling server action, which checks again that the
// caller is the owner and then redirects to Stripe. The plan itself only
// changes when Stripe tells us (the webhook), so right after paying it may
// take a moment to show.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import Button from "@/components/common/button/Button";
import Message from "@/components/common/form/Message";
import { submitBilling } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import {
  PLANS,
  type BillingInterval,
  type PaidPlan,
  type PlanKey,
} from "@/lib/finance/plans";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { rich } from "@/i18n/rich";
import styles from "./BillingSettings.module.css";

interface BillingSettingsProps {
  /** Whether you may change the plan (the owner) */
  isOwner: boolean;
  plan: PlanKey;
  /** How many people the team may have; null = no limit */
  memberLimit: number | null;
  memberCount: number;
  /** A note about the subscription's state, e.g. a failed payment */
  note: "cancelled" | "pastDue" | "trialing" | null;
  /** When the paid period ends or renews, as text; null without one */
  periodEnd: string | null;
  /** Whether "Manage billing" has somewhere to go */
  hasCustomer: boolean;
  /** Just back from Stripe's payment page */
  justPaid: boolean;
}

const PAID_PLANS: PaidPlan[] = ["starter", "growth"];

export default function BillingSettings({
  isOwner,
  plan,
  memberLimit,
  memberCount,
  note,
  periodEnd,
  hasCustomer,
  justPaid,
}: BillingSettingsProps) {
  const t = useI18n().m.settings.billing;
  const [state, dispatch, pending] = useActionState(submitBilling, initialActionState);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const full = memberLimit !== null && memberCount >= memberLimit;

  const go = (fields: Record<string, string>) => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="billing">
      {state.error && <Message type="error">{state.error}</Message>}
      {justPaid && (
        <Message type="success">
          {plan === "free" ? t.thanksPending : fill(t.thanks, { plan: PLANS[plan].name })}
        </Message>
      )}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.title}</h2>
          <p className={shared.cardHint}>{t.hint}</p>
        </div>

        <div className={styles.current}>
          <span className={styles.plan}>{PLANS[plan].name}</span>
          <span className={full ? styles.full : styles.usage}>
            {fill(t.usage, { count: memberCount, limit: memberLimit ?? t.unlimited })}
            {full && t.full}
          </span>
          {periodEnd && (
            <span className={styles.usage}>{fill(t.periodEnds, { date: periodEnd })}</span>
          )}
          {note && <span className={styles.note}>{t.notes[note]}</span>}
        </div>

        {!isOwner ? (
          <p className={styles.usage}>{t.ownerOnly}</p>
        ) : plan === "free" ? (
          <>
            {/* Monthly / yearly prices */}
            <div className={styles.toggle} role="group" aria-label={t.period}>
              {(["monthly", "yearly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.toggleOption} ${interval === option ? styles.toggleActive : ""}`}
                  onClick={() => setInterval(option)}
                  aria-pressed={interval === option}
                >
                  {option === "monthly" ? t.monthly : t.yearly}
                </button>
              ))}
            </div>
            <div className={styles.plans}>
              {PAID_PLANS.map((key) => {
                const price =
                  interval === "yearly" ? PLANS[key].yearlyPrice : PLANS[key].monthlyPrice;
                return (
                  <div key={key} className={styles.option}>
                    <span className={styles.optionName}>{PLANS[key].name}</span>
                    <span className={styles.optionPrice}>
                      ${price}
                      <span className={styles.usage}>
                        {t.perMonth}
                        {interval === "yearly" && t.billedYearly}
                      </span>
                    </span>
                    <span className={styles.usage}>
                      {fill(t.upTo, { count: PLANS[key].members })}
                    </span>
                    <Button
                      variant={key === "growth" ? "primary" : "outline"}
                      size="sm"
                      text={fill(t.choose, { plan: PLANS[key].name })}
                      action={() => go({ plan: key, interval })}
                      disabled={pending}
                    />
                  </div>
                );
              })}
            </div>
            <p className={styles.usage}>
              {rich(t.enterprise, {
                link: (text) => (
                  <Link href="/contact" className={styles.link}>
                    {text}
                  </Link>
                ),
              })}
            </p>
          </>
        ) : (
          hasCustomer && (
            <div>
              <Button
                variant="outline"
                size="sm"
                text={pending ? t.opening : t.manage}
                loading={pending}
                action={() => go({ intent: "portal" })}
                disabled={pending}
              />
              <p className={styles.hint}>{t.manageHint}</p>
            </div>
          )
        )}
      </section>
    </div>
  );
}
