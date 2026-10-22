CREATE TABLE "document_counter" (
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_counter_organization_id_type_year_pk" PRIMARY KEY("organization_id","type","year")
);
--> statement-breakpoint
CREATE TABLE "document_series" (
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"prefix" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_series_organization_id_type_pk" PRIMARY KEY("organization_id","type")
);
--> statement-breakpoint
ALTER TABLE "document_counter" ADD CONSTRAINT "document_counter_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_series" ADD CONSTRAINT "document_series_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;