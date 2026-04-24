import { createNeonDb } from "./driver-neon";
import * as schema from "./schema";

/**
 * DB client factory.
 *
 * Driver is selected at module-load time via `DB_DRIVER`:
 *   - unset or "neon" (default) → Neon HTTP driver (prod / local dev)
 *   - "pglite"                   → in-process pglite driver (E2E only)
 *
 * Production code path is unchanged. Only the E2E flow flips
 * `DB_DRIVER=pglite`. The pglite module is loaded via a computed
 * `require` string so bundlers don't try to pull it into the
 * production server build (pglite is a devDependency).
 */

function createDb() {
  const driver = process.env.DB_DRIVER ?? "neon";
  if (driver === "pglite") {
    // Computed path defeats static analysis so @electric-sql/pglite
    // is never bundled into the production server. See ./driver-pglite.ts.
    const modId = `./driver-${driver}`;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(modId) as typeof import("./driver-pglite");
    return mod.createPgliteDb();
  }
  return createNeonDb();
}

export const db = createDb();
export type DB = typeof db;
export { schema };
