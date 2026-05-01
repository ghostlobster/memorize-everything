import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { decks, cards } from "@/lib/db/schema";
import { generateDeck } from "@/lib/ai/generate-deck";
import type { ProviderId } from "@/lib/ai/models";
import type { TopicRequest } from "@/lib/ai/schemas";

export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, id), eq(decks.userId, userId)),
  });
  if (!deck) {
    return Response.json({ ok: false, error: "Deck not found" }, { status: 404 });
  }

  if (deck.status === "ready") {
    return Response.json({ ok: true });
  }

  const override =
    deck.modelProvider && deck.modelId
      ? { provider: deck.modelProvider as ProviderId, modelId: deck.modelId }
      : undefined;

  const topicReq: TopicRequest = {
    topic: deck.topic,
    level: deck.level as TopicRequest["level"],
    goal: deck.goal as TopicRequest["goal"],
    scope: deck.scope ?? undefined,
  };

  let generated: Awaited<ReturnType<typeof generateDeck>>;
  try {
    generated = await generateDeck(topicReq, override);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown generation error";
    await db
      .update(decks)
      .set({ status: "failed", generationError: message })
      .where(eq(decks.id, id));
    return Response.json({ ok: false, error: message }, { status: 500 });
  }

  // neon-http driver does not support transactions; use sequential writes.
  // Insert cards first so that if it fails the deck stays in "failed" state
  // (status update to "ready" only happens after cards are committed).
  try {
    await db.insert(cards).values(
      generated.payload.cards.map((c, idx) => ({
        deckId: id,
        front: c.front,
        back: c.back,
        whyItMatters: c.whyItMatters,
        referenceSection: c.referenceSection,
        orderIdx: idx,
      })),
    );

    await db
      .update(decks)
      .set({
        status: "ready",
        generationError: null,
        sourceMarkdown: generated.markdown,
        mermaidSrc: generated.payload.mermaid,
        mnemonics: generated.payload.mnemonics,
        interleaving: generated.payload.interleaving,
        modelProvider: generated.modelProvider,
        modelId: generated.modelId,
        updatedAt: new Date(),
      })
      .where(eq(decks.id, id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown write error";
    await db
      .update(decks)
      .set({ status: "failed", generationError: message })
      .where(eq(decks.id, id));
    return Response.json({ ok: false, error: message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
