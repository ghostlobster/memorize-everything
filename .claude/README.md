# Claude Code harness

The `.claude/` directory configures Claude Code for this repo so the
ticket-first, coverage-gated, never-push-to-main workflow from
`CONTRIBUTING.md` is enforced at the tool-call layer, not just in CI.

## What's here

```
.claude/
├── README.md                     (this file)
├── settings.json                 team-wide config: permissions + hook wiring
├── settings.local.json           gitignored; personal overrides
├── hooks/
│   ├── on-session-start.sh       branch + lockfile + migration drift brief
│   ├── on-user-prompt.sh         ~50-token branch/ticket injection per prompt
│   ├── on-pre-bash-guard.sh      denies push-to-main, force push, rm -rf;
│   │                             runs gitleaks on git add/commit
│   ├── on-tool-edit-schema.sh    reminds to `pnpm db:generate`
│   ├── on-tool-edit-prompts.sh   reminds to `pnpm smoke:deck`
│   └── on-stop-verify.sh         every-turn typecheck + test:coverage gate
├── skills/
│   ├── ship/SKILL.md             /ship — full pre-PR quality gate
│   ├── ticket/SKILL.md           /ticket — open issue + cut branch
│   ├── migrate/SKILL.md          /migrate — safe Drizzle migration flow
│   ├── deck/SKILL.md             /deck — end-to-end generation smoke test
│   └── db-inspect/SKILL.md       /db-inspect — read-only Neon preview queries
└── agents/
    ├── deck-qa.md                QA generated decks for contract compliance
    ├── schema-migrator.md        Scoped specialist for schema.ts + drizzle/
    └── prompt-tuner.md           Scoped specialist for prompts.ts + schemas.ts
```

## MCP servers

This project **does not ship its own `.mcp.json`.** The GitHub
integration is expected to come from either:

- the user-level MCP config (`~/.claude.json`), OR
- the web harness / IDE integration's managed MCP layer.

If you want to add a project-level MCP server (e.g. a Neon preview-branch
Postgres server), create `.mcp.json` at the repo root with the server
definition and add the server name to `enabledMcpjsonServers` in
`settings.json`. Do NOT commit credentials — use `${ENV_VAR}`
interpolation with `allowedEnvVars`.

The permissions allowlist in `settings.json` pre-approves read-only
GitHub MCP calls (`issue_read`, `pull_request_read`, `search_*`,
`list_*`, `get_*`) and asks before write calls (`issue_write`,
`create_pull_request`, etc.).

## Customizing

**Personal overrides** go in `.claude/settings.local.json` (gitignored).
Common uses:

- Relax the Stop gate locally: `{"hooks":{"Stop":[]}}` during
  prototyping.
- Add a louder status line.
- Add personal permission `allow` entries.

**Disabling a hook temporarily:** set `HARNESS_SKIP_GATE=1` in your
shell — the Stop hook honors it.

**Troubleshooting hooks:**

```bash
# Verify settings.json parses
jq . .claude/settings.json

# Re-run a hook by hand to see its output
echo '{}' | .claude/hooks/on-session-start.sh

# See whether Claude Code loaded your hooks (UI)
/hooks
```

If edits to `.claude/settings.json` aren't picking up, open `/hooks`
once in the Claude Code UI or restart the session — the settings
watcher only tracks directories that existed at session start.
