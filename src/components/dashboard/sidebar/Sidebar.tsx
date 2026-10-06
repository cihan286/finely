// ─────────────────────────────────────────────────────────────────────────────
// Dashboard sidebar (the menu on the left)
//
// In plain words: the dashboard's main menu — Dashboard, Transactions,
// Insights, Settings and Log out. It's narrow (icons only) and widens to show
// labels when you hover over it or move into it with the Tab key. The current
// page is highlighted. On phones it becomes a bar along the bottom.
//
// For developers: a client component ("use client") because it tracks hover,
// keyboard focus and the current address.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, type FocusEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./Sidebar.module.css";
import Logo from "@/components/common/logo/Logo";
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Settings,
  LogOut,
} from "lucide-react";

// The menu entries: address, label and icon
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
function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  // Whether the menu is currently wide (showing labels)
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Log out, then go to the login page
  const handleLogOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  // Collapse only when focus leaves the sidebar, not when it moves between items
  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsExpanded(false);
  };

  return (
    <aside
      className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      // Keyboard users expand it by tabbing into it
      onFocus={() => setIsExpanded(true)}
      onBlur={handleBlur}
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
        <button className={styles.navItem} onClick={handleLogOut}>
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

interface NavItemContentProps {
  icon: ReactNode;
  label: string;
  isExpanded: boolean;
}

interface NavLinkProps extends NavItemContentProps {
  href: string;
  active: boolean;
}

function NavLink({ href, icon, label, isExpanded, active }: NavLinkProps) {
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

function NavItemContent({ icon, label, isExpanded }: NavItemContentProps) {
  return (
    <>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      {/* Visual only: screen readers already get the label above */}
      {!isExpanded && (
        <span className={styles.tooltip} aria-hidden="true">
          {label}
        </span>
      )}
    </>
  );
}
