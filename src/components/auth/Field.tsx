// ─────────────────────────────────────────────────────────────────────────────
// Form field (label + input box)
//
// In plain words: one labeled input box in a form, like "Email" or "Password".
// Password boxes get an eye button to show or hide what you've typed.
//
// For developers: a client component ("use client") because it reacts to
// typing and clicks in the browser. Accepts every normal <input> attribute
// (name, type, required, autoComplete…) and passes them through.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./AuthForm.module.css";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Help text under the input, e.g. password rules */
  hint?: string;
  /** Shown at the right of the label, e.g. a "Forgot password?" link */
  labelAside?: ReactNode;
}

// Labeled input. Password fields get a show/hide toggle.
export default function Field({
  label,
  hint,
  labelAside,
  type = "text",
  ...inputProps
}: FieldProps) {
  // A unique ID links the label to its box, so clicking the label focuses the
  // box and screen readers announce the label
  const id = useId();
  const hintId = `${id}-hint`;
  // Whether the password is currently shown as plain text
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {labelAside}
      </div>
      <div className={styles.inputWrap}>
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          className={`${styles.input} ${isPassword ? styles.hasToggle : ""}`}
          aria-describedby={hint ? hintId : undefined}
          {...inputProps}
        />
        {/* The show/hide eye button, only on password fields */}
        {isPassword && (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {hint && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
