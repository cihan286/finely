// ─────────────────────────────────────────────────────────────────────────────
// Dashboard frame
//
// In plain words: every dashboard page shares the same frame — the menu on the
// left (sidebar) and the bar at the top with search, notifications and the
// user's name. This file draws that frame and puts the current page inside it.
// It also makes sure someone is logged in and has a company, and fetches both
// (plus the person's other companies, for the switcher in the top bar, and
// the company's notifications, for the bell).
//
// For developers: requireOrganization() redirects to /login without a session
// and to /onboarding without a company. Pages inside must still call it
// themselves, because this layout doesn't re-run when navigating between
// dashboard pages. For the same reason the notifications are as of the last
// full load or save (server actions that call refresh() re-run it).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import styles from "./layout.module.css";
import Sidebar from "@/components/dashboard/sidebar/Sidebar";
import TopBar from "@/components/dashboard/topbar/TopBar";
import DemoBanner from "@/components/dashboard/demo-banner/DemoBanner";
import VerifyEmailBanner from "@/components/dashboard/verify-banner/VerifyEmailBanner";
import { todayIn } from "@/lib/dates";
import { getCompanyLocale } from "@/lib/data/common";
import { listNotifications } from "@/lib/data/notifications";
import { listUserOrganizations, requireOrganization } from "@/lib/session";

// Shared frame for every /dashboard/* page: sidebar + top bar stay mounted
// while navigating, only {children} changes.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, organization } = await requireOrganization();
  const [organizations, notifications, { timeZone, demoExpiresAt }] = await Promise.all([
    listUserOrganizations(),
    listNotifications(),
    getCompanyLocale(organization.id),
  ]);

  return (
    <div className={styles.mainContainer}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <TopBar
          user={{ name: user.name, email: user.email }}
          organization={{ id: organization.id, name: organization.name }}
          organizations={organizations}
          notifications={notifications}
          today={todayIn(timeZone)}
        />
        {/* Reminder until the email address is verified */}
        {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
        {/* A demo company ("Try the demo"): made up, and deleted soon */}
        {demoExpiresAt && <DemoBanner hoursLeft={hoursUntil(demoExpiresAt)} />}
        {children}
      </div>
    </div>
  );
}

// Whole hours from now until a moment, rounded up (never below zero)
function hoursUntil(moment: Date): number {
  return Math.max(0, Math.ceil((moment.getTime() - Date.now()) / (60 * 60 * 1000)));
}
