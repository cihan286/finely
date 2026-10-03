import Link from "next/link";
import styles from "./Button.module.css";

// Renders a <Link> when given an href (navigation), a <button> otherwise (action).
// variant: "primary" | "secondary" | "outline"   size: "md" | "sm"
export default function Button({
  text,
  action,
  href,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
}) {
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
