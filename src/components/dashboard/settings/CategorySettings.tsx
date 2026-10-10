// ─────────────────────────────────────────────────────────────────────────────
// Category settings
//
// In plain words: the company's categories (Payroll, Sales, …), grouped into
// money in and money out. Owners and admins can add categories and change
// each one's name, type, color and icon, or delete it — its transactions
// then become "Uncategorized". Members can see the list but not change it.
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
import Message from "@/components/common/form/Message";
import { CATEGORY_ICONS } from "@/components/dashboard/categoryIcons";
import { submitCategory } from "@/app/dashboard/settings/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { Category, CategoryIconKey } from "@/types/finance";
// The settings sections share their card, list and message styles
import shared from "./TeamSettings.module.css";
import styles from "./CategorySettings.module.css";

const GROUPS = [
  { kind: "income", title: "Money in" },
  { kind: "expense", title: "Money out" },
] as const;

interface CategorySettingsProps {
  /** Whether you may change categories (owners and admins) */
  canManage: boolean;
  categories: Category[];
}

export default function CategorySettings({
  canManage,
  categories,
}: CategorySettingsProps) {
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

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, e.nativeEvent.submitter);
    if (
      formData.get("intent") === "delete" &&
      !window.confirm(
        `Delete ${formData.get("name")}? Its transactions will become uncategorized.`,
      )
    ) {
      return;
    }
    startTransition(() => dispatch(formData));
  };

  return (
    <div className={shared.stack} id="categories">
      {(state.error || state.success) && (
        <Message type={state.error ? "error" : "success"}>
          {state.error ?? state.success}
        </Message>
      )}

      {/* Add form: owners and admins only */}
      {canManage && (
        <section className={shared.card}>
          <div className={shared.cardHeader}>
            <h2 className={shared.cardTitle}>Add a category</h2>
            <p className={shared.cardHint}>
              Categories show where money comes from and goes to on the
              dashboard and in imports.
            </p>
          </div>
          <form ref={addFormRef} className={styles.form} onSubmit={submit}>
            <input type="hidden" name="intent" value="add" />
            <CategoryFields />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? "Saving" : "Add category"}
              icon={<Plus size={16} />}
              disabled={pending}
            />
          </form>
        </section>
      )}

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>
            Categories <span className={shared.count}>{categories.length}</span>
          </h2>
        </div>
        {GROUPS.map(({ kind, title }) => {
          const group = categories.filter((c) => c.kind === kind);
          return (
            <div key={kind} className={styles.group}>
              <h3 className={styles.groupTitle}>{title}</h3>
              {group.length === 0 ? (
                <p className={styles.none}>None yet.</p>
              ) : (
                <ul className={shared.list}>
                  {group.map((category) =>
                    editingId === category.id ? (
                      <li key={category.id} className={shared.row}>
                        <form className={styles.form} onSubmit={submit}>
                          <input type="hidden" name="intent" value="update" />
                          <input type="hidden" name="id" value={category.id} />
                          <CategoryFields category={category} />
                          <div className={styles.rowButtons}>
                            <Button
                              variant="outline"
                              size="sm"
                              text="Cancel"
                              action={() => setEditingId(null)}
                              disabled={pending}
                            />
                            <Button
                              type="submit"
                              variant="primary"
                              size="sm"
                              loading={pending}
                              text={pending ? "Saving" : "Save"}
                              disabled={pending}
                            />
                          </div>
                        </form>
                      </li>
                    ) : (
                      <CategoryRow
                        key={category.id}
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
  canManage,
  pending,
  onEdit,
  onDelete,
}: {
  category: Category;
  canManage: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: (e: SubmitEvent<HTMLFormElement>) => void;
}) {
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
      {canManage && (
        <div className={styles.rowButtons}>
          <button
            type="button"
            className={styles.editButton}
            onClick={onEdit}
            disabled={pending}
          >
            Edit
          </button>
          <form onSubmit={onDelete}>
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="name" value={category.name} />
            <button type="submit" className={shared.rowAction} disabled={pending}>
              Delete
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

// Name, type, icon and color: shared by the add and edit forms
function CategoryFields({ category }: { category?: Category }) {
  return (
    <>
      <Field label="Name" className={styles.nameField}>
        <Input
          name="name"
          defaultValue={category?.name}
          placeholder="e.g. Travel"
          maxLength={60}
          required
        />
      </Field>
      <Field label="Type">
        <Select
          name="kind"
          defaultValue={category?.kind ?? "expense"}
        >
          <option value="expense">Money out</option>
          <option value="income">Money in</option>
        </Select>
      </Field>
      <Field label="Icon">
        <Select
          name="iconKey"
          defaultValue={category?.iconKey ?? "more"}
        >
          {(Object.keys(CATEGORY_ICONS) as CategoryIconKey[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_ICONS[key].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Color">
        <Input
          name="color"
          type="color"
          defaultValue={category?.color ?? "#6366f1"}
          className={styles.color}
        />
      </Field>
    </>
  );
}
