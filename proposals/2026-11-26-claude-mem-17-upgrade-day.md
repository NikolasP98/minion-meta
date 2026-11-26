---
id: 2026-11-26-claude-mem-17-upgrade-day
title: claude-mem 12.4.7 → 17 upgrade day (prep done, upgrade waits for 17 to be promoted)
status: draft
created: 2026-11-26
updated: 2026-11-26
repos: [minion-meta]
effort: S
source: claude-mem-17-impact-review-2026-11-26
---

# claude-mem 12.4.7 → 17 upgrade day

The owner chose to wait until upstream promotes 17 to its stable channel
(`releases/promoted-release.json` on `thedotmack/claude-mem` `main`; it says `16.2.1` on
2026-11-26) and then upgrade in one step. This file tracks what is already prepared and what
is left for that day. The full breaking-change review is the impact report
(`~/.orca/bots/kip/memory/claude-mem-17-impact.md`, rows 1–13).

## AS-IS (2026-11-26, after the prep)

- claude-mem **12.4.7** runs. DB schema v30. Chroma vector search has been broken since about
  2026-09-27 (pydantic 2.14 in the `chroma-mcp` uv environments; 17 pins it).
- **Backup:** `~/.claude-mem-pre17-2026-11-26/`, taken with `sqlite3 .backup` while the worker
  ran. `integrity_check` = `ok`, schema = `30`. It also holds Chroma, settings, the 12.4.7
  plugin folder, the marketplace HEAD (`5458dd2`), `installed_plugins.json`,
  `known_marketplaces.json`, `~/.codex/config.toml` and the old Codex wrapper cache.
- **Re-key done:** the gateway repo's old project key `minion` is now `minion-gateway` in
  SQLite (`sdk_sessions` 183, `observations` 1,398, `session_summaries` 504;
  `merged_into_project` had none). `MINION` is unchanged (1,214 / 22,749 / 5,186).
- **Chroma is NOT re-keyed:** 12,977 vector documents still carry metadata
  `project='minion'`, and `~/.claude-mem/chroma-sync-state.json` still has a `minion` entry.
- **Pre-seeded settings** (12.4.7 ignores unknown keys; its UI save merges into the file):
  `CLAUDE_MEM_AUTO_UPDATE=false`, `CLAUDE_MEM_WORK_STATE_ENABLED=false`,
  `CLAUDE_MEM_BACKUP_RETAIN_COUNT=3`, `CLAUDE_MEM_LOG_RETENTION_DAYS=30`,
  `CLAUDE_MEM_PROJECT_ENVIRONMENTS` (`minion-gateway` for `…/MINION/minion/**`) and
  `CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION=true`. `~/.claude-mem/telemetry.json` =
  `{"enabled": false, "installId": "", "decidedAt": …}`. The report's `{"enabled": false}`
  alone is rejected by 17's reader (`installId` must be a string), which would leave telemetry on.
- **Codex wrapper** (`codex/plugins/claude-mem`, version `12.4.7-minion-wrapper.2`): the MCP
  launcher and the hook forwarder both pick the newest installed runtime under
  `~/.claude/plugins/cache/thedotmack/claude-mem/` (17's ordering: highest version, a release
  before its prereleases, skip `.orphaned_at`). The MCP launcher runs the interpreter the runtime
  declares (12.4.7 needs `bun` for `bun:sqlite`; 17 declares `node`). `setup` runs
  `version-check.js` when present, otherwise `smart-install.js`. `~/.codex/config.toml`
  `[mcp_servers.mcp-search]` uses the same launcher; its tool approvals are kept.
- **Finding: Codex capture comes from the transcript watcher, not the wrapper hooks.** On Codex
  0.172 the plugin's hooks never run (`plugin_hooks` is `removed/false`; a `codex exec` run fires
  only the user hooks from `~/.codex/hooks.json`, and every Codex capture in the worker logs is
  `[TRANSCRIPT]`). 17 turns that watcher off by default, so without the
  `CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION=true` pre-seed, Codex capture would stop completely.

## TO-BE (after upgrade day)

claude-mem 17 runs with auto-update and telemetry off. Codex keeps writing
`platform_source='codex'` rows and its `mcp-search` keeps answering, with no manual repointing.
Vector search works again and covers every row, including the re-keyed `minion-gateway` rows.
`search project=MINION` (now case-insensitive in 17) does not return old gateway memory.

## DELTA: upgrade-day checklist

1. Confirm `releases/promoted-release.json` on `thedotmack/claude-mem` `main` names a 17.x.
2. Take a fresh `sqlite3 .backup` copy (the 2026-11-26 one goes stale as rows are added), then
   check `pragma integrity_check` and `select max(version) from schema_versions` (expect 30).
3. Close every Claude Code and Codex session.
4. Install 17 (`npx claude-mem@<promoted> install`, or `/plugin` update after refreshing the
   `thedotmack` marketplace). Open one Claude session, let the migrations and the launcher build
   finish, then restart it.
5. Verify (impact report § "Upgrade steps" 6):
   - `curl -s 127.0.0.1:37777/api/health`;
   - `select max(version) from schema_versions` = 75;
   - `claude-mem doctor` passes;
   - the log shows `Connected to chroma-mcp successfully`;
   - `search project=MINION` returns results and none with project `minion-gateway`;
   - `bash ~/.codex/plugins/cache/minion-codex/claude-mem/*/hooks/claude-mem-forwarder.sh resolve`
     prints the 17 folder, and a `codex exec` session's `mcp-search` `search` answers;
   - one Codex session writes a row with `platform_source='codex'` (via the transcript watch);
   - `jq .CLAUDE_MEM_AUTO_UPDATE ~/.claude-mem/settings.json` is still `"false"`, and
     `~/.claude-mem/telemetry.json` still has `enabled: false`;
   - no double-JSON warning on the first SessionStart (the 12.4.7 hand-patch is not carried over).
6. **Chroma re-index of all rows.** Rebuild or backfill so every observation, summary and prompt
   is embedded, which covers the rows that were never indexed since about 2026-09-27. The
   12,977 documents with metadata `project='minion'` must end up as `minion-gateway` (re-embed
   or update their metadata), and the stale `minion` entry in `chroma-sync-state.json` must not
   make the sync skip the `minion-gateway` rows. Then check that a Chroma query with
   `project=minion-gateway` returns gateway rows and `project=MINION` returns none of them.
7. Optional: delete the stale `<claude-mem-context>` block in `MINION/AGENTS.md`. With transcript
   ingestion on, 17 may keep refreshing it.
8. Rollback, if needed, is the impact report § "Exact rollback", using the fresh backup from step 2.

## Open ends

- The wrapper's Codex hooks are inert on Codex 0.172 (`TODO(handoff)` in
  `codex/plugins/claude-mem/hooks/claude-mem-forwarder.sh`). If a later Codex runs plugin hooks
  again, turn `CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION` off, or Codex sessions get captured twice.
- The 12.4.7 transcript watcher picked up only the first of three back-to-back `codex exec`
  sessions on 2026-11-26 (the other two rollouts were not in `transcript-watch-state.json` minutes
  later). Re-check on 17 before relying on it.

## Out of scope

Installing or upgrading claude-mem before 17 is promoted; fixing Chroma on 12.4.7; changing how
Kip or the JEV hook call `search`.
