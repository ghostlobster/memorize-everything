#!/usr/bin/env bash
# PostToolUse hook — fires on Write/Edit/MultiEdit.
# If the edit touched src/lib/ai/prompts.ts or src/lib/ai/schemas.ts,
# remind the author to run the deck generation smoke test.
set -euo pipefail

path="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')"

case "$path" in
  */src/lib/ai/prompts.ts|*/src/lib/ai/schemas.ts) ;;
  *) exit 0 ;;
esac

file="$(basename "$path")"

jq -cn --arg f "$file" '{
  systemMessage: ("⚠ " + $f + " changed — run `pnpm smoke:deck \"<topic>\"` before opening the PR."),
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("You just edited " + $f + ". This file defines the deck generation contract (prompts or Zod schemas) and is excluded from unit-test coverage by design. Before opening the PR, run `pnpm smoke:deck \"<topic>\"` with at least one realistic topic and verify the generated deck conforms to DeckPayloadSchema.")
  }
}'
