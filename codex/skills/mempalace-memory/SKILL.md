---
name: mempalace-memory
description: Search, wake up, mine, and inspect project memory using the installed mempalace CLI and this repo's mempalace.yaml. Use when the user asks to search project memory, recover prior context, load wake-up context, mine this repo into memory, save durable context to mempalace, or check mempalace status.
---

# Mempalace Memory

Use the installed `mempalace` CLI for repo/project memory. This repo has `mempalace.yaml` with wing `ai` and rooms for `minion`, `minion_hub`, `minion_site`, `paperclip_minion`, `pixel_agents`, `ai_studio`, `frontend`, `backend`, and related areas.

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
mempalace mine .
```

For a subproject-only refresh:

```bash
mempalace mine minion_hub
```

### Check status

```bash
mempalace status
```

## Saving session context

The installed CLI does not expose the Claude-only MCP diary tools here. For Codex, save durable context by creating or updating concise project notes only when the user asks or when another active memory tool supports direct writes. Then mine the changed notes.

Memory entries should capture decisions, gotchas, deployment recipes, cross-project dependencies, and recurring patterns. Do not save secrets or raw credentials.
