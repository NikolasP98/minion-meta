# Plugin Control Centers — Design

**Date:** 2026-05-19
**Status:** Approved — ready for plan
**Author:** Claude (Opus 4.7) + Nikolas P.

## Goal

Give plugins a second, first-class UI surface — a "control center" — that surfaces plugin-emitted data (complaints, calls, etc.) via the hub's Browse menu, alongside the existing settings UI.

## Motivation

The settings UI for plugins is hidden behind `/settings/plugins` and is oriented toward configuration — checkboxes, dropdowns, JSON-shaped inputs. It is not the right surface for a user who wants to *consume* what a plugin produces: read complaints, see call history, inspect dashboards. Today no such surface exists; users would have to roll one inside the settings iframe or wait for hub-native pages that don't scale.

A control-center surface lets each plugin own its data presentation in the same bridge/iframe model the settings UI already uses, with a hub-rendered nav entry that appears only when at least one plugin opts in.

## Architecture

Two-slot manifest model. Plugins continue to declare `ui[]` entries; we add a new slot value `"plugins.controlCenter"` alongside the existing `"settings.plugins"`. The hub picks both up via the same `pluginsUiList()` RPC and renders the new slot in two new places: a Browse-menu column and a top-level `/plugins/[id]` route. Plugins serve their own dashboard via the same iframe + bridge protocol used for settings.

Data layer per plugin: alert-watcher needs only new aggregation RPCs over its existing `complaints` table. Voice-call needs a new `call_history` SQLite table (today only ephemeral `telemetry/trace.ts` exists), populated by lifecycle hooks in `manager.ts`.

```
minion/src/plugins/types.ts
  PluginUiSlot += "plugins.controlCenter"

minion_hub
  Browse menu              ──┐
    new PLUGINS column      │
    items hydrated from     │── filter pluginsUiList() by slot === "plugins.controlCenter"
    pluginsUiList()         │
                            │
  /plugins/[id] route ──────┘
    full-bleed PluginIframe
    same bridge handshake as settings/plugins
    no save bar (read-only)

alert-watcher/ui (multi-entry Vite build)
  index.html        — settings (existing)
  control.html      — dashboard (new)
                      uses plugins.alerts.summary + plugins.alerts.list

voice-call/ui (new — multi-entry Vite build)
  index.html        — settings (existing)
  control.html      — dashboard (new)
                      uses plugins.voice.calls.{summary,list,trace}

voice-call/src
  store/call-history.ts   — new SQLite table + write helpers
  manager.ts              — lifecycle writes (call accepted/ended)
```

## Decisions

Locked via AskUserQuestion 2026-05-19:

| Decision | Choice | Rationale |
|---|---|---|
| Manifest shape | Add `"plugins.controlCenter"` to existing `ui[]` slot enum | Symmetric with current `"settings.plugins"`; reuses validator + loader; no new manifest top-level field |
| Routing | Top-level `/plugins/<id>` | Deep-linkable; matches reliability/marketplace pattern; no coupling to per-plugin route names |
| Dashboard impl | Plugin-served iframe | Reuses bridge + RPC + theme infra; plugin owns its data shape; hub doesn't grow per-plugin code |
| Browse visibility | Only enabled plugins with a control-center entry; PLUGINS column hidden when empty | Matches "hide when empty" intent; disabled plugins not discovery-grade |

## Components

### 1. Manifest slot (minion/src/plugins/types.ts)

Single-line additive change to `PluginUiSlot` union:

```ts
export type PluginUiSlot = "settings.plugins" | "dashboard.widget" | "workforce.sidebar" | "plugins.controlCenter";
```

No validator change required — `manifest.ts:96-115` already accepts any string for `slot`, narrowed by the type. (Verify and tighten if it does runtime enum-check.)

Plugin authors declare both slots in `minion.plugin.json`:

```json
{
  "ui": [
    { "slot": "settings.plugins",      "title": "Alert Watcher", "description": "Configure subscriptions & destinations", "entrypoint": "ui/dist/index.html",   "icon": "BellRing" },
    { "slot": "plugins.controlCenter", "title": "Alert Watcher", "description": "Complaints dashboard",                  "entrypoint": "ui/dist/control.html", "icon": "BellRing" }
  ]
}
```

### 2. Hub — Browse menu PLUGINS column

`minion_hub/src/lib/components/layout/sections.ts` currently exports a static `getSections(): Section[]` returning 3 sections (workforce, gateway, creative). It becomes reactive: a new `$lib/state/plugin-nav.svelte.ts` store hydrates once on `(app)` layout mount via the existing `pluginsUiList()` RPC, filters by `slot === "plugins.controlCenter"`, maps each into a `SectionItem` (href: `/plugins/<id>`, icon: lucide map fallback, label: manifest `title`).

`SectionSwitcher.svelte` is updated so that any section with `items.length === 0` is omitted from the grid. The PLUGINS section is appended after CREATIVE.

Icon resolution mirrors `settings/plugins/+page.svelte`'s `PLUGIN_ICON_MAP` (Phone, Megaphone, BellRing, Puzzle fallback). Extracted to a small shared `$lib/plugins/icon-map.ts` to avoid duplication.

### 3. Hub — `/plugins/[id]` route

New files:

- `src/routes/(app)/plugins/[id]/+page.server.ts`
  - Calls `pluginsUiList()`
  - Finds the entry where `slot === "plugins.controlCenter"` AND the plugin id matches `params.id`
  - Returns `{ entry, gatewayBaseUrl, hubOrigin, theme tokens via existing path }` or throws 404
- `src/routes/(app)/plugins/[id]/+page.svelte`
  - Full-bleed `<PluginIframe>` (same component used in settings/plugins) with the same theme handshake
  - No save bar — bridge dirty/save handlers stay inert because the dashboard never emits `plugin:dirty-changed`. Existing bridge infrastructure does not require changes; the hub only renders the save bar when a dirty signal arrives.

### 4. Alert-watcher control center

**No schema change.** The `complaints` table (`extensions/alert-watcher/src/store.ts:1-22`) already carries severity, category, created_at, channel_id, from_sender — every field the dashboard needs.

**UI**: multi-entry Vite build. `vite.config.ts` updated with `rollupOptions.input: { index: 'index.html', control: 'control.html' }`. `ui/control.html` mounts a new `ControlApp.svelte` that does the dashboard handshake (same bridge bootstrap as settings) and renders:

- **KPI strip**: total complaints (today / 7d / 30d), avg severity index, % notified
- **Severity timeline** — ECharts stacked area, daily buckets, low/med/high
- **Category donut** — ECharts pie
- **Top senders table** — sender, count, latest_at
- **Recent complaints table** — same row shape as current `RecentsPanel`, plus a filter bar (date range, severity multiselect, category multiselect, channel)

Visual reference: `minion_hub/src/routes/(app)/reliability/+page.svelte`. Component vocabulary (KpiCard, TimelineChart, DonutChart, FilterBar) is *copied* into `alert-watcher/ui/src/lib/dashboard/`, not abstracted into a shared package. (See YAGNI section.)

**RPCs** (gateway-side, in `minion/src/gateway/server-methods/alerts.ts` — same file that owns `plugins.alerts.recent`):

```ts
"plugins.alerts.summary"({ since: number, until: number }) =>
  {
    counts: { low: number; med: number; high: number; total: number; notified: number };
    byDay: Array<{ date: string; low: number; med: number; high: number }>;
    byCategory: Record<string, number>;
    topSenders: Array<{ sender: string; count: number; latestAt: number }>;
  }

"plugins.alerts.list"({
  since: number;
  until: number;
  severity?: ("low"|"med"|"high")[];
  category?: string[];
  channelId?: string;
  limit: number;
  offset: number;
}) => { rows: ComplaintRow[]; total: number }
```

All implementations are GROUP BY queries against `complaints` — no new indexes needed for v1 (existing `idx_complaints_chat_id` plus a small N).

### 5. Voice-call control center

**Schema work first.** New table in voice-call's SQLite (open via the same `ctx.runtime` DB path the plugin already uses — verify; if it has no DB yet, this is its first):

```sql
CREATE TABLE IF NOT EXISTS call_history (
  id            TEXT    PRIMARY KEY,    -- provider call sid (Twilio CallSid / similar)
  direction     TEXT    NOT NULL,       -- 'inbound' | 'outbound'
  from_e164     TEXT,
  to_e164       TEXT,
  agent_id      TEXT,
  channel       TEXT    NOT NULL,       -- provider channel id (telnyx, twilio, ...)
  started_at    INTEGER NOT NULL,
  answered_at   INTEGER,
  ended_at      INTEGER,
  duration_ms   INTEGER,
  outcome       TEXT,                   -- 'completed' | 'missed' | 'failed' | 'busy' | 'no_answer'
  error         TEXT,
  recording_url TEXT,
  cost_usd      REAL
);
CREATE INDEX IF NOT EXISTS idx_call_history_started ON call_history(started_at);
CREATE INDEX IF NOT EXISTS idx_call_history_agent   ON call_history(agent_id, started_at);
```

**Write path:** in-process from `manager.ts` lifecycle — single owner. `manager.ts` already creates a per-call record on accept and emits an end signal when the call closes; both hooks write to `call_history` synchronously. No event bus.

**UI:** multi-entry Vite build (mirrors alert-watcher pattern). Dashboard panels:

- **KPI strip**: calls today, total duration, avg duration, answer-rate, p95 first_audio
- **Volume timeline** — hourly bars for today, daily bars for 7d/30d
- **Outcome donut** — completed / missed / failed / busy
- **Latency histogram** — first_audio / asr_time / agent_ttft (from existing `telemetry/trace.ts`, surfaced via `plugins.voice.calls.trace`)
- **Calls table**: time, direction, from/to, duration, outcome, error — row click opens a side drawer with the full trace waterfall

**RPCs:**

```ts
"plugins.voice.calls.summary"({ since, until }) =>
  {
    counts: { total: number; completed: number; missed: number; failed: number };
    durationMs: { total: number; avg: number; p95: number };
    byHour: Array<{ ts: number; total: number; completed: number }>;
    latency: { firstAudioP50: number; firstAudioP95: number; asrTimeP50: number; asrTimeP95: number };
  }

"plugins.voice.calls.list"({
  since: number; until: number;
  direction?: "inbound"|"outbound";
  outcome?: ("completed"|"missed"|"failed"|"busy"|"no_answer")[];
  agentId?: string;
  limit: number; offset: number;
}) => { rows: CallHistoryRow[]; total: number }

"plugins.voice.calls.trace"(callId: string) =>
  { events: Array<{ ts: number; name: string; payload?: unknown }> }
```

The latency portions of `summary` and the `.trace` RPC may read from `telemetry/trace.ts`'s in-memory buffer for v1; persistence of trace events is out of scope (see Open Questions).

## Data flow

```
Browse menu click → /plugins/<id>
  ├─ +page.server.ts: pluginsUiList() → filter by slot+id → 404 or entry
  └─ +page.svelte:    PluginIframe entrypoint=entry.entrypoint
                          ↓ host:hello (theme + tokens + gatewayUrl + authToken)
                          ↓
                      iframe ControlApp.svelte
                          ↓ bridge.call("plugins.alerts.summary", { since, until })
                          ↓
                      gateway server-methods/alerts.ts
                          ↓ SQL GROUP BY on complaints
                          ↓
                      response → ECharts render
```

## Build sequence

Three phases, each independently shippable.

### Phase 1 — Plumbing
- New slot value in `PluginUiSlot`
- Hub `/plugins/[id]` route (server load + page)
- Browse menu PLUGINS column hydrated from `pluginsUiList()`
- Section hiding when empty
- Tests: unit tests for the section filter; e2e-light test that route 404s when no plugin registered

Ships with **zero plugin changes** — PLUGINS column is hidden, route 404s, nothing surfaces to the user yet. Lets us ship the plumbing risk-isolated.

### Phase 2 — Alert-watcher dashboard
- Multi-entry Vite build (`index.html` + `control.html`)
- `ControlApp.svelte` + dashboard components
- `plugins.alerts.summary` + `plugins.alerts.list` RPCs
- Manifest entry for `plugins.controlCenter` slot
- Deploy: npm publish (or hot-patch per [[reference_netcup_gateway_deploy_recipe]])

PLUGINS column shows "Alert Watcher" after this phase.

### Phase 3 — Voice-call schema + dashboard
- `call_history` table + write hooks in `manager.ts`
- `plugins.voice.calls.{summary,list,trace}` RPCs
- Multi-entry Vite build
- `ControlApp.svelte` + dashboard components + trace drawer
- Manifest entry

PLUGINS column shows "Voice Call" after this phase.

## Testing

Per plugin:

- **Unit:** RPC handlers tested against an in-memory `node:sqlite` DB seeded with fixture rows (mirrors existing alert-watcher test pattern at `extensions/alert-watcher/src/reply-flow/store.test.ts`).
- **UI:** Vitest+jsdom smoke that mounts `ControlApp.svelte` with a mocked bridge and asserts the chart components render with seeded data.
- **Bridge:** the existing `plugin-ui-bridge` tests already cover `bridge.call()` proxy-safety; no new bridge tests unless we extend the bridge.

Hub plumbing:

- Unit test for the section-filter helper (empty list ⇒ section omitted; n items ⇒ section with n rows).
- Light e2e (or component-test) for the `/plugins/[id]` route's 404 path and successful-load path.

## YAGNI

Things we are explicitly NOT building in this design:

- **A shared chart bundle** across plugins. Each plugin re-imports `echarts` in its own iframe bundle. Factor only if a third plugin needs charts.
- **A generic `ui.pages[]` array** in the manifest. Named slots stay — two slots is enough and adding pages invites scope creep.
- **Modal/drawer overlay** for control centers. Top-level routes only.
- **Disabled-plugin discoverability** in the PLUGINS column. Only enabled plugins with a control-center entry appear.
- **Persistent voice-call trace storage** in v1. Trace events are surfaced from the in-memory buffer; persistence can come later if it proves valuable. The `call_history` table stores call rows, not trace events.

## Open questions

- **Voice-call schema migrations:** does the plugin already open a SQLite DB, and where? If yes, extend `initSchema`. If no, add the bootstrap. Plan-writer should grep `extensions/voice-call/src/**/*.ts` for `DatabaseSync` before scoping Phase 3.
- **`pluginsUiList()` cache behavior:** the Browse menu wants to react to plugin enable/disable without a refresh. Verify whether the existing RPC is cached at the hub or fetched each call; if cached, wire an event or fetch lazily on Browse open.

## Cross-references

- [[reference_plugin_save_bar_hub_layer]] — bridge protocol the dashboard reuses
- [[reference_hub_plugin_iframe_remount_and_scroll]] — iframe scroll/remount patterns to copy
- [[project_alert_watcher_rename]] — alerts namespace history; classifier categories
- [[project_voicecall_pathA_deepgram_spike]] — trace waterfall data the voice-call drawer surfaces
- [[reference_npm_install_cache_silent_skip]] — deploy gotcha for Phase 2 + Phase 3 ship
