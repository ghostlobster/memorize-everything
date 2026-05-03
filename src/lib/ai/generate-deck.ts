import { generateText, generateObject, type SystemModelMessage } from "ai";
import type { ProviderId } from "./models";
import { resolveModel } from "./models";
import { normalizeMermaid } from "./mermaid";
import {
  KNOWLEDGE_ARCHITECT_SYSTEM,
  PHASE1_INSTRUCTIONS,
  PHASE234_INSTRUCTIONS,
  buildTopicPrompt,
} from "./prompts";
import { DeckPayloadSchema, type DeckPayload, type TopicRequest } from "./schemas";

function cachedSystem(content: string, provider: ProviderId): string | SystemModelMessage {
  if (provider !== "anthropic") return content;
  return {
    role: "system",
    content,
    providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
  };
}

export interface GeneratedDeck {
  markdown: string;
  payload: DeckPayload;
  modelProvider: ProviderId;
  modelId: string;
}

/**
 * Two-pass deck generation:
 *   1. Free-form markdown synthesis (Phase 1)
 *   2. Structured object (mermaid graph + cards + mnemonics + interleaving)
 *
 * Kept as two calls so Pass 1 is natural prose with LaTeX and §-section refs,
 * while Pass 2 can enforce a strict Zod schema via the provider's tool-use.
 */
export async function generateDeck(
  req: TopicRequest,
  override?: { provider?: ProviderId; modelId?: string },
): Promise<GeneratedDeck> {
  const profile = resolveModel("strong", override);

  // Pass 1 uses the fast model for the same provider — prose markdown doesn't
  // need heavy reasoning and is the main source of latency. Fall back to the
  // strong profile if the provider has no registered fast model.
  let pass1Profile = profile;
  try {
    pass1Profile = resolveModel("fast", { provider: profile.provider });
  } catch {
    // no fast model for this provider; keep the strong profile
  }

  // Anthropic models don't support explicit temperature in structured output mode
  const supportsTemperature = profile.provider !== "anthropic";

  const pass1 = await generateText({
    model: pass1Profile.model(),
    system: cachedSystem(KNOWLEDGE_ARCHITECT_SYSTEM, pass1Profile.provider),
    prompt: `${buildTopicPrompt(req)}\n\n${PHASE1_INSTRUCTIONS}`,
    ...(supportsTemperature && { temperature: 0.4 }),
  });

  const pass2 = await generateObject({
    model: profile.model(),
    schema: DeckPayloadSchema,
    system: cachedSystem(KNOWLEDGE_ARCHITECT_SYSTEM, profile.provider),
    prompt: [
      buildTopicPrompt(req),
      "",
      "Here is the Phase 1 markdown you already produced:",
      "---",
      pass1.text,
      "---",
      "",
      PHASE234_INSTRUCTIONS,
    ].join("\n"),
    ...(supportsTemperature && { temperature: 0.3 }),
  });

  const mermaid = normalizeMermaid(pass2.object.mermaid);

  return {
    markdown: pass1.text.trim(),
    payload: { ...pass2.object, mermaid },
    modelProvider: profile.provider,
    modelId: profile.id,
  };
}

