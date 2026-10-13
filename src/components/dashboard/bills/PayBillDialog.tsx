// ─────────────────────────────────────────────────────────────────────────────
// "Mark as paid" window
//
// In plain words: the pop-up for paying a bill — which account the money
// left and on which day. Confirming records the payment as a transaction in
// that account and, for a bill that repeats, adds the next one.
//
// For developers: a client component ("use client"). It opens when the
// address has ?pay=<id> and closes by returning to `closeHref`. Sent with
// onSubmit + startTransition, like the other windows. On success the server
// action redirects back to the list.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import Button from "@/components/common/button/Button";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import Field from "@/components/common/form/Field";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { submitBillPayment } from "@/app/dashboard/bills/actions";
import { initialActionState } from "@/lib/action-state";
import { nextDueDate } from "@/lib/finance/bills";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Account, Bill } from "@/types/finance";
// The windows of the dashboard share how their fields are arranged
import forms from "../transactions/forms.module.css";
import styles from "./BillDialog.module.css";

interface PayBillDialogProps {
  bill: Bill;
  accounts: Account[];
  /** Whether this person can add a bank account (owners and admins) */
  canManage: boolean;
  /** The list's address, to return to when the window closes */
  closeHref: string;
  /** Today in the company's timezone ("2026-10-01"), the default payment day */
  today: string;
}

export default function PayBillDialog(props: PayBillDialogProps) {
  const [state, dispatch, pending] = useActionState(
    submitBillPayment,
    initialActionState,
  );
  return (
    <Dialog title="Mark as paid" closeHref={props.closeHref} busy={pending}>
      <PayBillForm
        {...props}
        error={state.error}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface PayBillFormProps extends PayBillDialogProps {
  error: string | null;
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function PayBillForm({
  bill,
  accounts,
  canManage,
  today,
  error,
  pending,
  submit,
}: PayBillFormProps) {
  const close = useCloseDialog();
  const next = nextDueDate(bill.dueDate, bill.repeat);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(new FormData(e.currentTarget));
  };

  return (
    <form className={forms.form} onSubmit={handleSubmit}>
      {error && <Message type="error">{error}</Message>}

      <input type="hidden" name="id" value={bill.id} />

      {/* What's being paid */}
      <div className={styles.summary}>
        <span className={styles.summaryName}>{bill.name}</span>
        <span className={styles.summaryAmount}>{formatCurrency(bill.amount)}</span>
        <span className={styles.summaryNote}>Due {formatDate(bill.dueDate)}</span>
      </div>

      {accounts.length === 0 ? (
        // The payment needs an account to leave from
        <Message type="info">
          {canManage
            ? "Add a bank account in Settings first: the payment is recorded in the account it was paid from."
            : "Your company has no bank account in Finely yet. Ask an owner or admin to add one in Settings."}
        </Message>
      ) : (
        <>
          <div className={forms.grid}>
            <Field label="Paid from">
              <Select name="accountId" defaultValue={accounts[0].id} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.last4 ? ` ••${a.last4}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Paid on">
              <Input name="date" type="date" defaultValue={today} required />
            </Field>
          </div>

          <p className={styles.note}>
            This adds a payment of {formatCurrency(bill.amount)} to the
            account&apos;s transactions.
            {next && ` The next bill will be due ${formatDate(next)}.`}
          </p>
        </>
      )}

      <div className={forms.footer}>
        <div className={forms.footerRight}>
          <Button
            variant="outline"
            size="sm"
            text="Cancel"
            action={close}
            disabled={pending}
          />
          {accounts.length === 0 ? (
            canManage && (
              <Button
                href="/dashboard/settings#accounts"
                variant="primary"
                size="sm"
                text="Add a bank account"
              />
            )
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? "Saving" : "Mark as paid"}
              disabled={pending}
            />
          )}
        </div>
      </div>
    </form>
  );
}
