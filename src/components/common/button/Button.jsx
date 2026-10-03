import styles from "./Button.module.css";

export default function Button({
  text,
  action,
  style,
  icon,
  iconPosition = "left",
}) {
  return (
    <button className={styles[style]} onClick={action}>
      {iconPosition === "left" && icon}
      <span>{text}</span>
      {iconPosition === "right" && icon}
    </button>
  );
}
