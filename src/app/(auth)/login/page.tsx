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
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.login.title };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; next?: string; deleted?: string }>;
}) {
  // "?reset=success" in the address means the user just changed their password;
  // "?deleted=1" that they just deleted their account;
  // "?next=…" is where to return afterwards (e.g. an invitation)
  const { reset, deleted, next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext);

  // Already logged in? Skip this page
  if (await getSession()) redirect(next ?? "/dashboard");
  const t = (await getMessages()).auth.login;

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.heading}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <LoginForm
        googleEnabled={isGoogleEnabled}
        next={next}
        notice={
          reset === "success"
            ? t.passwordChanged
            : deleted
              ? t.accountDeleted
              : undefined
        }
      />

      <p className={styles.footer}>
        {t.newToFinely}{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className={styles.link}
        >
          {t.createAccount}
        </Link>
      </p>
    </>
  );
}
