# Meeting Recorder Plugin — Design Spec (v2: voxtype-as-daemon)

**Status:** Draft
**Date:** 2026-05-20
**Owners:** orchestrator
**Touches:** `minion/extensions/meeting-recorder/` (new), `minion_hub/src/routes/(app)/plugins/meeting-recorder/+page.svelte` (new), `voxtype` (small additive change — streaming hook + optional gateway client), `@minion-stack/shared` (new event types)
**Depends on:**
- [[project_plugin_control_centers_design]] — slot system, PluginIframe, dashboard pattern
- [[project_secrets_vault_v1]] — vault for `openrouter` / `anthropic` keys
- [[project_hub_desktop_shell_eval]] — Tauri shell port in flight (orthogonal — plugin works in browser hub too)

---

## Revised premise

The user already runs **voxtype** as a local Rust daemon with everything we need:

| Capability | Already in voxtype | Location |
|---|---|---|
| Hotkey (`SUPER ALT R`) | ✅ | `~/.config/hypr/bindings.conf:43` → `~/.local/bin/voxtype-meeting-start` |
| Parallel mic + loopback capture (16 kHz mono WAV) | ✅ | `voxtype-meeting-start` script (ffmpeg) |
| Source-based diarization (mic→You, loopback→Remote) | ✅ | `src/meeting/diarization/simple.rs` |
| ONNX speaker-embedding diarization (upgrade path) | ✅ | `src/meeting/diarization/ml.rs` (feature-gated) |
| Whisper transcription (local, configurable backends) | ✅ | `src/transcribe/*` (whisper-rs, ONNX, remote) |
| SQLite session storage + state machine | ✅ | `src/meeting/storage.rs`, `src/meeting/state.rs` |
| JSON / Markdown / SRT / VTT export | ✅ | `src/meeting/export/{json,markdown,srt,vtt}.rs` |
| Post-meeting LLM summary script | ✅ | `voxtype-meeting-save` (OpenRouter `gpt-4o-mini`, writes Obsidian) |
| Waybar status indicator | ✅ | `voxtype-meeting-status` |

What's missing for the minion use-case: **the meeting transcript never enters minion's world.** It lands in `~/Documents/VAULT/MEETINGS/` as Obsidian markdown. The hub never sees it; no agent can be asked "what did we decide on the call this morning"; there's no live transcript pane in the dashboard.

**Revised design:** Meeting Recorder plugin = thin gateway-side ingestion + hub UI layer on top of voxtype. Zero Tauri audio code. Voxtype keeps owning capture, diarization, and transcription — exactly what it's already best at.

---

## Architecture

```
┌──────── Arch desktop ────────┐         ┌──── minion gateway (netcup) ────┐
│                              │         │                                  │
│  Hyprland hotkey             │         │  extensions/meeting-recorder/    │
│    SUPER ALT R               │         │   ├─ ingest/                     │
│       ↓                      │         │   │  ├─ vault-watcher.ts (P1)    │
│  voxtype-meeting-start       │         │   │  └─ live-stream.ts   (P5)    │
│       ↓                      │         │   ├─ storage.ts (SQLite)         │
│  ffmpeg × 2 → WAVs           │         │   ├─ summarize.ts (gateway LLM)  │
│       ↓                      │         │   ├─ control-center.ts (RPCs)    │
│  voxtype meeting start       │         │   └─ minion.plugin.json          │
│   ├─ whisper transcribe      │         │                                  │
│   ├─ diarization (simple/ml) │         │  Reuses:                         │
│   └─ SQLite session          │         │   ├─ vault → openrouter/anthropic│
│       ↓                      │         │   ├─ slot system                 │
│  voxtype-meeting-stop        │         │   └─ LLM router                  │
│   └─ voxtype-meeting-save    │         │                                  │
│      ├─ export JSON          │         └────────────┬─────────────────────┘
│      ├─ write Obsidian MD    │                      ▲
│      └─ (NEW) POST to gateway│──────────────────────┘
│                              │   minion meeting.ingest API (HTTPS or
│  Optional live mode:         │   Tailscale-internal WS)
│    voxtype meeting tail      │
│     ↓ stdout JSONL           │
│    voxtype-meeting-relay     │──── WS event stream → live transcript pane
│     (NEW — tails + posts)    │     in hub dashboard
└──────────────────────────────┘
```

Two integration modes; both live in the same plugin. Start with batch (P1–P4); add live (P5) once batch is solid.

---

## Mode A — Batch ingestion (P1–P4)

**Trigger:** `voxtype-meeting-save` finishes. Add one line at the end:

```bash
# Existing save script already produces $MEETING_DIR with JSON + WAVs.
# Append:
curl -sS -X POST "$MINION_GATEWAY_URL/api/plugins/meeting-recorder/ingest" \
  -H "Authorization: Bearer $MINION_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @"$MEETING_DIR/${DATE}-${SLUG}-raw.md.json" \
  || true   # best-effort; vault on disk is the source of truth
```

Or — to keep the save script untouched — run a **vault watcher** in the gateway plugin:

- `inotify` (via `chokidar` or `node:fs.watch` recursive) on `~/Documents/VAULT/MEETINGS/`
- New dir created → wait for `*.json` to appear → parse → ingest

Vault watcher is the better default: works with zero changes to voxtype, survives gateway restarts (re-scan on boot for missed sessions), no auth surface on the desktop side.

**Ingestion writes:**
- `meetings` row (id, label, started_at, ended_at, duration_ms, sources, vault_path)
- `segments` rows (one per `transcript.segments[]` from voxtype JSON — preserves `source`, `start_ms`, `end_ms`, `text`, `confidence`, and any diarization label)
- Audio files copied into `~/.minion/data/meetings/<sid>/` or kept as a symlink to the vault dir (config flag — symlink is the cheaper default)

**Then summarize:** Gateway's LLM router (Anthropic/OpenRouter via vault) regenerates summary + action items. Voxtype's save script also does this with `gpt-4o-mini`; the plugin's version uses the user's configured agent model (Kimi K2.5 per current netcup config). Both can coexist — voxtype's runs locally for the Obsidian copy, gateway's runs for the hub view + agent retrieval.

---

## Mode B — Live streaming (P5, opt-in)

For live transcript pane in the hub, voxtype needs to emit segments as they're finalized, not just on session end. Two options:

**B1 — Tail script (zero voxtype changes):** A new `voxtype-meeting-relay` script runs alongside `voxtype meeting start`. It polls `voxtype meeting status --json` (already exists) and `voxtype meeting export <id> --format json` every ~1 s, diffs against last seen segment count, POSTs new ones to gateway. Crude but ships in an afternoon.

**B2 — Native streaming hook (small voxtype PR):** Add `voxtype meeting tail` subcommand that writes finalized segments to stdout as JSONL as they land. A tiny systemd-user service or `voxtype-meeting-relay` wrapper pipes that to a gateway WS. ~50 lines of Rust against the existing meeting state machine, plus a JSON serializer reusing the existing `TranscriptSegment` Serialize impl.

**Recommendation:** Ship B1 with v1 for speed; open a PR upstream for B2 once shape is validated. B1 has a ~1–2 s lag per segment, which for "live transcript in hub" is fine.

---

## File structure (new code)

### `minion/extensions/meeting-recorder/`

```
minion.plugin.json
package.json
src/
  index.ts                # entry — register RPCs, mount HTTP ingest, start vault watcher
  ingest/
    vault-watcher.ts      # chokidar on ~/Documents/VAULT/MEETINGS/
    voxtype-json.ts       # parser for voxtype's --format json --metadata --speakers output
    http-ingest.ts        # POST /api/plugins/meeting-recorder/ingest handler
    live-stream.ts        # WS endpoint for B1/B2 (P5)
  storage.ts              # SQLite schema + queries
  summarize.ts            # post-meeting summary via gateway LLM router
  control-center.ts       # summary / list / get / trace RPCs
  schema.sql              # tables — see below
ui/
  dashboard.tsx           # control center UI (mounted in slot)
README.md
```

### `minion_hub/src/routes/(app)/plugins/meeting-recorder/`

```
+page.svelte              # mounts PluginIframe; pattern from [[project_plugin_control_centers_design]]
+page.server.ts           # passes gatewayUrl + authToken to iframe
```

### `@minion-stack/shared/src/protocol/`

```
meeting-recorder.ts       # MeetingMeta, MeetingSegment, MeetingSummary, MeetingLiveEvent types
```

### Optional desktop additions (P5):

```
~/.local/bin/voxtype-meeting-relay        # bash wrapper for B1 polling
~/.config/systemd/user/voxtype-relay.service  # only when live mode is on
```

---

## Wire shapes

### HTTP ingest (POST `/api/plugins/meeting-recorder/ingest`)

Body = voxtype's `meeting export <id> --format json --metadata --speakers` output verbatim. Plugin owns parsing — voxtype's JSON shape is the source of truth and already includes everything we need (`metadata.{durationSecs,startedAt,endedAt}`, `transcript.segments[].{startMs,endMs,text,source,confidence,speaker?}`, `speakers[]`).

Response: `{ sid: string, summary_status: "queued" }`.

### Gateway RPCs (over existing WS — for hub UI)

| Method | Params | Returns |
|---|---|---|
| `meeting.list` | `{ limit?, before? }` | `{ items: MeetingMeta[] }` |
| `meeting.get` | `{ sid }` | `{ meta, segments, summary? }` |
| `meeting.summary` | `{ sid, regenerate?: bool }` | `{ summary, action_items[] }` |
| `meeting.trace` | `{ sid }` | `{ events: TraceEvent[] }` |
| `meeting.search` | `{ q, limit? }` | `{ hits: { sid, snippet, t_ms }[] }` (P4+) |
| `meeting.delete` | `{ sid, also_delete_audio?: bool }` | `{ ok: true }` |

### Live events (P5)

| Event | Payload |
|---|---|
| `meeting.live.started` | `{ sid, label, started_at }` |
| `meeting.live.segment` | `{ sid, source, start_ms, end_ms, text, confidence, speaker? }` |
| `meeting.live.ended` | `{ sid, duration_ms }` |
| `meeting.summary.ready` | `{ sid }` |

---

## Storage (gateway-side SQLite)

`~/.minion/meeting-recorder.sqlite`:

```sql
CREATE TABLE meetings (
  sid TEXT PRIMARY KEY,                   -- voxtype's uuid (preserved)
  label TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_ms INTEGER,
  vault_path TEXT,                        -- ~/Documents/VAULT/MEETINGS/<dir>
  audio_path TEXT,                        -- symlink target into vault by default
  summary TEXT,
  action_items_json TEXT,
  source_meta_json TEXT                   -- voxtype's full metadata blob
);

CREATE TABLE segments (
  sid TEXT NOT NULL REFERENCES meetings(sid) ON DELETE CASCADE,
  seg_id INTEGER NOT NULL,                -- voxtype's TranscriptSegment.id
  source TEXT NOT NULL,                   -- 'microphone' | 'loopback' | 'unknown'
  speaker TEXT,                           -- SpeakerId display name when ML diarization used
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  text TEXT NOT NULL,
  confidence REAL,
  PRIMARY KEY (sid, seg_id)
);

CREATE INDEX idx_segments_sid_t ON segments(sid, start_ms);
CREATE VIRTUAL TABLE segments_fts USING fts5(text, content=segments, tokenize='porter unicode61');
-- Triggers to keep FTS in sync; standard pattern.

CREATE TABLE trace (
  sid TEXT NOT NULL,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,                     -- 'ingest.start' | 'ingest.ok' | 'summary.start' | 'summary.ok' | 'summary.err'
  payload_json TEXT
);
```

**Audio storage policy:** Symlink to vault path by default (zero duplication). Config flag `copy_audio: true` copies into `~/.minion/data/meetings/<sid>/` if user wants the gateway to own its own copy. Default: symlink.

---

## Diarization (user requirement: mixed audio + diarization mandatory)

Voxtype's existing layered approach is exactly what we want:

1. **Default (`simple` backend):** Source-based attribution. Mic=You, loopback=Remote. Mixed audio is the WAVs side-by-side; diarization is "which file did the audio come from." Deterministic, free, always-on. **This satisfies the diarization requirement out of the box.**
2. **Upgrade (`ml` backend):** ONNX speaker-embedding clustering on the loopback channel to split multiple remote participants (SPEAKER_00, SPEAKER_01, …). Feature-gated; user enables when needed.
3. **Naming:** Voxtype already has `voxtype meeting label <id> <speaker> <name>` — wire that into the hub dashboard as a rename action that proxies to a `meeting.label` RPC (P4).

No diarization code lives in the plugin. Plugin just stores and renders what voxtype produces.

---

## Phases

### P1 — Plugin scaffold + vault watcher

- [ ] `extensions/meeting-recorder/` skeleton: manifest with `meeting-recorder` UI slot + `openrouter` / `anthropic` slots declared.
- [ ] `storage.ts` + `schema.sql` with FTS index. Test: insert 50 segments, FTS query returns expected matches.
- [ ] `ingest/voxtype-json.ts` parser. Test: feed real voxtype export JSON → assert all fields land correctly in meetings + segments tables.
- [ ] `ingest/vault-watcher.ts` (chokidar on `~/Documents/VAULT/MEETINGS/`). Test: drop a fixture dir → ingestion fires once.
- [ ] Boot-time re-scan: on plugin start, walk vault dir, ingest anything not already in DB.

Commit: `feat(meeting-recorder): plugin scaffold + voxtype vault ingestion`

### P2 — Control center RPCs

- [ ] `meeting.list`, `meeting.get`, `meeting.trace`, `meeting.search`, `meeting.delete` RPCs.
- [ ] `meeting.label` → updates `segments.speaker` for matching `source`+segment-id range; persists user-given names.
- [ ] Unit tests for each via existing gateway RPC harness.

Commit: `feat(meeting-recorder): control center RPCs`

### P3 — Summarization

- [ ] `summarize.ts` triggered post-ingest. Prompt: "Summarize this meeting; extract action items as JSON; classify type." Returns markdown summary + JSON action items.
- [ ] Uses gateway LLM router with the user's currently-configured model (Kimi K2.5 by default on netcup).
- [ ] Emit `meeting.summary.ready` event when done.
- [ ] `meeting.summary` RPC supports `regenerate: true` for re-running with a different model.

Commit: `feat(meeting-recorder): post-meeting summary via gateway LLM`

### P4 — Hub control center UI

- [ ] `+page.svelte` mounts PluginIframe per [[project_plugin_control_centers_design]] pattern.
- [ ] `ui/dashboard.tsx`:
  - **History view:** list of meetings (date, title, duration, summary preview). Click → detail.
  - **Detail view:** two-lane transcript (You / Remote / SPEAKER_NN), summary, action items, audio player (`<audio src={vault_path/audio/combined.wav}>` proxied through gateway), rename-speaker UI, regenerate-summary button.
  - **Search view:** FTS over all transcripts. Highlights snippets + jumps to timestamps.
- [ ] PLUGINS sidebar entry auto-appears.
- [ ] Smoke test in Chrome against live gateway.

Commit: `feat(hub): meeting-recorder control center`

### P5 — Live transcript (opt-in)

- [ ] `voxtype-meeting-relay` bash script: polls `voxtype meeting status --json` + `voxtype meeting export latest --format json` every 1 s, diffs segments, POSTs deltas to `/api/plugins/meeting-recorder/live` with the active sid.
- [ ] `ingest/live-stream.ts`: accepts deltas, writes segments to DB immediately, emits `meeting.live.segment` events.
- [ ] Hub dashboard: when `meeting.live.started` arrives, switch Detail view to "Live" mode and append events as they stream.
- [ ] systemd user unit `voxtype-relay.service` enabled by a hub UI toggle.

Commit: `feat(meeting-recorder): live transcript via voxtype polling relay`

### P6 — Agent integration

- [ ] New gateway tool `meeting_recall` available to agents: `meeting_recall(query, limit?)` → returns recent meeting snippets matching FTS query, with timestamps and speakers.
- [ ] New tool `meeting_summary_recent` → returns last N meeting summaries.
- [ ] User can ask any agent "what did we decide on the call this morning?" and get a grounded answer.
- [ ] Tool is auto-registered for agents whose config enables `meeting-recorder` (mirror plugin-secret consumer pattern).

Commit: `feat(meeting-recorder): agent tools for meeting recall`

---

## Decisions made (auto mode)

| Decision | Choice | Why |
|---|---|---|
| Daemon | voxtype (existing) | Avoids ~3000 lines of duplicated Rust; voxtype already does it better |
| Capture mode | mic + loopback parallel WAVs (mixed in spirit) | Already shipped; satisfies "mixed" and "diarization mandatory" via source attribution |
| Diarization | voxtype `simple` default, `ml` opt-in | Source-based is deterministic; ML upgrade exists for multi-party loopback |
| Ingestion path | vault watcher (chokidar on `~/Documents/VAULT/MEETINGS/`) | Zero voxtype changes; survives restarts; resilient to gateway downtime |
| Audio storage | symlink to vault path | Voxtype already writes there; no duplication |
| Live mode | poll-based relay script (B1) | Ships fast; B2 upstream PR is post-v1 polish |
| Summary model | gateway LLM router (Kimi K2.5 current default) | Lets user pick model centrally; preserves voxtype's local Obsidian flow untouched |
| Search | SQLite FTS5 over segments | Built-in, fast enough for 1000s of meetings, no extra deps |
| Hub UI | new control center slot | Already-built scaffolding from plugin-control-centers |
| Agent integration | `meeting_recall` + `meeting_summary_recent` tools | Turns archive into queryable agent memory |

---

## What this DOES NOT solve

- **Non-Linux hosts.** voxtype is Linux. macOS/Windows hub users have no daemon. Plugin still shows meetings ingested from any source, so future macOS daemon work plugs into the same shape.
- **Encrypted audio at rest.** v1 stores WAVs in vault as-is. Encrypting can mirror the secrets-vault libsodium pattern in a later phase.
- **Real-time agent injection.** "Listen on the call and whisper hints" is a different plugin. Live events from P5 give it the substrate, but the active-agent path isn't built here.
- **Multi-speaker labeling without ML.** If you want SPEAKER_00 / SPEAKER_01 split on a 4-person Zoom, you need voxtype's `ml-diarization` feature compiled in. Plugin renders whatever voxtype gives it; doesn't add diarization itself.

---

## Cross-project impact

| Change | Touches |
|---|---|
| Vault watcher reads from user's Obsidian vault | New external read dependency — document in README |
| New frame method names + event types | `@minion-stack/shared` (minor bump) |
| New plugin UI slot id `meeting-recorder` | Already supported |
| New agent tools `meeting_recall`, `meeting_summary_recent` | `src/agents/tools/_gen/_registry.generated.ts` regen |
| Optional `voxtype-meeting-relay` script | Lives in this repo's `extensions/meeting-recorder/contrib/` |
| Upstream voxtype PR (P5 B2 fallback) | Out-of-tree; non-blocking |

---

## Open follow-ups

- Upstream voxtype PR for native streaming (`voxtype meeting tail`) — replaces polling relay
- macOS/Windows daemon equivalent (Tauri-based capture, only on platforms where voxtype isn't available) — same ingestion shape
- n8n / Obsidian fanout: gateway already emits `meeting.summary.ready`; a subscriber can mirror to Notion etc.
- Encrypted audio at rest (libsodium, mirrors vault pattern)
- "Ambient agent" plugin layered on top of live events
