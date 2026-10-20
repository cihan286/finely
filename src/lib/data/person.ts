// ─────────────────────────────────────────────────────────────────────────────
// A person's own account: a copy of their data, and deleting it
//
// In plain words: two things everyone can do for themselves in Settings.
// "Download my data" gathers what Finely holds about the person: their
// profile, how they sign in, where they're logged in, the companies they
// belong to, the invitations they sent, their email choices and what the
// activity logs say they did. "Delete my account" removes the person for
// good. Someone who still owns a company has to hand it over or delete it
// first, so no company is left without an owner.
//
// For developers: server-only. The person comes from requireUser(), never
// from the browser. A company's own records (transactions, bills, files)
// aren't the person's data and stay with the company: the database sets
// "entered by" to empty when the account goes (ON DELETE SET NULL), and
// removes memberships, logins, sign-in methods, sent invitations and email
// choices with it (ON DELETE CASCADE). The activity logs keep the person's
// name next to what they did: that's the companies' record, and the privacy
// policy says so. Passwords and sign-in tokens are never put in the copy.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, notificationPreference, notificationRead } from "@/db/finance";
import { account, invitation, member, organization, session, user } from "@/db/schema";
import { afterResponse } from "@/lib/after-response";
import { sendEmail } from "@/lib/email/send";
import { accountDeletedEmail } from "@/lib/email/templates";
import { renderAudit } from "@/lib/finance/audit";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/session";
import { recordAudit } from "./audit";
import { DataError } from "./common";

/** The most activity-log lines the copy holds, newest first */
const MAX_ACTIVITY_LINES = 20_000;

/** Everything Finely holds about one person, as it's written to the file */
export interface PersonalData {
  exportedAt: string;
  profile: {
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    /** "en" or "tr"; null before the person picked or signed up with one */
    language: string | null;
    createdAt: string;
  };
  /** "credential" = email and password; otherwise the service, e.g. "google" */
  signInMethods: { method: string; addedAt: string }[];
  logins: {
    startedAt: string;
    expiresAt: string;
    ipAddress: string | null;
    browser: string | null;
  }[];
  companies: {
    name: string;
    role: string;
    joinedAt: string;
    emails: { weeklyDigest: boolean; unusualCharges: boolean } | null;
    notificationsReadAt: string | null;
  }[];
  invitationsSent: {
    company: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: string;
  }[];
  /** What the companies' activity logs say this person did */
  activity: { company: string; at: string; about: string; what: string }[];
  note: string;
}

/**
 * The names of the companies the signed-in person owns. While there are
 * any, their account can't be deleted.
 */
export async function listOwnedCompanies(): Promise<string[]> {
  const { id } = await requireUser();
  const rows = await db
    .select({ name: organization.name })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(and(eq(member.userId, id), eq(member.role, "owner")))
    .orderBy(organization.name);
  return rows.map((row) => row.name);
}

/**
 * Whether the signed-in person signs in with a password (and so can change
 * it); false for someone who only uses Google.
 */
export async function hasPassword(): Promise<boolean> {
  const { id } = await requireUser();
  const matches = await db.$count(
    account,
    and(eq(account.userId, id), eq(account.providerId, "credential")),
  );
  return matches > 0;
}

/** A copy of what Finely holds about the signed-in person. */
export async function exportPersonalData(): Promise<PersonalData> {
  const { id } = await requireUser();
  const [[profile], methods, logins, memberships, preferences, reads, invitations, activity] =
    await Promise.all([
      db.select().from(user).where(eq(user.id, id)),
      db
        .select({ method: account.providerId, addedAt: account.createdAt })
        .from(account)
        .where(eq(account.userId, id)),
      db
        .select({
          startedAt: session.createdAt,
          expiresAt: session.expiresAt,
          ipAddress: session.ipAddress,
          browser: session.userAgent,
        })
        .from(session)
        .where(eq(session.userId, id))
        .orderBy(desc(session.createdAt)),
      db
        .select({
          organizationId: member.organizationId,
          name: organization.name,
          role: member.role,
          joinedAt: member.createdAt,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, id))
        .orderBy(member.createdAt),
      db
        .select()
        .from(notificationPreference)
        .where(eq(notificationPreference.userId, id)),
      db.select().from(notificationRead).where(eq(notificationRead.userId, id)),
      db
        .select({
          company: organization.name,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        })
        .from(invitation)
        .innerJoin(organization, eq(invitation.organizationId, organization.id))
        .where(eq(invitation.inviterId, id))
        .orderBy(desc(invitation.expiresAt)),
      db
        .select({
          company: organization.name,
          at: auditLog.createdAt,
          area: auditLog.area,
          what: auditLog.summary,
          details: auditLog.details,
        })
        .from(auditLog)
        .innerJoin(organization, eq(auditLog.organizationId, organization.id))
        .where(eq(auditLog.actorId, id))
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(MAX_ACTIVITY_LINES),
    ]);
  if (!profile) throw new DataError("accountNotFound");
  const { locale, m } = await getI18n();
  const areas: Record<string, string> = m.audit.areas;

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      name: profile.name,
      email: profile.email,
      emailVerified: profile.emailVerified,
      image: profile.image,
      language: profile.locale,
      createdAt: profile.createdAt.toISOString(),
    },
    signInMethods: methods.map((m) => ({
      method: m.method,
      addedAt: m.addedAt.toISOString(),
    })),
    logins: logins.map((l) => ({
      ...l,
      startedAt: l.startedAt.toISOString(),
      expiresAt: l.expiresAt.toISOString(),
    })),
    companies: memberships.map((m) => {
      const emails = preferences.find((p) => p.organizationId === m.organizationId);
      const read = reads.find((r) => r.organizationId === m.organizationId);
      return {
        name: m.name,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        // null = never chosen: the defaults apply
        emails: emails
          ? { weeklyDigest: emails.weeklyDigest, unusualCharges: emails.unusualCharges }
          : null,
        notificationsReadAt: read?.readAt.toISOString() ?? null,
      };
    }),
    invitationsSent: invitations.map((i) => ({
      ...i,
      expiresAt: i.expiresAt.toISOString(),
    })),
    activity: activity.map((a) => ({
      company: a.company,
      at: a.at.toISOString(),
      about: areas[a.area] ?? a.area,
      what: a.details ? renderAudit(a.details, m, locale) : a.what,
    })),
    note: m.settings.person.exportNote,
  };
}

/**
 * Deletes the signed-in person's account for good, when `confirmation` is
 * their email address. Refused while they own a company. They leave every
 * company they're in (recorded in its activity log); what they entered
 * there stays, without their name on it.
 */
export async function deleteOwnAccount(confirmation: string) {
  const { id } = await requireUser();
  const [person] = await db
    .select({ name: user.name, email: user.email, locale: user.locale })
    .from(user)
    .where(eq(user.id, id));
  if (!person) throw new DataError("accountNotFound");
  if (
    typeof confirmation !== "string" ||
    confirmation.trim().toLowerCase() !== person.email.toLowerCase()
  ) {
    throw new DataError("confirmEmail");
  }

  const memberships = await db
    .select({
      organizationId: member.organizationId,
      company: organization.name,
      role: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, id));
  const owned = memberships.filter((m) => m.role === "owner").map((m) => m.company);
  if (owned.length > 0) {
    throw new DataError(owned.length === 1 ? "stillOwnsOne" : "stillOwnsMany", {
      companies: owned.join(", "),
    });
  }

  // While the account still exists, so the lines carry who it was
  for (const m of memberships) {
    await recordAudit(
      { organizationId: m.organizationId, userId: id, userName: person.name },
      {
        area: "team",
        action: "left",
        key: "leftDeletedAccount",
      },
    );
  }

  await db.batch([
    // Invitations other companies sent to this address
    db
      .delete(invitation)
      .where(sql`lower(${invitation.email}) = ${person.email.toLowerCase()}`),
    // Memberships, logins, sign-in methods, sent invitations and email
    // choices go with it (see the top of this file)
    db.delete(user).where(eq(user.id, id)),
  ]);

  // sendEmail() never throws
  await afterResponse(async () => {
    await sendEmail(accountDeletedEmail(person));
  });
}
