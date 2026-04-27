---
name: upgrade
description: "Run a #20-tracked dependency upgrade end-to-end — close the matching Dependabot PR, cut a feature branch, apply the bump, run the per-ticket gate, commit, push, open the upgrade PR, and tick the row on #20. Use when the user says \"/upgrade <N>\", \"do the lucide-react upgrade\", or otherwise references one of the open tracking tickets #29–#36."
---

# /upgrade — automate a tracked dependency upgrade

`#20` is the meta-ticket for the Dependabot major-bump backlog.
Tickets #29–#36 each describe a single major upgrade: the
from→to versions, the breaking changes to expect, the files in
the codebase the upgrade will touch, the risk level, and the
acceptance criteria.

This skill takes a ticket number and runs the upgrade workflow
that's been documented across `CONTRIBUTING.md → Dependabot
triage policy`, the harness, and the per-ticket bodies.
Companion to `/ticket`, `/migrate`, `/deck`, `/db-inspect`,
`/ship`.

## Inputs

The user invokes `/upgrade <N>` where `N` is the tracking ticket
number. **Refuse** if any of the following hold:

- `N` is not an open issue.
- The issue body does not contain `Tracked under #20` (i.e. it
  isn't part of the #20 backlog — Dependabot triage policy says
  patch / minor / action-bump PRs auto-merge instead).
- The user is not on `main` or has uncommitted changes.

## Procedure

### 1. Pre-flight (read-only)

- `mcp__github__issue_read` for ticket `N`. Extract:
  - the package list and current → target versions,
  - the "Repo files this upgrade will likely touch" list,
  - the risk level,
  - the gate items in the Acceptance section (typecheck, lint,
    test:coverage, build are mandatory; smoke:deck, db:generate,
    e2e are conditional on what the ticket lists).
- `git status --porcelain` — must be empty.
- `git rev-parse --abbrev-ref HEAD` — must be `main`.
- `mcp__github__list_pull_requests state=open` — find the
  matching open Dependabot PR by title (the legacy issue numbers
  in the table on #20's mapping comment tell you which Dependabot
  PR title to look for). Remember its number; if no match, that's
  fine — the bump may not have reopened yet, in which case
  proceed and skip step 9.

### 2. Cut the feature branch

Slug from the ticket title — drop the `feat(deps): upgrade ` prefix
and slugify the rest. Examples:

| Ticket title | Branch |
| --- | --- |
| `feat(deps): upgrade lucide-react 0.468 → 1.8 (first stable)` | `feat/33-upgrade-lucide-react` |
| `feat(deps): upgrade typescript 5.9 → 6.0` | `feat/34-upgrade-typescript` |
| `feat(deps): upgrade ai-sdk group (ai 4 → 6, providers 1 → 3)` | `feat/29-upgrade-ai-sdk` |

```bash
git checkout -b feat/<N>-upgrade-<slug>
```

### 3. Apply the bump

- **Single package:** `pnpm add <pkg>@<target>` (use `-D` for a
  package currently in `devDependencies`). Determine which list
  via `jq -r '.dependencies + .devDependencies | keys' package.json`.
- **Group:** one `pnpm add` invocation per package, taking care
  to keep the dep / devDep classification consistent with what
  package.json had before.
- After all bumps: `pnpm install` once to refresh the lockfile.
  Do **not** pass `--frozen-lockfile` — the lockfile must
  regenerate to reflect the new versions.

### 4. Run the per-ticket gate

The ticket's Acceptance section lists which gates apply.
Always run **typecheck → lint → test:coverage → build**, in that
order, stopping on the first failure:

```bash
pnpm typecheck
pnpm lint
pnpm test:coverage
DATABASE_URL=postgresql://stub:stub@localhost:5432/stub pnpm build
```

Conditionally:

- If the acceptance lists `pnpm smoke:deck "<topic>"` — run it
  for each topic the ticket calls out. Requires
  `GOOGLE_GENERATIVE_AI_API_KEY` (or the configured provider
  key) in `.env.local`. Bail if missing.
- If it lists `pnpm db:generate` — run it. The diff against the
  committed `drizzle/` should be empty unless schema changed.
  If non-empty, surface the diff and confirm with the user
  before continuing.
- If it lists `pnpm e2e` — run it locally. Requires
  `pnpm e2e:install` to have completed once. Skip with a warning
  if browsers aren't installed and CI is the validation path.

### 5. Triage typecheck failures

If typecheck fails:

- **Mechanical** — rename, missing explicit type, narrowed
  union, replaced an exported type alias. Apply the fix in-place
  with `Edit` and rerun.
- **Architectural** — function signature changed, new required
  argument, removed API, renamed default export. **Stop.**
  Surface the failing message + file/line + the ticket's
  "Suggested approach" paragraph, and ask the user whether to
  proceed with a workaround or pause.

Lint failures: usually mechanical. Apply auto-fixes via
`pnpm lint --fix` if available; otherwise hand-edit.

Test failures: don't paper over. If a test was relying on the
old version's behaviour, surface the diff and ask.

Coverage drops: surface the new numbers vs the thresholds. If
they fail, surface the file and ask — don't lower thresholds.

### 6. Commit + push

```
feat(deps): upgrade <pkg> <from> → <to>

<one-paragraph summary of breaking changes addressed and what
files were touched in adapting to them>

Refs #<N>
```

If the ticket is part of a group bump (ai-sdk, drizzle, react,
testing), include all packages in the subject:
`feat(deps): upgrade drizzle-orm 0.38 → 0.45, drizzle-kit 0.30 → 0.31`.

```bash
git add -A
git commit -m "<message>"
git push -u origin feat/<N>-upgrade-<slug>
```

The harness's PreToolUse Bash guard will block any
`git push --force` and any push targeting `main`. That's the
safety net.

### 7. Open the PR

`mcp__github__create_pull_request`:

- **base**: `main`
- **head**: `feat/<N>-upgrade-<slug>`
- **title**: matching the commit subject.
- **body**: filled out from the PR template
  (`.github/PULL_REQUEST_TEMPLATE.md`):
  - Summary — paste from the ticket's "Suggested approach".
  - Related ticket — `Closes #<N>`.
  - Changes — bulleted breaking-change adaptations.
  - Test plan — one checked box per gate that ran in step 4.
  - Breaking changes — copy from the ticket.

### 8. Close the Dependabot PR

If step 1 found a matching open Dependabot PR:

- `mcp__github__add_issue_comment` on it:
  `closing — tracked in #<N>; replacement PR #<new>`
- `mcp__github__update_pull_request` with `state=closed`.

### 9. Tick the row on #20

Default: post a one-line comment on #20 via
`mcp__github__add_issue_comment`:

```
Ticked: <pkg> upgrade landed in PR #<new> (closes #<N>).
```

Editing #20's body is more invasive (risks clobbering ongoing
discussion or breaking the existing tables). Only do that if the
user explicitly asks.

### 10. Report

End with:

- the PR URL,
- which gates ran and their results,
- any architectural issues that needed pause,
- whether #20 was ticked.

Subscribe the session to PR activity for the new PR if the user
wants follow-up CI watching, same as the standard
`subscribe_pr_activity` flow.

## Hard rules

- **Never push to `main`.** The PreToolUse Bash guard blocks
  this; don't try to bypass.
- **Never use `--force`.** Use `--force-with-lease` only with
  the user's explicit instruction — and not from this skill.
- **Never call `/ship` from inside `/upgrade`.** The gate run
  in step 4 is a superset; redundant runs cost CI minutes.
- **Never apply schema migrations to production.** If the
  drizzle bump (#30) emits a new migration file in step 5,
  commit it — but stop short of `pnpm db:migrate`. Production
  migration is the runbook
  (`docs/runbooks/production-migration.md`), not this skill.
- **Stop on architectural failures.** If the gate fails on
  something non-mechanical, surface the error and ask. Don't
  paper over it with `as any` casts or test-skip directives.

## When NOT to run /upgrade

- The user is asking about a Dependabot PR that's a patch /
  minor / action bump — those auto-merge per
  `CONTRIBUTING.md → Dependabot triage policy`. Use the regular
  CI flow, not this skill.
- The user wants the broader pre-PR sanity loop (lint +
  typecheck + tests + build + draft a Conventional PR body) for
  any PR — that's `/ship`.
- The repo is not on `main` or has uncommitted changes — refuse
  with a clear message and show `git status` output.
- The ticket isn't open or isn't a #20 tracking ticket — refuse.

## Examples

```
user: /upgrade 33

skill:
  → reads #33: lucide-react 0.468 → 1.8 (first stable), risk LOW
  → finds Dependabot PR titled "chore(deps): bump lucide-react …"
  → cuts feat/33-upgrade-lucide-react from main
  → pnpm add lucide-react@^1.8.0
  → pnpm install (regenerates lockfile)
  → typecheck → fails on `BrainCircuit not exported` (mechanical)
  → swap to `Brain` in src/components/layout/site-header.tsx
  → typecheck → green
  → lint → green
  → test:coverage → green (100/100/100/94.87)
  → build → green
  → e2e → green
  → commit "feat(deps): upgrade lucide-react 0.468 → 1.8"
  → push, open PR, close Dependabot PR with link, comment on #20
  → reports back: PR #N opened, all gates green, #20 row ticked

user: /upgrade 34

skill:
  → reads #34: typescript 5.9 → 6.0, risk MEDIUM
  → cuts feat/34-upgrade-typescript
  → pnpm add -D typescript@^6.0.3
  → typecheck → fails on 4 files with "implicit any in conditional type"
  → mechanical fixes for 3 of them (add explicit type annotations)
  → 4th is in src/lib/db/client.ts — the driver factory's return
    union is now too wide for downstream `.select()` inference
  → ARCHITECTURAL: stops, surfaces the error, points at #34's
    "Repo files this upgrade will likely touch" section, asks
    user how to proceed
```
