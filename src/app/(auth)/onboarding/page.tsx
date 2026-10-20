// ─────────────────────────────────────────────────────────────────────────────
// Company setup page (finely.com/onboarding)
//
// In plain words: the step right after signing up. Finely is for businesses,
// so everyone works inside a company. New users name their company here and
// become its owner. People who already belong to a company skip straight to
// the dashboard — unless they came to add another company of their own
// ("New company" in the top bar's company list).
//
// For developers: the dashboard sends anyone without an active company here
// (see requireOrganization() in lib/session.ts). /onboarding?new=1 shows the
// form to someone who already has a company.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import ActivateOrganization from "@/components/auth/ActivateOrganization";
import CreateOrganizationForm from "@/components/auth/CreateOrganizationForm";
import styles from "@/components/auth/AuthForm.module.css";
import { auth } from "@/lib/auth";
import { getActiveOrganization, requireUser } from "@/lib/session";
import { fill } from "@/i18n/config";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.onboarding.title };
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string | string[] }>;
}) {
  const user = await requireUser();
  const current = await getActiveOrganization();
  const t = (await getMessages()).auth.onboarding;

  // Adding another company next to the one they're working in
  if (current && (await searchParams).new) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>{t.addTitle}</h1>
          <p className={styles.subtitle}>{t.addSubtitle}</p>
        </div>

        <CreateOrganizationForm />

        <p className={styles.footer}>
          <Link href="/dashboard" className={styles.link}>
            {fill(t.backTo, { name: current.name })}
          </Link>
        </p>
      </>
    );
  }

  // Already working in a company: nothing to set up
  if (current) redirect("/dashboard");

  // Belongs to a company, but this login isn't connected to it yet
  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });
  if (organizations.length > 0) {
    return <ActivateOrganization organizationId={organizations[0].id} />;
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>{fill(t.welcome, { name: user.name.split(" ")[0] })}</p>
      </div>

      <CreateOrganizationForm />

      <p className={styles.legal}>{fill(t.joining, { email: user.email })}</p>
      {/* Without a company there is no Settings page to do this from */}
      <p className={styles.footer}>
        <Link href="/your-account" className={styles.link}>
          {t.yourAccount}
        </Link>
      </p>
    </>
  );
}
