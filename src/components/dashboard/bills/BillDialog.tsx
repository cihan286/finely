// ─────────────────────────────────────────────────────────────────────────────
// Add / edit bill window
//
// In plain words: the pop-up form for a bill — who or what it's for, how
// much, when it's due, whether it comes back (every week, month, 3 months or
// year) and its category. Owners and admins also get a Delete button when
// editing.
//
// For developers: a client component ("use client"). It opens when the
// address has ?new=1 or ?edit=<id> and closes by returning to `closeHref`.
// The form is sent with onSubmit + startTransition rather than
// <form action>, so what was typed stays in place when the server answers
// with an error. On success the server action redirects back to the list.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/common/button/Button";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import Field from "@/components/common/form/Field";
import { Input, Select, Textarea } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { submitBill } from "@/app/dashboard/bills/actions";
import { amountInputProps } from "@/lib/format";
import { initialActionState } from "@/lib/action-state";
import { BILL_REPEAT_LABELS } from "@/lib/finance/bills";
import {
  BILL_REPEATS,
  type Bill,
  type BillRepeat,
  type Category,
} from "@/types/finance";
// The windows of the dashboard share how their fields are arranged
import forms from "../transactions/forms.module.css";
import styles from "./BillDialog.module.css";

/** What a new bill's form starts with, e.g. from a regular payment */
export interface BillPrefill {
  name: string;
  amount: number | null;
  dueDate: string | null;
  repeat: BillRepeat | null;
  categoryId: string | null;
}

interface BillDialogProps {
  /** The bill to edit, or null to add a new one */
  bill: Bill | null;
  /** For a new bill: values to start with */
  prefill?: BillPrefill;
  categories: Category[];
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** Whether to show the Delete button (owners and admins) */
  canManage: boolean;
  /** The list's address, to return to when the window closes */
  closeHref: string;
  /** Today in the company's timezone ("2026-10-01"), the default due date */
  today: string;
}

export default function BillDialog(props: BillDialogProps) {
  const [state, dispatch, pending] = useActionState(submitBill, initialActionState);
  return (
    <Dialog
      title={props.bill ? "Edit bill" : "Add bill"}
      closeHref={props.closeHref}
      busy={pending}
    >
      <BillForm
        {...props}
        error={state.error}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface BillFormProps extends BillDialogProps {
  error: string | null;
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function BillForm({
  bill,
  prefill,
  categories,
  currency,
  canManage,
  today,
  error,
  pending,
  submit,
}: BillFormProps) {
  const close = useCloseDialog();
  const isNew = bill === null;
  // Bills are money going out
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = e.nativeEvent.submitter;
    if (
      submitter?.getAttribute("value") === "delete" &&
      !window.confirm("Delete this bill? This can't be undone.")
    ) {
      return;
    }
    // Includes the pressed button's name/value (intent=delete)
    submit(new FormData(e.currentTarget, submitter));
  };

  return (
    <form className={forms.form} onSubmit={handleSubmit}>
      {error && <Message type="error">{error}</Message>}

      <input type="hidden" name="id" value={bill?.id ?? ""} />

      <Field label="Bill">
        <Input
          name="name"
          type="text"
          placeholder="e.g. Office rent, Google Workspace"
          defaultValue={bill?.name ?? prefill?.name ?? ""}
          maxLength={120}
          required
          autoFocus
        />
      </Field>

      <div className={forms.grid}>
        <Field label={`Amount (${currency})`}>
          <Input
            name="amount"
            type="number"
            {...amountInputProps(currency)}
            defaultValue={bill?.amount ?? prefill?.amount ?? ""}
            required
          />
        </Field>
        <Field label="Due date">
          <Input
            name="dueDate"
            type="date"
            defaultValue={bill?.dueDate ?? prefill?.dueDate ?? today}
            required
          />
        </Field>
      </div>

      <div className={forms.grid}>
        <Field label="Repeats">
          <Select name="repeat" defaultValue={bill?.repeat ?? prefill?.repeat ?? "none"}>
            {BILL_REPEATS.map((repeat) => (
              <option key={repeat} value={repeat}>
                {BILL_REPEAT_LABELS[repeat]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select
            name="categoryId"
            defaultValue={bill?.categoryId ?? prefill?.categoryId ?? ""}
          >
            <option value="">Uncategorized</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Notes"
        optional
        hint="A repeating bill's next one is added when you mark this one as paid."
      >
        <Textarea
          name="notes"
          rows={2}
          maxLength={1000}
          defaultValue={bill?.notes ?? ""}
        />
      </Field>

      <div className={forms.footer}>
        {!isNew && canManage && (
          <button
            type="submit"
            name="intent"
            value="delete"
            // Deleting doesn't need the other fields to be valid
            formNoValidate
            className={styles.deleteButton}
            disabled={pending}
          >
            <Trash2 size={16} />
            Delete
          </button>
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
            text={pending ? "Saving" : isNew ? "Add bill" : "Save changes"}
            disabled={pending}
          />
        </div>
      </div>
    </form>
  );
}
