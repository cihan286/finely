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
import Footer from "@/components/common/footer/Footer";
import SiteHeader from "@/components/home/site-header/SiteHeader";
import styles from "./site.module.css";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className={styles.page}>{children}</main>
      <Footer />
    </>
  );
}
