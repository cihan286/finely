// ─────────────────────────────────────────────────────────────────────────────
// Authentication setup (server side)
//
// In plain words: this is the heart of signing up and logging in. It tells the
// Better Auth library where to store accounts (our database), which ways of
// signing in we offer (email + password, and Google), and what to do when
// someone forgets their password.
//
// For developers: server-only. The browser talks to this through the
// /api/auth/* routes (see app/api/auth). Client components use
// lib/auth-client.ts instead, and server code uses lib/session.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { appUrl, vercelUrls } from "@/lib/app-url";
import { queueEmail } from "@/lib/email/send";
import {
  invitationEmail,
  passwordResetEmail,
  verifyEmailEmail,
} from "@/lib/email/templates";
import { roleLabel } from "@/lib/roles";

// Google sign-in credentials, read from the secret .env.local file
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Google sign-in is offered only once its credentials are configured. */
export const isGoogleEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  baseURL: appUrl,
  // Logins are only accepted from pages on our own addresses. On Vercel,
  // the same deployment can be opened from either of its addresses.
  trustedOrigins: vercelUrls,

  // Store users, sessions and accounts in our Postgres database via Drizzle
  database: drizzleAdapter(db, { provider: "pg", schema }),

  // Classic sign-in with an email address and a password
  emailAndPassword: {
    enabled: true,
    // Called when someone asks to reset their password. `url` is the
    // one-time link that lets them choose a new one (valid for one hour).
    sendResetPassword: async ({ user, url }) => {
      queueEmail(passwordResetEmail(user.email, user.name, url));
    },
  },

  // "Verify your email address": sent automatically after signing up with a
  // password (Google already confirms the address). People can use Finely
  // before verifying, but need a verified email to join a team.
  emailVerification: {
    sendOnSignUp: true,
    // Clicking the link in the email also logs the person in
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      queueEmail(verifyEmailEmail(user.email, user.name, url));
    },
  },

  // "Continue with Google" — only switched on when its credentials exist
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Always ask which Google account to use: business users often
            // have a work and a personal account in the same browser.
            prompt: "select_account",
          },
        }
      : {},

  // Slow down people (or bots) trying many passwords or sign-ups in a row.
  // On by default in production only. The counts are kept in the database:
  // the server runs as many short-lived copies, so counts kept in memory
  // would be forgotten or split between copies.
  rateLimit: {
    storage: "database",
  },

  // The company each person last worked in, so their next login opens it.
  // Set by the hooks below; never by the browser (input: false).
  user: {
    additionalFields: {
      lastOrganizationId: { type: "string", required: false, input: false },
    },
  },

  databaseHooks: {
    session: {
      // When someone logs in, open a company they belong to, so the
      // dashboard knows whose data to show: the one they last worked in, or
      // else the one they joined first.
      create: {
        before: async (session) => {
          const [memberships, [person]] = await Promise.all([
            db
              .select({ organizationId: schema.member.organizationId })
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId))
              .orderBy(asc(schema.member.createdAt)),
            db
              .select({ last: schema.user.lastOrganizationId })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId)),
          ]);
          const membership =
            memberships.find((m) => m.organizationId === person?.last) ??
            memberships[0];
          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
      // When a login switches company (the switcher in the top bar, or
      // accepting an invitation), remember it for the next login. Sessions
      // are also updated for other reasons; then nothing changes here.
      update: {
        after: async (session) => {
          const organizationId = session.activeOrganizationId;
          if (typeof organizationId !== "string") return;
          await db
            .update(schema.user)
            .set({ lastOrganizationId: organizationId })
            .where(
              and(
                eq(schema.user.id, session.userId),
                sql`${schema.user.lastOrganizationId} is distinct from ${organizationId}`,
              ),
            );
        },
      },
    },
  },

  plugins: [
    // Business accounts ("organizations"): each company has members with a
    // role — owner, admin or member — and can invite people by email.
    organization({
      // Called when someone is invited. The link opens our accept page.
      sendInvitationEmail: async (invite) => {
        queueEmail(
          invitationEmail({
            to: invite.email,
            inviterName: invite.inviter.user.name,
            inviterEmail: invite.inviter.user.email,
            organizationName: invite.organization.name,
            role: roleLabel(invite.role).toLowerCase(),
            url: `${appUrl}/accept-invitation/${invite.id}`,
          }),
        );
      },
      // Only people who proved they own the invited email address can join.
      // Without this, someone could sign up with a colleague's address (we
      // don't check ownership at sign-up) and take their place on the team.
      requireEmailVerificationOnInvitation: true,
      // How many people a company's plan allows on its team (see
      // lib/data/billing.ts); checked when someone is invited or joins
      membershipLimit: async (_user, organization) => {
        const { memberLimitFor } = await import("@/lib/data/billing");
        return memberLimitFor(organization.id);
      },
      organizationHooks: {
        // Team changes go through Better Auth, not through lib/data/, so
        // they're written to the company's activity log from here
        afterCreateInvitation: async ({ invitation, inviter, organization }) => {
          await recordTeamChange(organization.id, inviter, "invited", {
            entityId: invitation.id,
            summary: `Invited ${invitation.email} as ${roleLabel(invitation.role).toLowerCase()}`,
          });
        },
        afterCancelInvitation: async ({ invitation, cancelledBy, organization }) => {
          await recordTeamChange(organization.id, cancelledBy, "invitation-cancelled", {
            entityId: invitation.id,
            summary: `Cancelled the invitation to ${invitation.email}`,
          });
        },
        afterAcceptInvitation: async ({ member, user, organization }) => {
          await recordTeamChange(organization.id, user, "joined", {
            entityId: member.id,
            summary: `Joined the company as ${roleLabel(member.role).toLowerCase()}`,
          });
        },
        afterUpdateMemberRole: async ({ member, previousRole, user, organization }) => {
          await recordTeamChange(organization.id, await signedInUser(), "role-changed", {
            entityId: member.id,
            summary: `Changed ${user.name}'s role from ${roleLabel(previousRole).toLowerCase()} to ${roleLabel(member.role).toLowerCase()}`,
          });
        },
        afterRemoveMember: async ({ member, user, organization }) => {
          await recordTeamChange(organization.id, await signedInUser(), "removed", {
            entityId: member.id,
            summary: `Removed ${user.name} (${user.email}) from the team`,
          });
        },
        afterUpdateOrganization: async ({ organization, user }) => {
          if (!organization) return;
          await recordTeamChange(organization.id, user, "company-updated", {
            summary: `Changed the company's name to “${organization.name}”`,
          });
        },
        // New companies start with a ready-made set of categories, and the
        // timezone of the browser they were created in (sent as metadata
        // by CreateOrganizationForm)
        afterCreateOrganization: async ({ organization }) => {
          let metadata = organization.metadata;
          if (typeof metadata === "string") {
            try {
              metadata = JSON.parse(metadata);
            } catch {
              metadata = null; // unreadable: use the default timezone
            }
          }
          // Loaded here, not at the top of the file: these are marked
          // "server-only", which only loads inside Next.js, and this file
          // must also load in the Better Auth CLI (npx auth generate)
          const [{ createDefaultCategories }, { createCompanySettings }] =
            await Promise.all([
              import("@/lib/data/default-categories"),
              import("@/lib/data/settings"),
            ]);
          await Promise.all([
            createDefaultCategories(organization.id),
            createCompanySettings(organization.id, metadata?.timezone),
          ]);
        },
      },
    }),
    // nextCookies lets server actions set auth cookies; it must stay last.
    nextCookies(),
  ],
});

// Who is making the current request, for the activity log. Some of Better
// Auth's hooks only say who was changed, not who changed them.
async function signedInUser(): Promise<{ id: string; name: string } | null> {
  try {
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    return null; // outside a request
  }
}

// Adds a team change to the company's activity log. Loaded here, not at the
// top of the file: lib/data/ is "server-only" (see afterCreateOrganization).
async function recordTeamChange(
  organizationId: string,
  actor: { id: string; name: string } | null,
  action: string,
  event: { summary: string; entityId?: string },
) {
  const { recordAudit } = await import("@/lib/data/audit");
  await recordAudit(
    { organizationId, userId: actor?.id ?? null, userName: actor?.name ?? null },
    { area: "team", action, ...event },
  );
}

// The shape of a logged-in session (user + session details), for TypeScript
export type Session = typeof auth.$Infer.Session;
