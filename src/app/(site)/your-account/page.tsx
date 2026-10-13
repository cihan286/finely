// ─────────────────────────────────────────────────────────────────────────────
// Your account page (finely.com/your-account)
//
// In plain words: your name, a copy of your data and deleting your account,
// for people who are logged in but have no company (they left their last
// one, or never set one up). Everyone else finds the same at the bottom of
// Settings; this page works for them too.
//
// For developers: requireUser() sends visitors who aren't logged in to
// /login. The section itself is the one Settings shows (PersonSettings),
// with the same checks behind it (lib/data/person.ts).
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import PersonSettings from "@/components/dashboard/settings/PersonSettings";
import { hasPassword, listOwnedCompanies } from "@/lib/data/person";
import { requireUser } from "@/lib/session";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "Your account",
  // Personal: nothing for a search engine
  robots: { index: false },
};

export default async function YourAccountPage() {
  const user = await requireUser();
  const [ownedCompanies, passwordSet] = await Promise.all([
    listOwnedCompanies(),
    hasPassword(),
  ]);

  return (
    <>
      <span className={styles.label}>Your account</span>
      <h1 className={styles.title}>{user.name}</h1>
      <p className={styles.intro}>
        Signed in as {user.email}.{" "}
        <Link href="/dashboard" className={styles.inlineLink}>
          Back to Finely
        </Link>
      </p>

      <PersonSettings
        name={user.name}
        email={user.email}
        hasPassword={passwordSet}
        ownedCompanies={ownedCompanies}
      />
    </>
  );
}
