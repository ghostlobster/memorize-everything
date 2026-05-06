import { NextResponse } from "next/server";
import { after } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { streamText } from "ai";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { petChatMessages } from "@/lib/db/schema";
import { resolveModel, type ProviderId } from "@/lib/ai/models";
import { petSystemPrompt } from "@/lib/pet/prompts";
import { getOrCreatePet, getRecentChat } from "@/server/actions/pets";
import { compactInteractionMemory } from "@/server/actions/pet-memory";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

const COMPACT_AFTER = 20;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: { messages?: ClientMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const last = body.messages?.at(-1);
  if (!last || last.role !== "user" || !last.content?.trim()) {
    return NextResponse.json({ error: "missing user message" }, { status: 400 });
  }

  const pet = await getOrCreatePet(userId);

  await db.insert(petChatMessages).values({
    petId: pet.id,
    role: "user",
    content: last.content.trim(),
  });

  const recent = await getRecentChat(pet.id, 10);
  const system = petSystemPrompt({
    name: pet.name,
    species: pet.species,
    level: pet.level,
    stage: pet.stage,
    knowledgeMemory: pet.knowledgeMemory,
    interactionMemory: pet.interactionMemory,
  });

  // Honour the user's preferred provider when available.
  const userRow = session.user as { preferredModelProvider?: string | null };
  const preferred = userRow?.preferredModelProvider as ProviderId | undefined;
  const profile = resolveModel("fast", preferred ? { provider: preferred } : undefined);

  const result = streamText({
    model: profile.model(),
    system,
    messages: recent.map((m) => ({ role: m.role, content: m.content })),
    onFinish: async ({ text }) => {
      try {
        await db.insert(petChatMessages).values({
          petId: pet.id,
          role: "assistant",
          content: text,
        });
        after(async () => {
          const [c] = await db
            .select({ n: count() })
            .from(petChatMessages)
            .where(
              and(
                eq(petChatMessages.petId, pet.id),
                eq(petChatMessages.compacted, false),
              ),
            );
          if (c && Number(c.n) >= COMPACT_AFTER) {
            await compactInteractionMemory(pet.id);
          }
        });
      } catch (err) {
        console.error("[pet:chat] persist failed:", err);
      }
    },
  });

  return result.toTextStreamResponse();
}
