import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { availableProviders, MODEL_REGISTRY, resolveModel } from "./models";

const envSnapshot = {
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  DEFAULT_MODEL_PROVIDER: process.env.DEFAULT_MODEL_PROVIDER,
};

function clearKeys() {
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEFAULT_MODEL_PROVIDER;
}

afterEach(() => {
  // Restore to avoid leaking state across suites.
  clearKeys();
  for (const [k, v] of Object.entries(envSnapshot)) {
    if (v != null) process.env[k] = v;
  }
});

describe("availableProviders", () => {
  beforeEach(clearKeys);

  it("returns empty when no keys are set", () => {
    expect(availableProviders()).toEqual([]);
  });

  it("includes providers whose keys are set", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    process.env.ANTHROPIC_API_KEY = "y";
    expect(availableProviders()).toEqual(["google", "anthropic"]);
  });

  it("does not include providers missing keys", () => {
    process.env.OPENAI_API_KEY = "z";
    expect(availableProviders()).toEqual(["openai"]);
  });
});

describe("resolveModel", () => {
  beforeEach(clearKeys);

  it("uses DEFAULT_MODEL_PROVIDER when available", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    process.env.DEFAULT_MODEL_PROVIDER = "google";
    const strong = resolveModel("strong");
    expect(strong.provider).toBe("google");
    expect(strong.tier).toBe("strong");
  });

  it("falls back to first available provider when DEFAULT is missing", () => {
    process.env.ANTHROPIC_API_KEY = "y";
    const strong = resolveModel("strong");
    expect(strong.provider).toBe("anthropic");
  });

  it("honors an explicit provider+modelId override from the registry", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    const m = resolveModel("fast", {
      provider: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
    });
    expect(m.provider).toBe("anthropic");
    expect(m.id).toBe("claude-haiku-4-5-20251001");
  });

  it("ignores an override that isn't in the registry", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
    const m = resolveModel("strong", {
      provider: "google",
      modelId: "does-not-exist",
    });
    expect(m.provider).toBe("google");
    expect(m.id).toBe("gemini-2.5-pro"); // falls back to provider+tier
  });

  it("throws when no model matches the provider + tier", () => {
    // No keys set → defaultProvider = 'google' (first in order), but we force
    // a provider override that has no 'fast' tier… all providers have a fast
    // tier, so instead check via direct call with unknown provider shape.
    expect(() =>
      resolveModel("strong", {
        // @ts-expect-error intentionally invalid provider for this negative test
        provider: "unknown-provider",
      }),
    ).toThrow(/No strong model registered/);
  });
});

describe("MODEL_REGISTRY", () => {
  it("has at least one strong and one fast model per provider", () => {
    const providers = new Set(
      Object.values(MODEL_REGISTRY).map((m) => m.provider),
    );
    for (const p of providers) {
      const forProvider = Object.values(MODEL_REGISTRY).filter(
        (m) => m.provider === p,
      );
      expect(forProvider.some((m) => m.tier === "strong")).toBe(true);
      expect(forProvider.some((m) => m.tier === "fast")).toBe(true);
    }
  });

  it("every factory produces a LanguageModel instance", () => {
    // Dummy keys — the AI SDK providers don't verify keys at construction.
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test";
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.OPENAI_API_KEY = "test";
    for (const profile of Object.values(MODEL_REGISTRY)) {
      const model = profile.model();
      expect(model).toBeDefined();
      expect(typeof model).toBe("object");
    }
  });
});
