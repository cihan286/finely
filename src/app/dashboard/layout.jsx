import styles from "./layout.module.css";
import Sidebar from "@/components/dashboard/sidebar/Sidebar";
import TopBar from "@/components/dashboard/topbar/TopBar";

// Shared frame for every /dashboard/* page: sidebar + top bar stay mounted
// while navigating, only {children} changes.
export default function DashboardLayout({ children }) {
  return (
    <div className={styles.mainContainer}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <TopBar />
        {children}
      </div>
    </div>
  );
}
