// ─────────────────────────────────────────────────────────────────────────────
// Bank account settings
//
// In plain words: the list of the company's bank accounts with their current
// balances, and — for owners and admins — a form to add one and buttons to
// remove them. Every transaction belongs to one of these accounts, so an
// account that still has transactions can't be removed.
//
// For developers: a client component ("use client") for the forms. Both forms
// go to the submitAccount server action, which refreshes the page on success.
// They submit via onSubmit + startTransition instead of <form action>, so
// what was typed isn't wiped when the server answers with an error.
// Permissions are enforced in lib/data/; canManage only hides the forms.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { startTransition, useActionState, useRef, useState, type SubmitEvent } from "react";
import { Landmark, Plus } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { useActionNotice } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import { submitAccount } from "@/app/dashboard/settings/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { Account } from "@/types/finance";
import { amountInputProps, formatCurrency } from "@/lib/format";
// The settings sections share their card, list and message styles
import shared from "./TeamSettings.module.css";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import styles from "./AccountSettings.module.css";

// Names shown on screen for each kind of account
const TYPES: Account["type"][] = ["checking", "savings", "reserve"];

interface AccountSettingsProps {
  /** Whether you may add and remove accounts (owners and admins) */
  canManage: boolean;
  accounts: Account[];
  /** The company's currency, e.g. "USD" */
  currency: string;
}

export default function AccountSettings({
  canManage,
  accounts,
  currency,
}: AccountSettingsProps) {
  const { locale, m } = useI18n();
  const t = m.settings.accounts;
  const typeLabels = m.dashboard.accountTypes;
  const addFormRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await submitAccount(previous, formData);
      // Empty the add form once the account was added
      if (!result.error && formData.get("intent") !== "remove") {
        addFormRef.current?.reset();
      }
      return result;
    },
    initialActionState,
  );
  useActionNotice(state);
  // Whether the last form sent removes an account, so removing doesn't show
  // the add button as saving
  const [removing, setRemoving] = useState(false);
  const adding = pending && !removing;

  const confirm = useConfirm();

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (
      formData.get("intent") === "remove" &&
      !(await confirm({
        text: fill(t.confirmRemove, { name: String(formData.get("name")) }),
        confirmText: t.remove,
        danger: true,
      }))
    ) {
      return;
    }
    setRemoving(formData.get("intent") === "remove");
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="accounts">
      {/* Add form: owners and admins only */}
      {canManage && (
        <section className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>{t.add}</h2>
            <p className={shared.cardHint}>{t.addHint}</p>
          </div>
          <form ref={addFormRef} className={styles.addForm} onSubmit={submit}>
            <Field label={t.name}>
              <Input
                name="name"
                placeholder={t.namePlaceholder}
                maxLength={120}
                required
              />
            </Field>
            <Field label={t.type}>
              <Select name="type" defaultValue="checking">
                {TYPES.map((value) => (
                  <option key={value} value={value}>
                    {typeLabels[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.last4}>
              <Input
                name="last4"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="3201"
                title={t.exactlyFour}
              />
            </Field>
            <Field label={t.openingBalance}>
              <Input
                name="openingBalance"
                type="number"
                // No minimum: an account can start below zero
                step={amountInputProps(currency).step}
                placeholder={amountInputProps(currency).placeholder}
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={adding}
              text={adding ? m.common.saving : t.addButton}
              icon={<Plus size={16} />}
              disabled={pending}
            />
          </form>
        </section>
      )}

      {/* The company's accounts */}
      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>
            {t.title} <span className={shared.count}>{accounts.length}</span>
          </h2>
        </div>
        {accounts.length === 0 ? (
          <Message type="info">
            {canManage ? t.emptyManage : t.emptyMember}
          </Message>
        ) : (
          <ul className={shared.list}>
            {accounts.map((account) => (
              <li key={account.id} className={shared.row}>
                <div className={`${shared.avatar} ${shared.avatarMuted}`} aria-hidden="true">
                  <Landmark size={16} />
                </div>
                <div className={shared.who}>
                  <span className={shared.name}>{account.name}</span>
                  <span className={shared.email}>
                    {typeLabels[account.type]}
                    {account.last4 && ` ••${account.last4}`}
                  </span>
                </div>
                <span className={styles.balance}>
                  {formatCurrency(account.balance, { currency }, locale)}
                </span>
                {canManage && (
                  <form onSubmit={submit}>
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="id" value={account.id} />
                    <input type="hidden" name="name" value={account.name} />
                    <button type="submit" className={shared.rowAction} disabled={pending}>
                      {t.remove}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
