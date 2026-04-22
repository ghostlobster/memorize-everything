#!/usr/bin/env bash
# UserPromptSubmit — minimal context injection on every prompt.
#
# Emits:
#   - current git branch
#   - parsed ticket number from the branch name (e.g. feat/17-foo → #17)
#   - a warning if the branch is main/master
#
# Total payload stays ~50 tokens to keep per-turn cost negligible.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'detached')"

# Extract ticket number from `<type>/<N>-<slug>` branch naming convention.
ticket=""
if [[ "$branch" =~ ^[a-z]+/([0-9]+)- ]]; then
  ticket="#${BASH_REMATCH[1]}"
fi

ctx="branch: \`$branch\`"
if [[ -n "$ticket" ]]; then
  ctx="$ctx · ticket: $ticket"
fi
if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  ctx="$ctx

⚠ on \`$branch\` — per CLAUDE.md, cut a ticket branch (\`<type>/<N>-<slug>\`) before writing code."
fi

jq -cn --arg ctx "$ctx" '{
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: $ctx
  }
}'
