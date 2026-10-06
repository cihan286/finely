// ─────────────────────────────────────────────────────────────────────────────
// Add / edit transaction window
//
// In plain words: the window that opens over the transactions list to add a
// transaction or change one. You choose "Money out" or "Money in", type the
// amount, a description and the date, and pick the account, category and
// status. Owners and admins also get a Delete button. Pressing Escape,
// Cancel or clicking outside the window closes it without saving.
//
// For developers: a client component ("use client") inside the shared
// Dialog, opened by the address (?new=1 / ?edit=<id>, see the transactions
// page). The form submits via onSubmit + startTransition instead of
// <form action>, because React resets <form action> fields after every
// submit, which would wipe what was typed when the server answers with an
// error. On success the server action redirects back to the list.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, type SubmitEvent } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/common/button/Button";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import { submitTransaction } from "@/app/dashboard/transactions/actions";
import { initialActionState } from "@/lib/action-state";
import type { Account, Category, TransactionDetails } from "@/types/finance";
import forms from "./forms.module.css";
import styles from "./TransactionDialog.module.css";

interface TransactionDialogProps {
  /** The transaction to edit, or null to add a new one */
  transaction: TransactionDetails | null;
  accounts: Account[];
  categories: Category[];
  /** Whether to show the Delete button (owners and admins) */
  canDelete: boolean;
  /** The list's address, to return to when the window closes */
  closeHref: string;
  /** Today's date ("2026-10-01"), the default for new transactions */
  today: string;
}

export default function TransactionDialog(props: TransactionDialogProps) {
  const [state, dispatch, pending] = useActionState(
    submitTransaction,
    initialActionState,
  );
  return (
    <Dialog
      title={props.transaction ? "Edit transaction" : "Add transaction"}
      closeHref={props.closeHref}
      busy={pending}
    >
      <TransactionForm
        {...props}
        error={state.error}
        pending={pending}
        submit={(formData) => startTransition(() => dispatch(formData))}
      />
    </Dialog>
  );
}

interface TransactionFormProps extends TransactionDialogProps {
  error: string | null;
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function TransactionForm({
  transaction,
  accounts,
  categories,
  canDelete,
  closeHref,
  today,
  error,
  pending,
  submit,
}: TransactionFormProps) {
  const close = useCloseDialog();
  const isNew = transaction === null;

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = e.nativeEvent.submitter;
    if (
      submitter?.getAttribute("value") === "delete" &&
      !window.confirm("Delete this transaction? This can't be undone.")
    ) {
      return;
    }
    // Includes the pressed button's name/value (intent=delete)
    submit(new FormData(e.currentTarget, submitter));
  };

  const incomeCategories = categories.filter((c) => c.kind === "income");
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  return (
    <form className={forms.form} onSubmit={handleSubmit}>
      {error && (
        <p className={forms.error} role="alert">
          {error}
        </p>
      )}

      <input type="hidden" name="id" value={transaction?.id ?? ""} />
      <input type="hidden" name="originalDate" value={transaction?.date ?? ""} />
      <input type="hidden" name="returnTo" value={closeHref} />

      {/* Money out / Money in: decides whether the amount is negative */}
      <fieldset className={styles.direction}>
        <legend className={forms.srOnly}>Type</legend>
        <label>
          <input
            type="radio"
            name="direction"
            value="out"
            defaultChecked={!transaction || transaction.amount < 0}
          />
          <span>Money out</span>
        </label>
        <label>
          <input
            type="radio"
            name="direction"
            value="in"
            defaultChecked={transaction !== null && transaction.amount > 0}
          />
          <span>Money in</span>
        </label>
      </fieldset>

      <div className={forms.grid}>
        <label className={forms.field}>
          <span className={forms.label}>Amount (USD)</span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            defaultValue={transaction ? Math.abs(transaction.amount) : ""}
            className={forms.input}
            required
            autoFocus
          />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>Date</span>
          <input
            name="date"
            type="date"
            defaultValue={transaction ? transaction.date.slice(0, 10) : today}
            className={forms.input}
            required
          />
        </label>
      </div>

      <label className={forms.field}>
        <span className={forms.label}>Description</span>
        <input
          name="name"
          type="text"
          placeholder="e.g. Office rent, Stripe payout"
          defaultValue={transaction?.name ?? ""}
          maxLength={120}
          className={forms.input}
          required
        />
      </label>

      <div className={forms.grid}>
        <label className={forms.field}>
          <span className={forms.label}>Account</span>
          <select
            name="accountId"
            defaultValue={transaction?.account ?? accounts[0]?.id}
            className={forms.input}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.last4 ? ` ••${a.last4}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>Category</span>
          <select
            name="categoryId"
            defaultValue={transaction?.categoryId ?? ""}
            className={forms.input}
          >
            <option value="">Uncategorized</option>
            {incomeCategories.length > 0 && (
              <optgroup label="Money in">
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            {expenseCategories.length > 0 && (
              <optgroup label="Money out">
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>

      <label className={forms.field}>
        <span className={forms.label}>Status</span>
        <select
          name="status"
          defaultValue={transaction?.status ?? "completed"}
          className={forms.input}
        >
          <option value="completed">Completed</option>
          <option value="pending">Pending (not in balances yet)</option>
        </select>
      </label>

      <label className={forms.field}>
        <span className={forms.label}>
          Notes <span className={forms.optional}>(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={2}
          maxLength={1000}
          defaultValue={transaction?.notes ?? ""}
          className={`${forms.input} ${forms.textarea}`}
        />
      </label>

      <div className={forms.footer}>
        {!isNew && canDelete && (
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
            text={pending ? "Saving…" : isNew ? "Add transaction" : "Save changes"}
            disabled={pending}
          />
        </div>
      </div>
    </form>
  );
}
