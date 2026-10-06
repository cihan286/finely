// ─────────────────────────────────────────────────────────────────────────────
// Sign-up page (finely.com/signup)
//
// In plain words: where new users create a Finely account with their name,
// email and a password (or Google). After signing up they go straight to the
// dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignupForm from "@/components/auth/SignupForm";
import styles from "@/components/auth/AuthForm.module.css";
import { isGoogleEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create your account",
};

export default async function SignupPage() {
  // Already logged in? Skip this page and go to the dashboard
  if (await getSession()) redirect("/dashboard");

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>
          Get a clear view of your business finances in minutes.
        </p>
      </div>

      <SignupForm googleEnabled={isGoogleEnabled} />

      <p className={styles.footer}>
        Already have an account?{" "}
        <Link href="/login" className={styles.link}>
          Log in
        </Link>
      </p>
      {/* TODO: link these once the Terms and Privacy pages exist */}
      <p className={styles.legal}>
        By creating an account, you agree to our Terms of Service and Privacy
        Policy.
      </p>
    </>
  );
}
