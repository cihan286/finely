// ─────────────────────────────────────────────────────────────────────────────
// "Are you sure?" window
//
// In plain words: before something that can't be taken back, like deleting
// a transaction, a small window pops up in the middle of the screen asking
// to confirm, with the button that does it (red when it deletes) and
// Cancel. It grows into place and shrinks away when answered; Escape or a
// click outside it count as Cancel.
//
// For developers: ConfirmProvider wraps every page (app/layout.tsx). Inside
// it: `if (!(await confirm({ text }))) return;` with confirm = useConfirm().
// Read anything you need from the event (e.g. new FormData(form)) before the
// await. A native <dialog> opened with showModal(), so it sits above an
// open Dialog and traps focus; Cancel is focused first, so pressing Enter
// by accident doesn't delete anything.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CircleHelp, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import styles from "./Confirm.module.css";

export interface ConfirmOptions {
  /** The question, e.g. "Delete this transaction? This can't be undone." */
  text: string;
  /** A heading in place of "Are you sure?" */
  title?: string;
  /** The button that goes ahead, e.g. "Delete"; "Yes, continue" if left out */
  confirmText?: string;
  /** Deleting or removing: the button is red */
  danger?: boolean;
}

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask>(() => Promise.resolve(false));

/** Asks before going ahead; answers true for yes */
export function useConfirm() {
  return use(ConfirmContext);
}

interface Question extends ConfirmOptions {
  id: number;
  answer: (yes: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  // One at a time; a new question while one is open waits its turn
  const [questions, setQuestions] = useState<Question[]>([]);
  const nextId = useRef(0);

  const ask = useCallback<Ask>(
    (options) =>
      new Promise((resolve) => {
        const id = nextId.current++;
        setQuestions((current) => [...current, { ...options, id, answer: resolve }]);
      }),
    [],
  );
  const shown = questions[0];

  return (
    <ConfirmContext value={ask}>
      {children}
      {shown && (
        <ConfirmWindow
          key={shown.id}
          question={shown}
          onClosed={() => setQuestions((current) => current.slice(1))}
        />
      )}
    </ConfirmContext>
  );
}

function ConfirmWindow({ question, onClosed }: { question: Question; onClosed: () => void }) {
  const { m } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The answer once given: the window shrinks away, then really closes
  const [answer, setAnswer] = useState<boolean | null>(null);
  const Icon = question.danger ? Trash2 : CircleHelp;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const respond = (yes: boolean) => {
    if (answer !== null) return;
    setAnswer(yes);
    // Answered straight away, so the action starts while the window leaves
    question.answer(yes);
  };

  // A click on the dimmed area outside the window is Cancel
  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) respond(false);
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${answer !== null ? styles.closing : ""}`}
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-text"
      // Escape: Cancel, shrinking away like the buttons do
      onCancel={(e) => {
        e.preventDefault();
        respond(false);
      }}
      // Also when the browser closes it itself (e.g. Escape pressed twice)
      onClose={() => {
        if (answer === null) question.answer(false);
        onClosed();
      }}
      onClick={handleClick}
      onAnimationEnd={(e) => {
        if (answer !== null && e.target === e.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className={`${styles.icon} ${question.danger ? styles.danger : ""}`} aria-hidden="true">
        <Icon size={22} />
      </div>
      <h2 id="confirm-title" className={styles.title}>
        {question.title ?? m.common.confirm.title}
      </h2>
      <p id="confirm-text" className={styles.text}>
        {question.text}
      </p>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.cancel}
          onClick={() => respond(false)}
          autoFocus
        >
          {m.common.cancel}
        </button>
        <button
          type="button"
          className={`${styles.yes} ${question.danger ? styles.yesDanger : ""}`}
          onClick={() => respond(true)}
        >
          {question.confirmText ?? m.common.confirm.yes}
        </button>
      </div>
    </dialog>
  );
}
