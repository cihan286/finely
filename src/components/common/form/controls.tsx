// ─────────────────────────────────────────────────────────────────────────────
// Form controls: input box, dropdown, text area, password box
//
// In plain words: the boxes people type in or choose from. Using these
// everywhere keeps every form looking and behaving the same.
//
// For developers: use these instead of styling a new <input>, <select> or
// <textarea>. They accept every normal attribute (name, type, required…) and
// pass it through. Put them inside a <Field> for a label, or give them an
// aria-label. `className` is for layout only (e.g. width in a row).
// `size="lg"` is the roomier style of the login and sign-up pages.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { useField } from "./Field";
import styles from "./Form.module.css";

type ControlSize = "md" | "lg";

const classes = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(" ");

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: ControlSize;
}

export function Input({ size = "md", className, ...props }: InputProps) {
  const field = useField();
  return (
    <input
      id={field?.id}
      aria-describedby={field?.hintId}
      {...props}
      className={classes(styles.control, size === "lg" && styles.lg, className)}
    />
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: ControlSize;
}

export function Select({ size = "md", className, ...props }: SelectProps) {
  const field = useField();
  return (
    <select
      id={field?.id}
      aria-describedby={field?.hintId}
      {...props}
      className={classes(styles.control, size === "lg" && styles.lg, className)}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useField();
  return (
    <textarea
      id={field?.id}
      aria-describedby={field?.hintId}
      {...props}
      className={classes(styles.control, styles.textarea, className)}
    />
  );
}

/** An input for passwords, with an eye button to show or hide what was typed */
export function PasswordInput({ className, ...props }: Omit<InputProps, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={styles.passwordWrap}>
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={classes(styles.hasToggle, className)}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
