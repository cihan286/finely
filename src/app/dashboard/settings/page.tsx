// ─────────────────────────────────────────────────────────────────────────────
// Settings page (finely.com/dashboard/settings)
//
// In plain words: where you manage your company — its timezone, its team
// (who's in it, their roles, and invitations), its bank accounts and its
// categories. Owners and admins can change all of these; members can see
// them.
//
// For developers: loads the active company with requireOrganization() and
// its settings and accounts from lib/data/, and hands plain values to the
// CompanySettings, TeamSettings, AccountSettings and CategorySettings
// components. /dashboard/settings#accounts and #categories jump to those
// sections.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import AccountSettings from "@/components/dashboard/settings/AccountSettings";
import CategorySettings from "@/components/dashboard/settings/CategorySettings";
import CompanySettings from "@/components/dashboard/settings/CompanySettings";
import TeamSettings from "@/components/dashboard/settings/TeamSettings";
import { listAccounts } from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";
import { getCompanySettings } from "@/lib/data/settings";
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
  const [accounts, categories, settings] = await Promise.all([
    listAccounts(),
    listCategories(),
    getCompanySettings(),
  ]);
  // Every timezone this server knows (UTC first), plus the saved one
  const timeZones = [
    "UTC",
    ...Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "UTC"),
  ];
  if (!timeZones.includes(settings.timeZone)) timeZones.push(settings.timeZone);

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
          Manage {organization.name}&apos;s timezone, team, bank accounts and
          categories.
        </p>
      </div>
      <CompanySettings
        canManage={canManageFinances(role)}
        timeZone={settings.timeZone}
        timeZones={timeZones}
      />
      <TeamSettings
        role={role}
        members={members}
        invitations={invitations}
        emailEnabled={Boolean(process.env.RESEND_API_KEY)}
      />
      <AccountSettings canManage={canManageFinances(role)} accounts={accounts} />
      <CategorySettings
        canManage={canManageFinances(role)}
        categories={categories}
      />
    </main>
  );
}
