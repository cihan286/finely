// ─────────────────────────────────────────────────────────────────────────────
// Category settings
//
// In plain words: the company's categories (Payroll, Sales, …), grouped into
// money in and money out. Owners and admins can add categories and change
// each one's name, type, color, icon and (for money out) monthly budget, or
// delete it — its transactions then become "Uncategorized". Members can see the list but not change it.
//
// For developers: a client component ("use client") for the forms. All forms
// go to the submitCategory server action (intent add / update / delete),
// which refreshes the page on success. They submit via onSubmit +
// startTransition instead of <form action>, so what was typed isn't wiped
// when the server answers with an error. Permissions are enforced in
// lib/data/; canManage only hides the forms.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import { Plus } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Select } from "@/components/common/form/controls";
import { useActionNotice } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import { CATEGORY_ICONS } from "@/components/dashboard/categoryIcons";
import { submitCategory } from "@/app/dashboard/settings/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { amountInputProps, formatCurrency } from "@/lib/format";
import type { Category, CategoryIconKey } from "@/types/finance";
// The settings sections share their card, list and message styles
import shared from "./TeamSettings.module.css";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import styles from "./CategorySettings.module.css";

const GROUPS = ["income", "expense"] as const;

interface CategorySettingsProps {
  /** Whether you may change categories (owners and admins) */
  canManage: boolean;
  categories: Category[];
  /** The company's currency, e.g. "USD" */
  currency: string;
}

export default function CategorySettings({
  canManage,
  categories,
  currency,
}: CategorySettingsProps) {
  const { m } = useI18n();
  const t = m.settings.categories;
  const addFormRef = useRef<HTMLFormElement>(null);
  // The category being edited, if any
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, dispatch, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await submitCategory(previous, formData);
      if (!result.error) {
        // Close the edit form, or empty the add form
        if (formData.get("intent") === "add") addFormRef.current?.reset();
        else setEditingId(null);
      }
      return result;
    },
    initialActionState,
  );
  useActionNotice(state);
  // What the last form sent does ("add", "update" or "delete"), so only its
  // button shows as saving
  const [intent, setIntent] = useState("");
  const adding = pending && intent === "add";
  const updating = pending && intent === "update";

  const confirm = useConfirm();

  const submit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, e.nativeEvent.submitter);
    if (
      formData.get("intent") === "delete" &&
      !(await confirm({
        text: fill(t.confirmDelete, { name: String(formData.get("name")) }),
        confirmText: m.common.delete,
        danger: true,
      }))
    ) {
      return;
    }
    setIntent(String(formData.get("intent")));
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="categories">
      {/* Add form: owners and admins only */}
      {canManage && (
        <section className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>{t.add}</h2>
            <p className={shared.cardHint}>{t.addHint}</p>
          </div>
          <form ref={addFormRef} className={styles.form} onSubmit={submit}>
            <input type="hidden" name="intent" value="add" />
            <CategoryFields currency={currency} />
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

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>
            {t.title} <span className={shared.count}>{categories.length}</span>
          </h2>
        </div>
        {GROUPS.map((kind) => {
          const group = categories.filter((c) => c.kind === kind);
          return (
            <div key={kind} className={styles.group}>
              <h3 className={styles.groupTitle}>
                {kind === "income" ? m.transactions.moneyIn : m.transactions.moneyOut}
              </h3>
              {group.length === 0 ? (
                <p className={styles.none}>{t.noneYet}</p>
              ) : (
                <ul className={shared.list}>
                  {group.map((category) =>
                    editingId === category.id ? (
                      <li key={category.id} className={shared.row}>
                        <form className={styles.form} onSubmit={submit}>
                          <input type="hidden" name="intent" value="update" />
                          <input type="hidden" name="id" value={category.id} />
                          <CategoryFields category={category} currency={currency} />
                          <div className={styles.rowButtons}>
                            <Button
                              variant="outline"
                              size="sm"
                              text={m.common.cancel}
                              action={() => setEditingId(null)}
                              disabled={pending}
                            />
                            <Button
                              type="submit"
                              variant="primary"
                              size="sm"
                              loading={updating}
                              text={updating ? m.common.saving : m.common.save}
                              disabled={pending}
                            />
                          </div>
                        </form>
                      </li>
                    ) : (
                      <CategoryRow
                        key={category.id}
                        currency={currency}
                        category={category}
                        canManage={canManage}
                        pending={pending}
                        onEdit={() => setEditingId(category.id)}
                        onDelete={submit}
                      />
                    ),
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

// One category in the list, with Edit and Delete for owners and admins
function CategoryRow({
  category,
  currency,
  canManage,
  pending,
  onEdit,
  onDelete,
}: {
  category: Category;
  currency: string;
  canManage: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: (e: SubmitEvent<HTMLFormElement>) => void;
}) {
  const { locale, m } = useI18n();
  const Icon = CATEGORY_ICONS[category.iconKey]?.icon ?? CATEGORY_ICONS.more.icon;
  return (
    <li className={shared.row}>
      <div
        className={styles.icon}
        style={{ backgroundColor: `${category.color}20`, color: category.color }}
        aria-hidden="true"
      >
        <Icon size={16} />
      </div>
      <span className={`${shared.name} ${styles.name}`}>{category.name}</span>
      {category.budget !== null && (
        <span className={styles.budget}>
          {fill(m.settings.categories.perMonth, {
            amount: formatCurrency(category.budget, { currency }, locale),
          })}
        </span>
      )}
      {canManage && (
        <div className={styles.rowButtons}>
          <button
            type="button"
            className={styles.editButton}
            onClick={onEdit}
            disabled={pending}
          >
            {m.common.edit}
          </button>
          <form onSubmit={onDelete}>
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="name" value={category.name} />
            <button type="submit" className={shared.rowAction} disabled={pending}>
              {m.common.delete}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

// Name, type, icon, color and budget: shared by the add and edit forms
function CategoryFields({
  category,
  currency,
}: {
  category?: Category;
  currency: string;
}) {
  // Only money going out can have a budget
  const { m } = useI18n();
  const t = m.settings.categories;
  const [kind, setKind] = useState<string>(category?.kind ?? "expense");
  return (
    <>
      <Field label={t.name} className={styles.nameField}>
        <Input
          name="name"
          defaultValue={category?.name}
          placeholder={t.namePlaceholder}
          maxLength={60}
          required
        />
      </Field>
      <Field label={t.type}>
        <Select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="expense">{m.transactions.moneyOut}</option>
          <option value="income">{m.transactions.moneyIn}</option>
        </Select>
      </Field>
      <Field label={t.icon}>
        <Select
          name="iconKey"
          defaultValue={category?.iconKey ?? "more"}
        >
          {(Object.keys(CATEGORY_ICONS) as CategoryIconKey[]).map((key) => (
            <option key={key} value={key}>
              {m.settings.icons[key]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t.color}>
        <Input
          name="color"
          type="color"
          defaultValue={category?.color ?? "#6366f1"}
          className={styles.color}
        />
      </Field>
      {kind === "expense" && (
        <Field label={fill(t.budget, { currency })} optional className={styles.budgetField}>
          <Input
            name="budget"
            type="number"
            {...amountInputProps(currency)}
            placeholder={t.noBudget}
            defaultValue={category?.budget ?? ""}
          />
        </Field>
      )}
    </>
  );
}
