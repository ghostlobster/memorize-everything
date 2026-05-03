import { generateText, type SystemModelMessage } from "ai";
import { resolveModel, type ProviderId } from "./models";
import { PRIMING_SYSTEM, ANALOGY_SYSTEM } from "./prompts";

function cachedSystem(content: string, provider: ProviderId): string | SystemModelMessage {
  if (provider !== "anthropic") return content;
  return {
    role: "system",
    content,
    providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
  };
}

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
    system: cachedSystem(PRIMING_SYSTEM, profile.provider),
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
    system: cachedSystem(ANALOGY_SYSTEM, profile.provider),
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
