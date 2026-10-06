// ─────────────────────────────────────────────────────────────────────────────
// Dialog (a window over the page)
//
// In plain words: the standard pop-up window, with a title and a close (×)
// button. The page behind it is dimmed. Pressing Escape, the × button or
// clicking the dimmed area closes it. Each window has its own address (e.g.
// ?edit=…), so closing it goes back to the page's address, and the browser's
// back button closes it too.
//
// For developers: a client component around a native <dialog>, opened with
// showModal() (focus trapping and Escape for free). Render it when the
// address says the window is open; closing navigates to `closeHref`.
// Content inside can close it with useCloseDialog().
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  createContext,
  use,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import styles from "./Dialog.module.css";

const CloseContext = createContext<() => void>(() => {});

/** Closes the dialog this is used in (e.g. for a Cancel button) */
export function useCloseDialog() {
  return use(CloseContext);
}

interface DialogProps {
  title: string;
  /** The page's address without the window, to go back to when closing */
  closeHref: string;
  /** While true (e.g. saving), clicking outside doesn't close the window */
  busy?: boolean;
  /** "md" for forms, "lg" for wider content such as tables */
  size?: "md" | "lg";
  children: ReactNode;
}

export default function Dialog({
  title,
  closeHref,
  busy = false,
  size = "md",
  children,
}: DialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  // Open as a modal window (dims the page and traps keyboard focus)
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // A click on the dimmed area outside the window closes it
  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget && !busy) close();
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${size === "lg" ? styles.large : ""}`}
      // Fires on Escape and on close(): go back to the page's address
      onClose={() => router.replace(closeHref, { scroll: false })}
      onClick={handleClick}
      aria-labelledby="dialog-title"
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 id="dialog-title" className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={close}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <CloseContext value={close}>{children}</CloseContext>
      </div>
    </dialog>
  );
}
