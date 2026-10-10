// ─────────────────────────────────────────────────────────────────────────────
// Message box
//
// In plain words: the colored box that tells people how something went: red
// when it failed ("That email is already in use"), green when it worked
// ("Saved"), grey for a plain note.
//
// For developers: errors are announced by screen readers right away
// (role="alert") and successes politely (role="status"); notes aren't announced.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import styles from "./Form.module.css";

interface MessageProps {
  type: "error" | "success" | "info";
  children: ReactNode;
}

export default function Message({ type, children }: MessageProps) {
  return (
    <p
      className={`${styles.message} ${styles[type]}`}
      role={type === "error" ? "alert" : type === "success" ? "status" : undefined}
    >
      {children}
    </p>
  );
}
