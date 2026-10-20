// ─────────────────────────────────────────────────────────────────────────────
// Settings page (finely.com/dashboard/settings)
//
// In plain words: where you manage your company — its name and timezone, its team
// (who's in it, their roles, and invitations), its bank accounts, its
// categories and its category rules. Owners and admins can change all of
// these; members can see them. Everyone chooses which emails they get
// themselves. The owner also gets a last section to hand
// the company over to someone else or delete it.
//
// For developers: loads the active company with requireOrganization() and
// its settings and accounts from lib/data/, and hands plain values to the
// CompanySettings, TeamSettings, AccountSettings, CategorySettings and
// CategoryRuleSettings components. /dashboard/settings#accounts,
// #categories and #rules jump to those sections; ?handedOver=1 shows the
// message after the owner handed the company over.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import AccountSettings from "@/components/dashboard/settings/AccountSettings";
import CategoryRuleSettings from "@/components/dashboard/settings/CategoryRuleSettings";
import BankConnections from "@/components/dashboard/settings/BankConnections";
import BillingSettings from "@/components/dashboard/settings/BillingSettings";
import CategorySettings from "@/components/dashboard/settings/CategorySettings";
import CompanySettings from "@/components/dashboard/settings/CompanySettings";
import EmailSettings from "@/components/dashboard/settings/EmailSettings";
import OwnerSettings from "@/components/dashboard/settings/OwnerSettings";
import PersonSettings from "@/components/dashboard/settings/PersonSettings";
import TeamSettings from "@/components/dashboard/settings/TeamSettings";
import Link from "next/link";
import Message from "@/components/common/form/Message";
import { isBankEnabled } from "@/lib/bank/provider";
import { listAccounts } from "@/lib/data/accounts";
import { listBankConnections } from "@/lib/data/bank";
import { getBilling } from "@/lib/data/billing";
import { listCategories } from "@/lib/data/categories";
import { listCategoryRules } from "@/lib/data/category-rules";
import { getEmailPreferences } from "@/lib/data/email-notifications";
import { hasPassword, listOwnedCompanies } from "@/lib/data/person";
import { getCompanySettings } from "@/lib/data/settings";
import { formatDate, formatDateTime } from "@/lib/format";
import { localDay } from "@/lib/dates";
import { canManageFinances } from "@/lib/roles";
import { requireOrganization } from "@/lib/session";
import { fill } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import styles from "./page.module.css";

// Browser tab title: "Settings | Finely"
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).m.settings.title };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    handedOver?: string | string[];
    billing?: string | string[];
  }>;
}) {
  // Protects the page and loads the company with its members and invitations
  const { user, organization, role } = await requireOrganization();
  const { handedOver, billing: billingResult } = await searchParams;
  const { locale, m } = await getI18n();
  const t = m.settings;
  const [
    accounts,
    categories,
    rules,
    settings,
    emailPreferences,
    banks,
    billing,
    ownedCompanies,
    passwordSet,
  ] = await Promise.all([
    listAccounts(),
    listCategories(),
    listCategoryRules(),
    getCompanySettings(),
    getEmailPreferences(),
    listBankConnections(),
    getBilling(),
    listOwnedCompanies(),
    hasPassword(),
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
    .map((member) => ({
      id: member.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      isYou: member.userId === user.id,
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
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>
          {fill(t.subtitle, { company: organization.name })}
          {canManageFinances(role) && (
            <>
              {" "}
              <Link href="/dashboard/settings/activity" className={styles.link}>
                {t.activityLink}
              </Link>
            </>
          )}
        </p>
      </div>
      {handedOver && role !== "owner" && (
        <Message type="success">
          {fill(t.handedOver, {
            owner:
              organization.members.find((member) => member.role === "owner")?.user.name ??
              t.someoneElse,
            company: organization.name,
          })}
        </Message>
      )}
      <CompanySettings
        canManage={canManageFinances(role)}
        organization={{ id: organization.id, name: organization.name }}
        timeZone={settings.timeZone}
        currency={settings.currency}
        monthlyBudget={settings.monthlyBudget}
        timeZones={timeZones}
      />
      <TeamSettings
        organization={{ id: organization.id, name: organization.name }}
        role={role}
        members={members}
        invitations={invitations}
        emailEnabled={Boolean(process.env.RESEND_API_KEY)}
      />
      {/* Shown once linking banks is set up, or while a linked bank remains */}
      {(isBankEnabled || banks.length > 0) && (
        <BankConnections
          canManage={canManageFinances(role) && isBankEnabled}
          connections={banks.map((bank) => ({
            id: bank.id,
            institutionName: bank.institutionName,
            accountCount: bank.accountCount,
            lastSynced: bank.lastSyncedAt
              ? formatDateTime(bank.lastSyncedAt, settings.timeZone, locale)
              : null,
            // Saved as a sentence's key (lib/data/bank.ts); older ones as text
            lastError:
              bank.lastError && bank.lastError in m.errors
                ? m.errors[bank.lastError as keyof typeof m.errors]
                : bank.lastError,
          }))}
        />
      )}
      <AccountSettings
        canManage={canManageFinances(role)}
        accounts={accounts}
        currency={settings.currency}
      />
      <CategorySettings
        canManage={canManageFinances(role)}
        categories={categories}
        currency={settings.currency}
      />
      <CategoryRuleSettings
        canManage={canManageFinances(role)}
        rules={rules}
        categories={categories}
      />
      {/* Shown once paying for a plan is set up */}
      {billing.enabled && (
        <BillingSettings
          isOwner={role === "owner"}
          plan={billing.plan}
          memberLimit={billing.memberLimit}
          memberCount={billing.memberCount}
          note={billing.note}
          periodEnd={
            billing.currentPeriodEnd
              ? formatDate(localDay(billing.currentPeriodEnd, settings.timeZone), locale)
              : null
          }
          hasCustomer={billing.hasCustomer}
          justPaid={billingResult === "success"}
        />
      )}
      <EmailSettings
        organizationName={organization.name}
        email={user.email}
        emailVerified={user.emailVerified}
        preferences={emailPreferences}
      />
      {role === "owner" && (
        <OwnerSettings
          organizationName={organization.name}
          members={members.filter((m) => !m.isYou)}
        />
      )}
      {/* About the person, not the company: their data and their account */}
      <PersonSettings
        name={user.name}
        email={user.email}
        hasPassword={passwordSet}
        ownedCompanies={ownedCompanies}
      />
    </main>
  );
}
