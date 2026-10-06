CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"color" text NOT NULL,
	"icon_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_organization_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "financial_account" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"last4" text,
	"opening_balance" numeric(14, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"account_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_account_id_financial_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_account_organizationId_idx" ON "financial_account" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "transaction_organization_occurredAt_idx" ON "transaction" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transaction_accountId_idx" ON "transaction" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transaction_categoryId_idx" ON "transaction" USING btree ("category_id");--> statement-breakpoint
-- Give companies that already exist the default categories
-- (the same list as lib/data/default-categories.ts)
INSERT INTO "category" ("id", "organization_id", "name", "kind", "color", "icon_key")
SELECT 'cat_' || replace(gen_random_uuid()::text, '-', ''), o."id", d."name", d."kind", d."color", d."icon_key"
FROM "organization" o
CROSS JOIN (VALUES
	('Sales', 'income', '#22c55e', 'income'),
	('Payroll', 'expense', '#8b5cf6', 'users'),
	('Office & Rent', 'expense', '#f59e0b', 'building'),
	('Software & IT', 'expense', '#3b82f6', 'laptop'),
	('Marketing', 'expense', '#10b981', 'megaphone'),
	('Other', 'expense', '#94a3b8', 'more')
) AS d("name", "kind", "color", "icon_key")
ON CONFLICT DO NOTHING;
