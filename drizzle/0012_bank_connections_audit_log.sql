CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"area" text NOT NULL,
	"action" text NOT NULL,
	"entity_id" text,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_connection" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"access_token" text NOT NULL,
	"cursor" text,
	"last_synced_at" timestamp,
	"last_error" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_account" ADD COLUMN "connection_id" text;--> statement-breakpoint
ALTER TABLE "financial_account" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_connection" ADD CONSTRAINT "bank_connection_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_connection" ADD CONSTRAINT "bank_connection_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_organization_createdAt_idx" ON "audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "bank_connection_organizationId_idx" ON "bank_connection" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_connection_provider_externalId_unique" ON "bank_connection" USING btree ("provider","external_id");--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_connection_id_bank_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connection"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_organization_externalId_unique" ON "transaction" USING btree ("organization_id","external_id");