"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  cards,
  decks,
  pets,
  petEvents,
  petChatMessages,
  type Pet,
  type PetPosition,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { applyXp, type PetState } from "@/lib/pet/xp";
import type { Grade } from "@/lib/db/schema";

/**
 * Lazy upsert: returns the user's pet, creating one with defaults on
 * first call. Safe to call from any auth-required route.
 */
export async function getOrCreatePet(userId: string): Promise<Pet> {
  const existing = await db.query.pets.findFirst({
    where: eq(pets.userId, userId),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(pets)
    .values({ userId })
    .onConflictDoNothing({ target: pets.userId })
    .returning();
  if (created) return created;
  // Conflict path — another concurrent insert won; fetch it.
  const fetched = await db.query.pets.findFirst({
    where: eq(pets.userId, userId),
  });
  if (!fetched) throw new Error("Failed to create or load pet");
  return fetched;
}

export interface AwardPetXpResult {
  delta: number;
  level: number;
  prevLevel: number;
  stage: number;
  prevStage: number;
  species: string;
  prevSpecies: string;
  leveledUp: boolean;
  evolved: boolean;
  speciesShifted: boolean;
  xp: number;
}

/**
 * Apply an XP delta from a card grade. Pure logic lives in `applyXp`;
 * this wrapper persists the new state and logs noteworthy events.
 */
export async function awardPetXp(
  userId: string,
  grade: Grade,
  topic: string,
): Promise<AwardPetXpResult> {
  const pet = await getOrCreatePet(userId);
  const prev: PetState = {
    xp: pet.xp,
    level: pet.level,
    stage: pet.stage,
    species: pet.species,
    topicTally: (pet.topicTally as Record<string, number>) ?? {},
  };
  const r = applyXp(prev, grade, topic);

  const mood =
    grade === "right" ? "happy" : grade === "wrong" ? "tired" : "neutral";
  const now = new Date();

  await db
    .update(pets)
    .set({
      xp: r.next.xp,
      level: r.next.level,
      stage: r.next.stage,
      species: r.next.species,
      topicTally: r.next.topicTally,
      mood,
      lastInteractionAt: now,
      updatedAt: now,
    })
    .where(eq(pets.id, pet.id));

  if (r.xpAwarded > 0) {
    await db.insert(petEvents).values({
      petId: pet.id,
      kind: "xp",
      payload: { delta: r.xpAwarded, grade, topic },
    });
  }
  if (r.leveledUp) {
    await db.insert(petEvents).values({
      petId: pet.id,
      kind: "levelup",
      payload: { from: r.prevLevel, to: r.next.level },
    });
  }
  if (r.evolved) {
    await db.insert(petEvents).values({
      petId: pet.id,
      kind: "evolve",
      payload: { from: r.prevStage, to: r.next.stage },
    });
  }
  if (r.speciesShifted) {
    await db.insert(petEvents).values({
      petId: pet.id,
      kind: "species_shift",
      payload: { from: r.prevSpecies, to: r.next.species },
    });
  }

  return {
    delta: r.xpAwarded,
    level: r.next.level,
    prevLevel: r.prevLevel,
    stage: r.next.stage,
    prevStage: r.prevStage,
    species: r.next.species,
    prevSpecies: r.prevSpecies,
    leveledUp: r.leveledUp,
    evolved: r.evolved,
    speciesShifted: r.speciesShifted,
    xp: r.next.xp,
  };
}

/**
 * If every non-suspended card in the deck has been reviewed at least
 * once and the deck has no `finishedAt` yet, set it. Returns whether
 * the transition just occurred so callers can trigger memory rebuild.
 */
export async function markDeckFinishedIfComplete(
  deckId: string,
): Promise<{ justFinished: boolean }> {
  const deck = await db.query.decks.findFirst({
    where: eq(decks.id, deckId),
  });
  if (!deck || deck.finishedAt) return { justFinished: false };

  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      reviewed: sql<number>`count(${cards.lastReviewedAt})`,
    })
    .from(cards)
    .where(and(eq(cards.deckId, deckId), eq(cards.suspended, false)));

  if (!row || row.total === 0) return { justFinished: false };
  if (Number(row.reviewed) < Number(row.total)) {
    return { justFinished: false };
  }

  await db
    .update(decks)
    .set({ finishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(decks.id, deckId), isNull(decks.finishedAt)));
  return { justFinished: true };
}

export async function getRecentChat(petId: string, limit = 10) {
  const rows = await db
    .select({
      role: petChatMessages.role,
      content: petChatMessages.content,
      createdAt: petChatMessages.createdAt,
    })
    .from(petChatMessages)
    .where(eq(petChatMessages.petId, petId))
    .orderBy(desc(petChatMessages.createdAt))
    .limit(limit);
  // Return oldest → newest so they can be fed straight into the model.
  return rows.reverse();
}

export async function listRecentPetEvents(petId: string, limit = 20) {
  return db
    .select()
    .from(petEvents)
    .where(eq(petEvents.petId, petId))
    .orderBy(desc(petEvents.createdAt))
    .limit(limit);
}

const NAME_RE = /^[\p{L}\p{N} _-]{1,24}$/u;

export async function renamePetAction(name: string): Promise<void> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!NAME_RE.test(trimmed)) {
    throw new Error("Pet name must be 1–24 letters, numbers, spaces, _ or -.");
  }
  const pet = await getOrCreatePet(user.id);
  await db
    .update(pets)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(pets.id, pet.id));
  await db.insert(petEvents).values({
    petId: pet.id,
    kind: "rename",
    payload: { from: pet.name, to: trimmed },
  });
  revalidatePath("/pet");
}

const ANCHORS = new Set<PetPosition["anchor"]>(["br", "bl", "tr", "tl"]);

export async function updatePetPositionAction(
  pos: PetPosition,
): Promise<void> {
  const user = await requireUser();
  if (!ANCHORS.has(pos.anchor)) throw new Error("Invalid anchor");
  const offsetX = Math.max(0, Math.min(5_000, Math.round(pos.offsetX)));
  const offsetY = Math.max(0, Math.min(5_000, Math.round(pos.offsetY)));
  const pet = await getOrCreatePet(user.id);
  await db
    .update(pets)
    .set({
      position: { anchor: pos.anchor, offsetX, offsetY },
      updatedAt: new Date(),
    })
    .where(eq(pets.id, pet.id));
}

/** Read-only summary used by both the chat route and `/pet`. */
export async function getPetForUser(userId: string) {
  const pet = await getOrCreatePet(userId);
  const events = await listRecentPetEvents(pet.id, 25);
  return { pet, events };
}

/**
 * Pull a sample of cards from each finished deck for the user, used by
 * `rebuildKnowledgeMemory`. Up to 5 cards per deck, ordered by `orderIdx`,
 * up to `deckLimit` decks.
 */
export async function listFinishedDeckSamples(
  userId: string,
  deckLimit = 8,
) {
  const finished = await db
    .select({
      id: decks.id,
      topic: decks.topic,
      level: decks.level,
      goal: decks.goal,
      finishedAt: decks.finishedAt,
    })
    .from(decks)
    .where(and(eq(decks.userId, userId), sql`${decks.finishedAt} is not null`))
    .orderBy(desc(decks.finishedAt))
    .limit(deckLimit);

  const samples = await Promise.all(
    finished.map(async (d) => {
      const sample = await db
        .select({
          front: cards.front,
          back: cards.back,
          whyItMatters: cards.whyItMatters,
        })
        .from(cards)
        .where(and(eq(cards.deckId, d.id), eq(cards.suspended, false)))
        .orderBy(asc(cards.orderIdx))
        .limit(5);
      return { ...d, cards: sample };
    }),
  );
  return samples;
}
