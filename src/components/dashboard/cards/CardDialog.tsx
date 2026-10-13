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
import Message from "@/components/common/form/Message";
import { submitCard } from "@/app/dashboard/cards/actions";
import { initialActionState } from "@/lib/action-state";
import { amountInputProps } from "@/lib/format";
import type { Card } from "@/types/finance";
// The windows of the dashboard share how their fields are arranged
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
  const [state, dispatch, pending] = useActionState(submitCard, initialActionState);
  return (
    <Dialog
      title={props.card ? "Edit card" : "Add card"}
      closeHref={props.closeHref}
      busy={pending}
    >
      <CardForm
        {...props}
        error={state.error}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface CardFormProps extends CardDialogProps {
  error: string | null;
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function CardForm({
  card,
  members,
  currency,
  error,
  pending,
  submit,
}: CardFormProps) {
  const close = useCloseDialog();
  const isNew = card === null;

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = e.nativeEvent.submitter;
    if (
      submitter?.getAttribute("value") === "delete" &&
      !window.confirm(
        "Delete this card? The transactions paid with it stay, without a card. This can't be undone.",
      )
    ) {
      return;
    }
    // Includes the pressed button's name/value (intent=delete, …)
    submit(new FormData(e.currentTarget, submitter));
  };

  return (
    <form className={forms.form} onSubmit={handleSubmit}>
      {error && <Message type="error">{error}</Message>}

      <input type="hidden" name="id" value={card?.id ?? ""} />

      <div className={forms.grid}>
        <Field label="Name">
          <Input
            name="name"
            type="text"
            placeholder="e.g. Marketing card"
            defaultValue={card?.name ?? ""}
            maxLength={60}
            required
            autoFocus
          />
        </Field>
        <Field
          label="Last four digits"
          hint="Finely never asks for the full number. Bank statements name a card by these, which is how its payments are recognized."
        >
          <Input
            name="last4"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            placeholder="4821"
            title="Exactly 4 digits"
            defaultValue={card?.last4 ?? ""}
            required
          />
        </Field>
      </div>

      <div className={forms.grid}>
        <Field label="Carried by">
          <Select name="holderId" defaultValue={card?.holderId ?? ""}>
            <option value="">Shared (nobody in particular)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={`Monthly limit (${currency})`}
          optional
          hint="Finely warns when it's reached; it can't stop the card."
        >
          <Input
            name="monthlyLimit"
            type="number"
            {...amountInputProps(currency)}
            placeholder="No limit"
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
              Delete
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
              {card.archived ? "Use again" : "Archive"}
            </button>
          </div>
        )}
        <div className={forms.footerRight}>
          <Button
            variant="outline"
            size="sm"
            text="Cancel"
            action={close}
            disabled={pending}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={pending}
            text={pending ? "Saving" : isNew ? "Add card" : "Save changes"}
            disabled={pending}
          />
        </div>
      </div>
    </form>
  );
}
