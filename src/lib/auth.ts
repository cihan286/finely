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

// The site's own address, used to build links in emails (e.g. invitations)
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
      // TODO: send this by email (e.g. with Resend) before going live.
      // Until then the link is printed in the server terminal.
      console.info(`\n[password reset] ${user.email}\n${url}\n`);
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
        const { id, email, role, inviter } = invite;
        // TODO: send this by email (e.g. with Resend) before going live.
        // Until then the link is printed in the server terminal.
        console.info(
          `\n[invitation] ${email} invited to "${invite.organization.name}" as ${role} by ${inviter.user.email}\n${appUrl}/accept-invitation/${id}\n`,
        );
      },
    }),
    // nextCookies lets server actions set auth cookies; it must stay last.
    nextCookies(),
  ],
});

// The shape of a logged-in session (user + session details), for TypeScript
export type Session = typeof auth.$Infer.Session;
