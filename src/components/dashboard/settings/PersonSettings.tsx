// ─────────────────────────────────────────────────────────────────────────────
// "Your account" settings
//
// In plain words: the last section of Settings, about you rather than the
// company. "Download my data" saves a file with what Finely holds about you.
// "Delete my account" removes you from Finely for good, after you typed your
// email address to confirm. Someone who still owns a company is told to hand
// it over or delete it first.
//
// For developers: a client component ("use client") for the form, sent to
// the submitAccountDeletion server action, which checks everything again
// (lib/data/person.ts) and then goes to the login page. The download is a
// plain link to a route that answers with a file.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useState,
  type SubmitEvent,
} from "react";
import { Download } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { submitAccountDeletion } from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import styles from "./OwnerSettings.module.css";

interface PersonSettingsProps {
  /** The signed-in person's email address, to type as confirmation */
  email: string;
  /** The companies this person owns; while there are any, deleting is refused */
  ownedCompanies: string[];
}

export default function PersonSettings({ email, ownedCompanies }: PersonSettingsProps) {
  const [deletion, dispatch, deleting] = useActionState(
    submitAccountDeletion,
    initialActionState,
  );
  // What was typed to confirm the deletion
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === email.toLowerCase();
  const blocked = ownedCompanies.length > 0;

  const handleDelete = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmed || blocked) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="you">
      {deletion.error && <Message type="error">{deletion.error}</Message>}

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Your data</h2>
          <p className={shared.cardHint}>
            A file with what Finely holds about you: your profile, how you
            sign in, where you&apos;re logged in, your companies and email
            choices, and what the activity logs say you did. A company&apos;s
            transactions and bills belong to the company and aren&apos;t in
            it.
          </p>
        </div>
        <div>
          <Button
            href="/dashboard/settings/my-data"
            download
            variant="outline"
            size="sm"
            text="Download my data"
            icon={<Download size={16} />}
          />
        </div>
      </section>

      <section className={`${shared.card} ${styles.danger}`}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Delete my account</h2>
          <p className={shared.cardHint}>
            Removes you from Finely and from every company you&apos;re in.
            What you entered there stays with the company, without your name
            on it; its activity log keeps your name next to what you did.
            This can&apos;t be undone.
          </p>
        </div>
        {blocked ? (
          <p className={styles.note}>
            You still own {ownedCompanies.join(", ")}. A company needs its
            owner: hand {ownedCompanies.length === 1 ? "it" : "each"} over to
            someone else or delete {ownedCompanies.length === 1 ? "it" : "them"}{" "}
            first (in that company&apos;s Settings, just above), then come
            back here.
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleDelete}>
            <Field label={`Type “${email}” to confirm`} className={styles.grow}>
              <Input
                name="confirmation"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <button
              type="submit"
              className={styles.deleteButton}
              disabled={!confirmed || deleting}
            >
              {deleting ? "Deleting" : "Delete my account"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
