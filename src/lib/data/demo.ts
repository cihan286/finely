// ─────────────────────────────────────────────────────────────────────────────
// The demo company ("Try the demo")
//
// In plain words: lets anyone look around Finely without signing up. Each
// visitor who presses "Try the demo" gets their own copy of a pretend
// company, Northpeak Studio, already full of half a year of made-up money
// (lib/finance/demo-data.ts), and is logged in as its owner. Visitors can
// change anything: nobody else sees their copy, and it's deleted, with its
// pretend people, a day later.
//
// A demo can't reach the outside world: it never sends emails (its
// addresses end in @demo.finely.invalid, which can't receive mail), can't
// invite people, link a bank, pay for a plan or change its email address.
//
// For developers: server-only. A demo company is one whose company_settings
// row has demo_expires_at; refuseInDemo() (common.ts) and isDemoEmail()
// (lib/demo.ts) are what the rest of the app checks. Expired demos are deleted when a new one starts
// and by the daily bank-sync job (deleteExpiredDemos()).
// ─────────────────────────────────────────────────────────────────────────────

import { getMessages } from "@/i18n/server";
import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNotNull, like, lt, notExists } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  bill,
  card,
  category,
  categoryRule,
  companySettings,
  financialAccount,
  prefixedId,
  transaction,
} from "@/db/finance";
import { member, organization, session, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isValidTimeZone, todayIn, zonedTime } from "@/lib/dates";
import {
  DEMO_COMPANY_NAME,
  DEMO_OWNER_NAME,
  DEMO_TEAMMATE_NAME,
  generateDemoData,
} from "@/lib/finance/demo-data";
import { DEMO_EMAIL_DOMAIN, DEMO_LIFETIME_HOURS } from "@/lib/demo";
import { clientIp, withinRateLimit } from "@/lib/rate-limit";
import { DataError } from "./common";
import { companyDeletionSteps } from "./company";
import { DEFAULT_CATEGORIES } from "./default-categories";

// At most this many new demos per visitor (IP address) per hour
const DEMOS_PER_HOUR = 5;

const randomId = (bytes = 12) => randomBytes(bytes).toString("base64url");

/**
 * Creates a new demo company full of sample data and logs the visitor in as
 * its owner (sets the login cookie; call from a server action). `timeZone`
 * is the visitor's, so "today" on the dashboard is their today.
 */
export async function startDemo(timeZone: unknown) {
  if (!(await withinRateLimit(`demo:${await clientIp()}`, DEMOS_PER_HOUR, 60 * 60))) {
    throw new DataError("tooManyDemos");
  }
  // Tidy up first, so old demos never pile up
  await deleteExpiredDemos();

  const zone = typeof timeZone === "string" && isValidTimeZone(timeZone) ? timeZone : "UTC";
  const tag = randomId(6).toLowerCase().replace(/[^a-z0-9]/g, "x");
  const ownerEmail = `maya.${tag}@${DEMO_EMAIL_DOMAIN}`;

  // A real login, so everything else works exactly as for anyone else. The
  // password is never shown: the demo can only be opened from this button.
  const { token, user: owner } = await auth.api.signUpEmail({
    body: { name: DEMO_OWNER_NAME, email: ownerEmail, password: randomId(24) },
    headers: await headers(),
  });

  try {
    if (!token) throw new Error("Signing up the demo owner didn't log them in.");
    await fillDemoCompany(owner.id, tag, zone, token);
  } catch (error) {
    // Nothing half-made stays behind (the person's logins go with them)
    await db.delete(user).where(eq(user.id, owner.id));
    throw error;
  }
}

async function fillDemoCompany(
  ownerId: string,
  tag: string,
  timeZone: string,
  sessionToken: string,
) {
  const today = todayIn(timeZone);
  // Its names and notes in the visitor's language
  const { samples } = await getMessages();
  const data = generateDemoData(today, Number.parseInt(tag.slice(0, 6), 36) || 1, samples.demo);
  const now = new Date();
  const organizationId = `org_demo_${tag}`;
  const teammateId = `user_demo_${tag}`;

  const categoryIds = new Map(DEFAULT_CATEGORIES.map((c) => [c.name, prefixedId("cat")()]));
  const accountIds = new Map(data.accounts.map((a) => [a.key, prefixedId("acc")()]));
  const cardIds = new Map(data.cards.map((c) => [c.key, prefixedId("card")()]));
  const categoryId = (name: string | null) => {
    if (name === null) return null;
    const id = categoryIds.get(name);
    if (!id) throw new Error(`The demo data names a category that doesn't exist: ${name}`);
    return id;
  };

  // All or nothing
  await db.batch([
    db.update(user).set({ emailVerified: true }).where(eq(user.id, ownerId)),
    db.insert(user).values({
      id: teammateId,
      name: DEMO_TEAMMATE_NAME,
      email: `jordan.${tag}@${DEMO_EMAIL_DOMAIN}`,
      emailVerified: true,
    }),
    db.insert(organization).values({
      id: organizationId,
      name: DEMO_COMPANY_NAME,
      slug: `northpeak-demo-${tag}`,
      createdAt: now,
    }),
    db.insert(member).values([
      { id: `member_demo_${tag}_owner`, organizationId, userId: ownerId, role: "owner", createdAt: now },
      { id: `member_demo_${tag}_team`, organizationId, userId: teammateId, role: "admin", createdAt: now },
    ]),
    db.insert(companySettings).values({
      organizationId,
      timezone: timeZone,
      monthlyBudget: data.companyBudget,
      demoExpiresAt: new Date(now.getTime() + DEMO_LIFETIME_HOURS * 60 * 60 * 1000),
    }),
    db.insert(category).values(
      DEFAULT_CATEGORIES.map(({ key, ...c }) => ({
        ...c,
        name: samples.categories[key],
        id: categoryIds.get(c.name)!,
        organizationId,
        monthlyBudget: data.budgets[c.name as keyof typeof data.budgets] ?? null,
      })),
    ),
    db.insert(categoryRule).values(
      data.rules.map((r) => ({ organizationId, matchText: r.matchText, categoryId: categoryId(r.category)! })),
    ),
    db.insert(financialAccount).values(
      data.accounts.map((a, i) => ({
        id: accountIds.get(a.key)!,
        organizationId,
        name: a.name,
        type: a.type,
        last4: a.last4,
        openingBalance: a.openingBalance,
        // A second apart, in the listed order: accounts are shown oldest
        // first, so the checking account comes first in every list
        createdAt: new Date(now.getTime() + i * 1000),
      })),
    ),
    db.insert(card).values(
      data.cards.map((c) => ({
        id: cardIds.get(c.key)!,
        organizationId,
        name: c.name,
        last4: c.last4,
        holderId: c.holder === "owner" ? ownerId : teammateId,
        monthlyLimit: c.monthlyLimit,
      })),
    ),
    db.insert(transaction).values(
      data.transactions.map((t) => ({
        organizationId,
        accountId: accountIds.get(t.account)!,
        categoryId: categoryId(t.category),
        cardId: t.card ? cardIds.get(t.card)! : null,
        name: t.name,
        amount: t.amount,
        occurredAt: zonedTime(t.day, "12:00", timeZone),
        status: t.status,
        notes: t.notes,
        // Entered by the owner, or by Jordan for Jordan's card
        createdById: t.card === "jordan" ? teammateId : ownerId,
      })),
    ),
    db.insert(bill).values(
      data.bills.map((b) => ({
        organizationId,
        name: b.name,
        amount: b.amount,
        dueDate: b.dueDate,
        repeat: b.repeat,
        categoryId: categoryId(b.category),
        notes: b.notes,
        createdById: ownerId,
      })),
    ),
    // Open the demo company in the login that was just made
    db.update(session).set({ activeOrganizationId: organizationId }).where(eq(session.token, sessionToken)),
    db.update(user).set({ lastOrganizationId: organizationId }).where(eq(user.id, ownerId)),
  ]);
}

/**
 * Deletes demo companies whose day is over, with their pretend people (and
 * so their logins). A few at a time, so no single request takes long.
 * Answers how many companies went.
 */
export async function deleteExpiredDemos(now = new Date(), limit = 20): Promise<number> {
  const expired = await db
    .select({ id: companySettings.organizationId })
    .from(companySettings)
    .where(and(isNotNull(companySettings.demoExpiresAt), lt(companySettings.demoExpiresAt, now)))
    .limit(limit);

  for (const { id } of expired) {
    const people = await db
      .select({ id: user.id })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.organizationId, id), like(user.email, `%@${DEMO_EMAIL_DOMAIN}`)));
    const steps = [
      ...companyDeletionSteps(id),
      ...(people.length > 0
        ? [db.delete(user).where(inArray(user.id, people.map((p) => p.id)))]
        : []),
    ];
    await db.batch(steps as [(typeof steps)[number], ...typeof steps]);
  }

  // Demo people left without a company (e.g. a demo that failed half-way),
  // once they're a day old
  await db.delete(user).where(
    and(
      like(user.email, `%@${DEMO_EMAIL_DOMAIN}`),
      lt(user.createdAt, new Date(now.getTime() - DEMO_LIFETIME_HOURS * 60 * 60 * 1000)),
      notExists(db.select({ id: member.id }).from(member).where(eq(member.userId, user.id))),
    ),
  );
  return expired.length;
}
