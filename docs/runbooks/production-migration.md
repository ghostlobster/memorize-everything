# Production migration runbook (#24)

Use this once to bring the live `main`-branch Neon DB to the
schema currently on `main` of this repo, finalize the GitHub
OAuth callback, and smoke-test the live preview.

After this runbook is done, every future schema change ships via
a feature PR that includes a fresh `drizzle/NNNN_*.sql` and gets
applied to production by re-running steps **3** and **4** below.

> **Time budget:** ~20 minutes if Neon + Vercel are already
> wired (they are — verified by the green Vercel preview on
> PRs #25, #26, #27).
>
> **Risk:** the initial migration creates 8 tables on what is
> almost certainly an empty production DB; idempotent if the
> tables already exist (Drizzle's migrator skips applied
> migrations via the `__drizzle_migrations` journal).

---

## 1. Prerequisites — verify Vercel + Neon state (5 min)

In the **Vercel dashboard** for the `memorize-everything`
project:

1. Open **Storage** and confirm a Neon database is connected.
2. Open **Settings → Environment Variables** and confirm these
   exist for the **Production** scope:
   - `DATABASE_URL` — from the Neon integration
   - `DATABASE_URL_UNPOOLED` — from the Neon integration
   - `AUTH_SECRET` — set manually (`openssl rand -base64 32`)
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
   - `DEFAULT_MODEL_PROVIDER` = `google`
   - `GOOGLE_GENERATIVE_AI_API_KEY`

   `AUTH_TRUST_HOST` is **not** required on Vercel — it
   auto-detects the host. Only add it if you see the
   `UntrustedHost` error in runtime logs.

3. **(Optional but recommended)** In the Vercel ↔ Neon
   integration settings, enable **"Branch per preview deploy"**.
   This gives every PR an ephemeral DB branch so preview deploys
   don't share state with production.

If any of the above is missing, fix it first — the migration in
step 3 needs `DATABASE_URL_UNPOOLED` to be the Neon **production**
branch URL.

---

## 2. Pull the production connection string locally (2 min)

Don't store the production string in your shell history; pull it
into `.env.production.local` (gitignored), used only for the
single migration command in step 3.

1. In the Vercel dashboard, **Settings → Environment Variables →
   Production scope**, copy `DATABASE_URL_UNPOOLED`.
2. Locally:

   ```bash
   cd /path/to/memorize-everything
   touch .env.production.local
   chmod 600 .env.production.local
   ```

3. Add the line to `.env.production.local`:

   ```env
   DATABASE_URL_UNPOOLED="<paste-the-production-unpooled-string>"
   ```

   `.env*.local` is in `.gitignore`; this will not be committed.
   The `.production.local` suffix isolates it from your normal
   dev `.env.local`.

---

## 3. Apply the initial migration (5 min)

`drizzle/0000_naive_mesmero.sql` is on `main` (came in via
PR #26). It creates the 8 tables (Auth.js + domain) plus the four
enums.

```bash
# Load only the production env for this single command.
# Pinning DATABASE_URL_UNPOOLED inline keeps the prod string out
# of your shell's persistent env and history.
DATABASE_URL_UNPOOLED="$(grep -E '^DATABASE_URL_UNPOOLED=' .env.production.local | cut -d'=' -f2- | tr -d '"')" \
  pnpm db:migrate
```

Expected output:

```
Reading config file '.../drizzle.config.ts'
Using 'pg' driver for database querying
[✓] migrations applied!
```

If it says `No migrations found` — you are connected to the wrong
URL or running from a stale checkout. Stop and re-verify.

If it complains about an existing table — the migration was
already applied (Drizzle's `__drizzle_migrations` journal will
prove it). Move on to step 4.

**Verify in Neon SQL editor** (or via the Postgres MCP from #18
pointed at this branch — only do this temporarily; the MCP is
intended for the **preview** branch):

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expect: `account`, `card`, `deck`, `review`, `session`,
`suggestion`, `user`, `verificationToken`. Plus the
`__drizzle_migrations` bookkeeping table.

---

## 4. GitHub OAuth callback URL (3 min)

Auth.js redirects from GitHub's OAuth flow back to
`<host>/api/auth/callback/github`. Each Vercel domain (preview,
custom production) needs to be registered.

1. Open https://github.com/settings/developers and find the OAuth
   App backing `AUTH_GITHUB_ID`.
2. Under **Authorization callback URL**, add:
   - `https://<your-production-domain>/api/auth/callback/github`
   - `https://memorize-everything-<owner>.vercel.app/api/auth/callback/github`
     (the Vercel-assigned default domain)
3. GitHub OAuth Apps allow only one callback URL by default. If
   you need multiple (preview + production), either:
   - Use one OAuth App per environment (separate
     `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` per Vercel scope),
     OR
   - Switch to a GitHub App which supports multiple callback URLs.

   Stick with separate OAuth Apps unless this gets painful.

---

## 5. Smoke-test the live preview (5 min)

1. Push a trivial PR (e.g. a typo fix in a comment) or visit the
   most recent merged-to-`main` Vercel deployment.
2. Open the preview URL.
3. Click **Sign in**, complete GitHub OAuth, get redirected back
   to the home page authenticated.
4. Click **New deck**, enter "Smoke test", `intermediate`,
   `mastery`, no scope.
5. Wait for generation (~30–60s). The deck page should render
   with markdown, mermaid graph, cards.
6. Click **Start review**, flip a card (space), grade Right (3).
7. Verify the next card surfaces; `due` count drops by 1.

If any step fails, check **Vercel runtime logs** for the actual
error — most failures at this stage are env-var typos or a
missing migration.

---

## 6. Tick the boxes (1 min)

On **#24** mark these acceptance items complete:

- [x] Vercel ↔ Neon Marketplace integration wired
- [x] Required env vars populated (Production scope)
- [x] **Initial migration applied to production**
- [x] GitHub OAuth callback URL registered
- [x] Sign-in works end-to-end on the live preview
- [x] `/decks/new` successfully creates a deck

Then close #24.

On **#16** task 5, tick:

- [x] Run `pnpm db:migrate` against the production branch
- [x] Add a ticket for a scheduled migration job _(deferred —
      open one when the first additive migration after the
      initial one needs to ship)_

---

## Rollback

If step 3 fails midway (some tables created, others not):

1. The Drizzle migrator runs each statement in a transaction;
   most failures roll back atomically. Check
   `__drizzle_migrations` — if no row was inserted for `0000_*`,
   nothing committed.
2. If partial state remains, drop the affected tables and
   re-run. Safe because production is empty at this point.
3. If you discover production is **not** empty (someone else
   already migrated), stop and reconcile. The journal in
   `drizzle/meta/_journal.json` tells you what should be
   applied; cross-reference with `__drizzle_migrations`.

If steps 4–5 surface bugs in env vars / OAuth config: fix in the
Vercel dashboard or GitHub OAuth App settings, redeploy. The
migration in step 3 doesn't need to be re-run.

---

## Future migrations (this is now the standard flow)

Once steps 1–6 above are complete, every schema change ships
this way:

1. Edit `src/lib/db/schema.ts` on a feature branch.
2. `pnpm db:generate` — creates `drizzle/NNNN_<name>.sql`.
3. Commit the SQL alongside the schema change.
4. PR review + merge.
5. Re-run **step 3** of this runbook against production
   (the migrator only applies whichever migrations are missing
   from `__drizzle_migrations`).

A scheduled migration workflow is explicitly deferred (see
#16 task 5 note) — running `pnpm db:migrate` from a developer
workstation post-merge is the chosen process.
