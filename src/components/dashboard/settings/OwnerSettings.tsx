// ─────────────────────────────────────────────────────────────────────────────
// Owner settings (hand over or delete the company)
//
// In plain words: the last section of Settings, shown only to the company's
// owner. "Hand over the company" makes another team member the owner (you
// become an admin, and can then leave if you want). "Delete this company"
// removes it for everyone with all its data; you have to type the company's
// name first, because it can't be undone.
//
// For developers: a client component ("use client") for the forms. Both go
// to server actions that check again that the caller is the owner
// (lib/data/company.ts); showing this section only hides it from others.
// After a deletion the action redirects to /onboarding, which opens another
// company the person belongs to or offers to set one up.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useState,
  type SubmitEvent,
} from "react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import {
  submitCompanyDeletion,
  submitOwnershipTransfer,
} from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import { roleLabel } from "@/lib/roles";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import styles from "./OwnerSettings.module.css";

interface OwnerSettingsProps {
  organizationName: string;
  /** Everyone in the company except you */
  members: { id: string; name: string; email: string; role: string }[];
}

export default function OwnerSettings({
  organizationName,
  members,
}: OwnerSettingsProps) {
  const [transfer, dispatchTransfer, transferring] = useActionState(
    submitOwnershipTransfer,
    initialActionState,
  );
  const [deletion, dispatchDeletion, deleting] = useActionState(
    submitCompanyDeletion,
    initialActionState,
  );
  // What was typed to confirm the deletion
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === organizationName.trim();

  const handleTransfer = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const member = members.find((m) => m.id === formData.get("memberId"));
    if (
      !member ||
      !window.confirm(
        `Make ${member.name} the owner of ${organizationName}? You'll become an admin, and only ${member.name} can hand it back.`,
      )
    ) {
      return;
    }
    startTransition(() => dispatchTransfer(formData));
  };

  const handleDelete = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatchDeletion(formData));
  };

  return (
    <div className={shared.stack} id="owner">
      {(transfer.error || deletion.error) && (
        <Message type="error">{transfer.error ?? deletion.error}</Message>
      )}

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Hand over the company</h2>
          <p className={shared.cardHint}>
            Make someone else the owner. You become an admin, and can then
            leave the company if you want.
          </p>
        </div>
        {members.length === 0 ? (
          <p className={styles.note}>
            There&apos;s nobody to hand it over to yet. Invite the person
            first; once they&apos;ve joined, you can choose them here.
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleTransfer}>
            <Select
              name="memberId"
              aria-label="New owner"
              className={styles.grow}
              defaultValue={members[0].id}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email}), {roleLabel(member.role).toLowerCase()}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              loading={transferring}
              text={transferring ? "Handing over" : "Make owner"}
              disabled={transferring || deleting}
            />
          </form>
        )}
      </section>

      <section className={`${shared.card} ${styles.danger}`}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Delete this company</h2>
          <p className={shared.cardHint}>
            Removes {organizationName} for everyone on the team, with all its
            bank accounts, transactions, bills, categories and rules. This
            can&apos;t be undone.
          </p>
        </div>
        <form className={styles.form} onSubmit={handleDelete}>
          <Field
            label={`Type “${organizationName}” to confirm`}
            className={styles.grow}
          >
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
            disabled={!confirmed || deleting || transferring}
          >
            {deleting ? "Deleting" : "Delete company"}
          </button>
        </form>
      </section>
    </div>
  );
}
