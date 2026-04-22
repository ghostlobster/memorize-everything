---
name: db-inspect
description: Read-only SQL inspection of the Neon preview branch for debugging. Refuses INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE. Use when the user asks "what does the DB look like", "count cards due", or issues a specific SELECT. Never touches production.
---

# /db-inspect — read-only DB queries

A skill instead of the Postgres MCP so we keep the tool surface
small and the safety rails explicit. Wraps `drizzle-kit` and raw
`psql` with enforced SELECT-only semantics.

## Procedure

1. **Verify the target is NOT production.**
   - Read `DATABASE_URL_UNPOOLED` from `.env.local`.
   - If the hostname contains `prod`, `production`, or
     `main.<team>.neon.tech`, refuse. Production is off-limits
     from chat.
   - Prefer the Neon **preview branch** URL. If the user is on
     `main` locally, ask them to switch to a feature branch first
     so any accidental write is against preview.

2. **Sanitize the query.** Reject if the SQL (case-insensitive)
   contains any of:
   - `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`,
     `CREATE`, `GRANT`, `REVOKE`, `;` (multi-statement).
   Only `SELECT` / `WITH ... SELECT` / `EXPLAIN` pass.
   Auto-inject `LIMIT 50` if the query lacks a LIMIT.

3. **Prefer Drizzle Studio** for ad-hoc browsing when the user
   just wants to "look around":
   ```bash
   pnpm db:studio
   ```
   Prints a URL; user clicks. No query involved.

4. **For specific queries**, use `psql`:
   ```bash
   psql "$DATABASE_URL_UNPOOLED" -c "<sanitized SELECT>" --tuples-only --no-align
   ```
   Cap output rows. If no `psql` binary, suggest installing it or
   fall through to Drizzle Studio.

5. **Common canned queries** (offer as shortcuts):
   - Due cards: `SELECT count(*) FROM card WHERE due_at <= now();`
   - Active users: `SELECT count(DISTINCT user_id) FROM review WHERE reviewed_at > now() - interval '7 days';`
   - Deck stats: `SELECT topic, level, created_at FROM deck ORDER BY created_at DESC LIMIT 10;`

## Hard rules

- Read-only. No write path, ever.
- Preview branch only. Refuse on prod hostnames.
- No raw `DATABASE_URL` printed to chat (connection strings
  contain credentials).

## When NOT to run /db-inspect

- User wants to modify data — redirect to a proper migration via
  `/migrate`, or ask them to run the write manually in `psql`.
- No `.env.local` present — can't locate the DB URL safely.
