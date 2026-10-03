"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import Logo from "@/components/common/logo/Logo";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/transactions",
    label: "Transactions",
    icon: ArrowRightLeft,
  },
  { href: "/dashboard/insights", label: "Insights", icon: PieChart },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

// "/dashboard" only matches itself; sections also match their sub-pages.
function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

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
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            icon={<Icon size={20} />}
            label={label}
            isExpanded={isExpanded}
            active={isActive(pathname, href)}
          />
        ))}
      </nav>

      <div className={styles.footer}>
        {/* Stays a button: logging out is an action, not a page */}
        <button className={styles.navItem}>
          <NavItemContent
            icon={<LogOut size={20} />}
            label="Log out"
            isExpanded={isExpanded}
          />
        </button>
      </div>
    </aside>
  );
}

function NavLink({ href, icon, label, isExpanded, active }) {
  return (
    <Link
      href={href}
      className={`${styles.navItem} ${active ? styles.active : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <NavItemContent icon={icon} label={label} isExpanded={isExpanded} />
    </Link>
  );
}

function NavItemContent({ icon, label, isExpanded }) {
  return (
    <>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      {!isExpanded && <span className={styles.tooltip}>{label}</span>}
    </>
  );
}
