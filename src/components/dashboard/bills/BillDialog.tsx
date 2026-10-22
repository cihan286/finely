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
import { useActionNotice } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import { submitBill } from "@/app/dashboard/bills/actions";
import { amountInputProps } from "@/lib/format";
import { initialActionState } from "@/lib/action-state";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
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
  /** Whether anything can be changed (everyone but viewers) */
  canRecord: boolean;
  /** The list's address, to return to when the window closes */
  closeHref: string;
  /** Today in the company's timezone ("2026-10-01"), the default due date */
  today: string;
}

export default function BillDialog(props: BillDialogProps) {
  const t = useI18n().m.bills;
  const [state, dispatch, pending] = useActionState(submitBill, initialActionState);
  useActionNotice(state);
  return (
    <Dialog
      title={props.bill ? t.dialog.editTitle : t.add}
      closeHref={props.closeHref}
      busy={pending}
    >
      <BillForm
        {...props}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface BillFormProps extends BillDialogProps {
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
  canRecord,
  today,
  pending,
  submit,
}: BillFormProps) {
  const close = useCloseDialog();
  const confirm = useConfirm();
  const { m } = useI18n();
  const words = m.bills;
  const t = words.dialog;
  const isNew = bill === null;
  // Bills are money going out
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = e.nativeEvent.submitter;
    // Includes the pressed button's name/value (intent=delete)
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
      {/* Viewers see the details but can't change them */}
      <fieldset className={forms.fields} disabled={!canRecord}>
        <input type="hidden" name="id" value={bill?.id ?? ""} />

        <Field label={t.bill}>
          <Input
            name="name"
            type="text"
            placeholder={t.placeholder}
            defaultValue={bill?.name ?? prefill?.name ?? ""}
            maxLength={120}
            required
            autoFocus
          />
        </Field>

        <div className={forms.grid}>
          <Field label={fill(t.amountIn, { currency })}>
            <Input
              name="amount"
              type="number"
              {...amountInputProps(currency)}
              defaultValue={bill?.amount ?? prefill?.amount ?? ""}
              required
            />
          </Field>
          <Field label={t.dueDate}>
            <Input
              name="dueDate"
              type="date"
              defaultValue={bill?.dueDate ?? prefill?.dueDate ?? today}
              required
            />
          </Field>
        </div>

        <div className={forms.grid}>
          <Field label={t.repeats}>
            <Select name="repeat" defaultValue={bill?.repeat ?? prefill?.repeat ?? "none"}>
              {BILL_REPEATS.map((repeat) => (
                <option key={repeat} value={repeat}>
                  {words.repeats[repeat]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.category}>
            <Select
              name="categoryId"
              defaultValue={bill?.categoryId ?? prefill?.categoryId ?? ""}
            >
              <option value="">{words.uncategorized}</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label={t.notes}
          optional
          hint={t.notesHint}
        >
          <Textarea
            name="notes"
            rows={2}
            maxLength={1000}
            defaultValue={bill?.notes ?? ""}
          />
        </Field>
      </fieldset>

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
            {m.common.delete}
          </button>
        )}
        <div className={forms.footerRight}>
          <Button
            variant="outline"
            size="sm"
            text={canRecord ? m.common.cancel : m.common.close}
            action={close}
            disabled={pending}
          />
          {canRecord && (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? m.common.saving : isNew ? words.add : t.saveChanges}
              disabled={pending}
            />
          )}
        </div>
      </div>
    </form>
  );
}
