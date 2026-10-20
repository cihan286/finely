// ─────────────────────────────────────────────────────────────────────────────
// Add / edit card window
//
// In plain words: the pop-up for a payment card — what it's called, the last
// four digits of its number, who carries it and, if wanted, how much it may
// spend per month. When editing, it can also be archived (cancelled or
// expired; its past payments stay), taken back into use, or deleted.
//
// For developers: a client component ("use client"). It opens when the
// address has ?new=1 or ?edit=<id> and closes by returning to `closeHref`.
// Sent with onSubmit + startTransition, like the other windows. On success
// the server action redirects back to the list.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import Button from "@/components/common/button/Button";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import Field from "@/components/common/form/Field";
import { Input, Select } from "@/components/common/form/controls";
import { useActionNotice } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import { submitCard } from "@/app/dashboard/cards/actions";
import { initialActionState } from "@/lib/action-state";
import { amountInputProps } from "@/lib/format";
import type { Card } from "@/types/finance";
// The windows of the dashboard share how their fields are arranged
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import forms from "../transactions/forms.module.css";
import styles from "../bills/BillDialog.module.css";
import layout from "./CardsView.module.css";

interface CardDialogProps {
  /** The card to edit, or null to add a new one */
  card: Card | null;
  /** The people who can carry a card: everyone on the team */
  members: { id: string; name: string }[];
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** The list's address, to return to when the window closes */
  closeHref: string;
}

export default function CardDialog(props: CardDialogProps) {
  const t = useI18n().m.cards;
  const [state, dispatch, pending] = useActionState(submitCard, initialActionState);
  useActionNotice(state);
  return (
    <Dialog
      title={props.card ? t.dialog.editTitle : t.add}
      closeHref={props.closeHref}
      busy={pending}
    >
      <CardForm
        {...props}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface CardFormProps extends CardDialogProps {
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function CardForm({
  card,
  members,
  currency,
  pending,
  submit,
}: CardFormProps) {
  const close = useCloseDialog();
  const confirm = useConfirm();
  const { m } = useI18n();
  const words = m.cards;
  const t = words.dialog;
  const isNew = card === null;

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = e.nativeEvent.submitter;
    // Includes the pressed button's name/value (intent=delete, …)
    const formData = new FormData(e.currentTarget, submitter);
    if (
      submitter?.getAttribute("value") === "delete" &&
      !(await confirm({ text: t.confirmDelete, confirmText: m.common.delete, danger: true }))
    ) {
      return;
    }
    submit(formData);
  };

  return (
    <form className={forms.form} onSubmit={handleSubmit}>

      <input type="hidden" name="id" value={card?.id ?? ""} />

      <div className={forms.grid}>
        <Field label={t.name}>
          <Input
            name="name"
            type="text"
            placeholder={t.namePlaceholder}
            defaultValue={card?.name ?? ""}
            maxLength={60}
            required
            autoFocus
          />
        </Field>
        <Field
          label={t.lastFour}
          hint={t.lastFourHint}
        >
          <Input
            name="last4"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="4821"
            title={t.exactlyFour}
            defaultValue={card?.last4 ?? ""}
            required
          />
        </Field>
      </div>

      <div className={forms.grid}>
        <Field label={t.carriedBy}>
          <Select name="holderId" defaultValue={card?.holderId ?? ""}>
            <option value="">{t.sharedNobody}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={fill(t.limit, { currency })}
          optional
          hint={t.limitHint}
        >
          <Input
            name="monthlyLimit"
            type="number"
            {...amountInputProps(currency)}
            placeholder={words.noLimit}
            defaultValue={card?.monthlyLimit ?? ""}
          />
        </Field>
      </div>

      <div className={forms.footer}>
        {!isNew && (
          <div className={layout.dialogLeft}>
            <button
              type="submit"
              name="intent"
              value="delete"
              // These don't need the other fields to be valid
              formNoValidate
              className={styles.deleteButton}
              disabled={pending}
            >
              <Trash2 size={16} />
              {m.common.delete}
            </button>
            <button
              type="submit"
              name="intent"
              value={card.archived ? "restore" : "archive"}
              formNoValidate
              className={styles.deleteButton}
              disabled={pending}
            >
              {card.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {card.archived ? t.useAgain : t.archive}
            </button>
          </div>
        )}
        <div className={forms.footerRight}>
          <Button
            variant="outline"
            size="sm"
            text={m.common.cancel}
            action={close}
            disabled={pending}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={pending}
            text={pending ? m.common.saving : isNew ? words.add : t.saveChanges}
            disabled={pending}
          />
        </div>
      </div>
    </form>
  );
}
