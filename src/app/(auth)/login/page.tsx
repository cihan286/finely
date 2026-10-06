// ─────────────────────────────────────────────────────────────────────────────
// Login page (finely.com/login)
//
// In plain words: where existing users log in with their email and password
// (or Google). After a successful password reset, people land here and see a
// "Your password was changed" message.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import styles from "@/components/auth/AuthForm.module.css";
import { isGoogleEnabled } from "@/lib/auth";
import { safeNextPath } from "@/lib/redirect";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; next?: string }>;
}) {
  // "?reset=success" in the address means the user just changed their password;
  // "?next=…" is where to return afterwards (e.g. an invitation)
  const { reset, next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext);

  // Already logged in? Skip this page
  if (await getSession()) redirect(next ?? "/dashboard");

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Log in to your Finely account.</p>
      </div>

      <LoginForm
        googleEnabled={isGoogleEnabled}
        next={next}
        notice={
          reset === "success"
            ? "Your password was changed. Log in with your new password."
            : undefined
        }
      />

      <p className={styles.footer}>
        New to Finely?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className={styles.link}
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
