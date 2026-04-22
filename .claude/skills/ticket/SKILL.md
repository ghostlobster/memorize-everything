---
name: ticket
description: Start new work the ticket-first way. Create a GitHub issue with the correct template, then cut a feature branch named <type>/<N>-<slug>. Use when the user says "let's start X", "new ticket", "/ticket", or begins work without an existing issue.
---

# /ticket — open issue + branch in one step

Per CLAUDE.md rule 1: every change starts from a ticket. Per
CONTRIBUTING.md: branch name is `<type>/<N>-<slug>`.

## Procedure

1. **Collect the input** from the user (ask only for what's missing):
   - Type: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`,
     `perf`, `build`, `ci`.
   - One-line title.
   - Longer description (optional; ok to draft from the title).

2. **Create the issue** with `mcp__github__issue_write`:
   - Repo: `ghostlobster/memorize-everything`.
   - Title: `<type>: <summary>` (matches Conventional Commit format,
     no `(scope)` required for issues).
   - Body: if type is `feat` → use the Feature Request template
     structure (Problem / Proposed solution / Alternatives / Scope
     / Acceptance). If type is `fix` → use the Bug Report structure
     (What happened / Expected / Steps / Environment / Logs).
     Otherwise a plain description with Acceptance checklist.
   - Labels: map type → GitHub labels (`enhancement` for `feat`,
     `bug` for `fix`, etc.).

3. **Record the issue number** returned by the MCP call.

4. **Cut the branch:**
   - Slug the title: lowercase, kebab-case, ≤ 40 chars, no
     trailing punctuation.
   - `git checkout -b <type>/<N>-<slug>` — from `main`.
   - Confirm with `git branch --show-current`.

5. **Report** the issue URL and the new branch. Suggest the user
   start a TodoWrite list if the ticket is multi-step.

## Example

User: "Start a feat ticket: add cloze deletion support to
flashcards."

You:
1. Issue created: `feat: add cloze deletion support to flashcards`
   → #42.
2. Branch cut: `feat/42-cloze-deletion-support`.
3. All commits on this branch should end with `Refs #42`, and the
   PR body should include `Closes #42`.

## When NOT to run /ticket

- The user already has an open issue — use that number instead
  of creating a duplicate.
- The change is trivial and already has a ticket (e.g. addressing
  a review comment on an in-flight PR).
