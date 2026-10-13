// ─────────────────────────────────────────────────────────────────────────────
// The company itself: handing it over, and deleting it
//
// In plain words: two things only a company's owner can do. Handing the
// company over makes another team member the owner (the former owner becomes
// an admin, and can then leave like anyone else). Deleting the company
// removes it for everyone, with all its accounts, transactions, bills,
// categories and rules. That can't be undone, so the owner has to type the
// company's name first. The new owner, and the team of a deleted company,
// get an email about it.
//
// For developers: server-only. Everything else about teams (inviting,
// roles, removing, renaming) goes through Better Auth; these two are done
// here because each must happen completely or not at all (one batch). The
// company and the caller's role come from requireOrganization(), never from
// the browser. Deleting goes table by table rather than relying on the
// database to cascade: transactions block the deletion of their account
// (ON DELETE RESTRICT), so the order matters.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  attachment,
  auditLog,
  bankConnection,
  bill,
  card,
  category,
  categoryRule,
  companySettings,
  financialAccount,
  notificationPreference,
  notificationRead,
  recurringDismissal,
  subscription,
  transaction,
} from "@/db/finance";
import { invitation, member, organization, session, user } from "@/db/schema";
import { afterResponse } from "@/lib/after-response";
import { sendEmail } from "@/lib/email/send";
import {
  companyDeletedEmail,
  ownershipTransferredEmail,
} from "@/lib/email/templates";
import { requireOrganization } from "@/lib/session";
import { recordAudit } from "./audit";
import { cancelSubscriptionFor, updateBillingContact } from "./billing";
import { DataError } from "./common";

// The signed-in person and their company; stops anyone but the owner
async function requireOwner() {
  const context = await requireOrganization();
  if (context.role !== "owner") {
    throw new DataError("Only the company's owner can do this.");
  }
  return context;
}

/**
 * Makes another member the company's owner; the current owner becomes an
 * admin. Owner only.
 */
export async function transferOwnership(memberId: string) {
  const { user: me, organization: company } = await requireOwner();
  if (typeof memberId !== "string" || !memberId) {
    throw new DataError("Choose who to hand the company over to.");
  }

  const [target] = await db
    .select({
      id: member.id,
      userId: member.userId,
      name: user.name,
      email: user.email,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.id, memberId), eq(member.organizationId, company.id)));
  if (!target) throw new DataError("That person isn't in this company.");
  if (target.userId === me.id) throw new DataError("You already own this company.");

  // Both or neither: a company never ends up with two owners or none
  await db.batch([
    db
      .update(member)
      .set({ role: "owner" })
      .where(and(eq(member.id, target.id), eq(member.organizationId, company.id))),
    db
      .update(member)
      .set({ role: "admin" })
      .where(and(eq(member.userId, me.id), eq(member.organizationId, company.id))),
  ]);
  await recordAudit(
    { organizationId: company.id, userId: me.id, userName: me.name },
    {
      area: "team",
      action: "ownership-transferred",
      entityId: target.id,
      summary: `Handed the company over to ${target.name} and became an admin`,
    },
  );
  // Neither of these throws: the handover stands whatever happens to them
  await afterResponse(async () => {
    // Receipts and payment notices go to the new owner from now on
    await updateBillingContact(company.id, target.email);
    await sendEmail(ownershipTransferredEmail(target, company.name, me.name));
  });
}

/**
 * Deletes the company and everything in it, for everyone. Owner only, and
 * only when `confirmation` is the company's name. Can't be undone.
 */
export async function deleteCompany(confirmation: string) {
  const { user: me, organization: company } = await requireOwner();
  if (typeof confirmation !== "string" || confirmation.trim() !== company.name.trim()) {
    throw new DataError("Type the company's name exactly to confirm.");
  }

  const id = company.id;
  // Everyone else on the team, to tell them afterwards
  const team = await db
    .select({ name: user.name, email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, id), ne(member.userId, me.id)));
  // First, so nobody keeps paying for a company that no longer exists; if
  // Stripe can't be told, the company stays
  await cancelSubscriptionFor(id);
  await db.batch([
    // Files and bills point at their transaction, and transactions at their
    // account and category, so: files, bills, transactions, then what those
    // belonged to
    db.delete(attachment).where(eq(attachment.organizationId, id)),
    db.delete(bill).where(eq(bill.organizationId, id)),
    db.delete(transaction).where(eq(transaction.organizationId, id)),
    db.delete(card).where(eq(card.organizationId, id)),
    db.delete(categoryRule).where(eq(categoryRule.organizationId, id)),
    db.delete(category).where(eq(category.organizationId, id)),
    db.delete(financialAccount).where(eq(financialAccount.organizationId, id)),
    db.delete(bankConnection).where(eq(bankConnection.organizationId, id)),
    db.delete(auditLog).where(eq(auditLog.organizationId, id)),
    db.delete(subscription).where(eq(subscription.organizationId, id)),
    db.delete(companySettings).where(eq(companySettings.organizationId, id)),
    db.delete(notificationRead).where(eq(notificationRead.organizationId, id)),
    db.delete(recurringDismissal).where(eq(recurringDismissal.organizationId, id)),
    db
      .delete(notificationPreference)
      .where(eq(notificationPreference.organizationId, id)),
    db.delete(invitation).where(eq(invitation.organizationId, id)),
    db.delete(member).where(eq(member.organizationId, id)),
    // Logins working in it, and people who last used it, open another
    // company next time (or set one up)
    db
      .update(session)
      .set({ activeOrganizationId: null })
      .where(eq(session.activeOrganizationId, id)),
    db
      .update(user)
      .set({ lastOrganizationId: null })
      .where(eq(user.lastOrganizationId, id)),
    db.delete(organization).where(eq(organization.id, id)),
  ]);
  // sendEmail() never throws
  await afterResponse(async () => {
    for (const person of team) {
      await sendEmail(companyDeletedEmail(person, company.name, me.name));
    }
  });
}
