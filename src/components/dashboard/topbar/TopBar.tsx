// ─────────────────────────────────────────────────────────────────────────────
// Dashboard top bar
//
// In plain words: the bar across the top of every dashboard page — a search
// box that looks through the company's transactions (descriptions, notes,
// categories and amounts), the company you're
// working in (and a way to switch), the notifications bell (with a count of
// unread messages and a panel that opens on click), and the logged-in user's
// initials, name and email.
//
// For developers: a client component ("use client") because the notifications
// panel opens, closes and marks messages as read. The user and the
// notifications come from the dashboard layout. Searching opens the
// Transactions page with ?q=…; "Mark all as read" shows the change right
// away and saves it with a server action.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useRef, useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { markAllNotificationsRead } from "@/app/dashboard/actions";
import CompanySwitcher from "@/components/dashboard/company-switcher/CompanySwitcher";
import styles from "./TopBar.module.css";
import { formatRelativeDate, getInitials } from "@/lib/format";
import { useDismiss } from "@/lib/use-dismiss";
import type { ISODate, Notification } from "@/types/finance";

interface Company {
  id: string;
  name: string;
}

interface TopBarProps {
  user: { name: string; email: string };
  /** The company the user is working in */
  organization: Company;
  /** Every company the user belongs to */
  organizations: Company[];
  /** What the bell reports, newest first */
  notifications: Notification[];
  /** Today in the company's timezone, for "Today" / "Yesterday" */
  today: ISODate;
}

export default function TopBar({
  user,
  organization,
  organizations,
  notifications,
  today,
}: TopBarProps) {
  // Whether the panel is open, the notifications marked as read here since
  // the page loaded, and a reference to the bell area so we can tell clicks
  // inside it from outside
  const [open, setOpen] = useState(false);
  const [readHere, setReadHere] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const items = notifications.map((n) =>
    readHere.includes(n.id) ? { ...n, read: true } : n,
  );

  // The number shown on the red badge
  const unreadCount = items.filter((n) => !n.read).length;

  // Close the panel on outside click or Escape
  useDismiss(wrapRef, open, useCallback(() => setOpen(false), []));

  // "Mark all as read": clears the unread highlight and the badge, and saves
  // it for next time
  const markAllRead = () => {
    setReadHere(notifications.map((n) => n.id));
    void markAllNotificationsRead();
  };

  return (
    <header className={styles.topBar}>
      {/* Search box: Enter opens the matching transactions */}
      <Form
        action="/dashboard/transactions"
        role="search"
        className={styles.searchWrap}
      >
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          name="q"
          type="search"
          className={styles.searchInput}
          placeholder="Search by description, notes, category or amount…"
          aria-label="Search transactions"
          maxLength={100}
        />
      </Form>

      <div className={styles.actions}>
        {/* The company you're working in, and a way to switch */}
        <CompanySwitcher current={organization} companies={organizations} />

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
              {items.length === 0 ? (
                <p className={styles.empty}>
                  Nothing needs your attention right now.
                </p>
              ) : (
                <ul className={styles.notifList}>
                  {items.map((n) => (
                    <li key={n.id}>
                      {/* Opens the place where it can be dealt with */}
                      <Link
                        href={n.href}
                        className={[
                          styles.notifItem,
                          !n.read && styles.unread,
                          n.type === "alert" && styles.alert,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setOpen(false)}
                      >
                        <span className={styles.notifDot} aria-hidden="true" />
                        <span className={styles.notifBody}>
                          <span className={styles.notifTitle}>{n.title}</span>
                          <span className={styles.notifDesc}>{n.description}</span>
                          <span className={styles.notifTime}>
                            {formatRelativeDate(n.day, today)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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
