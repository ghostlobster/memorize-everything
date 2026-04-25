import { createNeonDb } from "./driver-neon";
import * as schema from "./schema";

/**
 * DB client factory.
 *
 * Driver is selected at module-load time via `DB_DRIVER`:
 *   - unset or "neon" (default) → Neon HTTP driver (prod / local dev)
 *   - "pglite"                   → in-process pglite driver (E2E only)
 *
 * The `require("./driver-pglite")` is intentionally a static
 * literal so the Next bundler resolves it and includes the file in
 * the server build. An earlier attempt used a computed-string
 * `require` to keep pglite out of the prod bundle, but Next's
 * "Collecting page data" phase still evaluates this module — and
 * with the file missing from the bundle, the require fails at
 * build time when DB_DRIVER=pglite. Static include is safer:
 * pglite ships in the bundle but is never executed in prod
 * (DB_DRIVER is unset there → Neon branch only).
 */

function createDb() {
  const driver = process.env.DB_DRIVER ?? "neon";
  if (driver === "pglite") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./driver-pglite") as typeof import("./driver-pglite");
    return mod.createPgliteDb();
  }
  return createNeonDb();
}

export const db = createDb();
export type DB = typeof db;
export { schema };
