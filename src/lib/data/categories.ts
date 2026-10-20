// ─────────────────────────────────────────────────────────────────────────────
// Categories: reading and saving
//
// In plain words: lists the company's categories (Payroll, Sales, …) and lets
// owners and admins add, change or remove them. Removing a category doesn't
// remove its transactions; they simply become "Uncategorized".
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/finance";
import {
  CATEGORY_ICON_KEYS,
  CATEGORY_KINDS,
  type Category,
} from "@/types/finance";
import { hasChanges, type AuditChange } from "@/lib/finance/audit";
import { recordAudit } from "./audit";
import {
  DataError,
  getFinanceContext,
  isUniqueViolation,
  money,
  oneOf,
  requiredText,
} from "./common";

/**
 * What a person fills in when adding or editing a category. Leaving out the
 * budget (or null) means no budget.
 */
export type CategoryInput = Omit<Category, "id" | "budget"> & {
  budget?: number | null;
};

// The columns that make up a Category
const categoryColumns = {
  id: category.id,
  name: category.name,
  kind: category.kind,
  color: category.color,
  iconKey: category.iconKey,
  budget: category.monthlyBudget,
};

/** The company's categories: income first, then expenses, A to Z */
export async function listCategories(): Promise<Category[]> {
  const { organizationId } = await getFinanceContext();
  const rows = await db
    .select(categoryColumns)
    .from(category)
    .where(eq(category.organizationId, organizationId))
    .orderBy(asc(category.kind), asc(category.name));
  return rows as Category[];
}

// Checks and tidies what was typed into the category form
function parseCategoryInput(input: CategoryInput, currency: string) {
  if (typeof input.color !== "string" || !/^#[0-9a-f]{6}$/i.test(input.color)) {
    throw new DataError("colorInvalid");
  }
  const kind = oneOf(input.kind, CATEGORY_KINDS, "categoryType");
  const budget =
    input.budget === null || input.budget === undefined
      ? null
      : money(input.budget, "monthlyBudget", currency);
  if (budget !== null && budget <= 0) {
    throw new DataError("budgetAboveZero");
  }
  if (budget !== null && kind !== "expense") {
    throw new DataError("budgetMoneyOutOnly");
  }
  return {
    name: requiredText(input.name, "name", 60),
    kind,
    color: input.color.toLowerCase(),
    iconKey: oneOf(input.iconKey, CATEGORY_ICON_KEYS, "icon"),
    monthlyBudget: budget,
  };
}

/** Adds a category (owners and admins only) and returns its ID. */
export async function createCategory(input: CategoryInput): Promise<string> {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  try {
    const [row] = await db
      .insert(category)
      .values({ ...parseCategoryInput(input, actor.currency), organizationId })
      .returning({
        id: category.id,
        name: category.name,
        budget: category.monthlyBudget,
      });
    await recordAudit(actor, {
      area: "category",
      action: "created",
      entityId: row.id,
      ...(row.budget === null
        ? { key: "categoryAdded" as const, values: { name: row.name } }
        : {
            key: "categoryAddedBudget" as const,
            values: { name: row.name, budget: { perMonth: row.budget, currency: actor.currency } },
          }),
    });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError("duplicateCategory");
    throw error;
  }
}

/** Changes a category (owners and admins only). */
export async function updateCategory(id: string, input: CategoryInput) {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  const own = and(eq(category.id, id), eq(category.organizationId, organizationId));
  try {
    // What it was, to say what changed
    const [before] = await db.select(categoryColumns).from(category).where(own);
    const updated = await db
      .update(category)
      .set(parseCategoryInput(input, actor.currency))
      .where(own)
      .returning(categoryColumns);
    if (updated.length === 0) throw new DataError("categoryNotFound");
    const [after] = updated;
    const budget = (amount: number | null) =>
      amount === null ? null : { perMonth: amount, currency: actor.currency };
    const changes: AuditChange[] = [
      { field: "name", before: before?.name ?? null, after: after.name },
      {
        field: "type",
        before: before ? { kind: before.kind } : null,
        after: { kind: after.kind },
      },
      { field: "budget", before: budget(before?.budget ?? null), after: budget(after.budget) },
    ];
    await recordAudit(actor, {
      area: "category",
      action: "updated",
      entityId: id,
      // Nothing listed changed: it was the color or the icon
      ...(hasChanges(changes)
        ? { key: "categoryChanged" as const, values: { name: after.name, changes: { changes } } }
        : { key: "categoryRestyled" as const, values: { name: after.name } }),
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError("duplicateCategory");
    throw error;
  }
}

/**
 * Removes a category (owners and admins only). Its transactions stay and
 * become uncategorized.
 */
export async function deleteCategory(id: string) {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  const deleted = await db
    .delete(category)
    .where(and(eq(category.id, id), eq(category.organizationId, organizationId)))
    .returning({ id: category.id, name: category.name });
  if (deleted.length > 0) {
    await recordAudit(actor, {
      area: "category",
      action: "deleted",
      entityId: id,
      key: "categoryDeleted",
      values: { name: deleted[0].name },
    });
  }
  if (deleted.length === 0) throw new DataError("categoryNotFound");
}
