// ─────────────────────────────────────────────────────────────────────────────
// Frame for the public pages (About, Contact, Terms, Privacy)
//
// In plain words: these pages share the same top bar and the same footer as
// the home page. This file draws both and puts the page between them.
//
// For developers: "(site)" in parentheses is a route group. It groups these
// pages for a shared layout without adding "/site" to their addresses. The
// home page isn't in it: its navigation is part of the hero.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import Footer from "@/components/common/footer/Footer";
import SiteHeader from "@/components/home/site-header/SiteHeader";
import styles from "./site.module.css";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  // Logged-in people get a way back to their dashboard instead of "Log in"
  const signedIn = Boolean(await getSession());
  return (
    <>
      <SiteHeader signedIn={signedIn} />
      <main className={styles.page}>{children}</main>
      <Footer signedIn={signedIn} />
    </>
  );
}
