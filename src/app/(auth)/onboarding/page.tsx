// ─────────────────────────────────────────────────────────────────────────────
// Company setup page (finely.com/onboarding)
//
// In plain words: the step right after signing up. Finely is for businesses,
// so everyone works inside a company. New users name their company here and
// become its owner. People who already belong to a company skip straight to
// the dashboard.
//
// For developers: the dashboard sends anyone without an active company here
// (see requireOrganization() in lib/session.ts).
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ActivateOrganization from "@/components/auth/ActivateOrganization";
import CreateOrganizationForm from "@/components/auth/CreateOrganizationForm";
import styles from "@/components/auth/AuthForm.module.css";
import { auth } from "@/lib/auth";
import { getActiveOrganization, requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Set up your company",
};

export default async function OnboardingPage() {
  const user = await requireUser();

  // Already working in a company: nothing to set up
  if (await getActiveOrganization()) redirect("/dashboard");

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
        <h1 className={styles.title}>Set up your company</h1>
        <p className={styles.subtitle}>
          Welcome, {user.name.split(" ")[0]}! What&apos;s your company called?
        </p>
      </div>

      <CreateOrganizationForm />

      <p className={styles.legal}>
        Joining a company that already uses Finely? Ask someone there to invite{" "}
        {user.email}.
      </p>
    </>
  );
}
