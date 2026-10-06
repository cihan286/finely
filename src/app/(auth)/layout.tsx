import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/common/logo/Logo";
import styles from "./layout.module.css";

// Shared frame for /login, /signup and the password reset pages
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand} aria-label="Finely home">
        <Logo />
      </Link>
      <div className={styles.card}>{children}</div>
    </main>
  );
}
