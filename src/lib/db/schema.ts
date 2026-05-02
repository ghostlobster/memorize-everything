import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uuid,
  pgEnum,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// Auth.js tables (Drizzle adapter schema)
// -----------------------------------------------------------------------------

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  preferredModelProvider: text("preferredModelProvider"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => ({
    pk: primaryKey({ columns: [a.provider, a.providerAccountId] }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// -----------------------------------------------------------------------------
// Domain tables
// -----------------------------------------------------------------------------

export const cardTypeEnum = pgEnum("card_type", ["basic"]);
export const gradeEnum = pgEnum("grade", ["wrong", "hard", "right"]);
export const suggestionKindEnum = pgEnum("suggestion_kind", [
  "mnemonic",
  "interleave",
  "priming",
  "analogy",
]);
export const cardStateEnum = pgEnum("card_state", ["new", "learning", "review"]);
export const deckStatusEnum = pgEnum("deck_status", ["generating", "ready", "failed", "archived"]);

export const deckGroups = pgTable("deck_group", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const decks = pgTable(
  "deck",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("groupId").references(() => deckGroups.id, {
      onDelete: "set null",
    }),
    topic: text("topic").notNull(),
    level: text("level").notNull().default("intermediate"),
    goal: text("goal").notNull().default("mastery"),
    scope: text("scope"),
    status: deckStatusEnum("status").notNull().default("ready"),
    generationError: text("generationError"),
    sourceMarkdown: text("sourceMarkdown"),
    mermaidSrc: text("mermaidSrc"),
    mnemonics: jsonb("mnemonics").$type<
      { name: string; device: string; explanation?: string }[]
    >(),
    interleaving: jsonb("interleaving").$type<{
      topic: string;
      reason: string;
    } | null>(),
    modelProvider: text("modelProvider"),
    modelId: text("modelId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (d) => ({
    byUser: index("deck_user_idx").on(d.userId),
  }),
);

export const cards = pgTable(
  "card",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckId: uuid("deckId")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    type: cardTypeEnum("type").notNull().default("basic"),
    front: text("front").notNull(),
    back: text("back").notNull(),
    whyItMatters: text("whyItMatters"),
    referenceSection: text("referenceSection"),
    orderIdx: integer("orderIdx").notNull().default(0),
    // Review scheduling state (SM-2)
    state: cardStateEnum("state").notNull().default("new"),
    ease: numeric("ease", { precision: 4, scale: 2 }).notNull().default("2.50"),
    repetition: integer("repetition").notNull().default(0),
    intervalDays: integer("intervalDays").notNull().default(0),
    dueAt: timestamp("dueAt", { mode: "date" }).notNull().defaultNow(),
    lastReviewedAt: timestamp("lastReviewedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (c) => ({
    byDeck: index("card_deck_idx").on(c.deckId),
    byDue: index("card_due_idx").on(c.dueAt),
  }),
);

export const reviews = pgTable(
  "review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("cardId")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grade: gradeEnum("grade").notNull(),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }).notNull().defaultNow(),
    durationMs: integer("durationMs"),
    intervalDays: integer("intervalDays").notNull(),
    ease: numeric("ease", { precision: 4, scale: 2 }).notNull(),
    repetition: integer("repetition").notNull(),
    scheduledNextAt: timestamp("scheduledNextAt", { mode: "date" }).notNull(),
  },
  (r) => ({
    byCard: index("review_card_idx").on(r.cardId),
    byUser: index("review_user_idx").on(r.userId),
  }),
);

export const suggestions = pgTable(
  "suggestion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deckId: uuid("deckId")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    cardId: uuid("cardId").references(() => cards.id, {
      onDelete: "cascade",
    }),
    kind: suggestionKindEnum("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (s) => ({
    byDeck: index("suggestion_deck_idx").on(s.deckId),
    byCard: index("suggestion_card_idx").on(s.cardId),
  }),
);

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  decks: many(decks),
  reviews: many(reviews),
  groups: many(deckGroups),
}));

export const deckGroupsRelations = relations(deckGroups, ({ one, many }) => ({
  user: one(users, { fields: [deckGroups.userId], references: [users.id] }),
  decks: many(decks),
}));

export const decksRelations = relations(decks, ({ one, many }) => ({
  user: one(users, { fields: [decks.userId], references: [users.id] }),
  group: one(deckGroups, { fields: [decks.groupId], references: [deckGroups.id] }),
  cards: many(cards),
  suggestions: many(suggestions),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  deck: one(decks, { fields: [cards.deckId], references: [decks.id] }),
  reviews: many(reviews),
  suggestions: many(suggestions),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  card: one(cards, { fields: [reviews.cardId], references: [cards.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type DeckGroup = typeof deckGroups.$inferSelect;
export type InsertDeckGroup = typeof deckGroups.$inferInsert;
export type Deck = typeof decks.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;
export type Grade = (typeof gradeEnum.enumValues)[number];
