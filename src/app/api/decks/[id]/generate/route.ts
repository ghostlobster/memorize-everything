import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { decks, cards } from "@/lib/db/schema";
import { streamDeck } from "@/lib/ai/generate-deck";
import type { ProviderId } from "@/lib/ai/models";
import type { TopicRequest } from "@/lib/ai/schemas";

export const maxDuration = 300;

const enc = new TextEncoder();
function sseEvent(data: Record<string, unknown>): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(data)}\n\n`);
}

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
    // Already done — send an immediate done event so the client can refresh.
    const body = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(sseEvent({ type: "done" }));
        ctrl.close();
      },
    });
    return new Response(body, { headers: sseHeaders() });
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

  const body = new ReadableStream({
    async start(ctrl) {
      let generated: Awaited<ReturnType<typeof streamDeck>> | null = null;
      try {
        generated = await streamDeck(topicReq, override, (chunk) => {
          ctrl.enqueue(sseEvent({ type: "chunk", text: chunk }));
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown generation error";
        await db
          .update(decks)
          .set({ status: "failed", generationError: message })
          .where(eq(decks.id, id));
        ctrl.enqueue(sseEvent({ type: "error", message }));
        ctrl.close();
        return;
      }

      // neon-http driver does not support transactions; use sequential writes.
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
        const message =
          err instanceof Error ? err.message : "Unknown write error";
        await db
          .update(decks)
          .set({ status: "failed", generationError: message })
          .where(eq(decks.id, id));
        ctrl.enqueue(sseEvent({ type: "error", message }));
        ctrl.close();
        return;
      }

      ctrl.enqueue(sseEvent({ type: "done" }));
      ctrl.close();
    },
  });

  return new Response(body, { headers: sseHeaders() });
}

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  };
}
