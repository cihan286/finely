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
import { getMessages } from "@/i18n/server";
import styles from "./(site)/site.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).site.notFound.title };
}

export default async function NotFound() {
  const signedIn = Boolean(await getSession());
  const { site } = await getMessages();
  const t = site.notFound;
  return (
    <>
      <SiteHeader signedIn={signedIn} />
      <main className={styles.page}>
        <p className={styles.label}>{t.label}</p>
        <h1 className={styles.title}>{t.heading}</h1>
        <p className={styles.intro}>{t.intro}</p>
        <div className={styles.cta}>
          {signedIn ? (
            <Button variant="primary" text={t.openDashboard} href="/dashboard" />
          ) : (
            <Button variant="primary" text={t.goHome} href="/" />
          )}
          <Button variant="secondary" text={site.about.contactUs} href="/contact" />
        </div>
      </main>
      <Footer signedIn={signedIn} />
    </>
  );
}
