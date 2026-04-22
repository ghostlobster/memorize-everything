import { generateText, generateObject } from "ai";
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

  const pass1 = await generateText({
    model: profile.model(),
    system: KNOWLEDGE_ARCHITECT_SYSTEM,
    prompt: `${buildTopicPrompt(req)}\n\n${PHASE1_INSTRUCTIONS}`,
    temperature: 0.4,
  });

  const pass2 = await generateObject({
    model: profile.model(),
    schema: DeckPayloadSchema,
    system: KNOWLEDGE_ARCHITECT_SYSTEM,
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
    temperature: 0.3,
  });

  const mermaid = normalizeMermaid(pass2.object.mermaid);

  return {
    markdown: pass1.text.trim(),
    payload: { ...pass2.object, mermaid },
    modelProvider: profile.provider,
    modelId: profile.id,
  };
}

