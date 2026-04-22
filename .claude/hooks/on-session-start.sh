#!/usr/bin/env bash
# SessionStart hook for memorize-everything.
#
# Emits a short session brief as additionalContext: current branch,
# whether the lockfile is ahead of node_modules, and whether the
# Drizzle migration set is in sync with the schema.
#
# Stays under ~200 tokens so it's cheap to inject every session.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'detached')"

warnings=()

# Main-branch warning — work should happen on a ticket branch.
if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  warnings+=("on '$branch' — per CLAUDE.md, cut a ticket branch before writing code.")
fi

# Detect lockfile drift. pnpm writes ./node_modules/.pnpm after each install;
# if the lockfile is newer than that marker, deps are stale.
if [[ -f pnpm-lock.yaml ]]; then
  if [[ ! -d node_modules/.pnpm || pnpm-lock.yaml -nt node_modules/.pnpm ]]; then
    warnings+=("pnpm-lock.yaml is newer than installed deps — run \`pnpm install --frozen-lockfile\`.")
  fi
fi

# Detect schema/migration drift — the schema has changed relative to the
# latest migration if schema.ts is newer than every file in ./drizzle.
if [[ -f src/lib/db/schema.ts ]]; then
  latest_mig=""
  if [[ -d drizzle ]]; then
    latest_mig="$(find drizzle -maxdepth 1 -name '*.sql' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)"
  fi
  if [[ -z "$latest_mig" || src/lib/db/schema.ts -nt "$latest_mig" ]]; then
    warnings+=("schema.ts is newer than the latest migration — run \`pnpm db:generate\` before the PR.")
  fi
fi

# Assemble the additionalContext blob.
context="# Harness session brief

- branch: \`$branch\`"

if [[ ${#warnings[@]} -gt 0 ]]; then
  context="$context

Reminders:"
  for w in "${warnings[@]}"; do
    context="$context
- $w"
  done
fi

# Emit as JSON. The field keys are documented in settings.json schema.
jq -cn --arg ctx "$context" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
