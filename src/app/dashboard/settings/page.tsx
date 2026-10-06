// ─────────────────────────────────────────────────────────────────────────────
// Settings page (finely.com/dashboard/settings)
//
// In plain words: where you manage your company's team — who's in it, their
// roles, and invitations — and its bank accounts. Owners and admins can
// invite and remove people, and add and remove bank accounts.
//
// For developers: loads the active company with requireOrganization() and
// its accounts with listAccounts(), and hands plain lists to the
// TeamSettings and AccountSettings components. /dashboard/settings#accounts
// jumps to the bank accounts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import AccountSettings from "@/components/dashboard/settings/AccountSettings";
import TeamSettings from "@/components/dashboard/settings/TeamSettings";
import { listAccounts } from "@/lib/data/accounts";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";
import styles from "./page.module.css";

// Browser tab title: "Settings | Finely"
export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  // Protects the page and loads the company with its members and invitations
  const { user, organization, role } = await requireOrganization();
  const accounts = await listAccounts();

  // Owner first, then admins, then members; alphabetical within each role
  const order = { owner: 0, admin: 1, member: 2 } as Record<string, number>;
  const members = organization.members
    .map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      isYou: m.userId === user.id,
    }))
    .sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.name.localeCompare(b.name));

  // Only invitations that can still be accepted
  const now = new Date();
  const invitations = organization.invitations
    .filter((i) => i.status === "pending" && new Date(i.expiresAt) > now)
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: new Date(i.expiresAt),
    }));

  return (
    <main className={styles.page}>
      <div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage the team and bank accounts at {organization.name}.
        </p>
      </div>
      <TeamSettings
        role={role}
        members={members}
        invitations={invitations}
        emailEnabled={Boolean(process.env.RESEND_API_KEY)}
      />
      <AccountSettings canManage={canManageFinances(role)} accounts={accounts} />
    </main>
  );
}
