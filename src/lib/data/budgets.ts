// ─────────────────────────────────────────────────────────────────────────────
// Budgets: fetching this month's spending
//
// In plain words: for every spending category that has a monthly budget,
// adds up what was spent in it since the first of the month, and hands it to
// the calculations in lib/finance/budgets.ts. Only completed money out
// counts. The month follows the company's timezone. The budgets themselves
// are part of the categories (Settings; see lib/data/categories.ts).
//
// A company's overall budget (Settings) is added as one more line, "All
// spending": everything spent this month, whatever its category.
//
// For developers: server-only; finds the company itself via
// getFinanceContext(). selectBudgetSpending() is shared with the
// notifications, which also need to know when each category last changed.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { and, eq, gte, isNotNull, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { category, companySettings, transaction } from "@/db/finance";
import { startOfDay, todayIn } from "@/lib/dates";
import {
  ALL_SPENDING,
  buildBudgets,
  monthStart,
  nextMonthStart,
  type BudgetProgress,
} from "@/lib/finance/budgets";
import type { CategoryIconKey, ISODate } from "@/types/finance";
import { getFinanceContext } from "./common";
import { getMessages } from "@/i18n/server";

/**
 * Every category of a company that has a budget, with what was spent in it
 * during the month `today` is in, and when its latest payment was entered
 * (null without payments). If the company has an overall budget, it's there
 * too, under ALL_SPENDING, with everything spent that month.
 */
export async function selectBudgetSpending(
  organizationId: string,
  timeZone: string,
  today: ISODate,
) {
  const thisMonth = and(
    eq(transaction.status, "completed"),
    lt(transaction.amount, 0),
    gte(transaction.occurredAt, startOfDay(monthStart(today), timeZone)),
    lt(transaction.occurredAt, startOfDay(nextMonthStart(today), timeZone)),
  );
  const changedAt = sql`max(${transaction.createdAt})`.mapWith(
    transaction.createdAt,
  ) as SQL<Date | null>;
  const [[settings], [everything]] = await Promise.all([
    db
      .select({ budget: companySettings.monthlyBudget })
      .from(companySettings)
      .where(eq(companySettings.organizationId, organizationId)),
    db
      .select({
        spent: sql<number>`coalesce(-sum(${transaction.amount}), 0)`.mapWith(Number),
        changedAt,
      })
      .from(transaction)
      .where(and(eq(transaction.organizationId, organizationId), thisMonth)),
  ]);
  const overall = settings?.budget
    ? [
        {
          categoryId: ALL_SPENDING,
          name: (await getMessages()).dashboard.allSpending,
          color: "#2196f3",
          iconKey: "receipt" as CategoryIconKey,
          budget: settings.budget,
          spent: everything.spent,
          changedAt: everything.changedAt,
        },
      ]
    : [];

  const rows = await db
    .select({
      categoryId: category.id,
      name: category.name,
      color: category.color,
      iconKey: category.iconKey,
      budget: category.monthlyBudget,
      spent: sql<number>`coalesce(-sum(${transaction.amount}), 0)`.mapWith(Number),
      changedAt: sql`max(${transaction.createdAt})`.mapWith(
        transaction.createdAt,
      ) as SQL<Date | null>,
    })
    .from(category)
    // The month's payments are picked in the join, so categories without
    // any still appear, with nothing spent
    .leftJoin(
      transaction,
      and(
        eq(transaction.categoryId, category.id),
        eq(transaction.status, "completed"),
        lt(transaction.amount, 0),
        gte(transaction.occurredAt, startOfDay(monthStart(today), timeZone)),
        lt(transaction.occurredAt, startOfDay(nextMonthStart(today), timeZone)),
      ),
    )
    .where(
      and(
        eq(category.organizationId, organizationId),
        isNotNull(category.monthlyBudget),
      ),
    )
    .groupBy(category.id);
  return [
    ...overall,
    ...rows.map((row) => ({
      ...row,
      // Never null: the query only returns categories with a budget
      budget: row.budget ?? 0,
      iconKey: row.iconKey as CategoryIconKey,
    })),
  ];
}

/** This month's progress of the company's budgets, the most used up first */
export async function getBudgets(): Promise<{
  /** Today in the company's timezone; its month is the one shown */
  today: ISODate;
  budgets: BudgetProgress[];
}> {
  const { organizationId, timeZone } = await getFinanceContext();
  const today = todayIn(timeZone);
  const rows = await selectBudgetSpending(organizationId, timeZone, today);
  return {
    today,
    budgets: buildBudgets(
      rows.map(({ categoryId, name, color, iconKey, budget, spent }) => ({
        categoryId,
        name,
        color,
        iconKey,
        budget,
        spent,
      })),
    ),
  };
}
