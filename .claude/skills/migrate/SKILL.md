---
name: migrate
description: Safely generate and apply a Drizzle migration after a schema change. Runs pnpm db:generate, shows the generated SQL, and only applies it to the Neon preview branch (never production). Use when the user asks to migrate, after schema.ts edits, or when /migrate is invoked.
---

# /migrate — safe DB migration flow

Drizzle does not generate migrations automatically. After editing
`src/lib/db/schema.ts`, the author must generate the matching SQL
and commit it. This skill makes that flow explicit and refuses to
touch production.

## Procedure

1. **Verify we're in the right state:**
   - `git diff --stat src/lib/db/schema.ts` — confirm the schema
     actually changed.
   - Check `drizzle/` for any existing *uncommitted* migrations;
     surface them if present.

2. **Generate** the migration:
   ```bash
   pnpm db:generate
   ```
   Drizzle writes `drizzle/NNNN_<name>.sql`. Read the file and
   show the SQL to the user. Flag any:
   - `DROP TABLE` / `DROP COLUMN` — destructive.
   - `ALTER COLUMN ... NOT NULL` on an existing column without a
     default — will fail on a non-empty table.
   - `ALTER TYPE ... ADD VALUE` on an enum — cannot be wrapped in
     a transaction in some Postgres versions.

3. **Ask for confirmation** before applying. Show the plan:
   - Target: **preview branch** of the Neon database (from
     `DATABASE_URL_UNPOOLED` in `.env.local` — verify it is NOT
     the production URL; refuse if the hostname contains
     `prod`/`production` or if the user isn't sure).
   - Command: `pnpm db:migrate`.

4. **Apply to preview only:**
   ```bash
   pnpm db:migrate
   ```
   Show output. If it fails, do not retry — hand control back.

5. **Stage and commit** the new migration alongside the schema
   change in the user's current feature branch. The commit should
   be part of the same PR as the schema change, not separate.

## Hard rules

- **NEVER apply migrations to production** from this skill. Prod
  migrations are a release step tracked in a separate ticket.
- **NEVER regenerate an already-applied migration.** If the user
  wants to revise, generate a new migration that undoes +
  re-applies the change.
- **NEVER edit the generated SQL by hand** unless the user
  explicitly asks — Drizzle's journal file tracks hashes.

## When NOT to run /migrate

- No changes in `src/lib/db/schema.ts` — tell the user there's
  nothing to migrate.
- Production DATABASE_URL detected — refuse; direct them to the
  release workflow.
