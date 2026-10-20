// ─────────────────────────────────────────────────────────────────────────────
// "Forgot your password?" page (finely.com/forgot-password)
//
// In plain words: people who forgot their password enter their email here, and
// we send them a link to choose a new one.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import styles from "@/components/auth/AuthForm.module.css";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.forgot.title };
}

export default async function ForgotPasswordPage() {
  const t = (await getMessages()).auth.forgot;
  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.heading}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <ForgotPasswordForm />

      <p className={styles.footer}>
        {t.remembered}{" "}
        <Link href="/login" className={styles.link}>
          {t.backToLogin}
        </Link>
      </p>
    </>
  );
}
