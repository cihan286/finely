// ─────────────────────────────────────────────────────────────────────────────
// Contact page (finely.com/contact)
//
// In plain words: where visitors write to us — to ask about the Enterprise
// plan ("Contact sales" on the pricing cards), to get help, or anything else.
//
// For developers: the form is ContactForm; submitting it runs
// submitContactMessage() in ./actions.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import ContactForm from "@/components/home/contact-form/ContactForm";
import { getMessages } from "@/i18n/server";
import styles from "../site.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const { contact } = (await getMessages()).site;
  return { title: contact.label, description: contact.metaDescription };
}

export default async function ContactPage() {
  const t = (await getMessages()).site.contact;
  return (
    <>
      <span className={styles.label}>{t.label}</span>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.intro}>{t.intro}</p>

      <div className={styles.card}>
        <ContactForm />
      </div>
    </>
  );
}

