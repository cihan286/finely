// ─────────────────────────────────────────────────────────────────────────────
// Frame for the login and sign-up pages
//
// In plain words: the login, sign-up and password reset pages all look alike —
// the Finely logo on top and a card with the form, centered on the page.
// This file draws that shared look; each page fills in the card.
//
// For developers: "(auth)" in parentheses is a route group. It groups these
// pages for a shared layout without adding "/auth" to their addresses.
// ─────────────────────────────────────────────────────────────────────────────

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
