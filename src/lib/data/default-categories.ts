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
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/server";

/** Which default category (its name is in m.samples.categories) */
export type DefaultCategoryKey = keyof Messages["samples"]["categories"];

/**
 * The categories every company starts with. `name` is how the demo data
 * refers to them; a company gets them named in its creator's language.
 */
export const DEFAULT_CATEGORIES: (Omit<Category, "id" | "budget"> & { key: DefaultCategoryKey })[] = [
  { key: "sales", name: "Sales", kind: "income", color: "#22c55e", iconKey: "income" },
  { key: "payroll", name: "Payroll", kind: "expense", color: "#8b5cf6", iconKey: "users" },
  { key: "office", name: "Office & Rent", kind: "expense", color: "#f59e0b", iconKey: "building" },
  { key: "software", name: "Software & IT", kind: "expense", color: "#3b82f6", iconKey: "laptop" },
  { key: "marketing", name: "Marketing", kind: "expense", color: "#10b981", iconKey: "megaphone" },
  { key: "other", name: "Other", kind: "expense", color: "#94a3b8", iconKey: "more" },
];

/** Gives a company the default categories it doesn't have yet, in the page's language. */
export async function createDefaultCategories(organizationId: string) {
  const names = (await getMessages()).samples.categories;
  await db
    .insert(category)
    .values(
      DEFAULT_CATEGORIES.map(({ key, ...c }) => ({ ...c, name: names[key], organizationId })),
    )
    .onConflictDoNothing();
}
