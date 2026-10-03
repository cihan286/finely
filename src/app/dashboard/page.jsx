import styles from "./page.module.css";
import Sidebar from "@/components/dashboard/sidebar/Sidebar";
import TopBar from "@/components/dashboard/topbar/TopBar";
import DashboardHome from "@/components/dashboard/home/DashboardHome";

export default function DashBoard() {
  return (
    <div className={styles.mainContainer}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <TopBar />
        <DashboardHome />
      </div>
    </div>
  );
}
