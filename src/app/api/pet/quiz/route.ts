import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { generateText } from "ai";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db/client";
import { cards, decks } from "@/lib/db/schema";
import { resolveModel } from "@/lib/ai/models";
import { quizPickPrompt } from "@/lib/pet/prompts";
import { getOrCreatePet } from "@/server/actions/pets";

export const runtime = "nodejs";
export const maxDuration = 30;

const COOKIE = "pet_quiz_cooldown";
const COOLDOWN_MS = 10 * 60 * 1000; // 10 min

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Cookie-based rate limit. We don't crash if the header is missing.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const m = new RegExp(`(?:^|; )${COOKIE}=(\\d+)`).exec(cookieHeader);
  if (m) {
    const last = Number(m[1]);
    if (Number.isFinite(last) && Date.now() - last < COOLDOWN_MS) {
      return NextResponse.json({ question: null, reason: "cooldown" });
    }
  }

  const pet = await getOrCreatePet(session.user.id);

  // 50/50: pick a real card from a stale finished deck, or LLM-generate from memory.
  const useCard = Math.random() < 0.5;
  let payload: {
    question: string | null;
    deckId?: string;
    cardId?: string;
    source: "card" | "llm" | "none";
  } = { question: null, source: "none" };

  if (useCard) {
    const [row] = await db
      .select({
        cardId: cards.id,
        deckId: decks.id,
        front: cards.front,
      })
      .from(cards)
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .where(
        and(
          eq(decks.userId, session.user.id),
          isNotNull(decks.finishedAt),
          eq(cards.suspended, false),
        ),
      )
      .orderBy(sql`random()`)
      .limit(1);
    if (row) {
      payload = {
        question: row.front,
        cardId: row.cardId,
        deckId: row.deckId,
        source: "card",
      };
    }
  }

  if (!payload.question && pet.knowledgeMemory.trim()) {
    try {
      const { model } = resolveModel("fast");
      const { text } = await generateText({
        model: model(),
        prompt: quizPickPrompt({
          petName: pet.name,
          knowledgeMemory: pet.knowledgeMemory,
        }),
        maxOutputTokens: 200,
      });
      const cleaned = text.trim();
      if (cleaned && cleaned.toUpperCase() !== "SKIP") {
        payload = { question: cleaned, source: "llm" };
      }
    } catch (err) {
      console.error("[pet:quiz] llm failed:", err);
    }
  }

  const res = NextResponse.json(payload);
  if (payload.question) {
    res.cookies.set(COOKIE, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOLDOWN_MS / 1000,
      path: "/",
    });
  }
  return res;
}
