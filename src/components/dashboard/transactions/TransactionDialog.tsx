// ─────────────────────────────────────────────────────────────────────────────
// Add / edit transaction window
//
// In plain words: the window that opens over the transactions list to add a
// transaction or change one. You choose "Money out" or "Money in", type the
// amount, a description and the date, and pick the account, category and
// status. Owners and admins also get a Delete button, and can tick "Always
// use this category" to make the choice a category rule. Pressing Escape,
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

import {
  startTransition,
  useActionState,
  useState,
  type SubmitEvent,
} from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Select, Textarea } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import Dialog, { useCloseDialog } from "@/components/common/dialog/Dialog";
import { submitTransaction } from "@/app/dashboard/transactions/actions";
import { amountInputProps } from "@/lib/format";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_TYPES,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/finance/attachments";
import { initialActionState } from "@/lib/action-state";
import {
  MAX_RULE_TEXT_LENGTH,
  MIN_RULE_TEXT_LENGTH,
} from "@/lib/finance/category-rules";
import type {
  Account,
  Attachment,
  Category,
  TransactionDetails,
} from "@/types/finance";
import Attachments from "./Attachments";
import forms from "./forms.module.css";
import styles from "./TransactionDialog.module.css";

interface TransactionDialogProps {
  /** The transaction to edit, or null to add a new one */
  transaction: TransactionDetails | null;
  /** The files attached to the transaction being edited */
  attachments: Attachment[];
  accounts: Account[];
  categories: Category[];
  /** The company's currency, e.g. "USD" */
  currency: string;
  /**
   * Whether to show the Delete button and "always use this category"
   * (owners and admins)
   */
  canManage: boolean;
  /** The list's address, to return to when the window closes */
  closeHref: string;
  /** Today in the company's timezone ("2026-10-01"), the default date */
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
      {/* Outside the form: files are saved as soon as they're chosen. A new
          transaction has to be saved once before it can have files. */}
      {props.transaction && (
        <Attachments
          transactionId={props.transaction.id}
          initial={props.attachments}
        />
      )}
    </Dialog>
  );
}

interface TransactionFormProps extends Omit<TransactionDialogProps, "attachments"> {
  error: string | null;
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function TransactionForm({
  transaction,
  accounts,
  categories,
  currency,
  canManage,
  closeHref,
  today,
  error,
  pending,
  submit,
}: TransactionFormProps) {
  const close = useCloseDialog();
  const isNew = transaction === null;
  // Whether "always use this category" is ticked
  const [remember, setRemember] = useState(false);

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
        <Message type="error">
          {error}
        </Message>
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
        <Field label={`Amount (${currency})`}>
          <Input
            name="amount"
            type="number"
            {...amountInputProps(currency)}
            defaultValue={transaction ? Math.abs(transaction.amount) : ""}
            required
            autoFocus
          />
        </Field>
        <Field label="Date">
          <Input
            name="date"
            type="date"
            defaultValue={transaction?.day ?? today}
            required
          />
        </Field>
      </div>

      <Field label="Description">
        <Input
          name="name"
          type="text"
          placeholder="e.g. Office rent, Stripe payout"
          defaultValue={transaction?.name ?? ""}
          maxLength={120}
          required
        />
      </Field>

      <div className={forms.grid}>
        <Field label="Account">
          <Select
            name="accountId"
            defaultValue={transaction?.account ?? accounts[0]?.id}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.last4 ? ` ••${a.last4}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select
            name="categoryId"
            defaultValue={transaction?.categoryId ?? ""}
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
          </Select>
        </Field>
      </div>

      {/* Make it a rule: owners and admins only */}
      {canManage && categories.length > 0 && (
        <div className={styles.remember}>
          <label className={forms.checkbox}>
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Always use this category for descriptions like this
          </label>
          {remember && (
            <Field
              label="Descriptions containing"
              hint="Leave empty to use the whole description. Shorter text matches more, e.g. “AWS”. Transactions that have no category yet get it too."
            >
              <Input
                name="ruleText"
                type="text"
                defaultValue={transaction?.name ?? ""}
                placeholder="The whole description"
                minLength={MIN_RULE_TEXT_LENGTH}
                maxLength={MAX_RULE_TEXT_LENGTH}
              />
            </Field>
          )}
        </div>
      )}

      <Field label="Status">
        <Select
          name="status"
          defaultValue={transaction?.status ?? "completed"}
        >
          <option value="completed">Completed</option>
          <option value="pending">Pending (not in balances yet)</option>
        </Select>
      </Field>

      <Field label="Notes" optional>
        <Textarea
          name="notes"
          rows={2}
          maxLength={1000}
          defaultValue={transaction?.notes ?? ""}
        />
      </Field>

      {/* While adding: one receipt right away. More can be added afterwards,
          by opening the transaction. */}
      {isNew && (
        <Field
          label="Receipt or invoice"
          optional
          hint={`${Object.values(ATTACHMENT_TYPES).join(", ")}, up to ${formatFileSize(MAX_ATTACHMENT_BYTES)}. Open the transaction later to add more.`}
        >
          <Input name="receipt" type="file" accept={ATTACHMENT_ACCEPT} />
        </Field>
      )}

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
            text={pending ? "Saving" : isNew ? "Add transaction" : "Save changes"}
            disabled={pending}
          />
        </div>
      </div>
    </form>
  );
}
