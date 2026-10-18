// ─────────────────────────────────────────────────────────────────────────────
// Message box
//
// In plain words: the colored box that tells people how something went: red
// when it failed ("That email is already in use"), green when it worked
// ("Saved"), grey for a plain note.
//
// For developers: errors are announced by screen readers right away
// (role="alert") and successes politely (role="status"); notes aren't announced.
// An error also scrolls itself into view: in a long form (or a dialog on a
// phone) it appears at the top while the button pressed is at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Form.module.css";

interface MessageProps {
  type: "error" | "success" | "info";
  children: ReactNode;
}

export default function Message({ type, children }: MessageProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    // "nearest": only moves when the message is out of sight
    if (type === "error") ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [type, children]);

  return (
    <p
      ref={ref}
      className={`${styles.message} ${styles[type]}`}
      role={type === "error" ? "alert" : type === "success" ? "status" : undefined}
    >
      {children}
    </p>
  );
}
