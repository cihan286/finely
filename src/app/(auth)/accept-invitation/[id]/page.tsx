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
import { fill } from "@/i18n/config";
import { bold, rich } from "@/i18n/rich";
import { getMessages } from "@/i18n/server";
import { getSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).auth.invitation.title };
}

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const here = `/accept-invitation/${id}`;
  const session = await getSession();
  const { auth: words, common } = await getMessages();
  const t = words.invitation;

  // Not logged in: log in or sign up first, then come back here
  if (!session) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>{t.invited}</h1>
          <p className={styles.subtitle}>{t.invitedText}</p>
        </div>
        <div className={styles.form}>
          <Link
            href={`/login?next=${encodeURIComponent(here)}`}
            className={styles.primaryLink}
          >
            {common.logIn}
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(here)}`}
            className={styles.secondaryLink}
          >
            {words.login.createAccount}
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
          <h1 className={styles.title}>{t.verifyTitle}</h1>
          <p className={styles.subtitle}>
            {rich(fill(t.verifyText, { email: session.user.email }), bold)}
          </p>
        </div>
        <p className={styles.footer}>
          {t.didntGetIt}{" "}
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
          <h1 className={styles.title}>{t.unavailable}</h1>
          <p className={styles.subtitle}>
            {rich(fill(t.unavailableText, { email: session.user.email }), bold)}
          </p>
        </div>
        <p className={styles.footer}>
          <SwitchAccountButton next={here} />
          {" · "}
          <Link href="/dashboard" className={styles.link}>
            {t.goToDashboard}
          </Link>
        </p>
      </>
    );
  }

  // "member" -> "a member", "admin" -> "an admin"
  const roles: Record<string, string> = words.roleWithArticle;
  const role = roles[invitation.role] ?? invitation.role;

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>{fill(t.join, { company: invitation.organizationName })}</h1>
        <p className={styles.subtitle}>
          {fill(t.joinText, {
            inviter: invitation.inviterEmail,
            company: invitation.organizationName,
            role,
          })}
        </p>
      </div>
      <InvitationActions invitationId={invitation.id} />
    </>
  );
}
