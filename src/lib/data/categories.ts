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
  const { organizationId } = await getFinanceContext({ manage: true });
  try {
    const [row] = await db
      .insert(category)
      .values({ ...parseCategoryInput(input), organizationId })
      .returning({ id: category.id });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError(DUPLICATE_NAME);
    throw error;
  }
}

/** Changes a category (owners and admins only). */
export async function updateCategory(id: string, input: CategoryInput) {
  const { organizationId } = await getFinanceContext({ manage: true });
  try {
    const updated = await db
      .update(category)
      .set(parseCategoryInput(input))
      .where(
        and(eq(category.id, id), eq(category.organizationId, organizationId)),
      )
      .returning({ id: category.id });
    if (updated.length === 0) throw new DataError("Category not found.");
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
  const { organizationId } = await getFinanceContext({ manage: true });
  const deleted = await db
    .delete(category)
    .where(and(eq(category.id, id), eq(category.organizationId, organizationId)))
    .returning({ id: category.id });
  if (deleted.length === 0) throw new DataError("Category not found.");
}
