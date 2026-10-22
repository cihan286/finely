CREATE TABLE "branch" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"address" text,
	"city" text,
	"phone" text,
	"is_head_office" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_profile" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"legal_name" text,
	"country" text,
	"tax_id" text,
	"tax_office" text,
	"mersis_no" text,
	"trade_registry_no" text,
	"address" text,
	"district" text,
	"city" text,
	"postal_code" text,
	"phone" text,
	"email" text,
	"website" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_profile" ADD CONSTRAINT "company_profile_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_organization_name_unique" ON "branch" USING btree ("organization_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "branch_organization_code_unique" ON "branch" USING btree ("organization_id",lower("code")) WHERE "branch"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_organization_head_office_unique" ON "branch" USING btree ("organization_id") WHERE "branch"."is_head_office";