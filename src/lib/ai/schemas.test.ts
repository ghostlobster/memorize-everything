import { describe, it, expect } from "vitest";
import {
  DeckPayloadSchema,
  FlashcardSchema,
  TopicRequestSchema,
  UpdateCardSchema,
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

  it("accepts short strings (length enforced by prompt, not schema)", () => {
    const r = FlashcardSchema.safeParse({ ...validCard, front: "hi" });
    expect(r.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const r = FlashcardSchema.safeParse({ front: "What is SM-2?" });
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

  it("accepts empty arrays (counts enforced by prompt, not schema)", () => {
    const r = DeckPayloadSchema.safeParse({ ...payload, cards: [], mnemonics: [] });
    expect(r.success).toBe(true);
  });

  it("accepts more than 20 cards (max enforced by prompt, not schema)", () => {
    const r = DeckPayloadSchema.safeParse({
      ...payload,
      cards: Array.from({ length: 21 }, () => validCard),
    });
    expect(r.success).toBe(true);
  });

  it("accepts a short mermaid string (length enforced by prompt, not schema)", () => {
    const r = DeckPayloadSchema.safeParse({ ...payload, mermaid: "short" });
    expect(r.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const r = DeckPayloadSchema.safeParse({ mermaid: "flowchart TD\n  A --> B" });
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

describe("UpdateCardSchema", () => {
  const valid = {
    front: "What is X?",
    back: "X is a thing.",
    whyItMatters: "Why it matters: it enables Y.",
    referenceSection: "§1.2",
    userNotes: "Remember: X ≈ Y in context Z",
  };

  it("accepts a fully populated update", () => {
    expect(UpdateCardSchema.parse(valid)).toEqual(valid);
  });

  it("accepts minimal update (only required fields)", () => {
    const r = UpdateCardSchema.safeParse({ front: "Q?", back: "A." });
    expect(r.success).toBe(true);
  });

  it("rejects empty front", () => {
    const r = UpdateCardSchema.safeParse({ ...valid, front: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty back", () => {
    const r = UpdateCardSchema.safeParse({ ...valid, back: "" });
    expect(r.success).toBe(false);
  });

  it("rejects front exceeding max length", () => {
    const r = UpdateCardSchema.safeParse({ ...valid, front: "x".repeat(1001) });
    expect(r.success).toBe(false);
  });

  it("rejects back exceeding max length", () => {
    const r = UpdateCardSchema.safeParse({ ...valid, back: "x".repeat(2001) });
    expect(r.success).toBe(false);
  });

  it("rejects userNotes exceeding max length", () => {
    const r = UpdateCardSchema.safeParse({ ...valid, userNotes: "x".repeat(1001) });
    expect(r.success).toBe(false);
  });
});
