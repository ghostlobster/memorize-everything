import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ProviderId = "google" | "anthropic" | "openai";

export interface ModelProfile {
  provider: ProviderId;
  id: string;
  label: string;
  tier: "strong" | "fast";
  model: () => LanguageModel;
}

/**
 * Registry of usable models. Add to this list to expose new providers.
 * NOTE: individual providers may be disabled at runtime if their API key
 * is missing (see `availableProviders`).
 */
export const MODEL_REGISTRY: Record<string, ModelProfile> = {
  "google:gemini-2.5-pro": {
    provider: "google",
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    tier: "strong",
    model: () => google("gemini-2.5-pro"),
  },
  "google:gemini-2.5-flash": {
    provider: "google",
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    tier: "fast",
    model: () => google("gemini-2.5-flash"),
  },
  "anthropic:claude-opus-4-7": {
    provider: "anthropic",
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    tier: "strong",
    model: () => anthropic("claude-opus-4-7"),
  },
  "anthropic:claude-haiku-4-5-20251001": {
    provider: "anthropic",
    id: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    tier: "fast",
    model: () => anthropic("claude-haiku-4-5-20251001"),
  },
  "openai:gpt-5": {
    provider: "openai",
    id: "gpt-5",
    label: "GPT-5",
    tier: "strong",
    model: () => openai("gpt-5"),
  },
  "openai:gpt-5-mini": {
    provider: "openai",
    id: "gpt-5-mini",
    label: "GPT-5 mini",
    tier: "fast",
    model: () => openai("gpt-5-mini"),
  },
};

export function availableProviders(): ProviderId[] {
  const out: ProviderId[] = [];
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) out.push("google");
  if (process.env.ANTHROPIC_API_KEY) out.push("anthropic");
  if (process.env.OPENAI_API_KEY) out.push("openai");
  return out;
}

function defaultProvider(): ProviderId {
  const env = process.env.DEFAULT_MODEL_PROVIDER as ProviderId | undefined;
  const avail = availableProviders();
  if (env && avail.includes(env)) return env;
  return avail[0] ?? "google";
}

export function resolveModel(
  tier: "strong" | "fast",
  override?: { provider?: ProviderId; modelId?: string },
): ModelProfile {
  if (override?.provider && override.modelId) {
    const key = `${override.provider}:${override.modelId}`;
    const found = MODEL_REGISTRY[key];
    if (found) return found;
  }
  const provider = override?.provider ?? defaultProvider();
  const candidates = Object.values(MODEL_REGISTRY).filter(
    (m) => m.provider === provider && m.tier === tier,
  );
  if (candidates.length === 0) {
    throw new Error(
      `No ${tier} model registered for provider '${provider}'. Check MODEL_REGISTRY and env vars.`,
    );
  }
  return candidates[0]!;
}
