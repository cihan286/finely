// ─────────────────────────────────────────────────────────────────────────────
// Branch settings
//
// In plain words: the places the company works from (its head office,
// shops, a factory) and — for owners and admins — a form to add one, and
// buttons to make one the head office or remove it.
//
// For developers: a client component ("use client") for the forms. They all
// go to the submitBranch server action, which refreshes the page on
// success. They submit via onSubmit + startTransition instead of
// <form action>, so what was typed isn't wiped when the server answers
// with an error. Permissions are enforced in lib/data/; canEdit only hides
// the forms.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, useRef, useState, type SubmitEvent } from "react";
import { Building2, Plus } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { useActionNotice } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import { submitBranch } from "@/app/dashboard/settings/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { Branch } from "@/lib/data/branches";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
// The settings sections share their card, list and message styles
import shared from "./TeamSettings.module.css";
import styles from "./BranchSettings.module.css";

interface BranchSettingsProps {
  /** Whether you may add and remove branches (owners and admins) */
  canEdit: boolean;
  branches: Branch[];
}

export default function BranchSettings({ canEdit, branches }: BranchSettingsProps) {
  const { m } = useI18n();
  const t = m.settings.branches;
  const addFormRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await submitBranch(previous, formData);
      // Empty the add form once the branch was added
      if (!result.error && !formData.get("intent")) addFormRef.current?.reset();
      return result;
    },
    initialActionState,
  );
  useActionNotice(state);
  // Whether the last form sent was the add form, so the other buttons
  // don't show it as saving
  const [adding, setAdding] = useState(false);
  const confirm = useConfirm();

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const intent = formData.get("intent");
    if (
      intent === "remove" &&
      !(await confirm({
        text: fill(t.confirmRemove, { name: String(formData.get("name")) }),
        confirmText: t.remove,
        danger: true,
      }))
    ) {
      return;
    }
    setAdding(!intent);
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="branches">
      {canEdit && (
        <section className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>{t.add}</h2>
            <p className={shared.cardHint}>{t.hint}</p>
          </div>
          <form ref={addFormRef} className={styles.addForm} onSubmit={submit}>
            <Field label={t.name}>
              <Input name="name" placeholder={t.namePlaceholder} maxLength={120} required />
            </Field>
            <Field label={t.code} optional>
              <Input name="code" placeholder={t.codePlaceholder} maxLength={10} />
            </Field>
            <Field label={t.city} optional>
              <Input name="city" maxLength={100} />
            </Field>
            <Field label={t.phone} optional>
              <Input name="phone" type="tel" maxLength={40} />
            </Field>
            <div className={styles.wide}>
              <Field label={t.address} optional>
                <Input name="address" maxLength={500} />
              </Field>
            </div>
            <label className={styles.checkbox}>
              <input type="checkbox" name="isHeadOffice" defaultChecked={branches.length === 0} />
              {t.isHeadOffice}
            </label>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending && adding}
              text={pending && adding ? m.common.saving : t.addButton}
              icon={<Plus size={16} />}
              disabled={pending}
            />
          </form>
        </section>
      )}

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>
            {t.title} <span className={shared.count}>{branches.length}</span>
          </h2>
          {!canEdit && <p className={shared.cardHint}>{t.hint}</p>}
        </div>
        {branches.length === 0 ? (
          <Message type="info">{canEdit ? t.emptyManage : t.empty}</Message>
        ) : (
          <ul className={shared.list}>
            {branches.map((branch) => (
              <li key={branch.id} className={shared.row}>
                <div className={`${shared.avatar} ${shared.avatarMuted}`} aria-hidden="true">
                  <Building2 size={16} />
                </div>
                <div className={shared.who}>
                  <span className={shared.name}>
                    {branch.name}
                    {branch.code && <span className={styles.code}> {branch.code}</span>}
                  </span>
                  <span className={shared.email}>
                    {[branch.address, branch.city, branch.phone].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {branch.isHeadOffice && <span className={shared.badge}>{t.headOffice}</span>}
                {canEdit && (
                  <div className={styles.actions}>
                    {!branch.isHeadOffice && (
                      <form onSubmit={submit}>
                        <input type="hidden" name="intent" value="headOffice" />
                        <input type="hidden" name="id" value={branch.id} />
                        <input type="hidden" name="name" value={branch.name} />
                        <button type="submit" className={shared.rowAction} disabled={pending}>
                          {t.makeHeadOffice}
                        </button>
                      </form>
                    )}
                    <form onSubmit={submit}>
                      <input type="hidden" name="intent" value="remove" />
                      <input type="hidden" name="id" value={branch.id} />
                      <input type="hidden" name="name" value={branch.name} />
                      <button type="submit" className={shared.rowAction} disabled={pending}>
                        {t.remove}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
