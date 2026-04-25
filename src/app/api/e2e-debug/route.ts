import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

/**
 * Test-only debug endpoint.
 *
 * Returns row counts from the seeded tables so the E2E spec can
 * verify the server's DB state without poking the file-backed
 * pglite directly. Available only when E2E_DEBUG=1, guaranteed
 * by an env check that 404s in production.
 */
export async function GET() {
  if (process.env.E2E_DEBUG !== "1") {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const [users] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.users);
    const [sessions] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.sessions);
    const [decks] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.decks);
    const [cards] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.cards);

    return NextResponse.json({
      ok: true,
      driver: process.env.DB_DRIVER ?? "neon",
      pgliteDataDir: process.env.PGLITE_DATA_DIR ?? null,
      counts: {
        users: users?.n ?? 0,
        sessions: sessions?.n ?? 0,
        decks: decks?.n ?? 0,
        cards: cards?.n ?? 0,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        driver: process.env.DB_DRIVER ?? "neon",
        pgliteDataDir: process.env.PGLITE_DATA_DIR ?? null,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
