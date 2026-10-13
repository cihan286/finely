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
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions about Finely, the Enterprise plan or your account? Send us a message.",
};

export default function ContactPage() {
  return (
    <>
      <span className={styles.label}>Contact</span>
      <h1 className={styles.title}>Talk to us</h1>
      <p className={styles.intro}>
        Curious about the Enterprise plan, stuck on something, or have an idea
        for Finely? Send us a message and we&apos;ll reply by email.
      </p>

      <div className={styles.card}>
        <ContactForm />
      </div>
    </>
  );
}
