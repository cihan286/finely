import Link from "next/link";
import styles from "./Button.module.css";

// Renders a <Link> when given an href (navigation), a <button> otherwise (action).
export default function Button({
  text,
  action,
  href,
  style,
  icon,
  iconPosition = "left",
}) {
  const content = (
    <>
      {iconPosition === "left" && icon}
      <span>{text}</span>
      {iconPosition === "right" && icon}
    </>
  );

  if (href) {
    return (
      <Link className={styles[style]} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={styles[style]} onClick={action}>
      {content}
    </button>
  );
}
