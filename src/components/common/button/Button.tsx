// ─────────────────────────────────────────────────────────────────────────────
// Button
//
// In plain words: the standard button used everywhere in Finely, so all
// buttons look and behave the same. It comes in a few styles: solid blue
// ("primary"), see-through ("secondary") and outlined ("outline"), in a
// regular or a compact size.
//
// For developers: use this instead of styling a new <button>. Pass `href` to
// make it a link to another page, or `action` for a click handler. While
// its action is running, pass `loading` (and a text like "Saving"): it shows
// a spinner and can't be clicked again.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import Link from "next/link";
import Spinner from "@/components/common/spinner/Spinner";
import styles from "./Button.module.css";

interface ButtonProps {
  text: string;
  /** Click handler, for buttons that perform an action */
  action?: () => void;
  /** Destination, for buttons that navigate; renders a Link instead */
  href?: string;
  variant?: "primary" | "secondary" | "outline";
  /** "sm" is the compact style for app UI like the dashboard */
  size?: "md" | "sm";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  /** "submit" for form buttons; ignored when href is set */
  type?: "button" | "submit";
  disabled?: boolean;
  /** Shows a spinner in place of the icon and disables the button */
  loading?: boolean;
  /** Stretch to the width of the container */
  fullWidth?: boolean;
}

// Renders a <Link> when given an href (navigation), a <button> otherwise (action).
export default function Button({
  text,
  action,
  href,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  type = "button",
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const className = [
    styles.button,
    styles[variant],
    size === "sm" && styles.sm,
    fullWidth && styles.fullWidth,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <Spinner /> : iconPosition === "left" && icon}
      <span>{text}</span>
      {!loading && iconPosition === "right" && icon}
    </>
  );

  if (href) {
    return (
      <Link className={className} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={className}
      onClick={action}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
