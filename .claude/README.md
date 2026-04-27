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
│   ├── db-inspect/SKILL.md       /db-inspect — read-only Neon preview queries
│   └── upgrade/SKILL.md          /upgrade <N> — run a #20-tracked dep upgrade end-to-end
└── agents/
    ├── deck-qa.md                QA generated decks for contract compliance
    ├── schema-migrator.md        Scoped specialist for schema.ts + drizzle/
    └── prompt-tuner.md           Scoped specialist for prompts.ts + schemas.ts
```

## MCP servers

GitHub MCP comes from the user-level config (`~/.claude.json`) or
the web harness / IDE integration's managed MCP layer — this
project does not redefine it.

**Project-level `.mcp.json` ships one server: `postgres`** —
`@modelcontextprotocol/server-postgres` connecting to
`${DATABASE_URL_PREVIEW}` for read-only DB inspection during
development. Wired up by #18.

### Postgres MCP — safety model

- **Preview-branch only.** The server is invoked with
  `${DATABASE_URL_PREVIEW}`, which by convention points at the
  Neon **preview** branch (see `.env.example`). If the env var is
  unset, the server fails to start — louder than silently falling
  back to a connection that might be production.
- **Read-only by design.** The official
  `@modelcontextprotocol/server-postgres` runs every query inside
  a `READ ONLY` transaction; INSERT/UPDATE/DELETE/DROP are rejected
  by Postgres itself, not by best-effort regex.
- **No credentials in git.** `.mcp.json` references the env var,
  not the connection string. Set `DATABASE_URL_PREVIEW` in
  `.env.local` (gitignored) or in your shell.
- **Enabled per project.** `settings.json` carries
  `enabledMcpjsonServers: ["postgres"]` so the server is opted in
  for the team without needing each developer to approve it.

### Postgres MCP — usage

Once `DATABASE_URL_PREVIEW` is set, ask Claude to inspect rows
naturally — e.g. *"how many cards are due across all decks?"* —
and it will route through `mcp__postgres__query` (already in the
permissions `allow` list). The complementary `/db-inspect` skill
remains available for canned queries (`pnpm db:studio`, common
counts) and is the recommended path when you don't want the
model in the loop.

### Adding more MCP servers

Append to `.mcp.json` and add the new server name to
`enabledMcpjsonServers`. Use `${ENV_VAR}` interpolation; never
commit credentials. The permissions allowlist in `settings.json`
pre-approves read-only GitHub MCP calls (`issue_read`,
`pull_request_read`, `search_*`, `list_*`, `get_*`) and asks
before write calls (`issue_write`, `create_pull_request`, etc.).

## Customizing

**Personal overrides** go in `.claude/settings.local.json` (gitignored).
Common uses:

- Relax the Stop gate locally: `{"hooks":{"Stop":[]}}` during
  prototyping.
- Add a louder status line.
- Add personal permission `allow` entries.

**Disabling a hook temporarily:** set `HARNESS_SKIP_GATE=1` in your
shell — the Stop hook honors it.

**Testing hooks after changes:** the PreToolUse Bash guard has a
table test at `.claude/hooks/test-on-pre-bash-guard.sh`. Run it
with:

```bash
bash .claude/hooks/test-on-pre-bash-guard.sh
```

All cases must pass before committing changes to
`on-pre-bash-guard.sh`. Add a new case for any new regression you
catch (write the failing case first, then fix).

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
