// ─────────────────────────────────────────────────────────────────────────────
// The categories every new company starts with
//
// In plain words: so nobody starts from an empty list, each new company gets
// a ready-made set of categories (Payroll, Office & Rent, Sales, …). Owners
// and admins can rename, recolor or delete them later.
//
// For developers: called from the afterCreateOrganization hook in lib/auth.ts.
// Companies created before categories existed got the same set from
// migration 0002 — keep the two in sync if you change this list.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import { db } from "@/db";
import { category } from "@/db/finance";
import type { Category } from "@/types/finance";

export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Sales", kind: "income", color: "#22c55e", iconKey: "income" },
  { name: "Payroll", kind: "expense", color: "#8b5cf6", iconKey: "users" },
  {
    name: "Office & Rent",
    kind: "expense",
    color: "#f59e0b",
    iconKey: "building",
  },
  {
    name: "Software & IT",
    kind: "expense",
    color: "#3b82f6",
    iconKey: "laptop",
  },
  { name: "Marketing", kind: "expense", color: "#10b981", iconKey: "megaphone" },
  { name: "Other", kind: "expense", color: "#94a3b8", iconKey: "more" },
];

/** Gives a company the default categories it doesn't have yet. */
export async function createDefaultCategories(organizationId: string) {
  await db
    .insert(category)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, organizationId })))
    .onConflictDoNothing();
}
