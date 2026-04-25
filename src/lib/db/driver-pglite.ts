import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * In-process pglite driver — E2E only. Never imported from the
 * production server build (client.ts routes here via a computed
 * `require` path that is opaque to bundlers).
 *
 * Migrations are NOT run here; they are applied once by
 * `scripts/seed-e2e.ts` against the same data directory before the
 * Next.js dev server opens the DB. The driver is therefore
 * synchronous — the PGlite constructor opens the data dir, queries
 * await internal readiness as needed.
 *
 * Data directory is overridable via `PGLITE_DATA_DIR`; defaults to
 * `.e2e-db` in the repo root. Must be the same value passed to the
 * seed script so both processes share the file-backed store.
 */
export function createPgliteDb() {
  const dataDir = process.env.PGLITE_DATA_DIR ?? ".e2e-db";
  const client = new PGlite(dataDir);
  return drizzle(client, { schema, casing: "camelCase" });
}

export type PgliteDB = ReturnType<typeof createPgliteDb>;
