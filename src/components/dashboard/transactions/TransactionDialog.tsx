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
import { useActionNotice } from "@/components/common/notice/Notice";
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
  Card,
  Attachment,
  Category,
  TransactionDetails,
} from "@/types/finance";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
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
  /** The company's payment cards, to say which one paid */
  cards: Card[];
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
  const t = useI18n().m.transactions.dialog;
  const [state, dispatch, pending] = useActionState(
    submitTransaction,
    initialActionState,
  );
  useActionNotice(state);
  return (
    <Dialog
      title={props.transaction ? t.editTitle : t.addTitle}
      closeHref={props.closeHref}
      busy={pending}
    >
      <TransactionForm
        {...props}
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
  pending: boolean;
  submit: (formData: FormData) => void;
}

// The form inside the window (separate so its Cancel button can close it)
function TransactionForm({
  transaction,
  accounts,
  categories,
  cards,
  currency,
  canManage,
  closeHref,
  today,
  pending,
  submit,
}: TransactionFormProps) {
  const close = useCloseDialog();
  const { locale, m } = useI18n();
  const words = m.transactions;
  const t = words.dialog;
  const isNew = transaction === null;
  // Whether "always use this category" is ticked
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = e.nativeEvent.submitter;
    if (
      submitter?.getAttribute("value") === "delete" &&
      !window.confirm(t.confirmDelete)
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

      <input type="hidden" name="id" value={transaction?.id ?? ""} />
      <input type="hidden" name="originalDate" value={transaction?.date ?? ""} />
      <input type="hidden" name="returnTo" value={closeHref} />

      {/* Money out / Money in: decides whether the amount is negative */}
      <fieldset className={styles.direction}>
        <legend className={forms.srOnly}>{t.type}</legend>
        <label>
          <input
            type="radio"
            name="direction"
            value="out"
            defaultChecked={!transaction || transaction.amount < 0}
          />
          <span>{words.moneyOut}</span>
        </label>
        <label>
          <input
            type="radio"
            name="direction"
            value="in"
            defaultChecked={transaction !== null && transaction.amount > 0}
          />
          <span>{words.moneyIn}</span>
        </label>
      </fieldset>

      <div className={forms.grid}>
        <Field label={fill(t.amountIn, { currency })}>
          <Input
            name="amount"
            type="number"
            {...amountInputProps(currency)}
            defaultValue={transaction ? Math.abs(transaction.amount) : ""}
            required
            autoFocus
          />
        </Field>
        <Field label={t.date}>
          <Input
            name="date"
            type="date"
            defaultValue={transaction?.day ?? today}
            required
          />
        </Field>
      </div>

      <Field label={t.description}>
        <Input
          name="name"
          type="text"
          placeholder={t.descriptionPlaceholder}
          defaultValue={transaction?.name ?? ""}
          maxLength={120}
          required
        />
      </Field>

      <div className={forms.grid}>
        <Field label={t.account}>
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
        <Field label={t.category}>
          <Select
            name="categoryId"
            defaultValue={transaction?.categoryId ?? ""}
          >
            <option value="">{words.uncategorized}</option>
            {incomeCategories.length > 0 && (
              <optgroup label={words.moneyIn}>
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            {expenseCategories.length > 0 && (
              <optgroup label={words.moneyOut}>
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

      {/* Only once the company has cards; archived ones can't be chosen,
          but the one this transaction already has stays */}
      {cards.length > 0 && (
        <Field
          label={t.paidWith}
          optional
          hint={isNew ? t.paidWithHint : undefined}
        >
          <Select name="cardId" defaultValue={transaction?.cardId ?? ""}>
            <option value="">{t.noCard}</option>
            {cards
              .filter((c) => !c.archived || c.id === transaction?.cardId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} •••• {c.last4}
                  {c.archived ? ` ${t.archived}` : ""}
                </option>
              ))}
          </Select>
        </Field>
      )}

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
            {t.remember}
          </label>
          {remember && (
            <Field
              label={t.containing}
              hint={t.containingHint}
            >
              <Input
                name="ruleText"
                type="text"
                defaultValue={transaction?.name ?? ""}
                placeholder={t.wholeDescription}
                minLength={MIN_RULE_TEXT_LENGTH}
                maxLength={MAX_RULE_TEXT_LENGTH}
              />
            </Field>
          )}
        </div>
      )}

      <Field label={t.status}>
        <Select
          name="status"
          defaultValue={transaction?.status ?? "completed"}
        >
          <option value="completed">{words.status.completed}</option>
          <option value="pending">{words.status.pendingLong}</option>
        </Select>
      </Field>

      <Field label={t.notes} optional>
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
          label={t.receipt}
          optional
          hint={fill(t.receiptHint, {
            types: Object.values(ATTACHMENT_TYPES).join(", "),
            size: formatFileSize(MAX_ATTACHMENT_BYTES, locale),
          })}
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
            {m.common.delete}
          </button>
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
