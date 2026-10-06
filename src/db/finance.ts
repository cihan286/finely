// ─────────────────────────────────────────────────────────────────────────────
// Database tables for a company's money: accounts, categories, transactions
//
// In plain words: these are the tables that hold each company's financial
// data. `company_settings` holds preferences such as the company's timezone,
// `financial_account` is a bank account (or cash box) the company keeps
// money in, `category` is a label such as "Payroll" or "Marketing", and
// `transaction` is one payment in or out of an account. Every row belongs to
// exactly one company, so companies never see each other's data.
//
// For developers: kept apart from schema.ts because that file is regenerated
// by the Better Auth CLI. Every table here has an organization_id, and every
// query must filter by it — use the functions in lib/data/ rather than
// querying these tables directly. Money is stored as numeric(14,2) (exact
// cents) and read back as a JS number. After a change, run
// `npm run db:generate` and `npm run db:migrate`.
// ─────────────────────────────────────────────────────────────────────────────

import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./schema";

// Money columns: exact to the cent, up to 999 billion
const money = (name: string) =>
  numeric(name, { precision: 14, scale: 2, mode: "number" });

// Random IDs with a short prefix, e.g. "acc_3f1c…", so IDs say what they are
const prefixedId = (prefix: string) => () =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;

// Columns every table has: when the row was created and last changed
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// A company's preferences. Companies without a row use the defaults.
export const companySettings = pgTable("company_settings", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  // IANA timezone name, e.g. "Europe/Istanbul". Decides which calendar day a
  // transaction falls on and when "today" starts.
  timezone: text("timezone").default("UTC").notNull(),
  ...timestamps,
});

// A bank account (or cash) the company holds money in. The current balance is
// the opening balance plus all of the account's transactions.
export const financialAccount = pgTable(
  "financial_account",
  {
    id: text("id").primaryKey().$defaultFn(prefixedId("acc")),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // "checking" | "savings" | "reserve" (see types/finance.ts)
    type: text("type").notNull(),
    // Last four digits of the account number, if there is one
    last4: text("last4"),
    openingBalance: money("opening_balance").default(0).notNull(),
    ...timestamps,
  },
  (table) => [index("financial_account_organizationId_idx").on(table.organizationId)],
);

// A label for transactions, e.g. "Payroll" (expense) or "Sales" (income)
export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey().$defaultFn(prefixedId("cat")),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // "income" | "expense"
    kind: text("kind").notNull(),
    // Hex color for charts, e.g. "#8b5cf6"
    color: text("color").notNull(),
    // Which icon to show (see CategoryIconKey in types/finance.ts)
    iconKey: text("icon_key").notNull(),
    ...timestamps,
  },
  (table) => [
    // No two categories with the same name in one company, ignoring
    // upper/lower case ("Payroll" and "payroll" would be confusing, and
    // imports match category names that way)
    uniqueIndex("category_organization_name_unique").on(
      table.organizationId,
      sql`lower(${table.name})`,
    ),
  ],
);

// One payment in or out of an account. Positive amount = money in.
export const transaction = pgTable(
  "transaction",
  {
    id: text("id").primaryKey().$defaultFn(prefixedId("tx")),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Accounts with transactions can't be deleted (move or delete these first)
    accountId: text("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "restrict" }),
    // Deleting a category leaves its transactions uncategorized
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    amount: money("amount").notNull(),
    // When the payment happened
    occurredAt: timestamp("occurred_at").notNull(),
    // "completed" | "pending"
    status: text("status").default("completed").notNull(),
    notes: text("notes"),
    // Who entered it (empty if that person's account was deleted)
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    // Most lists show one company's transactions, newest first
    index("transaction_organization_occurredAt_idx").on(
      table.organizationId,
      table.occurredAt,
    ),
    index("transaction_accountId_idx").on(table.accountId),
    index("transaction_categoryId_idx").on(table.categoryId),
  ],
);

// How the tables connect to each other
export const financialAccountRelations = relations(
  financialAccount,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [financialAccount.organizationId],
      references: [organization.id],
    }),
    transactions: many(transaction),
  }),
);

export const categoryRelations = relations(category, ({ one, many }) => ({
  organization: one(organization, {
    fields: [category.organizationId],
    references: [organization.id],
  }),
  transactions: many(transaction),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  organization: one(organization, {
    fields: [transaction.organizationId],
    references: [organization.id],
  }),
  account: one(financialAccount, {
    fields: [transaction.accountId],
    references: [financialAccount.id],
  }),
  category: one(category, {
    fields: [transaction.categoryId],
    references: [category.id],
  }),
  createdBy: one(user, {
    fields: [transaction.createdById],
    references: [user.id],
  }),
}));
