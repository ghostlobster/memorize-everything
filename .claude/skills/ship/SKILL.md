---
name: ship
description: Run the full pre-PR quality gate (lint, typecheck, test:coverage, build) and draft a Conventional Commits PR body with the ticket reference auto-extracted from the branch name. Use when the user says "ship it", "open a PR", "/ship", or otherwise signals the work is ready for review.
---

# /ship — pre-PR gate

This project's merge policy (CONTRIBUTING.md) requires the
`CI / Lint · Typecheck · Test · Build` and `CI / PR hygiene` checks to
pass before merge. `/ship` runs the same checks locally so you don't
wait on CI to learn about a lint error.

## Procedure

1. **Sanity-check the branch** before running expensive commands:
   - `git status --porcelain` — warn if dirty and ask the user to
     commit or stash first.
   - `git rev-parse --abbrev-ref HEAD` — refuse if on `main` or
     `master`. Cut a feature branch first.
   - Extract ticket number from `<type>/<N>-<slug>`. If the pattern
     doesn't match, prompt the user for an issue number before
     drafting the PR body.

2. **Run the gate in order, failing fast:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:coverage
   pnpm build
   ```
   If any step fails, stop, show the tail of the output, and hand
   control back to the user to fix. Do NOT paper over failures.

3. **Draft the PR body** using
   `.github/PULL_REQUEST_TEMPLATE.md` verbatim. Fill every section:
   - Summary (2–4 sentences).
   - Related ticket → `Closes #<N>` from the branch name.
   - Changes → bullet list derived from
     `git log main..HEAD --oneline`.
   - Test plan → check the boxes that actually apply based on
     what's in the diff (schema changed? prompts changed? UI?).
   - Breaking changes → "None" unless the diff says otherwise.

4. **Push and open the PR:**
   - `git push -u origin <branch>` (retry 4× with exponential
     backoff on network errors).
   - `mcp__github__create_pull_request` with the drafted title
     (Conventional Commit format) and body.

5. **Report the PR URL** and ask the user whether to subscribe to
   PR activity (review comments, CI status).

## When NOT to run /ship

- Work is still in progress — draft PRs are fine, but the author
  should open them manually without triggering the full gate.
- On `main` — refuse.
- No ticket reference findable — prompt for one; do not make one up.

## Related

- Branch protection: see CONTRIBUTING.md → Branch protection rules.
- Required CI checks must be green before squash-merge.
