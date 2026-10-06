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

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Forgot your password?</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className={styles.footer}>
        Remembered it?{" "}
        <Link href="/login" className={styles.link}>
          Back to log in
        </Link>
      </p>
    </>
  );
}
