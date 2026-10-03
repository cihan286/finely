"use client";

import { useState } from "react";
import styles from "./Sidebar.module.css";
import Logo from "@/components/common/logo/Logo";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Settings,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className={styles.header}>
        <Logo showText={isExpanded} />
      </div>

      <nav className={styles.navMenu}>
        <NavItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          isExpanded={isExpanded}
          active
        />
        <NavItem
          icon={<ArrowRightLeft size={20} />}
          label="Transactions"
          isExpanded={isExpanded}
        />
        <NavItem
          icon={<PieChart size={20} />}
          label="Insights"
          isExpanded={isExpanded}
        />
        <NavItem
          icon={<Settings size={20} />}
          label="Settings"
          isExpanded={isExpanded}
        />
      </nav>

      <div className={styles.footer}>
        <NavItem
          icon={<LogOut size={20} />}
          label="Log out"
          isExpanded={isExpanded}
        />
      </div>
    </aside>
  );
}

function NavItem({ icon, label, isExpanded, active }) {
  return (
    <button className={`${styles.navItem} ${active ? styles.active : ""}`}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      {!isExpanded && <span className={styles.tooltip}>{label}</span>}
    </button>
  );
}
