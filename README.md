# Memorize Everything

An AI-powered Knowledge Architect: give a topic, get a Feynman-style
deep-dive, a Mermaid knowledge graph, spaced-repetition flashcards,
mnemonics, and an interleaving suggestion — then review with a
self-correction coach that primes you before revealing answers.

> **What's planned next?** See [`ROADMAP.md`](./ROADMAP.md) — auto-generated
> from the open issues; refreshed daily.

## Stack

- **Next.js 15** App Router, React 19, TypeScript strict
- **Auth.js v5** + GitHub OAuth (database sessions)
- **Neon Postgres** + **Drizzle ORM**
- **Vercel AI SDK** — model-agnostic; defaults to Gemini 2.5 Pro /
  Flash, with Anthropic Claude and OpenAI GPT swappable via env var
- **Tailwind CSS**, **react-markdown** + **KaTeX**, **Mermaid**
- **SM-2** scheduler (pure, Vitest-tested) — FSRS-ready schema

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Fill in DATABASE_URL(_UNPOOLED), AUTH_* , and at least one model API key

pnpm db:generate   # generate migrations from schema.ts
pnpm db:migrate    # apply to Neon
pnpm dev
```

Open http://localhost:3000.

### Required environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (runtime) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection (migrations) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app |
| `DEFAULT_MODEL_PROVIDER` | `google` \| `anthropic` \| `openai` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini (default) |
| `ANTHROPIC_API_KEY` | Optional fallback |
| `OPENAI_API_KEY` | Optional fallback |

`.env.local` is git-ignored. Never commit real keys.

## Scripts

```bash
pnpm dev            # next dev
pnpm build          # next build
pnpm lint           # next lint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm test:coverage  # vitest run --coverage (HTML report in ./coverage)
pnpm e2e:install    # one-time: install Playwright chromium
pnpm seed:e2e       # seed the pglite data dir used by E2E
pnpm e2e            # playwright test (golden path against pglite)
pnpm smoke:deck "Bayesian inference"   # generate a deck end-to-end, no UI
pnpm db:generate    # drizzle-kit generate
pnpm db:migrate     # drizzle-kit migrate
pnpm db:studio      # drizzle-kit studio
```

### E2E (Playwright)

E2E runs against a pglite-backed (in-process Postgres) instance
seeded by `scripts/seed-e2e.ts`. No real Neon / Auth.js / AI keys
needed; the seeded Auth.js session cookie grants access to
protected routes.

First run:

```bash
pnpm e2e:install          # browsers — ~100MB download
pnpm e2e                  # runs global-setup → seed → dev server → spec
```

Swap the DB driver anywhere via `DB_DRIVER`:

| `DB_DRIVER` | Driver | Used for |
| --- | --- | --- |
| unset / `neon` | `@neondatabase/serverless` + `drizzle-orm/neon-http` | prod, local dev |
| `pglite` | `@electric-sql/pglite` + `drizzle-orm/pglite` | E2E only |

The `pglite` branch is loaded via a computed `require` string so
it never enters the production server bundle.

## CI / CD

- **CI** (`.github/workflows/ci.yml`): on every PR and push to `main`,
  runs lint → typecheck → vitest (with coverage gate) → `next build`,
  plus a `pr-hygiene` job that enforces Conventional Commit titles and
  requires every PR to reference an issue (`Closes #N`).
- **CD**: Vercel's GitHub integration handles preview deploys for every
  PR and production deploys on every merge to `main`. An optional
  workflow at `.github/workflows/production-deploy.yml` can gate
  production on CI success — disabled by default (flip the
  `VERCEL_DEPLOY_VIA_ACTIONS` repo variable to `true` to enable).
- **Dependabot** weekly, grouped by framework family (Next, React, AI
  SDK, Drizzle, Auth.js, testing, linting).

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the ticket-first workflow,
commit conventions, required branch protection rules, and review rules.

## Architecture at a glance

```
src/
  app/
    page.tsx                       # Home (decks list / sign-in)
    decks/
      new/                         # Topic form + Server Action + loading UI
      [id]/                        # Deck view: Phase 1–4
        review/                    # Focused review + self-correction loop
    review/page.tsx                # Global due queue
    api/auth/[...nextauth]/        # Auth.js routes
  components/
    layout/site-header.tsx
    markdown/markdown-view.tsx     # react-markdown + remark-math + KaTeX
    mermaid/mermaid-view.tsx       # Client-only Mermaid renderer
    ui/*                           # shadcn-style primitives
  lib/
    ai/
      models.ts                    # Provider registry (google/anthropic/openai)
      schemas.ts                   # Zod = tool schemas = DB types
      prompts.ts                   # Knowledge Architect system prompt
      generate-deck.ts             # Two-pass: markdown + structured object
      prime-card.ts                # Priming Q + analogy (fast models)
    auth/                          # Auth.js config + helpers + middleware
    db/                            # Drizzle schema + Neon client
    sr/sm2.ts                      # Pure SM-2 scheduler + tests
    utils.ts
    env.ts                         # Minimal .env loader for scripts
  server/actions/decks.ts          # createDeck / gradeCard / prime / analogy
middleware.ts                      # Protects /decks and /review
drizzle.config.ts
scripts/smoke-deck.ts              # End-to-end generation test
```

## Deploying to Vercel

1. Connect the repo to Vercel.
2. Add a Neon Postgres integration (Marketplace → Neon). This auto-populates
   `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
3. Add the remaining env vars (`AUTH_*`, model API keys,
   `DEFAULT_MODEL_PROVIDER`).
4. Set the GitHub OAuth callback URL to
   `https://<your-domain>/api/auth/callback/github`.
5. Run `pnpm db:migrate` locally against the Neon production branch,
   or wire it into the Vercel build step.

Neon supports per-preview-deploy branches — the `DATABASE_URL` passed
to each preview build is automatically branched.

## Future work (documented trade-offs)

| Deferred feature | Why deferred | What it costs to add |
| --- | --- | --- |
| **Cloze deletions** (`{{c1::…}}`) | Doubles renderer complexity; Phase 3 output is Q/A by design | `card.type='cloze'` + cloze parser + separate review component |
| **Additional card types** (reverse, image occlusion) | YAGNI for MVP | `CardType` enum + per-type render strategies |
| **Tags / sub-decks** | MVP has one deck per topic | New `Tag` + `CardTag` join table; `Deck.parentId` for hierarchy |
| **Custom per-deck scheduler config** | SM-2 defaults are fine | `Deck.schedulerConfig JSONB` |
| **Image / audio attachments** | Text-first Feynman flow | `CardAsset` table + S3/R2 + upload flow |
| **Anki `.apkg` import/export** | No data-lock-in concern yet | `genanki`-js on export, parser on import |
| **FSRS scheduler** | SM-2 is 80/20 | Drop-in replacement of `src/lib/sr/*`; review history already captures what FSRS needs |
| **Leeches / suspend** | Need review data first | Flag cards with ≥N consecutive Wrongs |
| **Shared / public decks** | Social layer is its own product | `Deck.visibility` + share URL + fork |
| **PWA + offline review** | Needs cached due queue | `next-pwa` + service worker + IndexedDB queue |
| **Push reminders** | Needs PWA first | Web Push API + cron over due-queue |
| **Streaming Phase 1 render** | Non-streamed works and keeps server action simple | Split into `streamText` + `streamObject` with suspense boundaries |
| **Prompt + context caching per provider** | AI SDK abstracts; providers differ | Add `providerOptions` per-call (Anthropic `cache_control`, Gemini caches) |
| **Magic-link / Google OAuth** | GitHub covers MVP | Add `Resend` provider + Google OAuth to `lib/auth/config.ts` |

The schema is additive-only for each of these — no breaking migrations required.

## License

Private, for now.
