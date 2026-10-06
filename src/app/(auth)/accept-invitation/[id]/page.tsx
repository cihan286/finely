// ─────────────────────────────────────────────────────────────────────────────
// Invitation page (finely.com/accept-invitation/…)
//
// In plain words: the link in an invitation opens this page. If you aren't
// logged in, it asks you to log in or create an account first (with the email
// the invitation was sent to) and brings you back here. If your email isn't
// verified yet, it asks you to do that first. Then it shows which company
// invited you, with buttons to accept or decline. If the invitation
// has expired, was already used, or belongs to a different email address, it
// explains that instead.
//
// For developers: deliberately not behind the proxy's login check, so
// logged-out visitors see the explanation. Better Auth only returns the
// invitation to the user whose email it was sent to.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import InvitationActions from "@/components/auth/InvitationActions";
import ResendVerificationButton from "@/components/auth/ResendVerificationButton";
import SwitchAccountButton from "@/components/auth/SwitchAccountButton";
import styles from "@/components/auth/AuthForm.module.css";
import { auth } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Join your team",
};

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const here = `/accept-invitation/${id}`;
  const session = await getSession();

  // Not logged in: log in or sign up first, then come back here
  if (!session) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>You&apos;re invited</h1>
          <p className={styles.subtitle}>
            Log in or create an account to join your team on Finely. Use the
            email address the invitation was sent to.
          </p>
        </div>
        <div className={styles.form}>
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className={styles.primaryLink}
          >
            Log in
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(here)}`}
            className={styles.secondaryLink}
          >
            Create an account
          </Link>
        </div>
      </>
    );
  }

  // Joining a team requires a verified email (see lib/auth.ts). Until then
  // Better Auth won't even reveal the invitation, so check this first.
  if (!session.user.emailVerified) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>Verify your email to join your team</h1>
          <p className={styles.subtitle}>
            We sent a verification link to <strong>{session.user.email}</strong>.
            Click it, and you&apos;ll come right back here to accept the
            invitation.
          </p>
        </div>
        <p className={styles.footer}>
          Didn&apos;t get it?{" "}
          <ResendVerificationButton
            email={session.user.email}
            callbackURL={here}
            className={styles.linkButton}
          />
        </p>
      </>
    );
  }

  // Look up the invitation; fails if it's expired, used, or for someone else
  let invitation = null;
  try {
    invitation = await auth.api.getInvitation({
      query: { id },
      headers: await headers(),
    });
  } catch {
    invitation = null;
  }

  if (!invitation) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>Invitation not available</h1>
          <p className={styles.subtitle}>
            This invitation has expired, was already used, or was sent to a
            different email address. You&apos;re logged in as{" "}
            <strong>{session.user.email}</strong>.
          </p>
        </div>
        <p className={styles.footer}>
          <SwitchAccountButton next={here} />
          {" · "}
          <Link href="/dashboard" className={styles.link}>
            Go to dashboard
          </Link>
        </p>
      </>
    );
  }

  // "member" -> "a member", "admin" -> "an admin"
  const role = roleLabel(invitation.role).toLowerCase();
  const roleWithArticle = `${/^[aeiou]/.test(role) ? "an" : "a"} ${role}`;

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Join {invitation.organizationName}</h1>
        <p className={styles.subtitle}>
          {invitation.inviterEmail} invited you to join{" "}
          {invitation.organizationName} on Finely as {roleWithArticle}.
        </p>
      </div>
      <InvitationActions invitationId={invitation.id} />
    </>
  );
}
