CREATE TYPE "public"."deck_status" AS ENUM('generating', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "deck" ALTER COLUMN "sourceMarkdown" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deck" ALTER COLUMN "modelProvider" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deck" ALTER COLUMN "modelId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deck" ADD COLUMN "status" "deck_status" DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "deck" ADD COLUMN "generationError" text;