#!/usr/bin/env bash
# PostToolUse hook — fires on Write/Edit/MultiEdit.
# If the edit touched src/lib/db/schema.ts, emit a reminder to
# regenerate the Drizzle migration.
set -euo pipefail

path="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')"

# Bail silently on anything else.
case "$path" in
  */src/lib/db/schema.ts) ;;
  *) exit 0 ;;
esac

jq -cn '{
  systemMessage: "⚠ schema.ts changed — run `pnpm db:generate` and commit the resulting drizzle/*.sql before opening the PR.",
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: "You just edited src/lib/db/schema.ts. Drizzle migrations are NOT generated automatically. Before this PR can merge, run `pnpm db:generate` and commit the new SQL file under drizzle/. Skipping this is a blocker per CLAUDE.md."
  }
}'
