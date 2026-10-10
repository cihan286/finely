// ─────────────────────────────────────────────────────────────────────────────
// Closing menus and panels
//
// In plain words: an open menu (notifications, the company switcher) should
// close when you click anywhere else or press Escape. This does that.
//
// For developers: a client hook. Pass a ref to the element that contains
// both the button and the menu, whether it's open, and what closes it.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, type RefObject } from "react";

export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, open, onDismiss]);
}
