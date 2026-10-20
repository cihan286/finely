// ─────────────────────────────────────────────────────────────────────────────
// About page (finely.com/about)
//
// In plain words: what Finely is, who it's for, and how it treats a
// company's financial data.
//
// For developers: plain text, no data, in i18n/messages/<language>/site.ts (both
// languages). Keep the claims in step with what the
// app really does (see the README and docs/features.md).
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Button from "@/components/common/button/Button";
import { bold, rich } from "@/i18n/rich";
import { getMessages } from "@/i18n/server";
import styles from "../site.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const { about } = (await getMessages()).site;
  return { title: about.label, description: about.metaDescription };
}

export default async function AboutPage() {
  const { site, common } = await getMessages();
  const t = site.about;
  return (
    <>
      <span className={styles.label}>{t.label}</span>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.intro}>{t.intro}</p>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.doesHeading}</h2>
        <ul className={styles.points}>
          {t.does.map((point) => (
            <li key={point} className={styles.point}>
              {rich(point, bold)}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.teamsHeading}</h2>
        <p className={styles.text}>{t.teams}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.dataHeading}</h2>
        <p className={styles.text}>{t.data}</p>
      </section>

      <div className={styles.cta}>
        <Button variant="primary" text={common.startForFree} href="/signup" />
        <Button variant="secondary" text={t.contactUs} href="/contact" />
      </div>
    </>
  );
}

