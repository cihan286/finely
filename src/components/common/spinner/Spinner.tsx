// ─────────────────────────────────────────────────────────────────────────────
// Spinner
//
// In plain words: the small turning ring that means "working on it", shown
// inside a button after it's clicked (logging in, saving…) until it's done.
//
// For developers: takes the color of the surrounding text. It's decorative
// (hidden from screen readers), so keep a text label such as "Saving" next
// to it. Button shows it for you when given `loading`.
// ─────────────────────────────────────────────────────────────────────────────

import styles from "./Spinner.module.css";

interface SpinnerProps {
  /** Width and height in pixels */
  size?: number;
}

export default function Spinner({ size = 16 }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
