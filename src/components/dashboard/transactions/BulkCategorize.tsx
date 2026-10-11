// ─────────────────────────────────────────────────────────────────────────────
// Categorize several transactions at once
//
// In plain words: tick the boxes next to some transactions (or the box in
// the table's heading for the whole page) and a bar appears above the table:
// choose a category, press Apply, and all of them get it.
//
// For developers: a client component ("use client") that wraps the table,
// which stays a server component and is passed in as children. The table
// renders plain checkboxes (name="ids", and name="all" in the heading); this
// component only counts them and submits them to the categorizeSelected
// server action, which refreshes the page on success.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type SubmitEvent,
} from "react";
import Button from "@/components/common/button/Button";
import { Select } from "@/components/common/form/controls";
import Message from "@/components/common/form/Message";
import { categorizeSelected } from "@/app/dashboard/transactions/actions";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { Category } from "@/types/finance";
import styles from "./BulkCategorize.module.css";

interface BulkCategorizeProps {
  categories: Category[];
  /** The table, with its checkboxes */
  children: ReactNode;
}

export default function BulkCategorize({ categories, children }: BulkCategorizeProps) {
  const formRef = useRef<HTMLFormElement>(null);
  // How many transactions are ticked
  const [selected, setSelected] = useState(0);

  // The row checkboxes and the "all on this page" one in the heading
  const boxes = () => {
    const form = formRef.current;
    return {
      rows: Array.from(
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? [],
      ),
      all: form?.querySelector<HTMLInputElement>('input[name="all"]') ?? null,
    };
  };

  const [state, dispatch, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await categorizeSelected(previous, formData);
      if (!result.error) {
        // Untick everything and put the category box back
        formRef.current?.reset();
        const { all } = boxes();
        if (all) all.indeterminate = false;
        setSelected(0);
      }
      return result;
    },
    initialActionState,
  );

  // A box was ticked or unticked somewhere in the table
  const handleChange = (e: FormEvent<HTMLFormElement>) => {
    const target = e.target as HTMLInputElement;
    const { rows, all } = boxes();
    if (target.name === "all") {
      for (const row of rows) row.checked = target.checked;
    }
    const count = rows.filter((row) => row.checked).length;
    if (all) {
      all.checked = count > 0 && count === rows.length;
      all.indeterminate = count > 0 && count < rows.length;
    }
    setSelected(count);
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  };

  const incomeCategories = categories.filter((c) => c.kind === "income");
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  return (
    <form ref={formRef} onChange={handleChange} onSubmit={handleSubmit}>
      {(state.error || state.success) && selected === 0 && (
        <div className={styles.message}>
          <Message type={state.error ? "error" : "success"}>
            {state.error ?? state.success}
          </Message>
        </div>
      )}

      {/* Only while something is ticked */}
      {selected > 0 && (
        <div className={styles.bar}>
          <span className={styles.count} role="status">
            {selected} selected
          </span>
          {state.error && <span className={styles.error}>{state.error}</span>}
          <div className={styles.actions}>
            <Select
              name="bulkCategory"
              aria-label="Category for the selected transactions"
              defaultValue=""
              className={styles.select}
              required
              disabled={pending}
            >
              <option value="" disabled>
                Set category…
              </option>
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
              <option value="none">Uncategorized</option>
            </Select>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              text={pending ? "Saving" : "Apply"}
              disabled={pending}
            />
          </div>
        </div>
      )}

      {children}
    </form>
  );
}
