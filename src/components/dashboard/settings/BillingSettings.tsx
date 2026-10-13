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
import styles from "./BillingSettings.module.css";

interface BillingSettingsProps {
  /** Whether you may change the plan (the owner) */
  isOwner: boolean;
  plan: PlanKey;
  /** How many people the team may have; null = no limit */
  memberLimit: number | null;
  memberCount: number;
  /** A note about the subscription's state, e.g. a failed payment */
  note: string | null;
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
          {plan === "free"
            ? "Thank you! Your plan is updated as soon as Stripe confirms the payment, usually within a minute. Reload the page if it still shows the old plan."
            : `Thank you! ${PLANS[plan].name} is active for your company.`}
        </Message>
      )}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Plan &amp; billing</h2>
          <p className={shared.cardHint}>
            The plan decides how many people can be on the team.
          </p>
        </div>

        <div className={styles.current}>
          <span className={styles.plan}>{PLANS[plan].name}</span>
          <span className={full ? styles.full : styles.usage}>
            {memberCount} of {memberLimit ?? "unlimited"} team members
            {full && ": no room for another one"}
          </span>
          {periodEnd && <span className={styles.usage}>Current period ends {periodEnd}</span>}
          {note && <span className={styles.note}>{note}</span>}
        </div>

        {!isOwner ? (
          <p className={styles.usage}>Only the company&apos;s owner can change the plan.</p>
        ) : plan === "free" ? (
          <>
            {/* Monthly / yearly prices */}
            <div className={styles.toggle} role="group" aria-label="Billing period">
              {(["monthly", "yearly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.toggleOption} ${interval === option ? styles.toggleActive : ""}`}
                  onClick={() => setInterval(option)}
                  aria-pressed={interval === option}
                >
                  {option === "monthly" ? "Monthly" : "Yearly"}
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
                        /month{interval === "yearly" && ", billed yearly"}
                      </span>
                    </span>
                    <span className={styles.usage}>
                      Up to {PLANS[key].members} team members
                    </span>
                    <Button
                      variant={key === "growth" ? "primary" : "outline"}
                      size="sm"
                      text={`Choose ${PLANS[key].name}`}
                      action={() => go({ plan: key, interval })}
                      disabled={pending}
                    />
                  </div>
                );
              })}
            </div>
            <p className={styles.usage}>
              Need more than 25 people?{" "}
              <Link href="/contact" className={styles.link}>
                Talk to us about Enterprise
              </Link>
              .
            </p>
          </>
        ) : (
          hasCustomer && (
            <div>
              <Button
                variant="outline"
                size="sm"
                text={pending ? "Opening" : "Manage billing"}
                loading={pending}
                action={() => go({ intent: "portal" })}
                disabled={pending}
              />
              <p className={styles.hint}>
                Change plan or payment method, cancel, and find your invoices,
                on a page from Stripe.
              </p>
            </div>
          )
        )}
      </section>
    </div>
  );
}
