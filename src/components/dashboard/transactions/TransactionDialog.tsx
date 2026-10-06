// ─────────────────────────────────────────────────────────────────────────────
// Add / edit transaction window
//
// In plain words: the window that opens over the transactions list to add a
// transaction or change one. You choose "Money out" or "Money in", type the
// amount, a description and the date, and pick the account, category and
// status. Owners and admins also get a Delete button. Pressing Escape,
// Cancel or clicking outside the window closes it without saving.
//
// For developers: a client component ("use client") around a native <dialog>.
// It's opened by the address (?new=1 / ?edit=<id>, see the transactions
// page), so closing it means going back to the list's address. The form
// submits via onSubmit + startTransition instead of <form action>, because
// React resets <form action> fields after every submit, which would wipe
// what was typed when the server answers with an error.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import Button from "@/components/common/button/Button";
import { submitTransaction } from "@/app/dashboard/transactions/actions";
import { initialActionState } from "@/lib/action-state";
import type { Account, Category, TransactionDetails } from "@/types/finance";
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

export default function TransactionDialog({
  transaction,
  accounts,
  categories,
  canDelete,
  closeHref,
  today,
}: TransactionDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, dispatch, pending] = useActionState(
    submitTransaction,
    initialActionState,
  );
  const isNew = transaction === null;

  // Open as a modal window (dims the page and traps keyboard focus)
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Fires on Escape and on dialog.close(): go back to the plain list
  const handleClose = () => {
    router.replace(closeHref, { scroll: false });
  };

  // A click on the dimmed area outside the window closes it
  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget && !pending) e.currentTarget.close();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    if (
      submitter?.getAttribute("value") === "delete" &&
      !window.confirm("Delete this transaction? This can't be undone.")
    ) {
      return;
    }
    // Includes the pressed button's name/value (intent=delete)
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };

  const incomeCategories = categories.filter((c) => c.kind === "income");
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={handleClose}
      onClick={handleBackdropClick}
      aria-labelledby="transaction-dialog-title"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h2 id="transaction-dialog-title" className={styles.title}>
            {isNew ? "Add transaction" : "Edit transaction"}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}

        <input type="hidden" name="id" value={transaction?.id ?? ""} />
        <input type="hidden" name="originalDate" value={transaction?.date ?? ""} />
        <input type="hidden" name="returnTo" value={closeHref} />

        {/* Money out / Money in: decides whether the amount is negative */}
        <fieldset className={styles.direction}>
          <legend className={styles.srOnly}>Type</legend>
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

        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.label}>Amount (USD)</span>
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              defaultValue={transaction ? Math.abs(transaction.amount) : ""}
              className={styles.input}
              required
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Date</span>
            <input
              name="date"
              type="date"
              defaultValue={transaction ? transaction.date.slice(0, 10) : today}
              className={styles.input}
              required
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Description</span>
          <input
            name="name"
            type="text"
            placeholder="e.g. Office rent, Stripe payout"
            defaultValue={transaction?.name ?? ""}
            maxLength={120}
            className={styles.input}
            required
          />
        </label>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.label}>Account</span>
            <select
              name="accountId"
              defaultValue={transaction?.account ?? accounts[0]?.id}
              className={styles.input}
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
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <select
              name="categoryId"
              defaultValue={transaction?.categoryId ?? ""}
              className={styles.input}
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

        <label className={styles.field}>
          <span className={styles.label}>Status</span>
          <select
            name="status"
            defaultValue={transaction?.status ?? "completed"}
            className={styles.input}
          >
            <option value="completed">Completed</option>
            <option value="pending">Pending (not in balances yet)</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Notes <span className={styles.optional}>(optional)</span>
          </span>
          <textarea
            name="notes"
            rows={2}
            maxLength={1000}
            defaultValue={transaction?.notes ?? ""}
            className={`${styles.input} ${styles.textarea}`}
          />
        </label>

        <div className={styles.footer}>
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
          <div className={styles.footerRight}>
            <Button
              variant="outline"
              size="sm"
              text="Cancel"
              action={() => dialogRef.current?.close()}
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
    </dialog>
  );
}
