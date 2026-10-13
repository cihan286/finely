// Checks a person's own account against an in-memory database: the copy of
// their data holds what's theirs and nothing secret or of anyone else, and
// deleting the account removes the person but not what companies recorded.

import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, transaction } from "@/db/finance";
import { account, invitation, member, session, user } from "@/db/schema";
import {
  actAs,
  addTestMember,
  createTestCompany,
  setUpTestDb,
  testDb,
} from "./testing";
import { createAccount } from "./accounts";
import { updateEmailPreferences } from "./email-notifications";
import { deleteOwnAccount, exportPersonalData, listOwnedCompanies } from "./person";
import { createTransaction } from "./transactions";

vi.mock("@/db", async () => ({ db: (await import("./testing")).testDb }));
// Emails aren't sent in tests: they're collected here to look at
const sentEmails: { to: string; subject: string }[] = [];
vi.mock("@/lib/email/send", () => ({
  sendEmail: async (email: { to: string; subject: string }) => {
    sentEmails.push(email);
    return true;
  },
}));
vi.mock("@/lib/session", async () => {
  const { currentSession } = await import("./testing");
  return {
    requireOrganization: currentSession,
    requireUser: async () => (await currentSession()).user,
  };
});

beforeAll(setUpTestDb);

// A company, and a second person in it who signs in with a password, is
// logged in once, sent an invitation and entered a transaction
async function seed(name: string) {
  const company = await createTestCompany(name);
  const userId = `user_${name}_pat`;
  const email = `pat@${name}.example`;
  await testDb.insert(user).values({ id: userId, name: "Pat Lee", email });
  await addTestMember(company, userId, "member");
  await testDb.insert(account).values({
    id: `acc_${name}`,
    accountId: userId,
    providerId: "credential",
    userId,
    password: "hash-that-must-never-leave",
    updatedAt: new Date(),
  });
  await testDb.insert(session).values({
    id: `ses_${name}`,
    token: `token-that-must-never-leave-${name}`,
    userId,
    expiresAt: new Date(Date.now() + 86_400_000),
    updatedAt: new Date(),
    ipAddress: "203.0.113.7",
    userAgent: "TestBrowser/1.0",
  });
  await testDb.insert(invitation).values({
    id: `inv_${name}`,
    organizationId: company.organizationId,
    email: "newcomer@example.com",
    role: "member",
    expiresAt: new Date(Date.now() + 86_400_000),
    inviterId: userId,
  });

  actAs(company);
  const accountId = await createAccount({ name: "Checking", type: "checking" });
  const pat = { ...company, userId };
  actAs(pat, "member");
  const transactionId = await createTransaction({
    accountId,
    categoryId: null,
    name: "Stamps",
    amount: -12,
    date: "2026-10-01",
    status: "completed",
  });
  await updateEmailPreferences({ weeklyDigest: false, unusualCharges: true });
  return { company, pat, email, transactionId };
}

describe("download my data", () => {
  it("holds what's the person's own, and nothing secret or of anyone else", async () => {
    const { company, pat, email } = await seed("initech");
    await seed("initrode");

    actAs(pat, "member");
    const data = await exportPersonalData();
    expect(data.profile).toMatchObject({ name: "Pat Lee", email, emailVerified: false });
    expect(data.signInMethods.map((m) => m.method)).toEqual(["credential"]);
    expect(data.logins).toMatchObject([
      { ipAddress: "203.0.113.7", browser: "TestBrowser/1.0" },
    ]);
    expect(data.companies).toMatchObject([
      {
        name: "initech",
        role: "member",
        emails: { weeklyDigest: false, unusualCharges: true },
        notificationsReadAt: null,
      },
    ]);
    expect(data.invitationsSent).toMatchObject([
      { company: "initech", email: "newcomer@example.com", status: "pending" },
    ]);
    // What they did, not what the owner did (adding the bank account)
    expect(data.activity.map((a) => [a.company, a.about, a.what])).toEqual([
      ["initech", "Transactions", "Added the transaction “Stamps” (-$12.00)"],
    ]);

    const file = JSON.stringify(data);
    expect(file).not.toContain("must-never-leave");
    expect(file).not.toContain("initrode");
    expect(file).not.toContain(company.userId);
  });
});

describe("delete my account", () => {
  it("needs the person's own email address, typed", async () => {
    const { pat } = await seed("hooli-xyz");
    actAs(pat, "member");
    for (const wrong of ["", "pat@example.com", "Pat Lee"]) {
      await expect(deleteOwnAccount(wrong)).rejects.toThrow(
        "Type your email address exactly to confirm.",
      );
    }
    expect(await testDb.$count(user, eq(user.id, pat.userId))).toBe(1);
  });

  it("is refused while the person owns a company", async () => {
    const { company } = await seed("pied-piper");
    actAs(company);
    expect(await listOwnedCompanies()).toEqual(["pied-piper"]);
    await expect(deleteOwnAccount("pied-piper@example.com")).rejects.toThrow(
      "You still own pied-piper. Hand it over to someone else or delete it first",
    );
    expect(await testDb.$count(user, eq(user.id, company.userId))).toBe(1);
  });

  it("removes the person and what's theirs, and leaves the company's records", async () => {
    const { company, pat, email, transactionId } = await seed("raviga");
    const other = await seed("breamhall");
    // Another company invited this address
    await testDb.insert(invitation).values({
      id: "inv_to_pat",
      organizationId: other.company.organizationId,
      email: email.toUpperCase(),
      role: "admin",
      expiresAt: new Date(Date.now() + 86_400_000),
      inviterId: other.company.userId,
    });

    actAs(pat, "member");
    expect(await listOwnedCompanies()).toEqual([]);
    sentEmails.length = 0;
    await deleteOwnAccount(`  ${email.toUpperCase()} `);

    // The person, their place in the company, logins, sign-in methods and
    // invitations (sent, and sent to them) are gone
    expect(await testDb.$count(user, eq(user.id, pat.userId))).toBe(0);
    expect(await testDb.$count(member, eq(member.userId, pat.userId))).toBe(0);
    expect(await testDb.$count(session, eq(session.userId, pat.userId))).toBe(0);
    expect(await testDb.$count(account, eq(account.userId, pat.userId))).toBe(0);
    expect(await testDb.$count(invitation, eq(invitation.id, "inv_raviga"))).toBe(0);
    expect(await testDb.$count(invitation, eq(invitation.id, "inv_to_pat"))).toBe(0);
    expect(sentEmails).toMatchObject([
      { to: email, subject: "Your Finely account was deleted" },
    ]);

    // What they entered stays with the company, without their name on it
    const [kept] = await testDb
      .select({ name: transaction.name, createdById: transaction.createdById })
      .from(transaction)
      .where(eq(transaction.id, transactionId));
    expect(kept).toEqual({ name: "Stamps", createdById: null });
    // The company's log says they left, and still says who did what
    const lines = await testDb
      .select({ actorName: auditLog.actorName, actorId: auditLog.actorId, summary: auditLog.summary })
      .from(auditLog)
      .where(eq(auditLog.organizationId, company.organizationId));
    expect(lines).toContainEqual({
      actorName: "Pat Lee",
      actorId: null,
      summary: "Left the company (deleted their Finely account)",
    });

    // Everyone else is untouched
    expect(await testDb.$count(user, eq(user.id, company.userId))).toBe(1);
    expect(await testDb.$count(user, eq(user.id, other.pat.userId))).toBe(1);
    expect(await testDb.$count(member, eq(member.organizationId, other.company.organizationId))).toBe(2);
  });
});
