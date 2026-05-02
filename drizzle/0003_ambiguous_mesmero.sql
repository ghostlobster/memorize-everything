CREATE TABLE "deck_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deck" ADD COLUMN "groupId" uuid;--> statement-breakpoint
ALTER TABLE "deck_group" ADD CONSTRAINT "deck_group_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_groupId_deck_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."deck_group"("id") ON DELETE set null ON UPDATE no action;