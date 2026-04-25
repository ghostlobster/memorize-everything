import * as schema from "./schema";
import { createNeonDb } from "./driver-neon";
import { createPgliteDb } from "./driver-pglite";

/**
 * DB client factory.
 *
 * Driver is selected at module-load time via `DB_DRIVER`:
 *   - unset or "neon" (default) → Neon HTTP driver (prod / local dev)
 *   - "pglite"                   → in-process pglite driver (E2E only)
 *
 * Both drivers are imported statically so the bundler can resolve
 * them cleanly. `@electric-sql/pglite` lives in `dependencies`
 * (not devDependencies) so the production server can require it
 * even though it is only ever executed when DB_DRIVER=pglite.
 *
 * An earlier attempt used a computed-string `require` to keep
 * pglite out of the prod bundle. That broke the E2E build path
 * because Next's "Collecting page data" phase evaluates this
 * module: a dynamic require could not resolve the file, and a
 * CJS require inside an ESM module fails at runtime in the dev
 * server. Static imports + a regular dep resolve both cases.
 */

function createDb() {
  const driver = process.env.DB_DRIVER ?? "neon";
  if (driver === "pglite") {
    return createPgliteDb();
  }
  return createNeonDb();
}

export const db = createDb();
export type DB = typeof db;
export { schema };
