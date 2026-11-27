---
id: 2026-11-26-claude-mem-17-upgrade-day
title: claude-mem upgrade — 16.2.1 installed 2026-11-26; Chroma rebuild running; 17 later
status: approved
created: 2026-11-26
updated: 2026-11-26
repos: [minion-meta]
effort: S
source: claude-mem-17-impact-review-2026-11-26
---

# claude-mem upgrade: 16.2.1 now, 17 later

The owner first chose to wait for 17 to be promoted, then approved **16.2.1** (the promoted stable
release on 2026-11-26) the same day. 16.2.1 is now installed. This file records what was done, how
to check it, and what is left before 17. The full breaking-change review is the impact report
(`~/.orca/bots/kip/memory/claude-mem-17-impact.md`, rows 1–13); everything it says about 17
also applies to 16.2.1, except where the table below says otherwise.

## 16.2.1 vs the 17 findings (checked in the 16.2.1 npm tarball)

| Area | 16.2.1 |
|---|---|
| Schema | Migrates v30 → **v75**, 53 migrations, same as 17. One-way: rollback = restore a DB copy. |
| Old-version sweep | Present. Keeps the newest 2 non-orphaned versions, plus versions protected by the registry, the running worker, and **live `.in_use/<pid>` records** that Claude Code writes per session. Claude Code put `.orphaned_at` on 12.4.7 right after the registry switch, so only live pre-upgrade sessions keep it now. |
| Opt-out keys | `CLAUDE_MEM_AUTO_UPDATE`, `CLAUDE_MEM_WORK_STATE_ENABLED`, `CLAUDE_MEM_LOG_RETENTION_DAYS`, `CLAUDE_MEM_PROJECT_ENVIRONMENTS` are the same. `CLAUDE_MEM_BACKUP_RETAIN_COUNT` exists but daily backups are **off by default** (`CLAUDE_MEM_BACKUP_ENABLED=false`). |
| telemetry.json | Same reader as 17: `installId` must be a string. The pre-seeded `{"enabled":false,"installId":"",…}` is accepted. |
| Codex transcript ingestion | Same key and default (`CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION`, default `false`). Pre-seeded `true`, so the watch is still on. |
| Setup script | `scripts/version-check.js` (no `smart-install.js`). |
| Hooks / launcher | Same as 17: exec-form `claude-mem …` hooks; `ensure-launcher.cjs` builds `~/.local/bin/claude-mem`. |
| MCP tools | `search` (with `project`), `timeline`, `get_observations` unchanged; `__IMPORTANT` → `important_workflow`. MCP server runs under `node`. |
| Chroma pin | `pydantic<2.14`, `chromadb==1.5.9`, `onnxruntime>=1.20`, `protobuf<7`. |

## What was done (2026-11-26, ~07:45–08:15 UTC)

1. **Backup** `~/.claude-mem-pre16-2026-11-26/` (`sqlite3 .backup`, `integrity_check` = ok, schema 30;
   plus Chroma, settings, telemetry, sync-state, the 12.4.7 plugin folder, registry files,
   `~/.codex/config.toml`, the Codex wrapper cache, `.bashrc`/`.zshrc`). The pre17 backup is untouched.
2. **Manual install** instead of `npx claude-mem install`, whose interactive setup can write
   `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, reset telemetry from its prompts and overwrite the
   marketplace checkout: copied `plugin/` to `cache/thedotmack/claude-mem/16.2.1`, ran
   `version-check.js` (bun install), ran `ensure-launcher.cjs` (rc files unchanged), and pointed the
   user entry in `installed_plugins.json` at 16.2.1. `known_marketplaces.json` and the marketplace
   checkout are unchanged.
3. **Pre-upgrade sessions:** `12.4.7/scripts/worker-service.cjs` and `mcp-server.cjs` are now shims
   that run the 16.2.1 scripts (originals kept as `*.orig-12.4.7`). A hook from a session started
   before the upgrade therefore runs 16.2.1 code and can never start a 12.4.7 worker on the
   migrated DB. Already-running 12.4.7 MCP servers keep working because they only call the worker's
   HTTP API (`/api/search`, `/api/timeline`, `/api/observations/batch`), which 16.2.1 still serves.
4. **Cutover:** 12.4.7 worker shut down, 16.2.1 worker started; the migration to v75 took ~34 s.
5. **Re-keys:** besides the morning's `minion` → `minion-gateway`, 16.2.1's worktree adoption
   re-created the old key (it set `merged_into_project='minion'` on 16 observations of removed
   gateway worktrees). Fixed: `minion/<worktree>` → `minion-gateway/<worktree>` (16 observations,
   16 sessions) and `merged_into_project` `minion` → `minion-gateway` (16). No lowercase `minion`
   key is left in any project column.
6. **Chroma:** the old collection was unreadable ("Error deserializing pickle file … EOF" in its
   HNSW segment, unchanged since 2026-10-06, so most likely why vector search died). It was moved to
   the pre16 backup and rebuilt from SQLite with 16.2.1's paced backfill; 102 of 110 projects are
   marked `rebuildPending`, which resets their watermarks to 0, so every row is re-embedded. The
   stale `minion` sync-state entry is gone with the old state file.
7. **Settings 16.2.1 changed itself:** it migrated `CLAUDE_MEM_OPENROUTER_MODEL` off a retired free
   model (provider is `claude`, so unused). Added `CLAUDE_MEM_CHROMA_MAX_THREADS=4`.
   `CLAUDE_MEM_LOG_RETENTION_DAYS=30` deleted 228 old log files (~960 MB) on first start.

## Verified

- `/api/health` ok, version 16.2.1; `select max(version) from schema_versions` = 75; quick_check ok.
- `npx claude-mem@16.2.1 doctor`: all required checks pass (warns about a stale
  `alias claude-mem=` pointing at 10.5.2 in `.bashrc`/`.zshrc`; hooks don't use it).
- Log: `Connected to chroma-mcp successfully`.
- `search project=MINION` answers via 16.2.1's MCP server and via Codex's `mcp-search`.
- **Semantic search:** the query "packing mac desktop program breaks since drive stays locked"
  shares no keyword with observation #43741 ("macOS DMG bundler fails with hdiutil disk2 resource
  busy error"); it returned #43741 first in 0.64 s with no keyword-fallback line. Seven more
  searches during the backfill: 0.4–4.1 s, no fallback.
- New Claude session → `sdk_sessions` row 2651 (`claude`); Codex session with a tool call → row
  2652 (`codex`, via the transcript watch).
- Both Codex resolvers (`forwarder.sh resolve`, `config.toml` launcher) pick 16.2.1 with `node`.

## Open ends

- **Chroma rebuild is running** (paced, nice 10, 4 ONNX threads): ~73 docs/min at ~1.9 cores,
  ~1.35 CPU-s per doc, for ~347k docs → **ETA ~3 days** (around 2026-11-29). MINION's history
  is reached after ~16 h and done after ~60 h; until then semantic search only covers rows already
  embedded (all new rows are embedded as they are written). Faster: set
  `CLAUDE_MEM_CHROMA_BACKFILL_PAUSE_RATIO=0` (about twice as fast, same total CPU, more contention
  with searches). Semantic searches timed out (20 s budget → keyword fallback) only in the first
  minutes after a worker/Chroma start; none since 03:05 local.
- **Pre-upgrade sessions** still run the 12.4.7 MCP server (working, but without 16's new tools).
  `/mcp` → reconnect or a restart gives them the 16.2.1 server. Once they all end, 16.2.1's sweep
  deletes the 12.4.7 folder (and the shims with it).
- The wrapper's Codex hooks are inert on Codex 0.172 (`TODO(handoff)` in
  `codex/plugins/claude-mem/hooks/claude-mem-forwarder.sh`, line 4:
  https://github.com/NikolasP98/minion-meta/blob/dev/codex/plugins/claude-mem/hooks/claude-mem-forwarder.sh#L4
  — flagged independently by the handoff-ledger sweep as handoff-minion-meta-73009062); Codex
  capture is the transcript watch. If plugin hooks return, turn
  `CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION` off, or Codex sessions get captured twice.
- Codex sessions with no tool calls create no claude-mem row (seen on 12.4.7 and 16.2.1).
- Stale `alias claude-mem=` (10.5.2) in `~/.bashrc` / `~/.zshrc` shadows the launcher in interactive
  shells; remove it by hand.
- The stale `<claude-mem-context>` block in `MINION/AGENTS.md` is left alone.

## 17 later (when promoted)

17 has the same schema target (75) and the same hooks, launcher, telemetry and setting keys, so
the step is smaller: fresh backup → install 17 the same manual way (copy to the cache, run
`version-check.js` and `ensure-launcher.cjs`, switch the registry) → restart the worker → run the
**Verified** list above. Re-check the 17 changelog for any migration past v75 first.

## Rollback (16.2.1 → 12.4.7)

Stop the worker; restore `claude-mem.db`, `chroma`, `settings.json`, `telemetry.json`,
`transcript-watch*.json` and `chroma-sync-state.json` from `~/.claude-mem-pre16-2026-11-26/`;
restore the 12.4.7 scripts from `*.orig-12.4.7` (or the backup's `plugin-12.4.7`) and remove
`.orphaned_at`; restore `installed_plugins.json`; remove `cache/.../16.2.1` and
`~/.local/bin/claude-mem`. Everything recorded after the upgrade is lost.

## Out of scope

Changing how Kip or the JEV hook call `search`; the Codex plugin-hook question upstream.
