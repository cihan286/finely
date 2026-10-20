// ─────────────────────────────────────────────────────────────────────────────
// "Mark as paid" window
//
// In plain words: the pop-up for paying a bill — which account the money
// left and on which day. Confirming records the payment as a transaction in
// that account and, for a bill that repeats, adds the next one. If a
// transaction of the bill's amount is already there around its due date (it
// came with a bank statement, say), the window offers it as the payment
// instead, so the payment isn't recorded twice.
//
// For developers: a client component ("use client"). It opens when the
// address has ?pay=<id> and closes by returning to `closeHref`. Sent with
// onSubmit + startTransition, like the other windows. On success the server
// action redirects back to the list.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useState,
  type SubmitEvent,
} from "react";
import Button from "@/components/common/button/Button";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import Field from "@/components/common/form/Field";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { useActionNotice } from "@/components/common/notice/Notice";
import { submitBillPayment } from "@/app/dashboard/bills/actions";
import { initialActionState } from "@/lib/action-state";
import { nextDueDate } from "@/lib/finance/bills";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Account, Bill, BillPaymentCandidate } from "@/types/finance";
// The windows of the dashboard share how their fields are arranged
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import forms from "../transactions/forms.module.css";
import styles from "./BillDialog.module.css";

interface PayBillDialogProps {
  bill: Bill;
  /**
   * Transactions that look like this bill's payment, the likeliest first;
   * empty if there are none
   */
  candidates: BillPaymentCandidate[];
  accounts: Account[];
  /** The company's currency, e.g. "USD" */
  currency: string;
  /** Whether this person can add a bank account (owners and admins) */
  canManage: boolean;
  /** The list's address, to return to when the window closes */
  closeHref: string;
  /** Today in the company's timezone ("2026-10-01"), the default payment day */
  today: string;
}

export default function PayBillDialog(props: PayBillDialogProps) {
  const t = useI18n().m.bills;
  const [state, dispatch, pending] = useActionState(
    submitBillPayment,
    initialActionState,
  );
  useActionNotice(state);
  return (
    <Dialog title={t.markAsPaid} closeHref={props.closeHref} busy={pending}>
      <PayBillForm
        {...props}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface PayBillFormProps extends PayBillDialogProps {
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function PayBillForm({
  bill,
  candidates,
  accounts,
  currency,
  canManage,
  today,
  pending,
  submit,
}: PayBillFormProps) {
  const close = useCloseDialog();
  const { locale, m } = useI18n();
  const words = m.bills;
  const t = words.pay;
  const date = (day: string) => formatDate(day, locale);
  const next = nextDueDate(bill.dueDate, bill.repeat);
  // The transaction that is the payment; "" = record a new one. When one
  // looks like it, that's the likelier truth.
  const [existingId, setExistingId] = useState(candidates[0]?.id ?? "");

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(new FormData(e.currentTarget));
  };

  return (
    <form className={forms.form} onSubmit={handleSubmit}>

      <input type="hidden" name="id" value={bill.id} />

      {/* What's being paid */}
      <div className={styles.summary}>
        <span className={styles.summaryName}>{bill.name}</span>
        <span className={styles.summaryAmount}>
          {formatCurrency(bill.amount, { currency }, locale)}
        </span>
        <span className={styles.summaryNote}>{fill(t.due, { date: date(bill.dueDate) })}</span>
      </div>

      {candidates.length > 0 && (
        <Field
          label={t.payment}
          hint={t.paymentHint}
        >
          <Select
            name="transactionId"
            value={existingId}
            onChange={(e) => setExistingId(e.target.value)}
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {fill(t.alreadyThere, { name: c.name, date: date(c.day), account: c.account })}
              </option>
            ))}
            <option value="">{t.recordNew}</option>
          </Select>
        </Field>
      )}

      {existingId ? (
        <p className={styles.note}>
          {t.nothingAdded}
          {next && ` ${fill(t.nextBill, { date: date(next) })}`}
        </p>
      ) : accounts.length === 0 ? (
        // The payment needs an account to leave from
        <Message type="info">
          {canManage ? t.addAccountFirst : t.noAccountMember}
        </Message>
      ) : (
        <>
          <div className={forms.grid}>
            <Field label={t.paidFrom}>
              <Select name="accountId" defaultValue={accounts[0].id} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.last4 ? ` ••${a.last4}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.paidOn}>
              <Input name="date" type="date" defaultValue={today} required />
            </Field>
          </div>

          <p className={styles.note}>
            {fill(t.addsPayment, { amount: formatCurrency(bill.amount, { currency }, locale) })}
            {next && ` ${fill(t.nextBill, { date: date(next) })}`}
          </p>
        </>
      )}

      <div className={forms.footer}>
        <div className={forms.footerRight}>
          <Button
            variant="outline"
            size="sm"
            text={m.common.cancel}
            action={close}
            disabled={pending}
          />
          {!existingId && accounts.length === 0 ? (
            canManage && (
              <Button
                href="/dashboard/settings#accounts"
                variant="primary"
                size="sm"
                text={t.addAccount}
              />
            )
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? m.common.saving : words.markAsPaid}
              disabled={pending}
            />
          )}
        </div>
      </div>
    </form>
  );
}
