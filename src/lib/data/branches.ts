// ─────────────────────────────────────────────────────────────────────────────
// Branches: reading and saving
//
// In plain words: the places a company works from: its head office, a
// shop, a factory. Each has a name, an optional short code ("IST") and an
// address. One of them can be the head office; marking another one moves
// it there. Everyone on the team can see them; owners and admins can add,
// change and remove them. Later, warehouses and cost centers will belong to
// a branch.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { branch } from "@/db/finance";
import { recordAudit } from "./audit";
import {
  DataError,
  getFinanceContext,
  isUniqueViolation,
  optionalText,
  requiredText,
} from "./common";

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  isHeadOffice: boolean;
}

/** What a person fills in when adding or editing a branch */
export interface BranchInput {
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  isHeadOffice?: boolean;
}

const columns = {
  id: branch.id,
  name: branch.name,
  code: branch.code,
  address: branch.address,
  city: branch.city,
  phone: branch.phone,
  isHeadOffice: branch.isHeadOffice,
};

/** The company's branches: the head office first, then by name */
export async function listBranches(): Promise<Branch[]> {
  const { organizationId } = await getFinanceContext();
  return db
    .select(columns)
    .from(branch)
    .where(eq(branch.organizationId, organizationId))
    .orderBy(desc(branch.isHeadOffice), asc(branch.name));
}

function parseBranchInput(input: BranchInput) {
  const code = optionalText(input.code, "code", 10);
  if (code !== null && !/^[\p{L}\p{N}-]+$/u.test(code)) {
    throw new DataError("branchCode");
  }
  return {
    name: requiredText(input.name, "name", 120),
    code: code?.toUpperCase() ?? null,
    address: optionalText(input.address, "address", 500),
    city: optionalText(input.city, "city", 100),
    phone: optionalText(input.phone, "phone", 40),
    isHeadOffice: input.isHeadOffice === true,
  };
}

// Becoming the head office takes it away from the one that was
const otherHeadOffices = (organizationId: string, except: string | null) =>
  db
    .update(branch)
    .set({ isHeadOffice: false, updatedAt: new Date() })
    .where(
      and(
        eq(branch.organizationId, organizationId),
        eq(branch.isHeadOffice, true),
        ...(except ? [ne(branch.id, except)] : []),
      ),
    );

/** Adds a branch (owners and admins only) and returns its ID */
export async function createBranch(input: BranchInput): Promise<string> {
  const actor = await getFinanceContext({ need: "company.update" });
  const { organizationId } = actor;
  const values = parseBranchInput(input);
  try {
    const insert = db
      .insert(branch)
      .values({ ...values, organizationId })
      .returning({ id: branch.id, name: branch.name });
    const [row] = values.isHeadOffice
      ? (await db.batch([otherHeadOffices(organizationId, null), insert]))[1]
      : await insert;
    await recordAudit(actor, {
      area: "settings",
      action: "created",
      entityId: row.id,
      key: "branchAdded",
      values: { name: row.name },
    });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError("duplicateBranch");
    throw error;
  }
}

/** Changes a branch (owners and admins only) */
export async function updateBranch(id: string, input: BranchInput) {
  const actor = await getFinanceContext({ need: "company.update" });
  const { organizationId } = actor;
  const values = parseBranchInput(input);
  const update = db
    .update(branch)
    .set(values)
    .where(and(eq(branch.id, id), eq(branch.organizationId, organizationId)))
    .returning({ id: branch.id, name: branch.name });
  try {
    const updated = values.isHeadOffice
      ? (await db.batch([otherHeadOffices(organizationId, id), update]))[1]
      : await update;
    if (updated.length === 0) throw new DataError("branchNotFound");
    await recordAudit(actor, {
      area: "settings",
      action: "updated",
      entityId: id,
      key: "branchChanged",
      values: { name: updated[0].name },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError("duplicateBranch");
    throw error;
  }
}

/** Makes a branch the head office instead of the one that was (owners and admins only) */
export async function setHeadOffice(id: string) {
  const actor = await getFinanceContext({ need: "company.update" });
  const { organizationId } = actor;
  const [, updated] = await db.batch([
    otherHeadOffices(organizationId, id),
    db
      .update(branch)
      .set({ isHeadOffice: true, updatedAt: new Date() })
      .where(and(eq(branch.id, id), eq(branch.organizationId, organizationId)))
      .returning({ name: branch.name }),
  ]);
  if (updated.length === 0) throw new DataError("branchNotFound");
  await recordAudit(actor, {
    area: "settings",
    action: "updated",
    entityId: id,
    key: "branchChanged",
    values: { name: updated[0].name },
  });
}

/** Removes a branch (owners and admins only) */
export async function deleteBranch(id: string) {
  const actor = await getFinanceContext({ need: "company.update" });
  const deleted = await db
    .delete(branch)
    .where(and(eq(branch.id, id), eq(branch.organizationId, actor.organizationId)))
    .returning({ name: branch.name });
  if (deleted.length === 0) throw new DataError("branchNotFound");
  await recordAudit(actor, {
    area: "settings",
    action: "deleted",
    entityId: id,
    key: "branchRemoved",
    values: { name: deleted[0].name },
  });
}
