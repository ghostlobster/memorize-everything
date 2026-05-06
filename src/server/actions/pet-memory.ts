"use server";

import { generateText } from "ai";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { petChatMessages, petEvents, pets } from "@/lib/db/schema";
import { resolveModel } from "@/lib/ai/models";
import {
  interactionCompactPrompt,
  knowledgeRebuildPrompt,
} from "@/lib/pet/prompts";
import { listFinishedDeckSamples } from "./pets";

const KNOWLEDGE_TOKENS = 1500;
const INTERACTION_TOKENS = 1000;

/**
 * Rebuild the pet's knowledge memory from up to 8 recently finished
 * decks. Logs a `knowledge_rebuild` event so /pet can show a timeline.
 * Errors are swallowed: this runs in `after()` and should never fail
 * the parent grade request.
 */
export async function rebuildKnowledgeMemory(petId: string): Promise<void> {
  try {
    const pet = await db.query.pets.findFirst({ where: eq(pets.id, petId) });
    if (!pet) return;
    const decks = await listFinishedDeckSamples(pet.userId, 8);
    if (decks.length === 0) return;

    const prompt = knowledgeRebuildPrompt({
      petName: pet.name,
      prevMemory: pet.knowledgeMemory,
      decks,
    });

    const { model } = resolveModel("fast");
    const { text } = await generateText({
      model: model(),
      prompt,
      maxOutputTokens: KNOWLEDGE_TOKENS,
    });

    const now = new Date();
    await db
      .update(pets)
      .set({
        knowledgeMemory: text.trim(),
        knowledgeMemoryUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(pets.id, petId));
    await db.insert(petEvents).values({
      petId,
      kind: "knowledge_rebuild",
      payload: { deckCount: decks.length, chars: text.length },
    });
  } catch (err) {
    console.error("[pet] rebuildKnowledgeMemory failed:", err);
  }
}

/**
 * Compact the rolling chat buffer into the pet's interaction memory.
 * Keeps the most recent `KEEP_RECENT` messages live; older un-compacted
 * messages are summarised into Markdown and marked compacted.
 */
const KEEP_RECENT = 6;

export async function compactInteractionMemory(petId: string): Promise<void> {
  try {
    const pet = await db.query.pets.findFirst({ where: eq(pets.id, petId) });
    if (!pet) return;

    const all = await db
      .select()
      .from(petChatMessages)
      .where(
        and(
          eq(petChatMessages.petId, petId),
          eq(petChatMessages.compacted, false),
        ),
      )
      .orderBy(asc(petChatMessages.createdAt));

    if (all.length <= KEEP_RECENT) return;
    const stale = all.slice(0, all.length - KEEP_RECENT);
    if (stale.length === 0) return;

    const prompt = interactionCompactPrompt({
      petName: pet.name,
      prevMemory: pet.interactionMemory,
      messages: stale.map((m) => ({ role: m.role, content: m.content })),
    });

    const { model } = resolveModel("fast");
    const { text } = await generateText({
      model: model(),
      prompt,
      maxOutputTokens: INTERACTION_TOKENS,
    });

    const now = new Date();
    await db
      .update(pets)
      .set({
        interactionMemory: text.trim(),
        interactionMemoryUpdatedAt: now,
        updatedAt: now,
      })
      .where(eq(pets.id, petId));

    const ids = stale.map((m) => m.id);
    if (ids.length > 0) {
      await db
        .update(petChatMessages)
        .set({ compacted: true })
        .where(
          and(
            eq(petChatMessages.petId, petId),
            inArray(petChatMessages.id, ids),
          ),
        );
    }
    await db.insert(petEvents).values({
      petId,
      kind: "interaction_compact",
      payload: { compactedCount: stale.length },
    });
  } catch (err) {
    console.error("[pet] compactInteractionMemory failed:", err);
  }
}

/** Convenience: get only the un-compacted tail (newest first). */
export async function recentChatBuffer(petId: string, limit = 10) {
  return db
    .select()
    .from(petChatMessages)
    .where(eq(petChatMessages.petId, petId))
    .orderBy(desc(petChatMessages.createdAt))
    .limit(limit);
}
