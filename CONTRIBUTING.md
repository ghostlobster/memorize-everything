# Contributing

Thanks for contributing to memorize-everything.

## TL;DR

1. **Open an issue first** — every change must have an associated ticket.
2. Branch off `main` with a name that embeds the ticket number.
3. Commit using Conventional Commits (`feat:`, `fix:`, `chore:`, …).
4. Open a PR that references the ticket (`Closes #123`) and fill out the
   template. CI will block the merge if the ticket link is missing.
5. Wait for CI green + one code-owner approval, then squash-merge.

## Ticket-first workflow

> **Every implementation must be associated with a ticket.**
> The CI `pr-hygiene` job enforces this and will fail if the PR body does
> not include at least one issue reference.

Before writing any code:

1. Find or create a GitHub issue describing the work.
   - Bugs → **Bug report** template.
   - Features → **Feature request** template.
   - Small chores (typos, doc tweaks, dependency bumps) → a one-line issue
     is still required, but can be terse.
2. Note the issue number (e.g. `#42`). You'll reference it in your branch,
   commits, and PR.

Acceptable ways to reference a ticket in the PR body:

```
Closes #42
Fixes #42
Resolves #42
Refs #42
https://github.com/<org>/memorize-everything/issues/42
```

`Closes` / `Fixes` / `Resolves` auto-close the issue on merge — prefer those
when the PR fully completes the work.

## Branching

- Default branch: `main`. It is always deployable.
- Feature branches: `<type>/<issue-number>-<short-slug>`
  - `feat/42-cloze-cards`
  - `fix/87-review-timer-reset`
  - `chore/101-bump-next-16`

Keep branches short-lived. Rebase on `main` rather than merging it in.

## Commit messages

Follow **Conventional Commits**. The first line format is:

```
<type>(<optional-scope>): <short summary>
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`,
`build`, `ci`.

Include a body when the "why" is non-obvious. Reference the ticket in the
footer:

```
feat(review): persist priming questions per card

Priming questions are now written to the suggestions table so the learner
sees the same question on a future lapse and we can spot prompts that
repeatedly fail to land.

Refs #42
```

## Development loop

```bash
pnpm install
cp .env.example .env.local   # fill in required values
pnpm db:generate && pnpm db:migrate
pnpm dev
```

Before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

All four must pass. Coverage thresholds are enforced in `vitest.config.ts`.

## Pull requests

- Keep PRs focused. One ticket → one PR whenever possible.
- Fill out every section of the PR template.
- Mark the PR as **Draft** until you've verified it locally and CI is green.
- Self-review your own diff first; add inline comments where a reviewer
  might reasonably ask "why?".

### Required CI checks

The following must pass before merge:

| Check | Required |
| --- | --- |
| `CI / Lint · Typecheck · Test · Build` | ✅ |
| `CI / PR hygiene (ticket + title)` | ✅ |

### Review

- At least **one approval from a CODEOWNER** is required (see
  `.github/CODEOWNERS`).
- Reviewers should look for: missing tests, missing docs, schema migrations
  not generated, breaking changes not called out, secrets accidentally
  committed.
- Respond to every review comment with either a fix or a reason it was not
  acted on. Mark resolved threads with the "Resolve conversation" button.

### Merging

- **Squash and merge** only. This keeps `main` history linear and
  one-commit-per-ticket.
- The squash commit message should remain Conventional and retain the
  `Closes #N` footer so the issue auto-closes.
- Force-pushing to `main` is prohibited.

## Branch protection rules

Enable these under **Settings → Branches → Add rule → `main`** (or use
the GitHub UI / API once to apply the settings below). Keep this list in
sync with the CONTRIBUTING workflow above.

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners
  - [ ] Require approval of the most recent reviewable push (enable if you
        want pushes to invalidate prior approvals)
- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Required status checks:
    - `CI / Lint · Typecheck · Test · Build`
    - `CI / PR hygiene (ticket + title)`
- [x] **Require conversation resolution before merging**
- [x] **Require signed commits** *(optional but recommended)*
- [x] **Require linear history** (blocks merge commits — pairs with squash-merge)
- [x] **Do not allow bypassing the above settings**
- [x] **Restrict who can push to matching branches** → nobody (PRs only)
- [x] **Block force pushes**
- [x] **Block deletions**

### Repository settings

Under **Settings → General → Pull Requests**:

- [x] Allow squash merging — default message: "Pull request title and description"
- [ ] Allow merge commits — **OFF**
- [ ] Allow rebase merging — **OFF**
- [x] Always suggest updating pull request branches
- [x] Automatically delete head branches after merge

## Release process

Every merge to `main` deploys to production via the Vercel GitHub
integration. There is no manual release step for the application.

For migrations:

1. Schema change lands in a PR that includes the generated
   `drizzle/NNNN_*.sql` file.
2. Before merging, run `pnpm db:migrate` against the **preview** Neon
   branch to verify.
3. After merging, run `pnpm db:migrate` against the production Neon
   branch (or wire it into a release workflow — tracked in a separate
   ticket).

## Security

- Do not commit `.env*` files other than `.env.example`.
- Never paste real API keys or DB connection strings in issues/PRs.
- Report security issues privately via GitHub Security Advisories (under
  Security → Advisories → Report a vulnerability) rather than a public
  issue.

## Code of conduct

Be kind. Assume good intent. Critique code, not people.
