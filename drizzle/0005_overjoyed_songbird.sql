CREATE TYPE "public"."pet_chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."pet_event_kind" AS ENUM('xp', 'levelup', 'evolve', 'species_shift', 'rename', 'knowledge_rebuild', 'interaction_compact');--> statement-breakpoint
CREATE TYPE "public"."pet_mood" AS ENUM('happy', 'neutral', 'tired');--> statement-breakpoint
CREATE TYPE "public"."pet_species" AS ENUM('pip', 'cyber_fox', 'leaf_axolotl', 'quill_owl', 'star_octopus', 'crystal_bunny', 'babel_cat');--> statement-breakpoint
CREATE TABLE "pet_chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"petId" uuid NOT NULL,
	"role" "pet_chat_role" NOT NULL,
	"content" text NOT NULL,
	"compacted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"petId" uuid NOT NULL,
	"kind" "pet_event_kind" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text DEFAULT 'Pip' NOT NULL,
	"species" "pet_species" DEFAULT 'pip' NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"mood" "pet_mood" DEFAULT 'neutral' NOT NULL,
	"topicTally" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"knowledgeMemory" text DEFAULT '' NOT NULL,
	"interactionMemory" text DEFAULT '' NOT NULL,
	"knowledgeMemoryUpdatedAt" timestamp,
	"interactionMemoryUpdatedAt" timestamp,
	"position" jsonb DEFAULT '{"anchor":"br","offsetX":24,"offsetY":24}'::jsonb NOT NULL,
	"lastInteractionAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pet_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "deck" ADD COLUMN "finishedAt" timestamp;--> statement-breakpoint
ALTER TABLE "pet_chat_message" ADD CONSTRAINT "pet_chat_message_petId_pet_id_fk" FOREIGN KEY ("petId") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_event" ADD CONSTRAINT "pet_event_petId_pet_id_fk" FOREIGN KEY ("petId") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet" ADD CONSTRAINT "pet_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pet_chat_pet_idx" ON "pet_chat_message" USING btree ("petId");--> statement-breakpoint
CREATE INDEX "pet_event_pet_idx" ON "pet_event" USING btree ("petId");