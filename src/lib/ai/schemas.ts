import { z } from "zod";

// Note: min/max numeric constraints on strings and arrays are intentionally
// omitted here. The Anthropic API rejects minLength > 1 and minItems > 1 in
// structured-output schemas. Quality enforcement lives in the prompt instead.

export const FlashcardSchema = z.object({
  front: z
    .string()
    .describe("Question or concept prompt shown on the front of the card."),
  back: z
    .string()
    .describe(
      "Concise answer shown on the back. 1-3 sentences. No markdown headers.",
    ),
  whyItMatters: z
    .string()
    .describe(
      "A single sentence starting with 'Why it matters:' explaining the practical or conceptual significance.",
    ),
  referenceSection: z
    .string()
    .describe(
      "The Phase 1 section id this card references (e.g. '§1.5' or '1.5').",
    ),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const MnemonicSchema = z.object({
  name: z.string().describe("Short label for the mnemonic."),
  device: z.string().describe("The mnemonic itself (e.g. acronym, phrase)."),
  explanation: z.string().optional().describe("How to unpack the mnemonic."),
});
export type Mnemonic = z.infer<typeof MnemonicSchema>;

export const InterleavingSchema = z.object({
  topic: z.string().describe("A related tangent topic to study next."),
  reason: z
    .string()
    .describe("Why interleaving this topic improves retention."),
});
export type Interleaving = z.infer<typeof InterleavingSchema>;

export const DeckPayloadSchema = z.object({
  mermaid: z
    .string()
    .describe(
      "Mermaid.js flowchart syntax for the knowledge graph. Must start with 'flowchart' or 'graph'. Do NOT wrap in markdown code fences. Wrap every node label in double quotes (e.g., A[\"label\"], B{\"label\"}).",
    ),
  cards: z
    .array(FlashcardSchema)
    .describe("High-quality flashcards covering the core concepts (8–20 cards)."),
  mnemonics: z
    .array(MnemonicSchema)
    .describe("Memory devices for dense lists or technical vocabulary (1–5 devices)."),
  interleaving: InterleavingSchema.describe(
    "A related tangent topic for cross-domain retention.",
  ),
});
export type DeckPayload = z.infer<typeof DeckPayloadSchema>;

export const TopicRequestSchema = z.object({
  topic: z.string().min(2).max(200),
  level: z
    .enum(["novice", "intermediate", "advanced"])
    .default("intermediate"),
  goal: z
    .enum(["overview", "exam", "mastery", "research"])
    .default("mastery"),
  scope: z.string().max(500).optional(),
});
export type TopicRequest = z.infer<typeof TopicRequestSchema>;

export const UpdateCardSchema = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(2000),
  whyItMatters: z.string().max(500).optional(),
  referenceSection: z.string().max(50).optional(),
  userNotes: z.string().max(1000).optional(),
});
export type UpdateCard = z.infer<typeof UpdateCardSchema>;
