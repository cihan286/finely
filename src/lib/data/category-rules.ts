// ─────────────────────────────────────────────────────────────────────────────
// Category rules: reading and saving
//
// In plain words: lists the company's rules ("descriptions containing AWS
// are Software & IT") and lets owners, admins and accountants add, change or remove them,
// and apply a rule to the transactions that have no category yet. Removing
// a rule doesn't touch transactions that already got its category.
//
// For developers: server-only. Every function finds the company itself via
// getFinanceContext(); callers never pass an organization ID. Which rule
// applies to a description is decided in lib/finance/category-rules.ts.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { category, categoryRule, transaction } from "@/db/finance";
import {
  categoryFromRules,
  MAX_RULE_TEXT_LENGTH,
  MIN_RULE_TEXT_LENGTH,
} from "@/lib/finance/category-rules";
import type { CategoryRule } from "@/types/finance";
import { recordAudit } from "./audit";
import {
  DataError,
  escapeLike,
  getFinanceContext,
  isUniqueViolation,
  requiredText,
} from "./common";

/** What a person fills in when adding or editing a rule */
export type CategoryRuleInput = Omit<CategoryRule, "id">;

// The columns that make up a CategoryRule
const ruleColumns = {
  id: categoryRule.id,
  matchText: categoryRule.matchText,
  categoryId: categoryRule.categoryId,
};

/**
 * One company's rules, oldest first (between rules with equally long texts,
 * the older one wins). Only for other data functions, with the company from
 * getFinanceContext(); pages use listCategoryRules().
 */
export function selectRules(organizationId: string) {
  return db
    .select(ruleColumns)
    .from(categoryRule)
    .where(eq(categoryRule.organizationId, organizationId))
    .orderBy(asc(categoryRule.createdAt), asc(categoryRule.id));
}

/** The company's rules, oldest first */
export async function listCategoryRules(): Promise<CategoryRule[]> {
  const { organizationId } = await getFinanceContext();
  return selectRules(organizationId);
}

// Checks and tidies what was typed into the rule form, including that the
// chosen category belongs to this company
async function parseRuleInput(input: CategoryRuleInput, organizationId: string) {
  // Runs of spaces collapsed, as bank descriptions are when imported
  const matchText = requiredText(input.matchText, "text", MAX_RULE_TEXT_LENGTH)
    .replace(/\s+/g, " ");
  if (matchText.length < MIN_RULE_TEXT_LENGTH) {
    throw new DataError("ruleTextTooShort", { min: MIN_RULE_TEXT_LENGTH });
  }

  const categoryId = requiredText(input.categoryId, "category");
  const categoryMatches = await db.$count(
    category,
    and(eq(category.id, categoryId), eq(category.organizationId, organizationId)),
  );
  if (categoryMatches === 0) throw new DataError("categoryNotFound");

  return { matchText, categoryId };
}

/** Adds a rule (owners, admins and accountants only) and returns its ID. */
export async function createCategoryRule(
  input: CategoryRuleInput,
): Promise<string> {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const values = await parseRuleInput(input, organizationId);
  try {
    const [row] = await db
      .insert(categoryRule)
      .values({ ...values, organizationId })
      .returning({ id: categoryRule.id });
    await recordAudit(actor, {
      area: "rule",
      action: "created",
      entityId: row.id,
      key: "ruleAdded",
      values: { text: values.matchText },
    });
    return row.id;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError("duplicateRule");
    throw error;
  }
}

/** Changes a rule's text or category (owners, admins and accountants only). */
export async function updateCategoryRule(id: string, input: CategoryRuleInput) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const values = await parseRuleInput(input, organizationId);
  try {
    const updated = await db
      .update(categoryRule)
      .set(values)
      .where(
        and(
          eq(categoryRule.id, id),
          eq(categoryRule.organizationId, organizationId),
        ),
      )
      .returning({ id: categoryRule.id });
    if (updated.length === 0) throw new DataError("ruleNotFound");
    await recordAudit(actor, {
      area: "rule",
      action: "updated",
      entityId: id,
      key: "ruleChanged",
      values: { text: values.matchText },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DataError("duplicateRule");
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Applying rules to transactions that are already there               */
/* ------------------------------------------------------------------ */

// Gives the company's uncategorized transactions whose description contains
// `matchText` the category the rules say (the longest fitting text wins, as
// for new transactions). Returns how many were categorized.
async function categorizeMatching(
  organizationId: string,
  matchText: string,
): Promise<number> {
  const [rules, candidates] = await Promise.all([
    selectRules(organizationId),
    db
      .select({ id: transaction.id, name: transaction.name })
      .from(transaction)
      .where(
        and(
          eq(transaction.organizationId, organizationId),
          isNull(transaction.categoryId),
          // Runs of spaces collapsed, as the rules compare descriptions
          sql`regexp_replace(${transaction.name}, '\\s+', ' ', 'g') ilike ${`%${escapeLike(matchText)}%`}`,
        ),
      ),
  ]);

  const idsByCategory = new Map<string, string[]>();
  for (const candidate of candidates) {
    const categoryId = categoryFromRules(candidate.name, rules);
    if (!categoryId) continue;
    idsByCategory.set(categoryId, [
      ...(idsByCategory.get(categoryId) ?? []),
      candidate.id,
    ]);
  }

  // In chunks, sent together so the database saves all of them or none
  const updates = [];
  let categorized = 0;
  for (const [categoryId, ids] of idsByCategory) {
    categorized += ids.length;
    for (let i = 0; i < ids.length; i += 500) {
      updates.push(
        db
          .update(transaction)
          .set({ categoryId })
          .where(
            and(
              eq(transaction.organizationId, organizationId),
              isNull(transaction.categoryId),
              inArray(transaction.id, ids.slice(i, i + 500)),
            ),
          ),
      );
    }
  }
  if (updates.length > 0) {
    await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  }
  return categorized;
}

/**
 * Applies a rule to the transactions that have no category yet (owners and
 * admins only) and returns how many it categorized. Transactions that
 * already have a category are never changed.
 */
export async function applyCategoryRule(id: string): Promise<number> {
  const { organizationId } = await getFinanceContext({ need: "finance.manage" });
  const [rule] = await db
    .select({ matchText: categoryRule.matchText })
    .from(categoryRule)
    .where(
      and(eq(categoryRule.id, id), eq(categoryRule.organizationId, organizationId)),
    );
  if (!rule) throw new DataError("ruleNotFound");
  return categorizeMatching(organizationId, rule.matchText);
}

/**
 * "Always categorize descriptions containing this text like this" (owners,
 * admins and accountants only): adds the rule, or changes the category of the rule that
 * text already has, and applies it to the transactions that have no category
 * yet. Returns how many of those it categorized.
 */
export async function saveCategoryRule(
  input: CategoryRuleInput,
): Promise<{ categorized: number }> {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const values = await parseRuleInput(input, organizationId);

  const [existing] = await db
    .select({ id: categoryRule.id })
    .from(categoryRule)
    .where(
      and(
        eq(categoryRule.organizationId, organizationId),
        sql`lower(${categoryRule.matchText}) = lower(${values.matchText})`,
      ),
    );
  if (existing) {
    await db
      .update(categoryRule)
      .set({ categoryId: values.categoryId })
      .where(eq(categoryRule.id, existing.id));
  } else {
    await db.insert(categoryRule).values({ ...values, organizationId });
  }
  await recordAudit(actor, {
    area: "rule",
    action: existing ? "updated" : "created",
    entityId: existing?.id,
    key: existing ? "ruleChanged" : "ruleAdded",
    values: { text: values.matchText },
  });
  return { categorized: await categorizeMatching(organizationId, values.matchText) };
}

/**
 * Removes a rule (owners, admins and accountants only). Transactions it categorized keep
 * their category.
 */
export async function deleteCategoryRule(id: string) {
  const actor = await getFinanceContext({ need: "finance.manage" });
  const { organizationId } = actor;
  const deleted = await db
    .delete(categoryRule)
    .where(
      and(
        eq(categoryRule.id, id),
        eq(categoryRule.organizationId, organizationId),
      ),
    )
    .returning({ id: categoryRule.id, matchText: categoryRule.matchText });
  if (deleted.length === 0) throw new DataError("ruleNotFound");
  await recordAudit(actor, {
    area: "rule",
    action: "deleted",
    entityId: id,
    key: "ruleDeleted",
    values: { text: deleted[0].matchText },
  });
}
