import { describe, it, expect } from "vitest";
import { buildTopicPrompt, KNOWLEDGE_ARCHITECT_SYSTEM } from "./prompts";

describe("buildTopicPrompt", () => {
  it("includes topic, level, and goal", () => {
    const out = buildTopicPrompt({
      topic: "Transformer attention",
      level: "advanced",
      goal: "research",
    });
    expect(out).toContain("Topic: Transformer attention");
    expect(out).toContain("Learner level: advanced");
    expect(out).toContain("Goal: research");
  });

  it("omits the scope line when scope is absent", () => {
    const out = buildTopicPrompt({
      topic: "X",
      level: "novice",
      goal: "overview",
    });
    expect(out).not.toContain("Scope");
  });

  it("includes scope when provided", () => {
    const out = buildTopicPrompt({
      topic: "X",
      level: "intermediate",
      goal: "mastery",
      scope: "focus on encoder-only",
    });
    expect(out).toContain("Scope / constraints: focus on encoder-only");
  });
});

describe("KNOWLEDGE_ARCHITECT_SYSTEM", () => {
  it("mentions the non-negotiable invariants", () => {
    expect(KNOWLEDGE_ARCHITECT_SYSTEM).toContain("Feynman");
    expect(KNOWLEDGE_ARCHITECT_SYSTEM).toContain("referenceSection");
    expect(KNOWLEDGE_ARCHITECT_SYSTEM).toContain("Mermaid");
  });
});
