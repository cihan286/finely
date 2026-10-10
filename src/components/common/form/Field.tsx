// ─────────────────────────────────────────────────────────────────────────────
// Form field (a label above a box)
//
// In plain words: one labeled spot in a form, like "Email" or "Account". It
// draws the label, an optional hint underneath, and whatever box goes inside:
// an input, a dropdown or a text area.
//
// For developers: wrap one control from ./controls in it:
//   <Field label="Email"><Input name="email" type="email" /></Field>
// The control picks up its id and hint from here (through context), so
// clicking the label focuses the box and screen readers announce both. For a
// box without a visible label, skip Field and give the control an aria-label.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import styles from "./Form.module.css";

interface FieldContextValue {
  id: string;
  hintId?: string;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** For controls: the id (and hint) of the Field they're inside, if any */
export const useField = () => useContext(FieldContext);

interface FieldProps {
  label: string;
  /** Adds "(optional)" after the label */
  optional?: boolean;
  /** Help text under the box, e.g. password rules */
  hint?: string;
  /** Shown at the right of the label, e.g. a "Forgot password?" link */
  labelAside?: ReactNode;
  /** For the layout around the field, e.g. its width in a row */
  className?: string;
  children: ReactNode;
}

export default function Field({
  label,
  optional = false,
  hint,
  labelAside,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(" ")}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {optional && <span className={styles.optional}> (optional)</span>}
        </label>
        {labelAside}
      </div>
      <FieldContext value={{ id, hintId }}>{children}</FieldContext>
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
