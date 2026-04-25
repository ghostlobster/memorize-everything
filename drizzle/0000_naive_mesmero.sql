CREATE TYPE "public"."card_state" AS ENUM('new', 'learning', 'review');--> statement-breakpoint
CREATE TYPE "public"."card_type" AS ENUM('basic');--> statement-breakpoint
CREATE TYPE "public"."grade" AS ENUM('wrong', 'hard', 'right');--> statement-breakpoint
CREATE TYPE "public"."suggestion_kind" AS ENUM('mnemonic', 'interleave', 'priming', 'analogy');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deckId" uuid NOT NULL,
	"type" "card_type" DEFAULT 'basic' NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"whyItMatters" text,
	"referenceSection" text,
	"orderIdx" integer DEFAULT 0 NOT NULL,
	"state" "card_state" DEFAULT 'new' NOT NULL,
	"ease" numeric(4, 2) DEFAULT '2.50' NOT NULL,
	"repetition" integer DEFAULT 0 NOT NULL,
	"intervalDays" integer DEFAULT 0 NOT NULL,
	"dueAt" timestamp DEFAULT now() NOT NULL,
	"lastReviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deck" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"topic" text NOT NULL,
	"level" text DEFAULT 'intermediate' NOT NULL,
	"goal" text DEFAULT 'mastery' NOT NULL,
	"scope" text,
	"sourceMarkdown" text NOT NULL,
	"mermaidSrc" text,
	"mnemonics" jsonb,
	"interleaving" jsonb,
	"modelProvider" text NOT NULL,
	"modelId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cardId" uuid NOT NULL,
	"userId" text NOT NULL,
	"grade" "grade" NOT NULL,
	"reviewedAt" timestamp DEFAULT now() NOT NULL,
	"durationMs" integer,
	"intervalDays" integer NOT NULL,
	"ease" numeric(4, 2) NOT NULL,
	"repetition" integer NOT NULL,
	"scheduledNextAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deckId" uuid NOT NULL,
	"cardId" uuid,
	"kind" "suggestion_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"preferredModelProvider" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_deckId_deck_id_fk" FOREIGN KEY ("deckId") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_deckId_deck_id_fk" FOREIGN KEY ("deckId") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_cardId_card_id_fk" FOREIGN KEY ("cardId") REFERENCES "public"."card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_deck_idx" ON "card" USING btree ("deckId");--> statement-breakpoint
CREATE INDEX "card_due_idx" ON "card" USING btree ("dueAt");--> statement-breakpoint
CREATE INDEX "deck_user_idx" ON "deck" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "review_card_idx" ON "review" USING btree ("cardId");--> statement-breakpoint
CREATE INDEX "review_user_idx" ON "review" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "suggestion_deck_idx" ON "suggestion" USING btree ("deckId");--> statement-breakpoint
CREATE INDEX "suggestion_card_idx" ON "suggestion" USING btree ("cardId");