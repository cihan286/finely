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
import { safeNextPath } from "@/lib/redirect";
import { getSession } from "@/lib/session";
import { rich } from "@/i18n/rich";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.signup.title };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // "?next=…" is where to return after signing up (e.g. an invitation)
  const next = safeNextPath((await searchParams).next);

  // Already logged in? Skip this page
  if (await getSession()) redirect(next ?? "/dashboard");
  const { auth, common } = await getMessages();
  const t = auth.signup;
  // The terms and the privacy policy open in a new tab, so the form stays
  const legalLink = (href: string) =>
    function LegalLink(text: string) {
      return (
        <Link href={href} className={styles.link} target="_blank">
          {text}
        </Link>
      );
    };

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <SignupForm googleEnabled={isGoogleEnabled} next={next} />

      <p className={styles.footer}>
        {t.haveAccount}{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className={styles.link}
        >
          {common.logIn}
        </Link>
      </p>
      <p className={styles.legal}>
        {rich(t.agree, { terms: legalLink("/terms"), privacy: legalLink("/privacy") })}
      </p>
    </>
  );
}
