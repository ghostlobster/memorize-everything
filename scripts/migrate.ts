/**
 * Safe migration runner for Vercel builds.
 *
 * Drizzle tracks every applied migration in the __drizzle_migrations table,
 * so re-running this script on an already-migrated database is a no-op.
 * If the migration fails the process exits non-zero, which fails the build
 * and prevents a deployment with mismatched schema from going live.
 */
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) {
  console.error(
    "[migrate] DATABASE_URL_UNPOOLED is not set — skipping migration.\n" +
      "Set this env var in Vercel (Project Settings → Environment Variables) " +
      "to the direct (non-pooled) Neon connection string.",
  );
  process.exit(0);
}

console.log("[migrate] Applying pending migrations…");
const sql = neon(url);
const db = drizzle(sql);

void (async () => {
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[migrate] Done.");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    process.exit(1);
  }
})();
