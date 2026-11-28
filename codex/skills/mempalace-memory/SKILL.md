---
name: mempalace-memory
description: Search, wake up, mine, and inspect project memory using the installed mempalace CLI and this repo's mempalace.yaml. Use when the user asks to search project memory, recover prior context, load wake-up context, mine this repo into memory, save durable context to mempalace, or check mempalace status.
---

# Mempalace Memory

Use the installed `mempalace` CLI (3.12 or later) for repo/project memory. Everything lands in wing `ai`, from two kinds of local, untracked `mempalace.yaml`:

- The meta-repo root `mempalace.yaml` (gitignored) covers meta files only: rooms `specs`, `proposals`, `audits`, `packages`, `scripts`, `planning`, `research`, plus `exclude_patterns` for scratch (`.local/`), EGM per-round spec copies (`**/egm/**/*target*.md`), raw evidence (`**/evidence/`), audit data dumps (`audits/**/*.{json,csv,html,txt}`, `audits/**/deployed-source/`) and `rankings/`. Audit `.md` reports are still mined.
- Each subproject (`minion`, `minion_hub`, `minion_site`, `minion_plugins`, `paperclip-minion`, `pixel-agents`, `Minion Docs`) has its own `mempalace.yaml` (hidden by that repo's `.git/info/exclude`), whose room is named after it (`minion`, `minion_hub`, `minion_site`, `minion_plugins`, `paperclip_minion`, `pixel_agents`, `documentation`).

Some subproject room maps also carry `exclude_patterns`: `minion` drops vendored bundles (`**/vendor/`, `*.min.js`, `*.min.css`) and `apps/code-atlas/data/`; `paperclip-minion` drops Drizzle schema snapshots (`packages/db/src/migrations/meta/`); `Minion Docs` drops the bulk-imported `agents/community/` definitions; `minion_site` drops the vendored `**/skills/impeccable/`.

Subprojects are mined as separate projects because the meta-repo `.gitignore` ignores every subproject directory, and mempalace respects it. Mined separately, each repo's own `.gitignore` applies, so build output (`.vercel`, `.svelte-kit`, generated paraglide) stays out.

## Command resolution

Prefer `mempalace` on `PATH`. If unavailable, use:

```bash
/home/nikolas/.local/share/mise/installs/python/3.14.0/bin/mempalace
```

Run commands from the repo root unless the user scopes a subproject.

## Common workflows

### Wake up project context

Use this at the start of broad repo work or after compaction:

```bash
mempalace wake-up --wing ai
```

### Search memory

Use focused terms and include a room when the subproject is clear:

```bash
mempalace search "prompt pipeline traceability" --wing ai --room minion
mempalace search "hub websocket reconnect" --wing ai --room minion_hub
```

If the room is uncertain, omit `--room` first, then narrow.

### Mine current repo content

Use when project files changed substantially or the user asks to refresh memory:

```bash
mempalace mine .            # meta files only
mempalace mine minion_hub   # one subproject (repeat per subproject)
```

Never pass `--no-gitignore` or `--include-ignored <subproject>`: `--include-ignored` force-includes the whole subtree, nested `.gitignore` files included, so build output comes back.

To drop drawers whose files are now gitignored or deleted, pass every root so each file is judged by its own repo's `.gitignore`. Run it as a dry run first:

```bash
mempalace sync --wing ai --root . --root minion_hub --root minion --root minion_site \
  --root minion_plugins --root paperclip-minion --root pixel-agents --root "Minion Docs"   # add --apply after review
```

### Automatic refresh (Claude Code hooks)

`~/.mempalace/hooks/mempal_save_hook.sh` (not in any repo) mines every 15 human messages: the session's workspace if it has a `mempalace.yaml`, then each `<workspace>/*/mempalace.yaml` child. Orca worktrees, bot homes and observer sessions have no room map, so they refresh the canonical checkout `~/Documents/CODE/MINION` instead, at most once per 30 minutes (`MEMPAL_FALLBACK_DIR`, `MEMPAL_FALLBACK_SECS`). A worktree is never mined: its paths would duplicate every drawer. Each mine runs at most 5 minutes and resumes on the next run, so a first mine of a large subproject is faster by hand. `mempal_precompact_hook.sh` copies the transcript to `~/.cache/mempalace-stage` and mines it into wing `claude-code` in the background, because Claude Code kills a hook after 30 seconds. To pause the hooks while you write to the palace yourself, write `date +%s` to `~/.mempalace/hook_state/palace_unhealthy` (6-hour cooldown) and delete it when done.

The index follows what is checked out in `~/Documents/CODE/MINION/<subproject>`, not the newest remote branch.

### Check status

```bash
mempalace status          # per-wing/room drawer counts
mempalace repair-status   # vector index vs sqlite; if diverged: mempalace repair --mode from-sqlite --archive-existing
```

## Saving session context

The installed CLI does not expose the Claude-only MCP diary tools here. For Codex, save durable context by creating or updating concise project notes only when the user asks or when another active memory tool supports direct writes. Then mine the changed notes.

Memory entries should capture decisions, gotchas, deployment recipes, cross-project dependencies, and recurring patterns. Do not save secrets or raw credentials.
