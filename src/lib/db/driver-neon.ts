import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon HTTP driver. Used in production and local dev against a Neon
 * connection string. Throws on missing DATABASE_URL so misconfiguration
 * fails loudly at startup rather than at first query.
 */
export function createNeonDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and provide a Neon connection string.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema, casing: "camelCase" });
}

export type NeonDB = ReturnType<typeof createNeonDb>;
