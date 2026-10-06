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
