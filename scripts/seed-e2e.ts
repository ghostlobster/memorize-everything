#!/usr/bin/env tsx
/**
 * Seed the pglite data directory used by Playwright's E2E flow.
 *
 * Invoked from Playwright's globalSetup (playwright.config.ts) before
 * the webServer starts. Creates a fresh file-backed pglite DB, runs
 * Drizzle migrations against it, and inserts the fixtures defined in
 * e2e/support/fixtures.ts so every E2E run starts from the same state.
 *
 * Usage:
 *   PGLITE_DATA_DIR=.e2e-db pnpm tsx scripts/seed-e2e.ts
 *   (Playwright sets the env var automatically.)
 */
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import {
  E2E_CARDS,
  E2E_DECK_ID,
  E2E_DECK_TOPIC,
  E2E_SESSION_TOKEN,
  E2E_USER_EMAIL,
  E2E_USER_ID,
  E2E_USER_NAME,
} from "../e2e/support/fixtures";

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  process.chdir(repoRoot);

  const dataDir = process.env.PGLITE_DATA_DIR ?? ".e2e-db";

  // Reset the data directory so every run starts clean.
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.mkdirSync(dataDir, { recursive: true });

  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema, casing: "camelCase" });

  await migrate(db, { migrationsFolder: "./drizzle" });

  // --- Seed fixtures ----------------------------------------------------

  await db.insert(schema.users).values({
    id: E2E_USER_ID,
    email: E2E_USER_EMAIL,
    name: E2E_USER_NAME,
  });

  await db.insert(schema.sessions).values({
    sessionToken: E2E_SESSION_TOKEN,
    userId: E2E_USER_ID,
    // 30 days from now, well beyond any test run.
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await db.insert(schema.decks).values({
    id: E2E_DECK_ID,
    userId: E2E_USER_ID,
    topic: E2E_DECK_TOPIC,
    level: "intermediate",
    goal: "mastery",
    sourceMarkdown: `# ${E2E_DECK_TOPIC}\n\n## Phase 1 — Synthesis\n\n### §1.1 Scaled dot-product attention\n\nAttention computes a weighted sum of value vectors where the weights come from the softmax of query·key similarities, scaled by √d_k.`,
    mermaidSrc: "flowchart TD\n  Q[Query] --> S[Score]\n  K[Key] --> S\n  S --> A[Softmax]\n  A --> O[Output]\n  V[Value] --> O",
    modelProvider: "google",
    modelId: "gemini-2.5-pro",
  });

  await db.insert(schema.cards).values(
    E2E_CARDS.map((card, idx) => ({
      deckId: E2E_DECK_ID,
      front: card.front,
      back: card.back,
      whyItMatters: `Why it matters: foundational concept ${idx + 1}.`,
      referenceSection: "§1.1",
      orderIdx: idx,
      // All cards due "now" so /review has work.
      dueAt: new Date(Date.now() - 60 * 1000),
    })),
  );

  // Sanity check: row counts should match seed intent.
  const userCount = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
  const deckCount = await db.select({ n: sql<number>`count(*)::int` }).from(schema.decks);
  const cardCount = await db.select({ n: sql<number>`count(*)::int` }).from(schema.cards);

  console.log(
    `seeded: ${userCount[0]?.n ?? 0} user(s), ${deckCount[0]?.n ?? 0} deck(s), ${cardCount[0]?.n ?? 0} card(s)`,
  );

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
