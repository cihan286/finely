// ─────────────────────────────────────────────────────────────────────────────
// Email notifications: preferences, the alert and the weekly summary
//
// In plain words: remembers which emails each person wants about a company,
// emails the team right away when a charge that was just saved is unusually
// high, and once a week emails each company's team a summary of the week.
// Only people who verified their email address get these emails.
//
// For developers: server-only. The preference functions find the person and
// company via getFinanceContext(). The alert and the summary don't: they run
// after a response or from the weekly job, where there's no login, so they
// take the company's ID from their caller (never from the browser) and
// always filter by it. Neither ever throws into a request: a failed email
// must not undo a saved transaction.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  bill,
  category,
  companySettings,
  financialAccount,
  notificationPreference,
  transaction,
} from "@/db/finance";
import { member, organization, user } from "@/db/schema";
import { localDay, startOfDay, todayIn } from "@/lib/dates";
import { sendEmail } from "@/lib/email/send";
import { unusualChargeEmail, weeklyDigestEmail } from "@/lib/email/templates";
import { summarizeBills } from "@/lib/finance/bills";
import {
  DEFAULT_EMAIL_PREFERENCES,
  DIGEST_DAYS,
  digestHasNews,
  digestRange,
  MAX_CHARGES_PER_ALERT,
  type Digest,
} from "@/lib/finance/digest";
import { findUnusualCharges, insightRange } from "@/lib/finance/insights";
import type { EmailPreferences, ISODate } from "@/types/finance";
import { selectBudgetSpending } from "./budgets";
import { DataError, getFinanceContext } from "./common";

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

/** Which emails the signed-in person gets about the current company */
export async function getEmailPreferences(): Promise<EmailPreferences> {
  const { organizationId, userId } = await getFinanceContext();
  const [row] = await db
    .select({
      weeklyDigest: notificationPreference.weeklyDigest,
      unusualCharges: notificationPreference.unusualCharges,
    })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.userId, userId),
        eq(notificationPreference.organizationId, organizationId),
      ),
    );
  return row ?? DEFAULT_EMAIL_PREFERENCES;
}

/** Saves which emails the signed-in person gets about the current company. */
export async function updateEmailPreferences(preferences: EmailPreferences) {
  const { organizationId, userId } = await getFinanceContext();
  if (
    typeof preferences?.weeklyDigest !== "boolean" ||
    typeof preferences?.unusualCharges !== "boolean"
  ) {
    throw new DataError("Choose which emails you want.");
  }
  const values = {
    weeklyDigest: preferences.weeklyDigest,
    unusualCharges: preferences.unusualCharges,
  };
  await db
    .insert(notificationPreference)
    .values({ userId, organizationId, ...values })
    .onConflictDoUpdate({
      target: [notificationPreference.userId, notificationPreference.organizationId],
      set: { ...values, updatedAt: new Date() },
    });
}

// The people in a company who want one kind of email and can get it (a
// verified address). People who never chose get the default.
async function selectRecipients(
  organizationId: string,
  kind: keyof EmailPreferences,
): Promise<{ name: string; email: string }[]> {
  const rows = await db
    .select({
      name: user.name,
      email: user.email,
      wanted: notificationPreference[kind],
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .leftJoin(
      notificationPreference,
      and(
        eq(notificationPreference.userId, member.userId),
        eq(notificationPreference.organizationId, member.organizationId),
      ),
    )
    .where(and(eq(member.organizationId, organizationId), eq(user.emailVerified, true)));
  return rows
    .filter((row) => row.wanted ?? DEFAULT_EMAIL_PREFERENCES[kind])
    .map(({ name, email }) => ({ name, email }));
}

// A company's completed expenses since the history for unusual charges
// begins, as findUnusualCharges() wants them
async function selectExpenses(organizationId: string, timeZone: string, today: ISODate) {
  const { historyStart } = insightRange(today, 3);
  const rows = await db
    .select({
      id: transaction.id,
      name: transaction.name,
      amount: transaction.amount,
      occurredAt: transaction.occurredAt,
    })
    .from(transaction)
    .where(
      and(
        eq(transaction.organizationId, organizationId),
        eq(transaction.status, "completed"),
        lt(transaction.amount, 0),
        gte(transaction.occurredAt, startOfDay(historyStart, timeZone)),
      ),
    );
  return rows.map(({ occurredAt, ...row }) => ({
    ...row,
    day: localDay(occurredAt, timeZone),
  }));
}

/* ------------------------------------------------------------------ */
/* The alert for unusual charges                                       */
/* ------------------------------------------------------------------ */

/**
 * Emails the team if any of these transactions (just added to this company)
 * is an unusually high charge. Returns how many emails were sent. Never
 * throws.
 */
export async function alertUnusualCharges(
  organizationId: string,
  timeZone: string,
  transactionIds: string[],
): Promise<number> {
  try {
    if (transactionIds.length === 0) return 0;
    const today = todayIn(timeZone);
    const added = new Set(transactionIds);
    const charges = findUnusualCharges(
      await selectExpenses(organizationId, timeZone, today),
      today,
      Infinity,
    )
      .filter((charge) => added.has(charge.id))
      .slice(0, MAX_CHARGES_PER_ALERT);
    if (charges.length === 0) return 0;

    const [[company], recipients] = await Promise.all([
      db
        .select({ name: organization.name })
        .from(organization)
        .where(eq(organization.id, organizationId)),
      selectRecipients(organizationId, "unusualCharges"),
    ]);
    if (!company) return 0;

    let sent = 0;
    for (const recipient of recipients) {
      if (await sendEmail(unusualChargeEmail(recipient, company.name, charges))) sent++;
    }
    return sent;
  } catch (error) {
    console.error("[alerts] Could not check for unusual charges:", error);
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* The weekly summary                                                  */
/* ------------------------------------------------------------------ */

/** What one company's summary says, for the seven days before `today` */
export async function loadDigest(
  organizationId: string,
  organizationName: string,
  timeZone: string,
  today: ISODate,
): Promise<Digest> {
  const { from, to } = digestRange(today);
  const inWeek = and(
    eq(transaction.organizationId, organizationId),
    eq(transaction.status, "completed"),
    gte(transaction.occurredAt, startOfDay(from, timeZone)),
    lt(transaction.occurredAt, startOfDay(today, timeZone)),
  );

  const [[week], topCategories, accounts, bills, budgets, expenses] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        moneyIn: sql<number>`coalesce(sum(${transaction.amount}) filter (where ${transaction.amount} > 0), 0)`.mapWith(Number),
        moneyOut: sql<number>`coalesce(-sum(${transaction.amount}) filter (where ${transaction.amount} < 0), 0)`.mapWith(Number),
      })
      .from(transaction)
      .where(inWeek),
    db
      .select({
        name: category.name,
        amount: sql<number>`-sum(${transaction.amount})`.mapWith(Number),
      })
      .from(transaction)
      .leftJoin(category, eq(transaction.categoryId, category.id))
      .where(and(inWeek, lt(transaction.amount, 0)))
      .groupBy(transaction.categoryId, category.name)
      .orderBy(desc(sql`-sum(${transaction.amount})`))
      .limit(3),
    // Each account's balance: where it started plus its completed payments
    db
      .select({
        openingBalance: financialAccount.openingBalance,
        completedTotal: sql<number>`coalesce(sum(${transaction.amount}), 0)`.mapWith(Number),
      })
      .from(financialAccount)
      .leftJoin(
        transaction,
        and(
          eq(transaction.accountId, financialAccount.id),
          eq(transaction.status, "completed"),
        ),
      )
      .where(eq(financialAccount.organizationId, organizationId))
      .groupBy(financialAccount.id),
    db
      .select({ amount: bill.amount, dueDate: bill.dueDate })
      .from(bill)
      .where(and(eq(bill.organizationId, organizationId), isNull(bill.paidAt))),
    selectBudgetSpending(organizationId, timeZone, today),
    selectExpenses(organizationId, timeZone, today),
  ]);

  const billSummary = summarizeBills(bills, today);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    organizationName,
    from,
    to,
    transactionCount: week.count,
    moneyIn: round2(week.moneyIn),
    moneyOut: round2(week.moneyOut),
    balance: round2(
      accounts.reduce((sum, a) => sum + a.openingBalance + a.completedTotal, 0),
    ),
    topCategories: topCategories.map((c) => ({
      name: c.name ?? "Uncategorized",
      amount: round2(c.amount),
    })),
    overdueBills: billSummary.overdue,
    billsDueSoon: billSummary.dueSoon,
    overBudget: budgets
      .filter((b) => b.spent > b.budget)
      .map((b) => ({ name: b.name, spent: round2(b.spent), budget: b.budget })),
    unusualCharges: findUnusualCharges(expenses, today, Infinity).filter(
      (charge) => charge.day >= from,
    ),
  };
}

/**
 * Emails every company's team its weekly summary. A company gets none if
 * nothing happened and nothing is due, if nobody wants it, or if it already
 * got one in the last six days (so running this twice doesn't send twice).
 * Returns how many companies and emails it came to.
 */
export async function sendWeeklyDigests(
  now = new Date(),
): Promise<{ companies: number; emails: number }> {
  const companies = await db
    .select({
      id: organization.id,
      name: organization.name,
      timeZone: companySettings.timezone,
    })
    .from(organization)
    .leftJoin(companySettings, eq(companySettings.organizationId, organization.id));

  // Already sent since then: not again
  const recently = new Date(now.getTime() - (DIGEST_DAYS - 1) * 86_400_000);
  const result = { companies: 0, emails: 0 };

  for (const company of companies) {
    // One company's problem mustn't stop the others' emails
    try {
      const timeZone = company.timeZone ?? "UTC";
      const digest = await loadDigest(
        company.id,
        company.name,
        timeZone,
        todayIn(timeZone, now),
      );
      if (!digestHasNews(digest)) continue;
      const recipients = await selectRecipients(company.id, "weeklyDigest");
      if (recipients.length === 0) continue;

      // Mark it as sent first, and only go on if that worked: two runs at
      // the same time can't both send
      const claimed = await db
        .insert(companySettings)
        .values({ organizationId: company.id, lastDigestAt: now })
        .onConflictDoUpdate({
          target: companySettings.organizationId,
          set: { lastDigestAt: now },
          setWhere: or(
            isNull(companySettings.lastDigestAt),
            lt(companySettings.lastDigestAt, recently),
          ),
        })
        .returning({ id: companySettings.organizationId });
      if (claimed.length === 0) continue;

      result.companies++;
      for (const recipient of recipients) {
        if (await sendEmail(weeklyDigestEmail(recipient, digest))) result.emails++;
      }
    } catch (error) {
      console.error(`[digest] Could not send the weekly summary of ${company.id}:`, error);
    }
  }
  return result;
}
