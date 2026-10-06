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
  const id = useId();
  const hintId = `${id}-hint`;
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
