// ─────────────────────────────────────────────────────────────────────────────
// Dashboard frame
//
// In plain words: every dashboard page shares the same frame — the menu on the
// left (sidebar) and the bar at the top with search, notifications and the
// user's name. This file draws that frame and puts the current page inside it.
// It also makes sure someone is logged in, and fetches who that is.
//
// For developers: requireUser() redirects to /login without a session. Pages
// inside must still call requireUser() themselves, because this layout doesn't
// re-run when navigating between dashboard pages.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import styles from "./layout.module.css";
import Sidebar from "@/components/dashboard/sidebar/Sidebar";
import TopBar from "@/components/dashboard/topbar/TopBar";
import { requireUser } from "@/lib/session";

// Shared frame for every /dashboard/* page: sidebar + top bar stay mounted
// while navigating, only {children} changes.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className={styles.mainContainer}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <TopBar user={{ name: user.name, email: user.email }} />
        {children}
      </div>
    </div>
  );
}
