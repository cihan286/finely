// ─────────────────────────────────────────────────────────────────────────────
// Email notification settings
//
// In plain words: where each person chooses which emails they get about this
// company — the weekly summary, and an alert right away when a charge is
// unusually high. The choice is yours alone and only for this company;
// teammates and your other companies have their own.
//
// For developers: a client component ("use client") for the form, saved
// through the submitEmailPreferences server action. These emails only go to
// verified addresses, so an unverified one gets a note saying so.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import Button from "@/components/common/button/Button";
import Message from "@/components/common/form/Message";
import { submitEmailPreferences } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import type { EmailPreferences } from "@/types/finance";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import styles from "./EmailSettings.module.css";

interface EmailSettingsProps {
  organizationName: string;
  /** The address the emails go to */
  email: string;
  /** Whether that address was verified (emails only go to verified ones) */
  emailVerified: boolean;
  preferences: EmailPreferences;
}

export default function EmailSettings({
  organizationName,
  email,
  emailVerified,
  preferences,
}: EmailSettingsProps) {
  const [state, dispatch, pending] = useActionState(
    submitEmailPreferences,
    initialActionState,
  );

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="emails">
      {(state.error || state.success) && (
        <Message type={state.error ? "error" : "success"}>
          {state.error ?? state.success}
        </Message>
      )}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Email notifications</h2>
          <p className={shared.cardHint}>
            What Finely emails you ({email}) about {organizationName}. Only
            you are affected; your teammates choose for themselves.
          </p>
        </div>
        {!emailVerified && (
          <p className={styles.note}>
            These emails are only sent to verified addresses. Verify yours
            with the link we emailed you (or the reminder at the top of the
            page) to start getting them.
          </p>
        )}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.option}>
            <input
              type="checkbox"
              name="weeklyDigest"
              defaultChecked={preferences.weeklyDigest}
            />
            <span>
              <strong>Weekly summary</strong>
              <span className={styles.description}>
                Every Monday: what came in and went out last week, what&apos;s
                in the bank, and what needs a look. Skipped in weeks when
                nothing happened.
              </span>
            </span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              name="unusualCharges"
              defaultChecked={preferences.unusualCharges}
            />
            <span>
              <strong>Unusual charges</strong>
              <span className={styles.description}>
                Right away, when a new charge is at least 50% above what that
                vendor usually charges.
              </span>
            </span>
          </label>
          <div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? "Saving" : "Save"}
              disabled={pending}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
