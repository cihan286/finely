// ─────────────────────────────────────────────────────────────────────────────
// "Choose a new password" page (finely.com/reset-password)
//
// In plain words: the link in the password reset email opens this page. If the
// link is valid, it shows a form to pick a new password. If the link is broken,
// already used or older than an hour, it explains that and offers a new one.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import styles from "@/components/auth/AuthForm.module.css";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.reset.title };
}

// The emailed link lands here with ?token=…, or with ?error=INVALID_TOKEN
// when the token is wrong or expired.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const t = (await getMessages()).auth.reset;

  // No usable link: show the "Link expired" message instead of the form
  if (!token || error) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>{t.expiredTitle}</h1>
          <p className={styles.subtitle}>{t.expiredText}</p>
        </div>
        <p className={styles.footer}>
          <Link href="/forgot-password" className={styles.link}>
            {t.requestNew}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <ResetPasswordForm token={token} />
    </>
  );
}
