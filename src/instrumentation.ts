import "server-only";

/**
 * Next.js server-startup hook. Runs once when the Node.js server
 * begins, before any request is handled.
 *
 * In E2E (DB_DRIVER=pglite + E2E_DEBUG=1) this is where we run
 * migrations and insert the deterministic fixtures. Doing it
 * here instead of in a separate seed-script process means the
 * Next.js server and the seeder share the *same* pglite instance,
 * which is the only way to share state with @electric-sql/pglite
 * (it does not synchronize multi-process file access).
 *
 * Production servers never enter this branch (env vars are
 * scoped to the E2E workflow + playwright.config.ts).
 */
export async function register() {
  // eslint-disable-next-line no-console
  console.log(
    `[instrumentation] register() runtime=${process.env.NEXT_RUNTIME ?? "<unset>"} ` +
      `driver=${process.env.DB_DRIVER ?? "<unset>"} ` +
      `e2e=${process.env.E2E_DEBUG ?? "<unset>"}`,
  );

  if (
    process.env.DB_DRIVER !== "pglite" ||
    process.env.E2E_DEBUG !== "1"
  ) {
    return;
  }

  const { db, schema } = await import("@/lib/db/client");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { sql } = await import("drizzle-orm");
  const fixtures = await import("../e2e/support/fixtures");

  // We've narrowed via env that DB_DRIVER=pglite, but the public
  // `db` export is typed as the Neon|pglite union. Cast to the
  // pglite shape only for the migrator call.
  type PgliteDb = Parameters<typeof migrate>[0];
  // Idempotent: migrate is a no-op once the journal is up to date.
  await migrate(db as unknown as PgliteDb, { migrationsFolder: "./drizzle" });

  // Seed only when empty so a hot reload doesn't re-insert.
  const [{ n: userCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.users);

  if (userCount > 0) {
    return;
  }

  await db.insert(schema.users).values({
    id: fixtures.E2E_USER_ID,
    email: fixtures.E2E_USER_EMAIL,
    name: fixtures.E2E_USER_NAME,
  });

  await db.insert(schema.sessions).values({
    sessionToken: fixtures.E2E_SESSION_TOKEN,
    userId: fixtures.E2E_USER_ID,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await db.insert(schema.decks).values({
    id: fixtures.E2E_DECK_ID,
    userId: fixtures.E2E_USER_ID,
    topic: fixtures.E2E_DECK_TOPIC,
    level: "intermediate",
    goal: "mastery",
    sourceMarkdown: `# ${fixtures.E2E_DECK_TOPIC}\n\n## Phase 1 — Synthesis\n\n### §1.1 Scaled dot-product attention\n\nAttention computes a weighted sum of value vectors where the weights come from the softmax of query·key similarities, scaled by √d_k.`,
    mermaidSrc:
      "flowchart TD\n  Q[Query] --> S[Score]\n  K[Key] --> S\n  S --> A[Softmax]\n  A --> O[Output]\n  V[Value] --> O",
    modelProvider: "google",
    modelId: "gemini-2.5-pro",
  });

  await db.insert(schema.cards).values(
    fixtures.E2E_CARDS.map((card, idx) => ({
      deckId: fixtures.E2E_DECK_ID,
      front: card.front,
      back: card.back,
      whyItMatters: `Why it matters: foundational concept ${idx + 1}.`,
      referenceSection: "§1.1",
      orderIdx: idx,
      dueAt: new Date(Date.now() - 60 * 1000),
    })),
  );

  // eslint-disable-next-line no-console
  console.log("[instrumentation] e2e fixtures seeded in-process");
}
