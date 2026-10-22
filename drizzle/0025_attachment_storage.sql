ALTER TABLE "attachment" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attachment" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_kept_once" CHECK (("attachment"."data" is null) <> ("attachment"."storage_key" is null));