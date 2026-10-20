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
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { appUrl, vercelUrls } from "@/lib/app-url";
import { isDemoEmail } from "@/lib/demo";
import type { AuditDetails } from "@/lib/finance/audit";
import { queueEmail } from "@/lib/email/send";
import {
  invitationEmail,
  passwordResetEmail,
  verifyEmailEmail,
} from "@/lib/email/templates";

// Google sign-in credentials, read from the secret .env.local file
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Google sign-in is offered only once its credentials are configured. */
export const isGoogleEnabled = Boolean(googleClientId && googleClientSecret);

// What a demo person may not do (see hooks.before)
const DEMO_BLOCKED_PATHS = new Set([
  "/organization/invite-member",
  "/organization/create",
  "/change-email",
]);

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
      queueEmail(passwordResetEmail(user.email, user.name, url, await localeOf(user)));
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
      queueEmail(verifyEmailEmail(user.email, user.name, url, await localeOf(user)));
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
      // Their language, for emails sent later: the page's language at
      // sign-up (databaseHooks.user below), then the language switcher's
      locale: { type: "string", required: false, input: false },
    },
    // People can change their email address in Settings. It only changes
    // once they opened the link we send to the new address (the same
    // "verify your email" message as after signing up), so nobody can take
    // an address that isn't theirs.
    changeEmail: { enabled: true },
  },

  databaseHooks: {
    // New people keep the language of the page they signed up on
    user: {
      create: {
        before: async (user) => {
          const { getLocale } = await import("@/i18n/server");
          return { data: { ...user, locale: await getLocale() } };
        },
      },
    },
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

  hooks: {
    // The demo's pretend people ("Try the demo", lib/data/demo.ts) can't
    // reach anyone outside it: no inviting, no changing their email address
    // to a real one, and no new companies (which would outlive the demo)
    before: createAuthMiddleware(async (ctx) => {
      if (!DEMO_BLOCKED_PATHS.has(ctx.path)) return;
      const current = await getSessionFromCtx(ctx);
      if (isDemoEmail(current?.user.email)) {
        throw new APIError("FORBIDDEN", {
          message: "This isn't available in the demo. Sign up to use it with your own company.",
          // Shown in the person's language (i18n/auth-errors.ts)
          code: "DEMO_BLOCKED",
        });
      }
    }),
    // Leaving a company by yourself has no hook of its own in Better Auth
    // (being removed by someone else does), so it's written to the
    // company's activity log from here
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/organization/leave") return;
      // Refused (e.g. the owner tried to leave): nothing happened
      if (isAPIError(ctx.context.returned)) return;
      const organizationId = ctx.body?.organizationId;
      const person = await signedInUser();
      if (typeof organizationId !== "string" || !person) return;
      await recordTeamChange(organizationId, person, "left", { key: "leftCompany" });
    }),
  },

  plugins: [
    // Business accounts ("organizations"): each company has members with a
    // role — owner, admin or member — and can invite people by email.
    organization({
      // Called when someone is invited. The link opens our accept page.
      // The invited person may not have an account yet: written in the
      // language of whoever invites them
      sendInvitationEmail: async (invite) => {
        const { getLocale } = await import("@/i18n/server");
        queueEmail(
          invitationEmail(
            {
              to: invite.email,
              inviterName: invite.inviter.user.name,
              inviterEmail: invite.inviter.user.email,
              organizationName: invite.organization.name,
              role: invite.role,
              url: `${appUrl}/accept-invitation/${invite.id}`,
            },
            await getLocale(),
          ),
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
            key: "invited",
            values: { email: invitation.email, role: { role: invitation.role } },
          });
        },
        afterCancelInvitation: async ({ invitation, cancelledBy, organization }) => {
          await recordTeamChange(organization.id, cancelledBy, "invitation-cancelled", {
            entityId: invitation.id,
            key: "invitationCancelled",
            values: { email: invitation.email },
          });
        },
        afterAcceptInvitation: async ({ member, user, organization }) => {
          await recordTeamChange(organization.id, user, "joined", {
            entityId: member.id,
            key: "joined",
            values: { role: { role: member.role } },
          });
        },
        afterUpdateMemberRole: async ({ member, previousRole, user, organization }) => {
          await recordTeamChange(organization.id, await signedInUser(), "role-changed", {
            entityId: member.id,
            key: "roleChanged",
            values: {
              name: user.name,
              from: { role: previousRole },
              to: { role: member.role },
            },
          });
        },
        afterRemoveMember: async ({ member, user, organization }) => {
          await recordTeamChange(organization.id, await signedInUser(), "removed", {
            entityId: member.id,
            key: "memberRemoved",
            values: { name: user.name, email: user.email },
          });
        },
        afterUpdateOrganization: async ({ organization, user }) => {
          if (!organization) return;
          await recordTeamChange(organization.id, user, "company-updated", {
            key: "companyRenamed",
            values: { name: organization.name },
          });
        },
        // New companies start with a ready-made set of categories, and the
        // timezone of the browser they were created in (sent as metadata
        // by CreateOrganizationForm)
        afterCreateOrganization: async ({ organization, user }) => {
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
          await recordTeamChange(organization.id, user, "company-created", {
            key: "companyCreated",
            values: { name: organization.name },
          });
        },
      },
    }),
    // nextCookies lets server actions set auth cookies; it must stay last.
    nextCookies(),
  ],
});

// The language to email someone in: the one saved on them, or else the
// current page's (loaded here: i18n/server is "server-only", see below)
async function localeOf(person: object) {
  const { isLocale } = await import("@/i18n/config");
  const saved = "locale" in person ? person.locale : null;
  if (isLocale(saved)) return saved;
  const { getLocale } = await import("@/i18n/server");
  return getLocale();
}

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
  event: AuditDetails & { entityId?: string },
) {
  const { recordAudit } = await import("@/lib/data/audit");
  await recordAudit(
    { organizationId, userId: actor?.id ?? null, userName: actor?.name ?? null },
    { area: "team", action, ...event },
  );
}

// The shape of a logged-in session (user + session details), for TypeScript
export type Session = typeof auth.$Infer.Session;
