"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, lte, asc, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decks, cards, suggestions, reviews } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { generateDeck } from "@/lib/ai/generate-deck";
import { primeCard, analogyForCard } from "@/lib/ai/prime-card";
import { schedule } from "@/lib/sr/sm2";
import { TopicRequestSchema } from "@/lib/ai/schemas";
import type { Grade } from "@/lib/db/schema";

export async function createDeckAction(formData: FormData) {
  const user = await requireUser();

  const parsed = TopicRequestSchema.safeParse({
    topic: String(formData.get("topic") ?? "").trim(),
    level: (formData.get("level") as string) || "intermediate",
    goal: (formData.get("goal") as string) || "mastery",
    scope: (formData.get("scope") as string) || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid topic: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  const generated = await generateDeck(parsed.data);

  const [inserted] = await db
    .insert(decks)
    .values({
      userId: user.id,
      topic: parsed.data.topic,
      level: parsed.data.level,
      goal: parsed.data.goal,
      scope: parsed.data.scope,
      sourceMarkdown: generated.markdown,
      mermaidSrc: generated.payload.mermaid,
      mnemonics: generated.payload.mnemonics,
      interleaving: generated.payload.interleaving,
      modelProvider: generated.modelProvider,
      modelId: generated.modelId,
    })
    .returning();

  if (!inserted) throw new Error("Failed to persist deck");

  await db.insert(cards).values(
    generated.payload.cards.map((c, idx) => ({
      deckId: inserted.id,
      front: c.front,
      back: c.back,
      whyItMatters: c.whyItMatters,
      referenceSection: c.referenceSection,
      orderIdx: idx,
    })),
  );

  revalidatePath("/");
  revalidatePath("/review");
  redirect(`/decks/${inserted.id}`);
}

export async function deleteDeckAction(deckId: string) {
  const user = await requireUser();
  await db
    .delete(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/review");
}

export async function gradeCardAction(input: {
  cardId: string;
  grade: Grade;
  durationMs?: number;
}) {
  const user = await requireUser();

  const card = await db.query.cards.findFirst({
    where: eq(cards.id, input.cardId),
    with: { deck: true },
  });
  if (!card) throw new Error("Card not found");
  if (card.deck.userId !== user.id) throw new Error("Not authorized");

  const prev = {
    repetition: card.repetition,
    intervalDays: card.intervalDays,
    ease: Number(card.ease),
  };
  const next = schedule(prev, input.grade);

  const now = new Date();

  await db
    .update(cards)
    .set({
      repetition: next.repetition,
      intervalDays: next.intervalDays,
      ease: next.ease.toFixed(2),
      dueAt: next.nextDueAt,
      lastReviewedAt: now,
      state: next.repetition === 0 ? "learning" : "review",
    })
    .where(eq(cards.id, card.id));

  await db.insert(reviews).values({
    cardId: card.id,
    userId: user.id,
    grade: input.grade,
    reviewedAt: now,
    durationMs: input.durationMs,
    intervalDays: next.intervalDays,
    ease: next.ease.toFixed(2),
    repetition: next.repetition,
    scheduledNextAt: next.nextDueAt,
  });

  revalidatePath(`/decks/${card.deckId}`);
  revalidatePath(`/decks/${card.deckId}/review`);
  revalidatePath("/review");

  return {
    intervalDays: next.intervalDays,
    nextDueAt: next.nextDueAt.toISOString(),
    repetition: next.repetition,
    ease: next.ease,
  };
}

export async function primeCardAction(cardId: string) {
  const user = await requireUser();
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: { deck: true },
  });
  if (!card || card.deck.userId !== user.id) throw new Error("Not authorized");

  const prompt = await primeCard({
    topic: card.deck.topic,
    front: card.front,
    back: card.back,
    whyItMatters: card.whyItMatters,
    referenceSection: card.referenceSection,
  });

  await db.insert(suggestions).values({
    deckId: card.deckId,
    cardId: card.id,
    kind: "priming",
    payload: { question: prompt, generatedAt: new Date().toISOString() },
  });

  return { question: prompt };
}

export async function analogyCardAction(cardId: string) {
  const user = await requireUser();
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: { deck: true },
  });
  if (!card || card.deck.userId !== user.id) throw new Error("Not authorized");

  const analogy = await analogyForCard({
    topic: card.deck.topic,
    front: card.front,
    back: card.back,
    whyItMatters: card.whyItMatters,
    referenceSection: card.referenceSection,
  });

  await db.insert(suggestions).values({
    deckId: card.deckId,
    cardId: card.id,
    kind: "analogy",
    payload: { text: analogy, generatedAt: new Date().toISOString() },
  });

  return { analogy };
}

// -----------------------------------------------------------------------------
// Query helpers (read-only; called from Server Components)
// -----------------------------------------------------------------------------

export async function listUserDecks(userId: string) {
  return db
    .select({
      id: decks.id,
      topic: decks.topic,
      level: decks.level,
      goal: decks.goal,
      createdAt: decks.createdAt,
      modelProvider: decks.modelProvider,
      modelId: decks.modelId,
      cardCount: sql<number>`(select count(*) from ${cards} where ${cards.deckId} = ${decks.id})`,
      dueCount: sql<number>`(select count(*) from ${cards} where ${cards.deckId} = ${decks.id} and ${cards.dueAt} <= now())`,
    })
    .from(decks)
    .where(eq(decks.userId, userId))
    .orderBy(desc(decks.createdAt));
}

export async function getDeckForUser(deckId: string, userId: string) {
  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
    with: {
      cards: { orderBy: [asc(cards.orderIdx)] },
    },
  });
  return deck;
}

export async function listDueCardsForUser(userId: string, limit = 100) {
  return db
    .select({
      cardId: cards.id,
      deckId: cards.deckId,
      topic: decks.topic,
      front: cards.front,
      dueAt: cards.dueAt,
      repetition: cards.repetition,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(and(eq(decks.userId, userId), lte(cards.dueAt, new Date())))
    .orderBy(asc(cards.dueAt))
    .limit(limit);
}

export async function nextDueCardInDeck(deckId: string, userId: string) {
  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
  });
  if (!deck) return null;

  const [next] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.deckId, deckId), lte(cards.dueAt, new Date())))
    .orderBy(asc(cards.dueAt), asc(cards.orderIdx))
    .limit(1);
  return next ?? null;
}
