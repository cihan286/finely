// ─────────────────────────────────────────────────────────────────────────────
// "Undo payment" window
//
// In plain words: the pop-up for a bill that was marked as paid by mistake.
// It says what undoing will do — the bill is owed again, the payment that
// "Mark as paid" recorded is deleted (a payment that was already among the
// transactions stays), and the next bill of a repeating one is removed — and
// asks to confirm.
//
// For developers: a client component ("use client"). It opens when the
// address has ?undo=<id> and closes by returning to `closeHref`. Sent with
// onSubmit + startTransition, like the other windows. On success the server
// action redirects back to the list.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import Button from "@/components/common/button/Button";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import Message from "@/components/common/form/Message";
import { submitUndoBillPayment } from "@/app/dashboard/bills/actions";
import { initialActionState } from "@/lib/action-state";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Bill } from "@/types/finance";
// The windows of the dashboard share how their fields are arranged
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import forms from "../transactions/forms.module.css";
import styles from "./BillDialog.module.css";

interface UndoPaymentDialogProps {
  /** A paid bill */
  bill: Bill;
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** The list's address, to return to when the window closes */
  closeHref: string;
}

export default function UndoPaymentDialog(props: UndoPaymentDialogProps) {
  const t = useI18n().m.bills.undoDialog;
  const [state, dispatch, pending] = useActionState(
    submitUndoBillPayment,
    initialActionState,
  );
  return (
    <Dialog title={t.title} closeHref={props.closeHref} busy={pending}>
      <UndoPaymentForm
        {...props}
        error={state.error}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface UndoPaymentFormProps extends UndoPaymentDialogProps {
  error: string | null;
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function UndoPaymentForm({
  bill,
  currency,
  error,
  pending,
  submit,
}: UndoPaymentFormProps) {
  const close = useCloseDialog();
  const { locale, m } = useI18n();
  const t = m.bills.undoDialog;
  const due = formatDate(bill.dueDate, locale);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(new FormData(e.currentTarget));
  };

  return (
    <form className={forms.form} onSubmit={handleSubmit}>
      {error && <Message type="error">{error}</Message>}

      <input type="hidden" name="id" value={bill.id} />

      {/* Which payment */}
      <div className={styles.summary}>
        <span className={styles.summaryName}>{bill.name}</span>
        <span className={styles.summaryAmount}>
          {formatCurrency(bill.amount, { currency }, locale)}
        </span>
        <span className={styles.summaryNote}>
          {bill.paidDay
            ? fill(t.paidDue, { paid: formatDate(bill.paidDay, locale), due })
            : fill(t.due, { due })}
        </span>
      </div>

      <p className={styles.note}>
        {t.backToOwed}{" "}
        {!bill.transactionId ? t.noPayment : bill.paymentLinked ? t.linked : t.recorded}
        {bill.repeat !== "none" && ` ${t.nextRemoved}`}
      </p>

      <div className={forms.footer}>
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
            text={pending ? t.undoing : t.title}
            disabled={pending}
          />
        </div>
      </div>
    </form>
  );
}
