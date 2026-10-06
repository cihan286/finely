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
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { createDefaultCategories } from "@/lib/data/default-categories";
import { queueEmail } from "@/lib/email/send";
import {
  invitationEmail,
  passwordResetEmail,
  verifyEmailEmail,
} from "@/lib/email/templates";
import { roleLabel } from "@/lib/roles";

// The site's own address, used to build links in emails (e.g. invitations).
// In production, set BETTER_AUTH_URL to the real address (https://…).
const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Google sign-in credentials, read from the secret .env.local file
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

/** Google sign-in is offered only once its credentials are configured. */
export const isGoogleEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
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

  // When someone logs in, open the company they belong to (the oldest
  // membership first), so the dashboard knows whose data to show.
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const [membership] = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .orderBy(asc(schema.member.createdAt))
            .limit(1);
          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
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
      organizationHooks: {
        // New companies start with a ready-made set of categories
        afterCreateOrganization: async ({ organization }) => {
          await createDefaultCategories(organization.id);
        },
      },
    }),
    // nextCookies lets server actions set auth cookies; it must stay last.
    nextCookies(),
  ],
});

// The shape of a logged-in session (user + session details), for TypeScript
export type Session = typeof auth.$Infer.Session;
