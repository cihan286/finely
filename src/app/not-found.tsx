// ─────────────────────────────────────────────────────────────────────────────
// "Page not found" (404)
//
// In plain words: what people see when they open an address that doesn't
// exist on Finely, for example from an old or mistyped link. Same top bar
// and footer as the other public pages, a plain explanation, and a way back:
// to the home page, or to the dashboard for someone who is logged in.
//
// For developers: Next.js shows this for any unknown address, and wherever
// notFound() is called.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Button from "@/components/common/button/Button";
import Footer from "@/components/common/footer/Footer";
import SiteHeader from "@/components/home/site-header/SiteHeader";
import { getSession } from "@/lib/session";
import styles from "./(site)/site.module.css";

export const metadata: Metadata = { title: "Page not found" };

export default async function NotFound() {
  const signedIn = Boolean(await getSession());
  return (
    <>
      <SiteHeader signedIn={signedIn} />
      <main className={styles.page}>
        <p className={styles.label}>Error 404</p>
        <h1 className={styles.title}>This page doesn&apos;t exist</h1>
        <p className={styles.intro}>
          The link may be old or mistyped, or the page may have moved.
        </p>
        <div className={styles.cta}>
          {signedIn ? (
            <Button variant="primary" text="Open your dashboard" href="/dashboard" />
          ) : (
            <Button variant="primary" text="Go to the home page" href="/" />
          )}
          <Button variant="secondary" text="Contact us" href="/contact" />
        </div>
      </main>
      <Footer signedIn={signedIn} />
    </>
  );
}
