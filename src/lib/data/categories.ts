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
import { describeChanges } from "@/lib/finance/audit";
import { formatCurrency } from "@/lib/format";
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
function parseCategoryInput(input: CategoryInput) {
  if (typeof input.color !== "string" || !/^#[0-9a-f]{6}$/i.test(input.color)) {
    throw new DataError("Color is invalid.");
  }
  const kind = oneOf(input.kind, CATEGORY_KINDS, "Category type");
  const budget =
    input.budget === null || input.budget === undefined
      ? null
      : money(input.budget, "Monthly budget");
  if (budget !== null && budget <= 0) {
    throw new DataError("Monthly budget must be more than zero. Leave it empty for no budget.");
  }
  if (budget !== null && kind !== "expense") {
    throw new DataError("Only “Money out” categories can have a budget.");
  }
  return {
    name: requiredText(input.name, "Name", 60),
    kind,
    color: input.color.toLowerCase(),
    iconKey: oneOf(input.iconKey, CATEGORY_ICON_KEYS, "Icon"),
    monthlyBudget: budget,
  };
}

const DUPLICATE_NAME = "There is already a category with this name.";

/** Adds a category (owners and admins only) and returns its ID. */
export async function createCategory(input: CategoryInput): Promise<string> {
  const actor = await getFinanceContext({ manage: true });
  const { organizationId } = actor;
  try {
    const [row] = await db
      .insert(category)
      .values({ ...parseCategoryInput(input), organizationId })
      .returning({
        id: category.id,
        name: category.name,
        budget: category.monthlyBudget,
      });
    await recordAudit(actor, {
      area: "category",
      action: "created",
      entityId: row.id,
      summary: `Added the category “${row.name}”${row.budget === null ? "" : ` with a budget of ${formatCurrency(row.budget)} a month`}`,
    });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError(DUPLICATE_NAME);
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
      .set(parseCategoryInput(input))
      .where(own)
      .returning(categoryColumns);
    if (updated.length === 0) throw new DataError("Category not found.");
    const [after] = updated;
    const kinds = { income: "Money in", expense: "Money out" } as Record<string, string>;
    const budget = (amount: number | null) =>
      amount === null ? null : `${formatCurrency(amount)} a month`;
    const changes = describeChanges([
      { label: "name", before: before?.name ?? null, after: after.name },
      { label: "type", before: kinds[before?.kind ?? ""] ?? null, after: kinds[after.kind] },
      { label: "budget", before: budget(before?.budget ?? null), after: budget(after.budget) },
    ]);
    await recordAudit(actor, {
      area: "category",
      action: "updated",
      entityId: id,
      summary: `Changed the category “${after.name}”${changes ? `: ${changes}` : " (color or icon)"}`,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError(DUPLICATE_NAME);
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
      summary: `Deleted the category “${deleted[0].name}”`,
    });
  }
  if (deleted.length === 0) throw new DataError("Category not found.");
}
