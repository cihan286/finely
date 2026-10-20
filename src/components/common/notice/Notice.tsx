// ─────────────────────────────────────────────────────────────────────────────
// Notifications
//
// In plain words: the small cards that slide in at the bottom right of the
// screen to say how something went: a green check when it worked ("Your
// password was changed."), a red mark when it didn't, a blue "i" for a plain
// note. Each slides away by itself after 5 seconds, counted down by a thin
// bar along its bottom (which stops while the pointer is on them), or
// straight away with its ×.
// Several stack up, newest at the bottom. On phones they come up from the
// bottom edge instead.
//
// For developers: NoticeProvider wraps every page (app/layout.tsx). Inside
// it, call useNotify() and then notify({ type, text }), e.g. after an
// action; useActionNotice(state) does that for a useActionState result.
// Server components render <Notify type text /> to show one when the page
// opens (e.g. ?undone=1). Server actions that redirect leave one for the
// next page with setFlashNotice() (lib/flash-notice.ts). The stack is a
// manual popover, so it's drawn in the browser's top layer without taking
// focus or blocking the page. While a modal <dialog> is open, everything
// outside it can't be clicked, so the stack moves inside the dialog.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { ActionState } from "@/lib/action-state";
import { FLASH_COOKIE, type NoticeType } from "./flash";
import styles from "./Notice.module.css";

export interface Notice {
  type: NoticeType;
  text: ReactNode;
  /** A heading in place of the usual one ("Done", "That didn't work"…) */
  title?: string;
  /** A link under the text, e.g. "See all rules" */
  link?: { href: string; text: string };
}

// How long each one stays, in milliseconds
const DURATION = 5000;
// Older ones make room beyond this many
const MAX_SHOWN = 4;

const NotifyContext = createContext<(notice: Notice) => void>(() => {});

/** Shows a notice */
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

type ShownNotice = Notice & { id: number };

export function NoticeProvider({ children }: { children: ReactNode }) {
  const { m } = useI18n();
  const [notices, setNotices] = useState<ShownNotice[]>([]);
  // While the pointer or keyboard is on the stack, nothing leaves by itself
  const [paused, setPaused] = useState(false);
  const nextId = useRef(0);
  const stackRef = useRef<HTMLDivElement>(null);
  const modal = useOpenModal();

  const notify = useCallback((notice: Notice) => {
    const id = nextId.current++;
    setNotices((current) => [...current, { ...notice, id }].slice(-MAX_SHOWN));
  }, []);
  const remove = (id: number) => {
    // The last one went from under the pointer: it can't say it left
    if (notices.length === 1) setPaused(false);
    setNotices((current) => current.filter((notice) => notice.id !== id));
  };

  // In the top layer while there's something to show (a new element when
  // it moves into or out of a dialog)
  const count = notices.length;
  useEffect(() => {
    const stack = stackRef.current;
    if (!stack?.showPopover) return;
    const open = stack.matches(":popover-open");
    if (count === 0 && open) stack.hidePopover();
    if (count > 0 && !open) stack.showPopover();
  }, [count, modal]);

  const stack = (
    <div
      ref={stackRef}
      className={styles.stack}
      popover="manual"
      role="region"
      aria-label={m.common.notice.label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {notices.map((notice) => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          paused={paused}
          onGone={() => remove(notice.id)}
        />
      ))}
    </div>
  );

  return (
    <NotifyContext value={notify}>
      {children}
      <FlashNotice />
      {modal ? createPortal(stack, modal) : stack}
    </NotifyContext>
  );
}

// The modal <dialog> open on top, if any
function useOpenModal() {
  const [modal, setModal] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    const update = () => {
      const open = document.querySelectorAll<HTMLDialogElement>("dialog:modal");
      setModal(open[open.length - 1] ?? null);
    };
    update();
    // Dialogs open and close by gaining and losing "open", or by being
    // added and removed
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => observer.disconnect();
  }, []);
  return modal;
}

// Picks up a notice a server action left for this page (lib/flash-notice.ts)
function FlashNotice() {
  const notify = useNotify();
  const pathname = usePathname();
  useEffect(() => {
    const check = () => {
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
    };
    check();
    // An action can also leave one without changing the address (it only
    // reloads the page): seen as soon as the cookie arrives, or within a
    // second where the browser can't say when cookies change
    const store = (window as { cookieStore?: EventTarget }).cookieStore;
    if (store) {
      store.addEventListener("change", check);
      return () => store.removeEventListener("change", check);
    }
    const timer = window.setInterval(check, 1000);
    return () => window.clearInterval(timer);
  }, [notify, pathname]);
  return null;
}

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

function NoticeCard({
  notice,
  paused,
  onGone,
}: {
  notice: ShownNotice;
  paused: boolean;
  onGone: () => void;
}) {
  const { m } = useI18n();
  // While true, the card slides away, then is removed
  const [leaving, setLeaving] = useState(false);
  const Icon = ICONS[notice.type];

  return (
    <div
      className={`${styles.item} ${leaving ? styles.leaving : ""}`}
      // The space it took closes last; then it's gone
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) onGone();
      }}
    >
      <div className={styles.clip}>
        <div
          className={`${styles.card} ${styles[notice.type]}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <Icon className={styles.icon} size={20} strokeWidth={2.2} aria-hidden="true" />
          <div className={styles.body}>
            <p className={styles.title}>{notice.title ?? m.common.notice[notice.type]}</p>
            <p className={styles.text}>{notice.text}</p>
            {notice.link && (
              <Link
                href={notice.link.href}
                className={styles.link}
                onClick={() => setLeaving(true)}
              >
                {notice.link.text}
              </Link>
            )}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={() => setLeaving(true)}
            aria-label={m.common.close}
          >
            <X size={16} />
          </button>
          {/* The time left: its animation is the timer, so a pause stops
              both where they are */}
          <span
            className={styles.timer}
            style={{
              animationDuration: `${DURATION}ms`,
              animationPlayState: paused ? "paused" : "running",
            }}
            onAnimationEnd={() => setLeaving(true)}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
