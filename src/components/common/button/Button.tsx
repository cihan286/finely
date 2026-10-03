import type { ReactNode } from "react";
import Link from "next/link";
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
}: ButtonProps) {
  const className = [
    styles.button,
    styles[variant],
    size === "sm" && styles.sm,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {iconPosition === "left" && icon}
      <span>{text}</span>
      {iconPosition === "right" && icon}
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
    <button type="button" className={className} onClick={action}>
      {content}
    </button>
  );
}
