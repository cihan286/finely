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
import { useActionNotice } from "@/components/common/notice/Notice";
import { submitEmailPreferences } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import type { EmailPreferences } from "@/types/finance";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
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
  const { m } = useI18n();
  const t = m.settings.emails;
  const [state, dispatch, pending] = useActionState(
    submitEmailPreferences,
    initialActionState,
  );
  useActionNotice(state);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="emails">
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.title}</h2>
          <p className={shared.cardHint}>{fill(t.hint, { email, company: organizationName })}</p>
        </div>
        {!emailVerified && (
          <p className={styles.note}>{t.unverified}</p>
        )}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.option}>
            <input
              type="checkbox"
              name="weeklyDigest"
              defaultChecked={preferences.weeklyDigest}
            />
            <span>
              <strong>{t.weekly}</strong>
              <span className={styles.description}>{t.weeklyText}</span>
            </span>
          </label>
          <label className={styles.option}>
            <input
              type="checkbox"
              name="unusualCharges"
              defaultChecked={preferences.unusualCharges}
            />
            <span>
              <strong>{t.unusual}</strong>
              <span className={styles.description}>{t.unusualText}</span>
            </span>
          </label>
          <div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? m.common.saving : m.common.save}
              disabled={pending}
            />
          </div>
        </form>
      </section>
    </div>
  );
}
