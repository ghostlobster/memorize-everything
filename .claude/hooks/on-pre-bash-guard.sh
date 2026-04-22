#!/usr/bin/env bash
# PreToolUse(Bash) guard.
#
# Blocks:
#   - `git push` to main/master (any form)
#   - `git push --force` / `-f` without --force-with-lease AND not to main
#     (force-with-lease is the safe form; force alone is always denied)
#   - `git reset --hard`
#   - `rm -rf <danger>` (root, home, anywhere near the project root)
#
# Scans staged content before `git add` / `git commit` for secrets via
# gitleaks when the binary is available; otherwise a regex fallback.
#
# Decision protocol:
#   emit {"hookSpecificOutput":{"hookEventName":"PreToolUse",
#        "permissionDecision":"deny|ask|allow",
#        "permissionDecisionReason":"..."}}
#   → allow passes silently; deny shows the reason and blocks; ask prompts.
set -euo pipefail

cmd="$(jq -r '.tool_input.command // empty')"
if [[ -z "$cmd" ]]; then exit 0; fi

deny() {
  jq -cn --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

# --- Hard denies -----------------------------------------------------------

# Force pushes without --force-with-lease.
if [[ "$cmd" =~ (^|[[:space:]])git[[:space:]]+push([[:space:]]|$) ]]; then
  if [[ "$cmd" =~ --force-with-lease ]]; then
    :
  elif [[ "$cmd" =~ (^|[[:space:]])(--force|-f)([[:space:]]|$) ]]; then
    deny "Blocked: \`git push --force\` / \`-f\` is not allowed (can overwrite shared history). Use \`--force-with-lease\` and a justifying comment in the PR."
  fi
  # Pushes targeting main/master (positional ref).
  if [[ "$cmd" =~ [[:space:]](main|master|HEAD:main|HEAD:master|:main|:master)([[:space:]]|$) ]]; then
    deny "Blocked: direct pushes to main/master are not allowed. Open a PR from the feature branch (see CONTRIBUTING.md)."
  fi
fi

# git reset --hard — destroys local work without confirmation.
if [[ "$cmd" =~ (^|[[:space:]])git[[:space:]]+reset[[:space:]]+--hard([[:space:]]|$) ]]; then
  deny "Blocked: \`git reset --hard\` discards uncommitted work irreversibly. If this is intentional, run it manually in a shell."
fi

# rm -rf on dangerous paths.
if [[ "$cmd" =~ (^|[[:space:]])rm[[:space:]]+(-[a-zA-Z]*r[a-zA-Z]*f|-rf|-fr)[[:space:]]+ ]]; then
  if [[ "$cmd" =~ [[:space:]](/|\$HOME|~|~/|\.|\./|/home/|/Users/|/root)([[:space:]]|/|$) ]]; then
    deny "Blocked: \`rm -rf\` targeting a dangerous path (/, \$HOME, ~, .). Use explicit relative paths or run the command manually."
  fi
fi

# --- Secret scanning on git add / git commit -------------------------------

if [[ "$cmd" =~ (^|[[:space:]])git[[:space:]]+(add|commit)([[:space:]]|$) ]]; then
  if command -v gitleaks >/dev/null 2>&1; then
    if ! gitleaks protect --staged --no-banner --redact --exit-code 1 >/tmp/gitleaks-harness.log 2>&1; then
      leaked=$(tail -20 /tmp/gitleaks-harness.log | sed 's/"/\\"/g')
      deny "Blocked: gitleaks found potential secrets in staged changes. Unstage and clean before committing.\n\n${leaked}"
    fi
  else
    # Fallback regex scan on staged diff.
    leaks=$(git diff --cached 2>/dev/null | grep -E \
      -e 'AKIA[0-9A-Z]{16}' \
      -e 'sk-[A-Za-z0-9]{20,}' \
      -e 'AIza[0-9A-Za-z_-]{35}' \
      -e 'ghp_[A-Za-z0-9]{36}' \
      -e 'github_pat_[A-Za-z0-9_]{22,}' \
      -e '-----BEGIN (RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----' \
      || true)
    if [[ -n "$leaks" ]]; then
      deny "Blocked: staged diff matches a secret pattern. Install gitleaks for a better scan, or clean the staged content first."
    fi
  fi
fi

# Otherwise allow — fall through to normal permission evaluation.
exit 0
