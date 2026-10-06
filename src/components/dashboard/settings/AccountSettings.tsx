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

import { startTransition, useActionState, useRef, type FormEvent } from "react";
import { Landmark, Plus } from "lucide-react";
import Button from "@/components/common/button/Button";
import { submitAccount } from "@/app/dashboard/settings/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { Account } from "@/types/finance";
import { formatCurrency } from "@/utils/format";
// The settings sections share their card, list and message styles
import shared from "./TeamSettings.module.css";
import styles from "./AccountSettings.module.css";

// Names shown on screen for each kind of account
const TYPE_LABELS: Record<Account["type"], string> = {
  checking: "Checking",
  savings: "Savings",
  reserve: "Reserve",
};

interface AccountSettingsProps {
  /** Whether you may add and remove accounts (owners and admins) */
  canManage: boolean;
  accounts: Account[];
}

export default function AccountSettings({
  canManage,
  accounts,
}: AccountSettingsProps) {
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

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (
      formData.get("intent") === "remove" &&
      !window.confirm(`Remove ${formData.get("name")}?`)
    ) {
      return;
    }
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="accounts">
      {(state.error || state.success) && (
        <p
          className={state.error ? shared.error : shared.success}
          role={state.error ? "alert" : "status"}
        >
          {state.error ?? state.success}
        </p>
      )}

      {/* Add form: owners and admins only */}
      {canManage && (
        <section className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>Add a bank account</h2>
            <p className={shared.cardHint}>
              Every transaction belongs to an account. The opening balance is
              what was in the account before the first transaction you record.
            </p>
          </div>
          <form ref={addFormRef} className={styles.addForm} onSubmit={submit}>
            <label className={styles.field}>
              <span>Name</span>
              <input
                name="name"
                placeholder="Business Checking"
                maxLength={120}
                className={shared.input}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Type</span>
              <select name="type" className={shared.select} defaultValue="checking">
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Last 4 digits</span>
              <input
                name="last4"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="3201"
                title="Exactly 4 digits"
                className={shared.input}
              />
            </label>
            <label className={styles.field}>
              <span>Opening balance</span>
              <input
                name="openingBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                className={shared.input}
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              text={pending ? "Saving…" : "Add account"}
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
            Bank accounts <span className={shared.count}>{accounts.length}</span>
          </h2>
        </div>
        {accounts.length === 0 ? (
          <p className={shared.notice}>
            {canManage
              ? "No bank accounts yet. Add one above."
              : "No bank accounts yet. Ask an owner or admin to add one."}
          </p>
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
                    {TYPE_LABELS[account.type]}
                    {account.last4 && ` ••${account.last4}`}
                  </span>
                </div>
                <span className={styles.balance}>
                  {formatCurrency(account.balance)}
                </span>
                {canManage && (
                  <form onSubmit={submit}>
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="id" value={account.id} />
                    <input type="hidden" name="name" value={account.name} />
                    <button type="submit" className={shared.rowAction} disabled={pending}>
                      Remove
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
