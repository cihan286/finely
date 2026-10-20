// ─────────────────────────────────────────────────────────────────────────────
// Category rule settings
//
// In plain words: the company's category rules — "descriptions containing
// AWS are Software & IT". New and imported transactions that have no
// category get one from these rules. Owners and admins can add rules, change
// a rule's text or category, or delete it. Members can see the list but not
// change it.
//
// For developers: a client component ("use client") for the forms. All forms
// go to the submitCategoryRule server action (intent add / update / delete),
// which refreshes the page on success. They submit via onSubmit +
// startTransition instead of <form action>, so what was typed isn't wiped
// when the server answers with an error. Permissions are enforced in
// lib/data/; canManage only hides the forms. Which rule applies to a
// description is decided in lib/finance/category-rules.ts.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import { ArrowRight, Plus } from "lucide-react";
import Button from "@/components/common/button/Button";
import Field from "@/components/common/form/Field";
import { Input, Select } from "@/components/common/form/controls";
import { useActionNotice } from "@/components/common/notice/Notice";
import { useConfirm } from "@/components/common/confirm/Confirm";
import { submitCategoryRule } from "@/app/dashboard/settings/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import {
  MAX_RULE_TEXT_LENGTH,
  MIN_RULE_TEXT_LENGTH,
} from "@/lib/finance/category-rules";
import type { Category, CategoryRule } from "@/types/finance";
// The settings sections share their card, list and message styles, and rules
// use the same form and row buttons as categories
import shared from "./TeamSettings.module.css";
import forms from "./CategorySettings.module.css";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import styles from "./CategoryRuleSettings.module.css";

interface CategoryRuleSettingsProps {
  /** Whether you may change rules (owners and admins) */
  canManage: boolean;
  rules: CategoryRule[];
  categories: Category[];
}

export default function CategoryRuleSettings({
  canManage,
  rules,
  categories,
}: CategoryRuleSettingsProps) {
  const { m } = useI18n();
  const t = m.settings.rules;
  const addFormRef = useRef<HTMLFormElement>(null);
  // The rule being edited, if any
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, dispatch, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await submitCategoryRule(previous, formData);
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
        text: fill(t.confirmDelete, { text: String(formData.get("matchText")) }),
        confirmText: m.common.delete,
        danger: true,
      }))
    ) {
      return;
    }
    setIntent(String(formData.get("intent")));
    startTransition(() => dispatch(formData));
  };

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className={shared.stack} id="rules">
      {/* Add form: owners and admins only */}
      {canManage && (
        <section className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>{t.add}</h2>
            <p className={shared.cardHint}>{t.addHint}</p>
          </div>
          {categories.length === 0 ? (
            <p className={forms.none}>{t.categoryFirst}</p>
          ) : (
            <form ref={addFormRef} className={forms.form} onSubmit={submit}>
              <input type="hidden" name="intent" value="add" />
              <RuleFields categories={categories} />
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
          )}
        </section>
      )}

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>
            {t.title} <span className={shared.count}>{rules.length}</span>
          </h2>
        </div>
        {rules.length === 0 ? (
          <p className={forms.none}>{t.empty}</p>
        ) : (
          <ul className={shared.list}>
            {rules.map((rule) =>
              editingId === rule.id ? (
                <li key={rule.id} className={shared.row}>
                  <form className={forms.form} onSubmit={submit}>
                    <input type="hidden" name="intent" value="update" />
                    <input type="hidden" name="id" value={rule.id} />
                    <RuleFields rule={rule} categories={categories} />
                    <div className={forms.rowButtons}>
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
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  category={categoryById.get(rule.categoryId)}
                  canManage={canManage}
                  pending={pending}
                  onEdit={() => setEditingId(rule.id)}
                  onDelete={submit}
                />
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

// One rule in the list: its text, the category it gives, and Edit and Delete
// for owners and admins
function RuleRow({
  rule,
  category,
  canManage,
  pending,
  onEdit,
  onDelete,
}: {
  rule: CategoryRule;
  category: Category | undefined;
  canManage: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: (e: SubmitEvent<HTMLFormElement>) => void;
}) {
  const { m } = useI18n();
  return (
    <li className={shared.row}>
      <div className={styles.rule}>
        <span className={styles.text}>{rule.matchText}</span>
        <ArrowRight size={14} className={styles.arrow} aria-label={m.settings.rules.gets} />
        <span className={styles.category}>
          <span
            className={styles.dot}
            style={{ backgroundColor: category?.color ?? "var(--text-subtle)" }}
            aria-hidden="true"
          />
          {category?.name}
        </span>
      </div>
      {canManage && (
        <div className={forms.rowButtons}>
          <button
            type="button"
            className={forms.editButton}
            onClick={onEdit}
            disabled={pending}
          >
            {m.common.edit}
          </button>
          <form onSubmit={onDelete}>
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={rule.id} />
            <input type="hidden" name="matchText" value={rule.matchText} />
            <button type="submit" className={shared.rowAction} disabled={pending}>
              {m.common.delete}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

// Text and category: shared by the add and edit forms
function RuleFields({
  rule,
  categories,
}: {
  rule?: CategoryRule;
  categories: Category[];
}) {
  const { m } = useI18n();
  const t = m.settings.rules;
  const incomeCategories = categories.filter((c) => c.kind === "income");
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  return (
    <>
      <Field label={t.contains} className={forms.nameField}>
        <Input
          name="matchText"
          defaultValue={rule?.matchText}
          placeholder={t.containsPlaceholder}
          minLength={MIN_RULE_TEXT_LENGTH}
          maxLength={MAX_RULE_TEXT_LENGTH}
          required
        />
      </Field>
      <Field label={t.category} className={styles.categoryField}>
        <Select name="categoryId" defaultValue={rule?.categoryId} required>
          {incomeCategories.length > 0 && (
            <optgroup label={m.transactions.moneyIn}>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
          {expenseCategories.length > 0 && (
            <optgroup label={m.transactions.moneyOut}>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>
    </>
  );
}
