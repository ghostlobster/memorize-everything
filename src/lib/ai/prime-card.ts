import { generateText } from "ai";
import { resolveModel, type ProviderId } from "./models";
import { PRIMING_SYSTEM, ANALOGY_SYSTEM } from "./prompts";

interface CardContext {
  topic: string;
  front: string;
  back: string;
  whyItMatters?: string | null;
  referenceSection?: string | null;
}

export async function primeCard(
  card: CardContext,
  override?: { provider?: ProviderId; modelId?: string },
): Promise<string> {
  const profile = resolveModel("fast", override);
  const { text } = await generateText({
    model: profile.model(),
    system: PRIMING_SYSTEM,
    prompt: [
      `Topic: ${card.topic}`,
      `Flashcard front: ${card.front}`,
      `Flashcard back (do NOT reveal): ${card.back}`,
      card.whyItMatters ? `Why it matters: ${card.whyItMatters}` : null,
      "",
      "Ask one priming question.",
    ]
      .filter(Boolean)
      .join("\n"),
    temperature: 0.5,
    maxOutputTokens: 160,
  });
  return text.trim();
}

export async function analogyForCard(
  card: CardContext,
  override?: { provider?: ProviderId; modelId?: string },
): Promise<string> {
  const profile = resolveModel("fast", override);
  const { text } = await generateText({
    model: profile.model(),
    system: ANALOGY_SYSTEM,
    prompt: [
      `Topic: ${card.topic}`,
      `Flashcard front: ${card.front}`,
      `Flashcard back: ${card.back}`,
      card.whyItMatters ? `Why it matters: ${card.whyItMatters}` : null,
      "",
      "Provide a short analogy or deeper mental model.",
    ]
      .filter(Boolean)
      .join("\n"),
    temperature: 0.6,
    maxOutputTokens: 220,
  });
  return text.trim();
}
