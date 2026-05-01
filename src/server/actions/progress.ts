"use server";

import { and, eq, ne, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cards, decks, reviews } from "@/lib/db/schema";

export async function getCardStats(userId: string) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      mature: sql<number>`count(*) filter (where ${cards.repetition} >= 3)::int`,
      struggling: sql<number>`count(*) filter (where ${cards.ease}::numeric <= 1.6)::int`,
      newCards: sql<number>`count(*) filter (where ${cards.state} = 'new')::int`,
      learning: sql<number>`count(*) filter (where ${cards.state} = 'learning')::int`,
      review: sql<number>`count(*) filter (where ${cards.state} = 'review')::int`,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(eq(decks.userId, userId), ne(decks.status, "archived")));
  return row;
}

export async function getReviewActivity(userId: string, days = 14) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select({
      day: sql<string>`date_trunc('day', ${reviews.reviewedAt})::date::text`,
      count: sql<number>`count(*)::int`,
      wrongs: sql<number>`count(*) filter (where ${reviews.grade} = 'wrong')::int`,
      rights: sql<number>`count(*) filter (where ${reviews.grade} = 'right')::int`,
    })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), gte(reviews.reviewedAt, since)))
    .groupBy(sql`date_trunc('day', ${reviews.reviewedAt})`)
    .orderBy(sql`date_trunc('day', ${reviews.reviewedAt})`);
}

export async function getUpcomingDue(userId: string) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return db
    .select({
      day: sql<string>`date_trunc('day', ${cards.dueAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(
      and(
        eq(decks.userId, userId),
        ne(decks.status, "archived"),
        gte(cards.dueAt, now),
        lte(cards.dueAt, in7Days),
      ),
    )
    .groupBy(sql`date_trunc('day', ${cards.dueAt})`)
    .orderBy(sql`date_trunc('day', ${cards.dueAt})`);
}

export async function getPerDeckStats(userId: string) {
  return db
    .select({
      deckId: cards.deckId,
      topic: decks.topic,
      total: sql<number>`count(*)::int`,
      mature: sql<number>`count(*) filter (where ${cards.repetition} >= 3)::int`,
      struggling: sql<number>`count(*) filter (where ${cards.ease}::numeric <= 1.6)::int`,
      dueNow: sql<number>`count(*) filter (where ${cards.dueAt} <= now())::int`,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(eq(decks.userId, userId), ne(decks.status, "archived")))
    .groupBy(cards.deckId, decks.topic)
    .orderBy(desc(sql`count(*) filter (where ${cards.dueAt} <= now())`));
}

export async function getScheduledByDay(userId: string, from: Date, to: Date) {
  return db
    .select({
      day: sql<string>`date_trunc('day', ${cards.dueAt})::date::text`,
      deckId: cards.deckId,
      topic: decks.topic,
      count: sql<number>`count(*)::int`,
      firstReview: sql<number>`count(*) filter (where ${cards.repetition} = 0)::int`,
      secondReview: sql<number>`count(*) filter (where ${cards.repetition} = 1)::int`,
      thirdReview: sql<number>`count(*) filter (where ${cards.repetition} = 2)::int`,
      matureReview: sql<number>`count(*) filter (where ${cards.repetition} >= 3)::int`,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(
      and(
        eq(decks.userId, userId),
        ne(decks.status, "archived"),
        gte(cards.dueAt, from),
        lte(cards.dueAt, to),
      ),
    )
    .groupBy(sql`date_trunc('day', ${cards.dueAt})`, cards.deckId, decks.topic)
    .orderBy(sql`date_trunc('day', ${cards.dueAt})`);
}

export async function getCompletedByDay(userId: string, from: Date, to: Date) {
  return db
    .select({
      day: sql<string>`date_trunc('day', ${reviews.reviewedAt})::date::text`,
      count: sql<number>`count(*)::int`,
      wrongs: sql<number>`count(*) filter (where ${reviews.grade} = 'wrong')::int`,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, userId),
        gte(reviews.reviewedAt, from),
        lte(reviews.reviewedAt, to),
      ),
    )
    .groupBy(sql`date_trunc('day', ${reviews.reviewedAt})`)
    .orderBy(sql`date_trunc('day', ${reviews.reviewedAt})`);
}
