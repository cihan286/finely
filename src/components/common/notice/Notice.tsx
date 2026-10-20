// ─────────────────────────────────────────────────────────────────────────────
// Notification window
//
// In plain words: the small window that pops up in the middle of the screen
// to say how something went: a green check when it worked ("Your password
// was changed."), a red mark when it didn't, a blue "i" for a plain note.
// It grows into place with a little spring and shrinks away when closed
// with OK, Escape or a click outside it. On phones it slides up from the
// bottom. If several arrive at once, they're shown one after another.
//
// For developers: NoticeProvider wraps every page (app/layout.tsx). Inside
// it, call useNotify() and then notify({ type, text }), e.g. after an
// action; useActionNotice(state) does that for a useActionState result.
// Server components render <Notify type text /> to show one when the page
// opens (e.g. ?undone=1). Server actions that redirect leave one for the
// next page with setFlashNotice() (lib/flash-notice.ts). The window is a
// native <dialog> opened with showModal(), so focus is trapped and the page
// behind can't be clicked.
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { ActionState } from "@/lib/action-state";
import { FLASH_COOKIE, type NoticeType } from "./flash";
import styles from "./Notice.module.css";

export interface Notice {
  type: NoticeType;
  text: ReactNode;
  /** A heading in place of the usual one ("Done", "That didn't work"…) */
  title?: string;
  /** A second button that leads somewhere, e.g. "See all rules" */
  link?: { href: string; text: string };
}

const NotifyContext = createContext<(notice: Notice) => void>(() => {});

/** Shows a notice in the notification window */
export function useNotify() {
  return use(NotifyContext);
}

/** Shows the error or success message of a useActionState result */
export function useActionNotice(state: ActionState) {
  const notify = useNotify();
  // A new object each time the action answers, so each answer shows once
  useEffect(() => {
    if (state.error) notify({ type: "error", text: state.error });
    else if (state.success) notify({ type: "success", text: state.success });
  }, [state, notify]);
}

/** For server components: shows a notice when the page opens */
export function Notify({ type, text, title, link }: Notice & { text: string }) {
  const notify = useNotify();
  const shown = useRef("");
  useEffect(() => {
    // Once per notice, also when React runs this twice while developing
    const key = `${type}:${text}`;
    if (shown.current === key) return;
    shown.current = key;
    notify({ type, text, title, link });
  }, [notify, type, text, title, link]);
  return null;
}

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<(Notice & { id: number })[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((notice: Notice) => {
    const id = nextId.current++;
    setQueue((current) => [...current, { ...notice, id }]);
  }, []);
  const shown = queue[0];

  return (
    <NotifyContext value={notify}>
      {children}
      <FlashNotice />
      {shown && (
        <NoticeWindow
          key={shown.id}
          notice={shown}
          onClosed={() => setQueue((current) => current.slice(1))}
        />
      )}
    </NotifyContext>
  );
}

// Picks up a notice a server action left for this page (lib/flash-notice.ts)
function FlashNotice() {
  const notify = useNotify();
  const pathname = usePathname();
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${FLASH_COOKIE}=([^;]*)`));
    if (!match) return;
    // Gone first, so it's shown once
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; Path=/`;
    try {
      const { type, text } = JSON.parse(decodeURIComponent(match[1]));
      if (typeof text === "string" && ["success", "error", "info"].includes(type)) {
        notify({ type, text });
      }
    } catch {
      // Not ours, or damaged: nothing to show
    }
  }, [notify, pathname]);
  return null;
}

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

function NoticeWindow({ notice, onClosed }: { notice: Notice; onClosed: () => void }) {
  const { m } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // While true, the window plays its closing animation, then really closes
  const [closing, setClosing] = useState(false);
  const Icon = ICONS[notice.type];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = () => setClosing(true);

  // A click on the dimmed area outside the window closes it
  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${closing ? styles.closing : ""}`}
      role={notice.type === "error" ? "alertdialog" : "dialog"}
      aria-labelledby="notice-title"
      aria-describedby="notice-text"
      // Escape: shrink away first instead of vanishing at once
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={onClosed}
      onClick={handleClick}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className={`${styles.icon} ${styles[notice.type]}`} aria-hidden="true">
        <Icon size={26} strokeWidth={2.2} />
      </div>
      <h2 id="notice-title" className={styles.title}>
        {notice.title ?? m.common.notice[notice.type]}
      </h2>
      <p id="notice-text" className={styles.text}>
        {notice.text}
      </p>
      <div className={styles.buttons}>
        {notice.link && (
          <Link href={notice.link.href} className={styles.secondary} onClick={close}>
            {notice.link.text}
          </Link>
        )}
        <button type="button" className={styles.primary} onClick={close} autoFocus>
          {m.common.notice.ok}
        </button>
      </div>
    </dialog>
  );
}
