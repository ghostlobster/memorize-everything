# CLAUDE.md

Project brief for Claude Code sessions working in this repo.

## What this project is

**memorize-everything** is a Next.js 15 web app that generates
Feynman-style learning modules from any topic and drills the learner
with spaced-repetition flashcards. The AI layer is model-agnostic via
the Vercel AI SDK — default provider is Gemini, with Claude and GPT as
swappable fallbacks.

## Non-negotiables

These rules are enforced by CI (`.github/workflows/ci.yml`) and by the
harness hooks in `.claude/`. Work with them, not around them.

1. **Ticket-first.** Every change must reference a GitHub issue in the
   PR body (`Closes #N`, `Fixes #N`, `Refs #N`, or an issue URL).
   Branch names embed the ticket: `<type>/<N>-<slug>`.
2. **Conventional Commits.** Subject line:
   `<type>(<scope>): <summary>`. Allowed types: feat, fix, chore, docs,
   refactor, test, perf, build, ci.
3. **Never push to `main` directly** — open a PR. The PreToolUse Bash
   guard blocks direct pushes and any `--force` push.
4. **Coverage gate.** `pnpm test:coverage` must pass with thresholds
   from `vitest.config.ts` (lines/functions/statements ≥ 70,
   branches ≥ 65). The Stop hook runs this on every turn.
5. **Schema changes generate migrations.** Editing
   `src/lib/db/schema.ts` without committing a matching `drizzle/`
   migration is a PR blocker. The PostToolUse hook reminds you.
6. **Prompt/schema contract changes smoke-test.** Edits to
   `src/lib/ai/{prompts,schemas}.ts` change the deck generation
   contract. Run `pnpm smoke:deck "<topic>"` before the PR — these
   files are excluded from coverage by design.
7. **Never commit secrets.** `.env*` files are gitignored except
   `.env.example`. The PreToolUse guard scans staged diffs via
   `gitleaks` (falling back to a regex scan).

## Stack at a glance

- **Framework:** Next.js 15 App Router, React 19, TypeScript strict.
- **Auth:** Auth.js v5 + GitHub OAuth + Drizzle adapter,
  database sessions.
- **DB:** Neon Postgres + Drizzle ORM. `DATABASE_URL` (pooled) at
  runtime; `DATABASE_URL_UNPOOLED` for `drizzle-kit` migrations.
- **AI:** Vercel AI SDK with provider registry in
  `src/lib/ai/models.ts`. Default handle `google` (`gemini-2.5-pro`
  strong, `gemini-2.5-flash` fast) via env `DEFAULT_MODEL_PROVIDER`.
- **SR scheduler:** custom SM-2 in `src/lib/sr/sm2.ts`, pure + tested.
- **Styling:** Tailwind 3 + shadcn-style UI primitives under
  `src/components/ui/`.
- **Package manager:** `pnpm` (never `npm`/`yarn`).

## Directory map

```
src/
  app/                      # Next.js App Router routes (RSC by default)
    page.tsx                # Home: decks list + sign-in
    decks/new/              # Topic form + Server Action
    decks/[id]/             # Phase 1–4 rendered view
    decks/[id]/review/      # Focused review UI (keyboard 1/2/3)
    review/                 # Global due queue
    review/multi/           # Multi-deck session queue
    calendar/               # Review calendar heatmap
    progress/               # Progress stats page
    api/auth/[...nextauth]/ # Auth.js route
    api/decks/[id]/generate/# Non-blocking generation endpoint (maxDuration=300s)
  components/
    cards/                  # CardGrid + CardEditSheet
    decks/                  # DeckSelectorGrid, DeckGroupSection, DeckActions,
                            # ArchivedDeckList
    layout/site-header.tsx
    markdown/markdown-view.tsx    # react-markdown + remark-math + KaTeX
    mermaid/mermaid-view.tsx      # Client-only Mermaid (dynamic import)
    review/                 # ReviewModeSelect and session UI primitives
    ui/*                    # Primitives (button, card, badge, etc.)
  lib/
    ai/                     # Model registry, prompts, Zod contracts,
                            # generate-deck.ts, prime-card.ts,
                            # mermaid.ts (fence stripper)
    auth/                   # Auth.js config + handlers + require-user
    db/                     # Drizzle schema, Neon client, pglite client
                            # driver-neon.ts / driver-pglite.ts / client.ts
    sr/sm2.ts               # Spaced-repetition scheduler (tested)
    utils.ts, env.ts, calendar.ts, progress.ts
  server/actions/
    decks.ts                # Server Actions (create/grade/prime/analogy/
                            # suspend/unsuspend/edit card)
    groups.ts               # Folder (group) CRUD actions
    progress.ts             # Progress aggregation
  types/                    # d.ts augmentations
drizzle/                    # Generated migrations (commit these!)
e2e/                        # Playwright specs
scripts/smoke-deck.ts       # End-to-end generation, no UI
.github/                    # CI, Dependabot, PR/issue templates, CODEOWNERS
.claude/                    # This harness
```

## Pitfalls (things that have bitten us)

- **Mermaid must be client-only.** `MermaidView` uses `'use client'`
  + dynamic `import('mermaid')`. Do not import it from a Server
  Component.
- **`generate-deck.ts` and `prime-card.ts` are excluded from coverage.**
  They're thin network wrappers. Test-worthy helpers go into
  `mermaid.ts`, `models.ts`, etc.
- **Server Actions live in `src/server/actions/`, not `src/app/api/`.**
  Only Auth.js uses the `api/` route. Deck generation uses an API route
  (`api/decks/[id]/generate`) because it needs `maxDuration = 300`.
- **Ease factor clamp is `[1.3, 2.8]`.** Changing these constants
  requires updating `src/lib/sr/sm2.test.ts`.
- **Stub env vars for `next build`.** Build imports the Auth.js
  config and the Neon client; both throw on missing env. CI sets
  stubs — never wire a real `DATABASE_URL` into CI.
- **`pnpm` only.** `package.json` pins the manager via the
  `packageManager` field; using `npm install` will corrupt the
  lockfile.
- **Always filter `suspended = false` in card queries.** Suspended
  cards must be excluded from review queues, due counts, and the active
  `cardCount` shown on the home page. All queries in
  `src/server/actions/decks.ts` that surface card counts to the user
  already do this — do not remove the filter when modifying those
  queries.
- **Drizzle uses `casing: "camelCase"` on both drivers.** DB column
  names are camelCase (e.g. `deckId`, `dueAt`). Both `driver-neon.ts`
  and `driver-pglite.ts` set `casing: "camelCase"` in the Drizzle
  config. Keep this consistent when adding new drivers or queries.
- **Decks can be organised into named groups (folders).** The
  `deck_group` table holds groups; `deck.groupId` is a nullable FK.
  Ungrouped decks have `groupId = null`. The home page component
  `DeckGroupSection` aggregates `cardCount` and `dueCount` from the
  `decks` prop — pass the correct subset, not the full deck list.

## Preferred commands

```bash
pnpm dev                         # local dev server
pnpm typecheck                   # fast; use liberally
pnpm test                        # vitest run
pnpm test:coverage               # enforced thresholds
pnpm lint
pnpm build                       # slow; used in /ship
pnpm smoke:deck "<topic>"        # end-to-end AI test without UI
pnpm db:generate                 # after schema.ts edits
pnpm db:migrate                  # applies pending migrations
pnpm db:studio                   # browse Neon
pnpm e2e                         # Playwright (needs `pnpm e2e:install` once)
```

## Where to find things in chat

- The PR template is in `.github/PULL_REQUEST_TEMPLATE.md` — use it
  verbatim when drafting PR descriptions.
- Branch protection + commit rules: `CONTRIBUTING.md`.
- Open tickets: ask the user or use `mcp__github__list_issues`.

## When in doubt

- Small, reversible, local edits: just do them.
- Anything touching `main`, prod DB, Vercel env, or force-push: ask
  first.
- When a plan gets above ~5 steps, use TodoWrite.
