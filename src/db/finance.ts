// ─────────────────────────────────────────────────────────────────────────────
// Database tables for a company's money: accounts, categories, transactions
//
// In plain words: these are the tables that hold each company's financial
// data. `company_settings` holds preferences such as the company's timezone,
// `financial_account` is a bank account (or cash box) the company keeps
// money in, `category` is a label such as "Payroll" or "Marketing",
// `category_rule` says which descriptions get which category automatically,
// `transaction` is one payment in or out of an account, `bill` is a payment
// the company still has to make (or has made), `attachment` is a receipt or
// other file added to a transaction, `notification_read` remembers when each
// person last read the company's notifications, and
// `notification_preference` which emails each person wants. Every row belongs to exactly one company, so companies never
// see each other's data.
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
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  numeric,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./schema";

// Money columns: exact to the cent, up to 999 billion
const money = (name: string) =>
  numeric(name, { precision: 14, scale: 2, mode: "number" });

// Random IDs with a short prefix, e.g. "acc_3f1c…", so IDs say what they are
export const prefixedId = (prefix: string) => () =>
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
  // When the weekly email was last sent to this company's team, so a run
  // that is repeated doesn't send it twice
  lastDigestAt: timestamp("last_digest_at"),
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
    // The most to spend in this category per calendar month; empty = no
    // budget. Only for "expense" categories.
    monthlyBudget: money("monthly_budget"),
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

// "Transactions whose description contains this text get this category".
// Applied when a transaction arrives without a category (see
// lib/finance/category-rules.ts).
export const categoryRule = pgTable(
  "category_rule",
  {
    id: text("id").primaryKey().$defaultFn(prefixedId("rule")),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // A rule is meaningless without its category, so it goes with it
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    // The text to look for in a description, e.g. "aws". Matched ignoring
    // upper/lower case and extra spaces.
    matchText: text("match_text").notNull(),
    ...timestamps,
  },
  (table) => [
    // One rule per text in a company, ignoring upper/lower case: two rules
    // for "AWS" and "aws" could point at different categories
    uniqueIndex("category_rule_organization_text_unique").on(
      table.organizationId,
      sql`lower(${table.matchText})`,
    ),
    index("category_rule_categoryId_idx").on(table.categoryId),
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

// A payment the company owes: who to, how much and by when. Marking it paid
// creates the transaction and, for a repeating bill, the next bill (see
// lib/data/bills.ts). Each row is one payment, so a monthly bill is a chain
// of rows.
export const bill = pgTable(
  "bill",
  {
    id: text("id").primaryKey().$defaultFn(prefixedId("bill")),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Who is paid or what for, e.g. "Office rent". Becomes the description
    // of the transaction.
    name: text("name").notNull(),
    // A positive number; the transaction gets it as money out
    amount: money("amount").notNull(),
    // A calendar day ("2026-11-01"), in the company's timezone
    dueDate: date("due_date", { mode: "string" }).notNull(),
    // "none" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
    repeat: text("repeat").default("none").notNull(),
    // Deleting a category leaves its bills uncategorized
    categoryId: text("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    // When it was paid; empty while it's still owed
    paidAt: timestamp("paid_at"),
    // The payment itself (empty if that transaction was deleted since)
    transactionId: text("transaction_id").references(() => transaction.id, {
      onDelete: "set null",
    }),
    // Who entered it (empty if that person's account was deleted)
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    // The list shows one company's bills by due date
    index("bill_organization_dueDate_idx").on(table.organizationId, table.dueDate),
  ],
);

// A receipt, invoice or other file added to a transaction. The file itself
// is kept in the row (as base64 text), so it is exactly as private as the
// rest of the company's data and needs no separate storage service; files
// are small (see lib/finance/attachments.ts for the limits).
export const attachment = pgTable(
  "attachment",
  {
    id: text("id").primaryKey().$defaultFn(prefixedId("att")),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Deleting a transaction deletes its files
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    // The file's name as it was on the person's device, e.g. "receipt.pdf"
    name: text("name").notNull(),
    // What kind of file it really is (checked from its content), e.g.
    // "application/pdf"
    contentType: text("content_type").notNull(),
    // In bytes
    size: integer("size").notNull(),
    // The file, base64-encoded. Never select this for lists.
    data: text("data").notNull(),
    // Who added it (empty if that person's account was deleted)
    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("attachment_transactionId_idx").on(table.transactionId)],
);

// Which emails a person wants about a company. People without a row get
// the defaults (see lib/finance/email-preferences.ts).
export const notificationPreference = pgTable(
  "notification_preference",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // The summary of the week, every Monday
    weeklyDigest: boolean("weekly_digest").notNull(),
    // An email right away when a charge is unusually high
    unusualCharges: boolean("unusual_charges").notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.userId, table.organizationId] })],
);

// When a person last pressed "Mark all as read" in a company. Notifications
// aren't stored: they're worked out from the company's data (see
// lib/finance/notifications.ts), and the newer ones than this count as unread.
export const notificationRead = pgTable(
  "notification_read",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.organizationId] })],
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
  rules: many(categoryRule),
}));

export const categoryRuleRelations = relations(categoryRule, ({ one }) => ({
  organization: one(organization, {
    fields: [categoryRule.organizationId],
    references: [organization.id],
  }),
  category: one(category, {
    fields: [categoryRule.categoryId],
    references: [category.id],
  }),
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
