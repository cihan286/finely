// ─────────────────────────────────────────────────────────────────────────────
// Dashboard top bar
//
// In plain words: the bar across the top of every dashboard page — a search
// box, the notifications bell (with a count of unread messages and a panel
// that opens on click), and the logged-in user's initials, name and email.
//
// For developers: a client component ("use client") because the notifications
// panel opens, closes and marks messages as read. The user comes from the
// dashboard layout, which reads it from the session. Search isn't wired up yet.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Search } from "lucide-react";
import styles from "./TopBar.module.css";
import { notifications as initialNotifications } from "@/data/mockData";
import { getInitials } from "@/utils/format";

interface TopBarProps {
  user: { name: string; email: string };
}

export default function TopBar({ user }: TopBarProps) {
  // The notifications (sample data for now), whether the panel is open, and a
  // reference to the bell area so we can tell clicks inside it from outside
  const [items, setItems] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // The number shown on the red badge
  const unreadCount = items.filter((n) => !n.read).length;

  // Close the panel on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // "Mark all as read": clears the unread highlight and the badge
  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <header className={styles.topBar}>
      {/* Search box (not connected to search yet) */}
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search transactions, bills, cards…"
          aria-label="Search"
        />
      </div>

      <div className={styles.actions}>
        {/* Bell button and its notifications panel */}
        <div className={styles.bellWrap} ref={wrapRef}>
          <button
            className={styles.iconBtn}
            onClick={() => setOpen((o) => !o)}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={open}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className={styles.badge}>{unreadCount}</span>
            )}
          </button>

          {open && (
            <div
              className={styles.panel}
              role="dialog"
              aria-label="Notifications"
            >
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Notifications</h2>
                {unreadCount > 0 && (
                  <button className={styles.linkBtn} onClick={markAllRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <ul className={styles.notifList}>
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`${styles.notifItem} ${n.read ? "" : styles.unread}`}
                  >
                    <span className={styles.notifDot} aria-hidden="true" />
                    <div className={styles.notifBody}>
                      <span className={styles.notifTitle}>{n.title}</span>
                      <span className={styles.notifDesc}>{n.description}</span>
                      <span className={styles.notifTime}>{n.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* The logged-in user: initials circle, name and email */}
        <div className={styles.user}>
          <div className={styles.avatar} aria-hidden="true">
            {getInitials(user.name)}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {user.name}
            </span>
            <span className={styles.userRole}>{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
