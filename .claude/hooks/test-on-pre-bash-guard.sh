#!/usr/bin/env bash
# Table-test for .claude/hooks/on-pre-bash-guard.sh.
#
# Pipes synthetic tool-input JSON payloads into the guard and checks
# whether it denies (exit-code 0 with permissionDecision=deny) or
# allows (exit-code 0 with no permissionDecision).
#
# Run:
#   bash .claude/hooks/test-on-pre-bash-guard.sh
#
# Exit code 0 if all cases pass, 1 if any fail.

set -uo pipefail

HOOK="$(dirname "$0")/on-pre-bash-guard.sh"

if [[ ! -x "$HOOK" ]]; then
  echo "Hook script not executable: $HOOK" >&2
  exit 2
fi

pass=0
fail=0
failed_cases=()

run_case() {
  local label="$1"
  local cmd="$2"
  local want="$3"  # "deny" or "allow"

  local payload
  payload="$(jq -cn --arg c "$cmd" '{tool_input: {command: $c}}')"

  local out
  out="$(printf '%s' "$payload" | "$HOOK" 2>&1)" || true

  local got
  if echo "$out" | jq -e '.hookSpecificOutput.permissionDecision == "deny"' >/dev/null 2>&1; then
    got="deny"
  else
    got="allow"
  fi

  if [[ "$got" == "$want" ]]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    failed_cases+=("$label — want=$want got=$got")
    printf 'FAIL  %s\n      cmd: %s\n      out: %s\n' "$label" "$cmd" "$out" >&2
  fi
}

# ---------------------------------------------------------------------------
# Legitimate commands — all should ALLOW.
# ---------------------------------------------------------------------------

run_case "plain feature push"        "git push origin feat/foo"                   allow
run_case "delete a feature branch"   "git push origin --delete feat/foo"          allow
run_case "force-with-lease"          "git push --force-with-lease origin feat/x"  allow
run_case "pnpm typecheck"            "pnpm typecheck"                             allow
run_case "rm -rf in subdirectory"    "rm -rf dist"                                allow
run_case "git reset without --hard"  "git reset HEAD"                             allow

# ---------------------------------------------------------------------------
# Legitimate but with trigger words inside comments / strings — #23 repros.
# ---------------------------------------------------------------------------

run_case "main in a comment line (repro of #23)" "$(printf '# content is in main now\ngit push origin --delete feat/foo')" allow
run_case "main in a double-quoted string"        'echo "note: main branch landed"'     allow
run_case "main in a single-quoted string"        "echo 'note: main branch landed'"     allow
run_case "--force in a comment"                  "$(printf '# dont use --force here\ngit push origin feat/foo')" allow

# ---------------------------------------------------------------------------
# Dangerous commands — all should DENY.
# ---------------------------------------------------------------------------

run_case "push to main positional"     "git push origin main"            deny
run_case "push to master positional"   "git push origin master"          deny
run_case "push :main delete"           "git push origin :main"           deny
run_case "push HEAD:main"              "git push origin HEAD:main"       deny
run_case "force push without lease"    "git push --force origin feat/x"  deny
run_case "short -f push"               "git push -f origin feat/x"       deny
run_case "git reset --hard HEAD"       "git reset --hard HEAD"           deny
run_case "rm -rf /"                    "rm -rf /"                        deny
run_case "rm -rf \$HOME"               "rm -rf \$HOME"                   deny
run_case "rm -rf ~"                    "rm -rf ~"                        deny

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

total=$((pass + fail))
echo ""
echo "results: $pass/$total passed"

if [[ $fail -gt 0 ]]; then
  printf '\nfailed cases:\n'
  for c in "${failed_cases[@]}"; do
    printf '  - %s\n' "$c"
  done
  exit 1
fi
