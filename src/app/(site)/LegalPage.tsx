// ─────────────────────────────────────────────────────────────────────────────
// A long page made of sections (Terms of service, Privacy policy)
//
// In plain words: draws a legal page in the visitor's language: its title,
// the date it last changed, and each section with its paragraphs and lists.
//
// For developers: the text is in i18n/messages/<language>/site.ts. Links inside it
// are written as <privacy>…</privacy>, <terms>…</terms> and
// <contact>…</contact>.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { fill } from "@/i18n/config";
import { bold, rich } from "@/i18n/rich";
import { getI18n } from "@/i18n/server";
import type { PageSection } from "@/i18n/messages/en/site";
import { formatDate } from "@/lib/format";
import type { ISODate } from "@/types/finance";
import styles from "./site.module.css";

export default async function LegalPage({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  /** The day the text last changed */
  updated: ISODate;
  sections: PageSection[];
}) {
  const { locale, m } = await getI18n();
  const link = (href: string) =>
    function InlineLink(text: string) {
      return (
        <Link href={href} className={styles.inlineLink}>
          {text}
        </Link>
      );
    };
  const tags = {
    ...bold,
    privacy: link("/privacy"),
    terms: link("/terms"),
    contact: link("/contact"),
  };

  return (
    <>
      <span className={styles.label}>{m.site.legal.label}</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.intro}>{intro}</p>
      <p className={styles.updated}>
        {fill(m.site.legal.updated, { date: formatDate(updated, locale) })}
      </p>

      {sections.map((section) => (
        <section key={section.heading} className={styles.section}>
          <h2 className={styles.heading}>{section.heading}</h2>
          {section.paragraphs?.map((text) => (
            <p key={text} className={styles.text}>
              {rich(text, tags)}
            </p>
          ))}
          {section.list && (
            <ul className={styles.list}>
              {section.list.map((text) => (
                <li key={text}>{rich(text, tags)}</li>
              ))}
            </ul>
          )}
          {section.after?.map((text) => (
            <p key={text} className={styles.text}>
              {rich(text, tags)}
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
