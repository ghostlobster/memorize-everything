"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, lte, asc, desc, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decks, cards, suggestions, reviews } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { primeCard, analogyForCard } from "@/lib/ai/prime-card";
import { schedule } from "@/lib/sr/sm2";
import { TopicRequestSchema, UpdateCardSchema } from "@/lib/ai/schemas";
import type { Grade } from "@/lib/db/schema";

export async function createDeckAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const user = await requireUser();

  const parsed = TopicRequestSchema.safeParse({
    topic: String(formData.get("topic") ?? "").trim(),
    level: (formData.get("level") as string) || "intermediate",
    goal: (formData.get("goal") as string) || "mastery",
    scope: (formData.get("scope") as string) || undefined,
  });
  if (!parsed.success) {
    return {
      error: `Invalid topic: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    };
  }

  const rawProvider = formData.get("provider") as string | null;
  const rawModelId = formData.get("modelId") as string | null;

  const [inserted] = await db
    .insert(decks)
    .values({
      userId: user.id,
      topic: parsed.data.topic,
      level: parsed.data.level,
      goal: parsed.data.goal,
      scope: parsed.data.scope,
      status: "generating",
      modelProvider: rawProvider || null,
      modelId: rawModelId || null,
    })
    .returning();

  if (!inserted) throw new Error("Failed to create deck record");

  revalidatePath("/");
  redirect(`/decks/${inserted.id}`);
}

export async function deleteDeckAction(deckId: string) {
  const user = await requireUser();
  await db
    .delete(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/review");
  redirect("/");
}

export async function archiveDeckAction(deckId: string) {
  const user = await requireUser();
  await db
    .update(decks)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.id)));
  revalidatePath("/");
  revalidatePath("/review");
  redirect("/");
}

export async function unarchiveDeckAction(deckId: string) {
  const user = await requireUser();
  await db
    .update(decks)
    .set({ status: "ready", updatedAt: new Date() })
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.id)));
  revalidatePath("/");
  revalidatePath(`/decks/${deckId}`);
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
  revalidatePath("/review/multi");

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

export async function updateCardAction(
  cardId: string,
  raw: {
    front: string;
    back: string;
    whyItMatters?: string;
    referenceSection?: string;
    userNotes?: string;
  },
): Promise<void> {
  const user = await requireUser();

  const parsed = UpdateCardSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid card data: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }

  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: { deck: true },
  });
  if (!card) throw new Error("Card not found");
  if (card.deck.userId !== user.id) throw new Error("Not authorized");

  await db
    .update(cards)
    .set({
      front: parsed.data.front,
      back: parsed.data.back,
      whyItMatters: parsed.data.whyItMatters ?? null,
      referenceSection: parsed.data.referenceSection ?? null,
      userNotes: parsed.data.userNotes ?? null,
    })
    .where(eq(cards.id, cardId));

  revalidatePath(`/decks/${card.deckId}`);
}

export async function suspendCardAction(cardId: string): Promise<void> {
  const user = await requireUser();
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: { deck: true },
  });
  if (!card) throw new Error("Card not found");
  if (card.deck.userId !== user.id) throw new Error("Not authorized");

  await db.update(cards).set({ suspended: true }).where(eq(cards.id, cardId));
  revalidatePath(`/decks/${card.deckId}`);
}

export async function unsuspendCardAction(cardId: string): Promise<void> {
  const user = await requireUser();
  const card = await db.query.cards.findFirst({
    where: eq(cards.id, cardId),
    with: { deck: true },
  });
  if (!card) throw new Error("Card not found");
  if (card.deck.userId !== user.id) throw new Error("Not authorized");

  await db.update(cards).set({ suspended: false }).where(eq(cards.id, cardId));
  revalidatePath(`/decks/${card.deckId}`);
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
      status: decks.status,
      createdAt: decks.createdAt,
      modelProvider: decks.modelProvider,
      modelId: decks.modelId,
      groupId: decks.groupId,
      cardCount: sql<number>`(select count(*) from ${cards} where ${cards.deckId} = ${decks.id})`,
      dueCount: sql<number>`(select count(*) from ${cards} where ${cards.deckId} = ${decks.id} and ${cards.dueAt} <= now())`,
    })
    .from(decks)
    .where(and(eq(decks.userId, userId), ne(decks.status, "archived")))
    .orderBy(desc(decks.createdAt));
}

export async function listArchivedDecks(userId: string) {
  return db
    .select({
      id: decks.id,
      topic: decks.topic,
      level: decks.level,
      goal: decks.goal,
      status: decks.status,
      createdAt: decks.createdAt,
      modelProvider: decks.modelProvider,
      modelId: decks.modelId,
      groupId: decks.groupId,
      cardCount: sql<number>`(select count(*) from ${cards} where ${cards.deckId} = ${decks.id})`,
      dueCount: sql<number>`0`,
    })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.status, "archived")))
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
    .where(
      and(
        eq(decks.userId, userId),
        ne(decks.status, "archived"),
        lte(cards.dueAt, new Date()),
        eq(cards.suspended, false),
      ),
    )
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
    .where(
      and(eq(cards.deckId, deckId), lte(cards.dueAt, new Date()), eq(cards.suspended, false)),
    )
    .orderBy(asc(cards.dueAt), asc(cards.orderIdx))
    .limit(1);
  return next ?? null;
}

export async function listDueCardsForDecks(userId: string, deckIds: string[]) {
  if (deckIds.length === 0) return [];
  return db
    .select({
      id: cards.id,
      front: cards.front,
      back: cards.back,
      whyItMatters: cards.whyItMatters,
      referenceSection: cards.referenceSection,
      repetition: cards.repetition,
      ease: cards.ease,
      state: cards.state,
      userNotes: cards.userNotes,
      deckTopic: decks.topic,
    })
    .from(cards)
    .innerJoin(decks, eq(decks.id, cards.deckId))
    .where(
      and(
        eq(decks.userId, userId),
        ne(decks.status, "archived"),
        inArray(cards.deckId, deckIds),
        lte(cards.dueAt, new Date()),
        eq(cards.suspended, false),
      ),
    )
    .orderBy(asc(cards.dueAt));
}
