import { describe, it, expect } from "vitest";
import {
  interactionCompactPrompt,
  knowledgeRebuildPrompt,
  petSystemPrompt,
  quizPickPrompt,
} from "./prompts";

describe("petSystemPrompt", () => {
  it("interpolates name, species, level, and both memories", () => {
    const out = petSystemPrompt({
      name: "Spark",
      species: "cyber_fox",
      level: 4,
      stage: 2,
      knowledgeMemory: "## Topics\n- Transformers",
      interactionMemory: "- user prefers concrete code examples",
    });
    expect(out).toContain("Spark");
    expect(out).toContain("neon cyber-fox");
    expect(out).toContain("Stage 2, level 4");
    expect(out).toContain("Transformers");
    expect(out).toContain("concrete code examples");
  });

  it("substitutes a placeholder when knowledge memory is empty", () => {
    const out = petSystemPrompt({
      name: "Pip",
      species: "pip",
      level: 1,
      stage: 1,
      knowledgeMemory: "",
      interactionMemory: "",
    });
    expect(out).toContain("haven't finished any decks");
    expect(out).toContain("first conversation");
  });
});

describe("knowledgeRebuildPrompt", () => {
  it("includes deck topics and a sample of cards", () => {
    const out = knowledgeRebuildPrompt({
      petName: "Spark",
      prevMemory: "",
      decks: [
        {
          topic: "Transformer attention",
          level: "intermediate",
          goal: "mastery",
          cards: [
            {
              front: "What is self-attention?",
              back: "A weighted sum of value vectors using softmax-normalised dot products.",
              whyItMatters: "Why it matters: it lets the model condition on the whole sequence.",
            },
          ],
        },
      ],
    });
    expect(out).toContain("Transformer attention");
    expect(out).toContain("intermediate");
    expect(out).toContain("self-attention");
    expect(out).toContain("Why it matters:");
    expect(out).toContain("## Open questions");
  });
});

describe("interactionCompactPrompt", () => {
  it("includes previous memory and the new transcript", () => {
    const out = interactionCompactPrompt({
      petName: "Spark",
      prevMemory: "- prefers code examples",
      messages: [
        { role: "user", content: "Tell me about K-means" },
        { role: "assistant", content: "It clusters data into K groups." },
      ],
    });
    expect(out).toContain("prefers code examples");
    expect(out).toContain("K-means");
    expect(out).toContain("**user**:");
    expect(out).toContain("**assistant**:");
  });
});

describe("quizPickPrompt", () => {
  it("instructs the model to output one sentence or SKIP", () => {
    const out = quizPickPrompt({
      petName: "Spark",
      knowledgeMemory: "## Topics\n- Krebs cycle",
    });
    expect(out).toContain("Spark");
    expect(out).toContain("Krebs cycle");
    expect(out).toContain("SKIP");
  });
});
