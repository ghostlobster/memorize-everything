import { describe, it, expect } from "vitest";
import {
  DeckPayloadSchema,
  FlashcardSchema,
  TopicRequestSchema,
} from "./schemas";

const validCard = {
  front: "What is SM-2?",
  back: "A spaced-repetition scheduling algorithm used by Anki.",
  whyItMatters: "Why it matters: it drives the review intervals.",
  referenceSection: "§1.2",
};

describe("FlashcardSchema", () => {
  it("accepts a well-formed card", () => {
    expect(FlashcardSchema.parse(validCard)).toEqual(validCard);
  });

  it("rejects too-short front", () => {
    const r = FlashcardSchema.safeParse({ ...validCard, front: "hi" });
    expect(r.success).toBe(false);
  });

  it("rejects too-short back", () => {
    const r = FlashcardSchema.safeParse({ ...validCard, back: "" });
    expect(r.success).toBe(false);
  });
});

describe("DeckPayloadSchema", () => {
  const payload = {
    mermaid: "flowchart TD\n  A --> B\n  B --> C",
    cards: Array.from({ length: 8 }, (_, i) => ({
      ...validCard,
      front: `${validCard.front} (card ${i + 1})`,
    })),
    mnemonics: [{ name: "FARE", device: "FAREDA — six pillars" }],
    interleaving: {
      topic: "Information retrieval",
      reason: "Underpins RAG intuition.",
    },
  };

  it("accepts a well-formed payload", () => {
    expect(DeckPayloadSchema.parse(payload)).toEqual(payload);
  });

  it("rejects fewer than 8 cards", () => {
    const r = DeckPayloadSchema.safeParse({
      ...payload,
      cards: payload.cards.slice(0, 3),
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 20 cards", () => {
    const r = DeckPayloadSchema.safeParse({
      ...payload,
      cards: Array.from({ length: 21 }, () => validCard),
    });
    expect(r.success).toBe(false);
  });

  it("rejects a tiny mermaid string", () => {
    const r = DeckPayloadSchema.safeParse({ ...payload, mermaid: "short" });
    expect(r.success).toBe(false);
  });

  it("requires at least one mnemonic", () => {
    const r = DeckPayloadSchema.safeParse({ ...payload, mnemonics: [] });
    expect(r.success).toBe(false);
  });
});

describe("TopicRequestSchema", () => {
  it("applies defaults for level and goal", () => {
    const r = TopicRequestSchema.parse({ topic: "AI Engineering" });
    expect(r.level).toBe("intermediate");
    expect(r.goal).toBe("mastery");
  });

  it("accepts valid enums", () => {
    const r = TopicRequestSchema.parse({
      topic: "Bayesian inference",
      level: "advanced",
      goal: "research",
    });
    expect(r).toEqual({
      topic: "Bayesian inference",
      level: "advanced",
      goal: "research",
    });
  });

  it("rejects empty topic", () => {
    const r = TopicRequestSchema.safeParse({ topic: "" });
    expect(r.success).toBe(false);
  });

  it("rejects overly long topic", () => {
    const r = TopicRequestSchema.safeParse({ topic: "x".repeat(201) });
    expect(r.success).toBe(false);
  });

  it("rejects unknown level", () => {
    const r = TopicRequestSchema.safeParse({
      topic: "X",
      level: "guru",
    });
    expect(r.success).toBe(false);
  });
});
