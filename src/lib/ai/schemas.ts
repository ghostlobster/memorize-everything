import { z } from "zod";

export const FlashcardSchema = z.object({
  front: z
    .string()
    .min(6)
    .describe("Question or concept prompt shown on the front of the card."),
  back: z
    .string()
    .min(6)
    .describe(
      "Concise answer shown on the back. 1-3 sentences. No markdown headers.",
    ),
  whyItMatters: z
    .string()
    .min(6)
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
    .min(20)
    .describe(
      "Mermaid.js flowchart syntax for the knowledge graph. Must start with 'flowchart' or 'graph'. Do NOT wrap in markdown code fences.",
    ),
  cards: z
    .array(FlashcardSchema)
    .min(8)
    .max(20)
    .describe("High-quality flashcards covering the core concepts."),
  mnemonics: z
    .array(MnemonicSchema)
    .min(1)
    .max(5)
    .describe("Memory devices for dense lists or technical vocabulary."),
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
