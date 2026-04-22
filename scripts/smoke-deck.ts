#!/usr/bin/env tsx
/**
 * Smoke test — generate a deck end-to-end without the UI or DB.
 * Usage:
 *   pnpm smoke:deck "AI Engineering"
 *   pnpm smoke:deck "Transformer attention" advanced
 */

import { loadEnv } from "../src/lib/env";
loadEnv();

import { generateDeck } from "../src/lib/ai/generate-deck";

async function main() {
  const topic = process.argv[2] ?? "AI Engineering";
  const level = (process.argv[3] as "novice" | "intermediate" | "advanced") ?? "intermediate";

  console.log(`🧠 Generating deck: "${topic}" (${level})`);
  const t0 = Date.now();
  const deck = await generateDeck({
    topic,
    level,
    goal: "mastery",
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n— Used ${deck.modelProvider}/${deck.modelId} (${elapsed}s)`);
  console.log(`\n=== Markdown (${deck.markdown.length} chars) ===`);
  console.log(deck.markdown.slice(0, 600) + "…");
  console.log(`\n=== Mermaid (${deck.payload.mermaid.length} chars) ===`);
  console.log(deck.payload.mermaid.slice(0, 400));
  console.log(`\n=== Cards (${deck.payload.cards.length}) ===`);
  for (const [i, c] of deck.payload.cards.entries()) {
    console.log(`${i + 1}. [${c.referenceSection}] ${c.front}`);
    console.log(`   → ${c.back.slice(0, 120)}…`);
  }
  console.log(`\n=== Mnemonics (${deck.payload.mnemonics.length}) ===`);
  for (const m of deck.payload.mnemonics) {
    console.log(`- ${m.name}: ${m.device}`);
  }
  console.log(`\n=== Interleaving ===`);
  console.log(
    `- ${deck.payload.interleaving.topic}: ${deck.payload.interleaving.reason}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
