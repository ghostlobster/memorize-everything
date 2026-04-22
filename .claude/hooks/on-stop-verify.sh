#!/usr/bin/env bash
# Stop hook — every-turn quality gate.
#
# Runs typecheck + test:coverage. If either fails, blocks Stop by
# returning {"continue": false, "stopReason": "..."} and the model
# resumes to fix it.
#
# Skipped when:
#   - the session made no .ts/.tsx edits (saves ~5s on chat-only turns)
#   - running outside the project root
#   - HARNESS_SKIP_GATE=1 is set (for escape-hatch sessions)
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root"

if [[ "${HARNESS_SKIP_GATE:-0}" == "1" ]]; then
  jq -cn '{ systemMessage: "Harness gate skipped (HARNESS_SKIP_GATE=1)." }'
  exit 0
fi

# Fast skip: if no staged/unstaged TS changes, don't waste 5s typechecking.
if ! git status --porcelain 2>/dev/null | grep -qE '^.+\.(ts|tsx)$'; then
  exit 0
fi

# Run the gate. Capture output so we can echo it back on failure.
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

if ! pnpm -s typecheck >"$tmp" 2>&1; then
  reason=$(printf 'Typecheck failed:\n\n%s' "$(tail -40 "$tmp")")
  jq -cn --arg r "$reason" '{ continue: false, stopReason: $r }'
  exit 0
fi

if ! pnpm -s test:coverage >"$tmp" 2>&1; then
  reason=$(printf 'Tests or coverage threshold failed:\n\n%s' "$(tail -40 "$tmp")")
  jq -cn --arg r "$reason" '{ continue: false, stopReason: $r }'
  exit 0
fi

jq -cn '{ systemMessage: "✅ typecheck + test:coverage green" }'
