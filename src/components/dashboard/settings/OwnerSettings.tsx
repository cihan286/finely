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
import { useActionNotice } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import {
  submitCompanyDeletion,
  submitOwnershipTransfer,
} from "@/app/dashboard/settings/actions";
import { initialActionState } from "@/lib/action-state";
import { roleLabel } from "@/lib/roles";
// The settings sections share their card and message styles
import shared from "./TeamSettings.module.css";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { rich } from "@/i18n/rich";
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
  const { m } = useI18n();
  const t = m.settings.owner;
  const [transfer, dispatchTransfer, transferring] = useActionState(
    submitOwnershipTransfer,
    initialActionState,
  );
  const [deletion, dispatchDeletion, deleting] = useActionState(
    submitCompanyDeletion,
    initialActionState,
  );
  useActionNotice(transfer);
  useActionNotice(deletion);
  // What was typed to confirm the deletion
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === organizationName.trim();

  const confirm = useConfirm();

  const handleTransfer = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const member = members.find((m) => m.id === formData.get("memberId"));
    if (
      !member ||
      !(await confirm({
        text: fill(t.confirmHandOver, { name: member.name, company: organizationName }),
        confirmText: t.makeOwner,
      }))
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
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.handOver}</h2>
          <p className={shared.cardHint}>{t.handOverHint}</p>
        </div>
        {members.length === 0 ? (
          <p className={styles.note}>{t.nobody}</p>
        ) : (
          <form className={styles.form} onSubmit={handleTransfer}>
            <Select
              name="memberId"
              aria-label={t.newOwner}
              className={styles.grow}
              defaultValue={members[0].id}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email}), {roleLabel(member.role, m.rolesInSentence)}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              loading={transferring}
              text={transferring ? t.handingOver : t.makeOwner}
              disabled={transferring || deleting}
            />
          </form>
        )}
      </section>

      <section className={`${shared.card} ${styles.danger}`}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>{t.delete}</h2>
          <p className={shared.cardHint}>{fill(t.deleteHint, { company: organizationName })}</p>
        </div>
        {/* Plain links: they answer with files, not pages */}
        <p className={styles.note}>
          {rich(t.keepCopy, {
            transactions: (text) => (
              <a href="/dashboard/transactions/export" download className={styles.exportLink}>
                {text}
              </a>
            ),
            bills: (text) => (
              <a href="/dashboard/bills/export" download className={styles.exportLink}>
                {text}
              </a>
            ),
            activity: (text) => (
              <a href="/dashboard/settings/activity/export" download className={styles.exportLink}>
                {text}
              </a>
            ),
          })}
        </p>
        <form className={styles.form} onSubmit={handleDelete}>
          <Field
            label={fill(t.typeToConfirm, { text: organizationName })}
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
            {deleting ? t.deleting : t.deleteButton}
          </button>
        </form>
      </section>
    </div>
  );
}
