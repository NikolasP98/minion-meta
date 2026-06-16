# Plugin SDK Recon & Improvement Report

**Date:** 2026-06-13
**Scope:** `minion/` (gateway = plugin host), `minion_hub/` (consumer), `@minion-stack/shared`, `packages/db`
**Method:** 5 parallel codebase-recon agents + direct verification of the two highest-stakes root causes.

---

## TL;DR — the five findings

| # | Issue | Severity | Root cause | Layer |
|---|---|---|---|---|
| 1 | **Channel accounts leak across orgs** (FACES + PANIK show in both MINION and FACES) | **High (correctness/tenancy)** | `channels.status` handler never threads `client.orgId`; channel-account config has no `orgIds` field | gateway |
| 2 | **Dashboards show no data** (WhatsApp "Message volume" empty) | **High (broken feature)** | Message ledger disabled by default **AND** dashboard queries a `messages` table the ledger never creates (it creates `outbox`) | gateway |
| 3 | **Studio "handshake timed out (2.5s)"** | Medium (deploy lag, misreported) | Deployed netcup gateway **404s** on `/plugins/studio/ui/control.html` — studio + meta-graph are the only un-served (newest) plugins; the bridge itself is fine | deploy |
| 4 | **Plugins not categorized** (alert-watcher/kanban/studio mixed with channel plugins) | Medium (UX/IA) | No `category` field on the manifest; channel-ness is inferred at runtime, voice-call falls through every classifier | gateway + hub |
| 5 | **SDK gaps**: no DB-table provisioning, weak docs, async-register dropped | Medium (DX/reliability) | No declarative storage/migration API; plugin authoring is undocumented tribal knowledge | SDK |

Findings 1, 2, 3 are **live production defects**. 4 and 5 are architecture/DX debt.

---

## 1. Channel/plugin settings leak across orgs (PRIORITY)

### What's wrong
The hub is multi-tenant (orgs MINION, FACES). On the Channels/Control-Center surfaces, **both orgs see both WhatsApp accounts** ("panik" and "Faces Sculptors"). Correct outcome: panik ∈ MINION only, Faces Sculptors ∈ FACES only. Same for Telegram and every other channel.

### Root cause (verified)
Channel accounts live in the gateway's `gateway.json` under `channels.<channel>.accounts.<id>` (e.g. `minion/src/channels/telegram/accounts.ts:28`, `minion/extensions/whatsapp/src/channel.ts:76`). The hub reads them via the `channels.status` WS RPC. The handler **deliberately omits the connection's org identity** that the equivalent agents handler uses:

- `agents.list` — `src/gateway/server-methods/agents.ts:291` destructures `client`, then `:305` `listAgentsForGateway(cfg, { orgId: client?.orgId })`. The JWT carries `orgId` (stamped at `src/gateway/server/ws-jwt-auth.ts:65`).
- `channels.status` — `src/gateway/server-methods/channels.ts:273` destructures only `{ params, respond, context }`. **`client` (and its `orgId`) is available at the identical call site but unused.** `buildChannelStatusPayload` (`channels.ts:72`) loops every account of every channel with no org gate (`channels.ts:124-181`).

Three missing pieces (the exact mirror of what makes agents work):
1. No `orgIds` field on channel-account config types (`types.telegram.ts`, `types.whatsapp.ts`) or on `ChannelAccountSnapshot` (`src/channels/plugins/types.core.ts:95`).
2. No org gate in `channels.status` / `buildChannelStatusPayload` (doesn't even read `client.orgId`).
3. No hub-side fallback filter — the hub consumes `gw.channels` raw (`minion_hub/src/lib/state/gateway/gateway-data.svelte.ts:19-38`); org-scoping there exists **only** for agents (`visibleAgents` → `filterAgentsByOrg`).

> ⚠️ Note: the existing agent client-filter (`agent-org.ts:34`) is a **name regex** (`/faces/i`) with hardcoded two-org slugs and fail-open behavior. Do **not** replicate that for channels — use real `orgIds` data.

### Fix design (mirror the agent pattern — architecture-consistent)
1. **Add `orgIds?: string[]`** to channel-account config types (`src/config/types.telegram.ts`, `types.whatsapp.ts`, shared account shape) + their Zod schemas, and to `ChannelAccountSnapshot` (`types.core.ts:95`).
2. **Thread `client.orgId`** into `channels.status` (`channels.ts:273`) and gate the account loop in `buildChannelStatusPayload` (`channels.ts:124-181`) with an `agentVisibleToOrg`-style helper (`src/gateway/sessions/session-utils.ts:361-372`). Reuse its fail-open semantics: undefined client orgId → show all (admin/shared token); account with no `orgIds` → visible to all (back-compat).
3. **Gate the side-channel RPCs too** — the same account data leaks via `plugins.config.get` flatten (`src/gateway/server-methods/plugins.ts:297-301`) and `telegram.accountsSummary` (`extensions/telegram/src/dashboard-rpcs.ts:54`). Fixing only `channels.status` leaves holes.
4. **Backfill** existing accounts on the netcup `gateway.json`: `panik.orgIds=[<MINION uuid>]`, `faces-sculptors.orgIds=[<FACES uuid>]` (fail-open means untagged accounts still show in both until tagged).
5. *(Optional)* add a `visibleChannels` derived in `gateway-data.svelte.ts` (parallel to `visibleAgents`) using the snapshot's `orgIds` + `page.data.activeOrgId`.

**Why gateway-config, not a hub DB table:** channel accounts are gateway-native (they live in `gateway.json`, not the hub DB) — exactly like agents, which are org-scoped via a config `orgIds` tag enforced off the JWT, not a relational mapping. This satisfies the requirement cleanly: the plugin stays gateway-scoped (installed once); each account entry carries org-scoped config.

This single fix (`buildChannelStatusPayload` + account config type) corrects **all 45+ channels at once** — the payload builder is channel-agnostic.

---

## 2. Dashboards show no recent data

### What's wrong
WhatsApp "Message volume" panel: *"No messages in this window. Try a wider time range or check that the message ledger is enabled."* — empty even at 24h.

### Root cause — TWO stacked bugs (both verified)
This panel is the **gateway iframe plugin** (`extensions/whatsapp/ui/src/control/lib/VolumeChart.svelte`), not a hub route. Its RPC chain: `VolumeChart` → `whatsapp.volumeBuckets` → `extensions/whatsapp/src/dashboard-rpcs.ts:volumeBuckets()`.

**Bug 2a — ledger disabled by default.** The ledger DB only opens if `MINION_MESSAGE_LEDGER` env is truthy OR `gateway.messageLedger.enabled === true` (`src/gateway/server.impl.ts:394-405`). The schema field is `z.boolean().optional()` with **no default** (`src/config/zod-schema.ts:460`), and no committed `gateway.json` sets it. → `getMessageLedgerDb()` returns `null` → `{ buckets: [] }`.

**Bug 2b — table-contract drift (fatal even if 2a is fixed).** Verified directly:
- `src/infra/message-ledger.ts:33` creates **only** `CREATE TABLE IF NOT EXISTS outbox` (a write-ahead buffer drained to Supabase).
- `extensions/whatsapp/src/dashboard-rpcs.ts:152,159,201` query **`FROM messages`** — a table that **no non-test code ever creates**. So with the flag on, the query throws `no such table: messages`.

The RPC and the ledger schema were written against **different table contracts**, and tests mask it by seeding their own `messages` fixture (`extensions/alert-watcher/src/context.test.ts:7`).

The WhatsApp panel also has **no live WS subscription** — it only refreshes on mount/button/filter, so it can never self-recover.

### Reliability dashboard — actually healthy
Closed loop: `emitReliabilityEvent()` (`src/logging/reliability.ts:61`) persists to the `events` store **and** the RPC handlers read the same store; the hub subscribes to the `'reliability'` event (`minion_hub/src/lib/state/gateway.svelte.ts:545`). It only looks empty when the gateway is disconnected or genuinely idle. One minor wire: `gateway.perf_snapshot` broadcasts as `events.new`, which the hub has no live `case` for — so perf snapshots appear on next pull instead of streaming.

### Fix
1. Enable the ledger: `gateway.messageLedger.enabled=true` (or `MINION_MESSAGE_LEDGER=1`) **and deploy the gateway**.
2. Fix the table contract — **recommended (A)**: point `dashboard-rpcs.ts` (`recentMessages` + `volumeBuckets`) at the real `outbox` table, parsing the JSON `payload` and filtering `channel='whatsapp'`. Lower-risk than (B) adding a `messages` projection table + double-write. Wrap the query in try/catch so a missing table degrades to `{buckets:[]}` instead of an RPC error.
3. Confirm inbound + outbound hooks record (`message-ledger-hooks.ts:50,99`).
4. *(Optional)* broadcast `perf_snapshot` via `emitReliabilityEvent` or add a `case 'events.new'` handler for live streaming.

---

## 3. Studio "Plugin handshake timed out (2.5s)"

### Root cause — deployment lag, NOT a bridge bug (verified by live probe)
Live HTTP against `https://netcup.donkey-agama.ts.net`:
```
404  /plugins/studio/ui/control.html
404  /plugins/meta-graph/ui/control.html
200  /plugins/voice-call, alert-watcher, whatsapp, telegram, discord
```
Studio (committed 2026-06-05) and meta-graph (2026-06-02) are the two **newest** UI plugins; every 200-serving plugin is older. The static handler (`minion/src/gateway/plugin-ui-static.ts:53-78`) 404s when the plugin isn't enabled/registered or its `ui/dist/` isn't on disk. **The deployed gateway predates these plugins being shipped/enabled.**

Why it *looks* like a handshake failure: a 404 still has a body, so the iframe's `onload` fires → "iframe loaded: yes", but there's no plugin JS → `notifyReady()` never runs → "plugin:ready: no" → timeout. The hub's CSP-diagnostic fetch finds no `frame-ancestors 'none'`, so it renders the **generic** Referrer/WS/throw error — none of which is the real cause. The bridge, origin handling (host-origin via URL hash to survive Referrer-Policy), and buffering are all correct. Studio's local `dist/` is healthy and contains the full bridge.

### Fix
- **Deploy:** ensure studio + meta-graph are enabled in the netcup `gateway.json` and their `ui/dist/` dirs are synced (add plugin `ui/dist` sync + plugin-enable to the deploy checklist `setup/utilities/deploy-bot-prd.sh`). Verify: `curl -I .../plugins/studio/ui/control.html` → 200.
- **Code hardening (so this stops masquerading):** the hub's timeout diagnostic already does `fetch(src)` (`minion_hub/.../PluginIframe.svelte:242`) — read `r.status` and render a dedicated *"Gateway returned {status} — plugin not deployed/enabled"* branch when `>= 400`. Raise the timeout to ~5–6s (tight for a cold remote bundle over Tailscale) and add one re-arm/retry. Consider routing the probe through a hub server endpoint to avoid CORS on the localhost→netcup diagnostic.

---

## 4. Plugin categorization

### What's wrong
The sidebar "PLUGINS" section is a flat dump (Kanban + Studio + Alert Watcher + Discord…) with no type distinction. Channel plugins (whatsapp/telegram) are actually on a *separate* surface (account/Channels page) via a different RPC — so the user's complaint conflates two cohorts. There is **no taxonomy** anywhere.

### Root cause
- `PluginManifest` (`minion/src/plugins/manifest.ts:39-69`) has **no `category`/`type`/`kind` field**. The only channel signals are `channels?: string[]` and `channelLink?` — and the loader doesn't even copy `channels` into the runtime record (`loader.ts:168`); channel-ness is decided imperatively by runtime `api.registerChannel()` calls.
- Two parallel discovery RPCs with no shared category: `plugins.ui.list` (control-center UIs → sidebar, `plugins.ts:253`) vs `channels.plugins.list` (channel plugins → account page, `channels-plugins.ts:83`). A plugin is a "channel plugin" only by accident of which RPC surfaces it.
- **voice-call falls through every classifier** (no `channels`, no `channelLink`, no `registerChannel`) yet the user considers it a channel.
- **Kanban** has zero gateway backing — it's a hardcoded hub-side label with a `/workforce` prefix hack (`minion_hub/src/lib/components/layout/sections.ts:103-110`).

### Fix
1. Add declarative `category?: 'channel' | 'tool' | 'dashboard' | 'creative' | 'automation'` to `PluginManifest` (`manifest.ts:~42`). Proposed mapping: **channel** = whatsapp/telegram/discord/**voice-call**; **automation** = alert-watcher/flows; **creative** = studio; **tool** = paperclip(Kanban)/memory; **dashboard** = generic.
2. Plumb it: copy into the runtime record (`loader.ts`), add to `PluginsUiListEntry` (`plugins.ts:12-30`) and `PluginUiManifestOccupant` (`minion_hub/src/lib/plugins/plugin-types.ts:3-15`). Back-compat fallback: absent → `channelIds.length>0 ? 'channel' : 'tool'`.
3. **Primary edit point:** `getDynamicPluginsSection()` (`sections.ts:117-136`) — stop returning one flat "Plugins" section; group entries by `category` into multiple sections ("Channels", "Tools", "Creative", "Automation"). The `Section[]` model already supports N sections. Move the hardcoded Kanban builtin into the `tool` group.

---

## 5. Plugin SDK internals — load-time, caching, storage, docs

### How it works
Author writes `defineManifest({...})` (Zod config) → codegen emits `minion.plugin.json` + drift checksum (`src/plugin-sdk/define-manifest.ts:79,122`). At gateway startup `loadOpenClawPlugins` (`src/plugins/loader.ts:186`) **eagerly + synchronously** discovers candidates across 4 precedence-ranked origins (`discovery.ts:333`), parses manifests, Jiti-imports each enabled entry (`loader.ts:351`), builds a capability-scoped `api`, and calls `register(api)`. Plugins contribute tools, hooks, HTTP routes, gateway/RPC methods, channels, providers, CLI, services, flow nodes/presets/templates, channelLink UIs, MCP tools, and vault secret slots.

### Load-time & caching
Three caches exist: **registry cache** keyed on serialized config (`loader.ts:51`, never TTL'd — config change = new key = the reload mechanism); **manifest-registry cache** (200ms TTL, env-tunable `MINION_PLUGIN_MANIFEST_CACHE_MS`); **Ajv validator cache**; **base config-schema memo** (`config/schema.ts:298`).

**Biggest remaining caching opportunity:** `buildConfigSchema()` (~2.6ms benchmarked) does **multiple `structuredClone` deep clones per call** when plugins/channels are present (`config/schema.ts:232,249,260,273,291`). Only the *base* is memoized; the *merged* result is recomputed and re-cloned every call. → Memoize the merged schema keyed by base-version + sorted plugin/channel schema checksums.

Other load-time levers: eager Jiti transpile (mitigated by `preferCompiledSource`); eager plugin-agent injection bloat (29 plugins/154 agents, no lazy-load path — only lever is disabling plugins); opt-in deferred activation for non-channel plugins would cut startup.

### DB-table provisioning — IMPORTANT GAP
**There is no mechanism for a plugin to declare or provision tables in the shared Supabase/Drizzle DB.** The manifest has no `tables`/`migrations` field; plugins never import Drizzle; the hub DB is entirely hub-curated. Plugins that persist data **hand-roll their own SQLite** at `ctx.stateDir/plugins/<id>/<file>.db` with manual `CREATE TABLE IF NOT EXISTS` + ad-hoc `ALTER TABLE` (e.g. alert-watcher `alerts.db`, voice-call `call_history`, flows `relay_*`). Some pin DB handles on `globalThis` to survive Jiti module duplication — a fragile workaround. Small state uses atomic JSON stores (`plugin-sdk/json-store.ts`). The message-ledger handle is exposed **read-only**.

This firewall (plugins can't touch the hub DB) is **architecturally correct** — but it's undocumented and there's no sanctioned storage abstraction. Recommendation: add `runtime.storage.openDb(pluginId)` returning a sandboxed SQLite handle at the standard path **plus** a declarative `migrations` manifest field with a tiny runner. If hub-visible relational data is ever needed, define an explicit gateway RPC contract — don't open the Drizzle DB to plugins.

### Failure isolation — GOOD
Every risky load step is wrapped in try/catch (`loader.ts:350,413,434,492`): a bad manifest, failed import, invalid config, missing export, or throwing `register()` marks the plugin `status:"error"` and continues. **One bad plugin cannot crash the gateway.** Weaknesses: async `register` is **silently dropped** (`loader.ts:461`); CHN-03 channelLink drift, method/route collisions are **warn-only** and ordering-dependent; registry cache never invalidates on source mtime (dev hot-edit needs restart).

### Documentation — WEAK (~3/10)
Best source is JSDoc on `define-manifest.ts`. No end-to-end "write your first plugin" guide; manifest fields are discoverable only by reading the TS type; the `register(api)` lifecycle, `runtime.*` surface, and the load-bearing `ctx.stateDir` storage convention are **undocumented**; no storage guidance (authors copy alert-watcher); `core.ts` (514 exports) is largely undocumented. → Write one authoring guide + a scaffold/template plugin.

---

## Good practices observed

- **Plugin load isolation** — comprehensive per-step try/catch; no plugin crashes the gateway; diagnostics surfaced to the hub.
- **Bridge security** — plugins never get the gateway token or open their own WS; RPC is tunneled through the hub's privileged connection; strict origin checks both directions; host-origin via URL hash to survive Referrer-Policy; buffered hello/ready on both sides handles the postMessage race.
- **Zod→JSON-Schema codegen** with a drift checksum (`pnpm check`).
- **Reliability dashboard** is a clean closed loop (same store for write/read, subscription wired) — the right pattern to copy.
- **Atomic JSON writes** (temp+rename, 0600) and file locks for plugin state.
- **Agent org-scoping** has a clean gateway-side primitive (`agentVisibleToOrg`) with a single chokepoint — reuse it for channels.

## Bad practices / risks

- **Org identity not threaded into channel/plugin RPCs** (Finding 1) — tenancy leak.
- **Silent table-name contract drift** ledger `outbox` vs RPC `messages` (Finding 2) — masked by test fixtures.
- **Diagnostics misreport deploy lag as a bridge bug** (Finding 3) — no HTTP-status check.
- **No declarative plugin storage / DB-provisioning API** — every plugin hand-rolls schema + `globalThis` handle hacks.
- **Channel-ness inferred at runtime**, not declared; no category taxonomy; voice-call unclassifiable; Kanban hardcoded hub-side.
- **Async `register` silently dropped**; CHN-03 / collision drift warn-only.
- **Merged config schema re-cloned every call**; registry cache never mtime-invalidated.
- **Duplicated bridge protocol** in 3 places (hub inline, package, dead package stub) — drift risk.
- **Client-side agent org-filter is a name regex** (`/faces/i`) — brittle, fail-open, won't scale. Don't extend it.

---

## Recommended implementation order

**Now (live defects):**
1. **Finding 1** — `orgIds` on channel-account config + gate `channels.status` (and the two side-channel RPCs) + backfill netcup accounts. *Tenancy correctness.*
2. **Finding 2** — enable `messageLedger`, repoint `dashboard-rpcs.ts` at `outbox` (option A) with try/catch, deploy gateway. *Restores dashboards.*
3. **Finding 3** — sync studio/meta-graph `ui/dist` + enable on netcup; add HTTP-status branch to the iframe timeout diagnostic. *Restores Studio + stops misdiagnosis.*

**Next (architecture/DX):**
4. **Finding 4** — `category` manifest field + group the sidebar by category.
5. **Finding 5** — merged-config-schema memoization (load-time); async-`register` support + promote drift/collisions to surfaced "degraded" status (reliability); `runtime.storage.openDb` + declarative `migrations` (DB provisioning); authoring guide + scaffold (docs).

---

## Key file index

- **Org-scoping:** `minion/src/gateway/server-methods/channels.ts:72,124-181,273`; `agents.ts:291,305`; `src/gateway/sessions/session-utils.ts:361-372`; `src/channels/plugins/types.core.ts:95`; `src/config/types.telegram.ts`, `types.whatsapp.ts`; `minion_hub/src/lib/state/gateway/gateway-data.svelte.ts`, `agent-org.ts`.
- **Dashboards:** `minion/src/infra/message-ledger.ts:33`; `extensions/whatsapp/src/dashboard-rpcs.ts:152,159,201`; `src/gateway/server.impl.ts:394-405`; `src/config/zod-schema.ts:460`; `extensions/whatsapp/ui/src/control/lib/VolumeChart.svelte`; `src/logging/reliability.ts:61`; `minion_hub/src/lib/state/gateway.svelte.ts:545`.
- **Bridge:** `minion_hub/src/lib/plugins/{bridge-protocol.ts,PluginIframe.svelte}`; `minion/packages/plugin-ui-bridge/src/index.ts`; `minion/src/gateway/plugin-ui-static.ts:53-78`; `extensions/studio/ui/src/control/main.ts`.
- **Categorization:** `minion/src/plugins/manifest.ts:39-69`; `loader.ts:168`; `src/gateway/server-methods/{plugins.ts:253,channels-plugins.ts:83}`; `minion_hub/src/lib/components/layout/sections.ts:103-136`, `Sidebar.svelte`; `minion_hub/src/lib/plugins/plugin-types.ts`.
- **SDK:** `minion/src/plugins/{loader.ts,registry.ts,manifest.ts,manifest-registry.ts,discovery.ts}`; `src/plugin-sdk/{define-manifest.ts,core.ts,json-store.ts}`; `src/plugins/runtime/types.ts`; `src/config/schema.ts:232-301`.
