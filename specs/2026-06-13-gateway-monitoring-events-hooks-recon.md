# Gateway Monitoring Recon — Events, Hooks & the /reliability Page

**Date:** 2026-06-13
**Scope:** `minion/` gateway (event/hook emission) + `minion_hub/` `/reliability` page (consumption)
**Goal:** Map every monitoring point, find the gaps, and recommend new instrumentation that feeds `/reliability` for better visibility.

---

## 1. Executive Summary

The gateway has a **mature, well-architected reliability event system** — a unified SQLite EventStore with Turso write-behind, filter-aware aggregation RPCs, and a sophisticated hub dashboard (8 KPIs, Sankey flow, stacked timeline, sparklines with 6σ control bands). Coverage of the *reliability* path is good (~60% of critical paths).

But there are **three classes of monitoring data the gateway already produces that never reach `/reliability`**, plus a long tail of swallowed errors. The single highest-value win is not writing new instrumentation from scratch — it's **bridging the existing `diagnostic-events` and `agent-events` streams into the EventStore**. Those streams already emit webhook errors, session-stuck detection, tool-loop detection, queue depth, and per-run attempts — they just have listeners and no persistence.

**Recommendation tiers:**
- **Tier 1 (high value, low risk):** A diagnostic→reliability bridge + ~10 swallowed-error emit sites. Pure additions; feed *existing* charts immediately.
- **Tier 2 (medium):** New derived KPIs that the bridged data unlocks (latency percentiles, per-channel error rate, reconnect/flap tracking, queue depth).
- **Tier 3 (larger):** New `/reliability` UI surfaces (per-channel drill-down, SLA/uptime %, cost forecasting).

---

## 1.5. ⚠️ CRITICAL FINDING — Health signals are coupled to the opt-in `diagnostics` flag

The single most important discovery: **a large class of failure signals only flow into the EventStore when `diagnostics.enabled === true`** — an opt-in *verbose telemetry* flag, not an always-on health toggle. In the default/prod config (diagnostics off), `/reliability` is **blind** to:

| Signal | Where it's gated | Effect when diagnostics OFF |
|---|---|---|
| **Message-processing errors (all channels)** | `dispatch-from-config.ts:144` — `recordProcessed` returns early when `!diagnosticsEnabled` | No `message.*` failure events at all |
| **Webhook errors** | `telegram/webhook.ts:108` — `if (diagnosticsEnabled) logWebhookError(...)` | No webhook-failure reliability events |
| **Stuck sessions** | `server.impl.ts:315` — `startDiagnosticHeartbeat()` only runs when diagnostics on | No `session.stuck` detection |

These reliability emits live *inside* diagnostic log functions that are themselves only called behind the flag — so they inherit the gate. This is an architectural coupling bug: always-on health monitoring should not depend on verbose-telemetry opt-in.

**Second finding (root cause of "everything is `general`"):** `emitReliabilityEvent()` is typed against `ReliabilityCategory` (`gateway/protocol/schema/reliability.ts`) which only allowed **8 categories** (cron/browser/timezone/general/auth/skill/agent/gateway). The richer `/reliability` categories (`channel`, `message`, `session`, `tool`, `connection`, …) existed only on the EventStore's `EventCategory` and were unreachable via `emitReliabilityEvent`. So the few bridges that did fire dumped into `general`, where they don't surface in the per-category Sankey/timeline/drill-downs.

---

## 1.6. Implemented this session (gateway DEV + hub dev — NOT yet committed/deployed)

Tier-1, low-risk, additive changes (gateway `tsgo` clean on modified files; 59 unit tests pass; hub `check` 0/0):

1. **Always-on message-error signal** — `src/auto-reply/reply/dispatch-from-config.ts`: `recordProcessed("error")` now emits `emitReliabilityEvent({category:"message", event:"message.processing_error", severity:"medium", metadata:{channel}})` **before** the diagnostics gate. This is the universal chokepoint for *every* channel (WhatsApp/Signal/Slack/Line/iMessage/Telegram/Discord), so per-channel message-failure visibility now works regardless of the diagnostics flag. Error-path only (low volume) + 60s/event-name rate-limit.
2. **Widened `ReliabilityCategory`** — `src/gateway/protocol/schema/reliability.ts`: added `connection, message, tool, session, orchestration, template, channel, crash, system` to both the TypeBox schema and the TS union, aligning it with `EventCategory`. (Purely additive/more-permissive; no validation regressions.)
3. **Recategorized 3 existing bridges** — `src/logging/diagnostic.ts`: `general.agent_error`→`channel.webhook_error`, `general.session_stuck`→`session.stuck`, `general.tool_loop`→`tool.loop`. Now surface under the correct `/reliability` categories.
4. **Hub:** added `session` to `CATEGORY_COLORS` (`ActivityLogTable.svelte`) so the new category renders with a distinct hue (`#818cf8`).

**Note:** tool-loop blocks were *already* covered always-on via `agent.tool_blocked` (`pi-tools.before-tool-call.ts:147`) — the recategorized `tool.loop` is the diagnostics-gated verbose duplicate.

5. **Always-on `agent.run_error`** (commit `bc9c468db`) — `pi-embedded-subscribe.handlers.lifecycle.ts` `handleAgentEnd` error branch now emits `emitEvent({category:"agent", severity:"high", event:"agent.run_error", metadata:{runId,provider,model}})`. Agent run failures (the gateway's core job) were previously only on the listener-only agent-events stream, never persisted — now they feed error-rate/health/top-events/Sankey. Uses `emitEvent` (category `agent` not rate-limited) so every failed run counts.

6. **`reliability.perf` RPC + hub Latency panel** (gw `8db1abd79`, hub `a6c060d`) — surfaces the already-emitted `gateway.perf_snapshot` series (handler p50/p95/p99/max latency, throughput, error rate, slowest methods, event-loop delay) that was collected every 60s but never shown. New `LatencyPanel.svelte` under Gateway Health on the Overview tab; hides on older gateways.

**Commits:** gw DEV `ab89008da` (msg-error + categories), `8db1abd79` (perf RPC), `bc9c468db` (agent.run_error). hub dev `ac46dd6` (session color), `a6c060d` (Latency panel).

### Remaining (low value — documented, not done)
- **Webhook-error decoupling:** telegram-only (`telegram/webhook.ts:108`); the universal `message.processing_error` already covers per-channel message failures, so this is narrow.
- **Stuck-session decoupling: NOT cheaply possible.** Stuck detection reads `diagnosticSessionStates`, which is populated by `logMessageQueued`/`logSessionStateChange` — both gated behind diagnostics (`canTrackSession = diagnosticsEnabled && sessionKey`). When diagnostics is off the map is empty, so detection can't run without making *all* session-state tracking always-on (the overhead the gate exists to avoid). Would need a dedicated lightweight always-on sweep — deferred.

---

## 2. Architecture — Three Event Tiers

The gateway has **three parallel event systems**, only one of which currently feeds `/reliability`:

| Tier | System | Persisted to EventStore? | Feeds /reliability? | Files |
|---|---|---|---|---|
| **A** | Unified EventStore (reliability) | ✅ Yes (SQLite + Turso) | ✅ Yes | `src/events/{store,emitter,types}.ts`, `src/logging/reliability.ts` |
| **B** | Diagnostic events (telemetry) | ❌ No (listeners only) | ❌ **No — GAP** | `src/infra/diagnostic-events.ts` |
| **C** | Agent run events (streamed) | ❌ No (listeners only) | ❌ **No — GAP** | `src/infra/agent-events.ts` |

Plus a **hook/lifecycle layer** (`src/hooks/`, `src/plugins/event-bus.ts`) that drives flows and bundled hooks but is not itself a monitoring surface — though several lifecycle points there are good emit candidates.

### 2.A — EventStore (the reliability backbone)

- **Schema** (`src/events/types.ts:49-70`): `{ id, category, severity, event, message, agentId?, correlationId?, metadata?, timestamp, createdAt }`.
- **Severities** (`types.ts:45`): `critical | high | medium | low | info`. ⚠️ The legacy `emitReliabilityEvent()` path (`gateway/protocol/schema/reliability.ts:15-20`) only allows `critical|high|medium|low` — `info` is reachable only via `emitEvent()` directly.
- **Categories** (`types.ts:17-40`): `cron, browser, timezone, general, auth, skill, agent, gateway, connection, message, tool, session, orchestration, template, channel, crash, system` + `debug.step`, `prompt.section`. Type is `string` — plugins can add custom. `heartbeat` and `memory` are used in practice too.
- **Event "mode"**: the suffix after the first `.` in the event name (`tool.call.error` → `error`). Extracted server-side in SQL (`store.ts:226-233`) for failure-mode filtering.
- **Store API** (`src/events/store.ts:96-163`): `insert, query, get, summary, timeline, timelineByCategory, flowBreakdown, eventStatsByEvent, recentErrors, cleanup, getUnsyncedEvents, dbSizeBytes`. All aggregates are filter-aware and **bypass the 2000-row WS cap**.
- **Emit helpers:**
  - `emitEvent(input)` — `src/events/emitter.ts:120-143`. Sync SQLite write + WS broadcast. Rate-limits `tool`/`message` to 5s/event-name. Never throws.
  - `emitReliabilityEvent(input)` — `src/logging/reliability.ts:61-96`. 60s rate-limit/event-name, legacy "reliability" broadcast, Sentry for critical/high. Maps `sessionKey`→`correlationId`.
  - `trackToolExecution()` / `trackSkillExecution()` — `reliability.ts:113-170`.
- **Heartbeat & memory already persist:** `src/infra/heartbeat-events.ts:54-73` (category `heartbeat`) and `src/memory/knowledge-graph.ts:129-150` (category `memory`) both write to the EventStore.

### 2.B — Diagnostic events (THE big gap)

`src/infra/diagnostic-events.ts` emits a rich telemetry stream **with listeners but no EventStore persistence**:

| Event | Fields | Monitoring value |
|---|---|---|
| `model.usage` | tokens (in/out/cache), cost, durationMs | **LLM latency + cost per call** |
| `webhook.received` / `processed` / `error` | channel, updateType, chatId, durationMs, error | **Per-channel webhook health + latency** |
| `message.queued` / `processed` | channel, source, queueDepth, outcome, duration | **Queue depth + message latency** |
| `session.state` | sessionKey, state (idle/processing/waiting), reason | Session liveness |
| `session.stuck` | sessionKey, state, ageMs, queueDepth | **Stuck-session detection** |
| `queue.lane.enqueue` / `dequeue` | lane, queueSize, waitMs | **Backlog + wait time** |
| `run.attempt` | sessionKey, runId, attempt | **Retry tracking** |
| `tool.loop` | toolName, level, action, count | **Runaway tool-loop detection** |
| `diagnostic.heartbeat` | webhooks{recv/proc/err}, active, waiting, queued | Rollup |

Emitted via `emitDiagnosticEvent()` (`diagnostic-events.ts:177-190`), fanned to `onDiagnosticEvent()` listeners. **None of this is queryable on `/reliability`.** This is the richest untapped source in the codebase.

### 2.C — Agent run events

`src/infra/agent-events.ts:57-78` streams `lifecycle | tool | assistant | error` per `runId` with monotonic seq. Listener-only. The `error` stream in particular is a high-value persist candidate (agent run failures).

### 2.D — Hooks & lifecycle layer

- **Internal hooks** (`src/hooks/internal-hooks.ts`): event types `command, session, agent, gateway, message, memory` × actions. Fired via `triggerInternalHook()` (`:254-273`). Observable lifecycle points:
  - `gateway:startup` (`server-startup.ts:24-25`)
  - `agent:bootstrap` (`bootstrap-hooks.ts:27-28`)
  - `command:new` / `command:reset` (`commands-core.ts:97`)
  - `message:received` (`fire-message-inbound.ts:41-49`)
  - `message:sent` (`deliver.ts:484-495`)
  - `memory:node_{created,updated,deleted}` (`knowledge-graph.ts:138`)
- **Hook event log** (`src/gateway/hooks-event-log.ts`): in-memory ring buffer (max 100) of hook dispatches with status `dispatched|skipped|rejected|error`. Debug-only — not in EventStore, not on `/reliability`.
- **Plugin event bus** (`src/plugins/event-bus.ts`): typed pub/sub with wildcard topics, plugin-namespaced. Diagnostics via `getSubscriptionCount()`.
- **Bundled hooks** (9): boot-md, bootstrap-extra-files, command-logger, failure-gate, kg-message-sync, session-autosave, session-memory, validation-harness.

---

## 3. What `/reliability` Shows Today

**Page:** `minion_hub/src/routes/(app)/reliability/+page.svelte` (~1459 lines). **State:** `src/lib/state/reliability/reliability.svelte.ts`.

### KPIs (Overview tab, 8 cards)

| KPI | Formula | Source RPC |
|---|---|---|
| Health Score | `100·(1 − (crit + 0.6·high + 0.3·med)/N)` | `reliability.summary` |
| Error Rate | `(high+crit)/total` | `reliability.summary` |
| Critical Rate | `crit/total` | `reliability.summary` |
| Noise Rate | `(info+low)/total` | `reliability.summary` |
| Heartbeat Health | `ok/(ok+failed)` | `reliability.activity` |
| Tool Success | `exec.ok/(exec.ok+exec.error)` | `reliability.activity` |
| Top Category/Mode | top by volume | `summary.byCategory` |
| Event Rate | `total/rangeHours` | `summary.total` |

Health score: `+page.svelte:559-570` / `625-638`. Sparklines: 24 buckets, raw + rolling-avg + ±3σ control band (`KpiSparkline.svelte`).

### Charts & panels
- **Sankey flow** (mode→category→severity) ← `reliability.flow`
- **Stacked timeline** (buckets×category) ← `reliability.timeline`
- **Top events** (top-20 failure modes), **Severity donut** ← `reliability.events`
- **Gateway Health Panel** (uptime/sessions/agents/memory + channel status grid) ← REST `/api/metrics/gateway-heartbeats` (60s poll)
- **Credential Health**, **Skill Stats**, **Agent Activity**, **Plugin Health**, **Activity Log** (per-category tabs, sortable/searchable)

### Tabs
- **Overview** — full filters (severity/category/mode)
- **Agents** — severity+mode filters; token cost/usage + activity
- **Plugins** — per-plugin health cards

### Gateway RPCs consumed
`reliability.summary`, `.timeline`, `.flow`, `.events`, `.usage`, `.activity` — all in `src/gateway/server-methods/reliability.ts`, all filter-aware (severities[]/categories[]/eventModes[]) except `.usage`/`.activity` (date-only).

---

## 4. Coverage Map by Subsystem

| Subsystem | Status | Notes |
|---|---|---|
| WS auth | ✅ Covered | ~7 emit sites |
| Agent dispatch / orchestration | ✅ Covered | ~6 sites |
| Tool execution | ✅ Covered | `trackToolExecution` |
| Auth | ✅ Covered | ~6 sites |
| Channel connect/disconnect | ✅ Covered | ~5 sites |
| Heartbeat | ✅ Covered | persists to EventStore |
| Memory (KG node ops) | ✅ Covered | success only |
| Message send/receive errors | ⚠️ Partial | **Telegram/Discord only**; WhatsApp/Signal/Slack/Line/iMessage missing |
| Hook execution | ⚠️ Partial | only `execution_failed`; ring buffer not persisted |
| Cron jobs | ⚠️ Partial | folded into orchestration.* |
| **LLM/provider failures** | ❌ **Gap** | no 429/5xx/fallback/circuit events |
| **WS connection lifecycle** | ❌ **Gap** | handshake timeout, socket error, abnormal close all log-only |
| **Session lifecycle** | ❌ **Gap** | no create/timeout/stuck persisted (exists in diagnostic stream!) |
| **Database / Turso sync** | ❌ **Gap** | sync failures log-only |
| **Memory/RAG failures** | ❌ **Gap** | extraction/embedding failures swallowed |
| **Webhook health** | ❌ **Gap** | exists in diagnostic stream, not persisted |
| **Queue depth / backlog** | ❌ **Gap** | exists in diagnostic stream, not persisted |
| **LLM latency** | ❌ **Gap** | in `model.usage` diagnostic + `gateway.perf_snapshot`, not surfaced as a KPI |

**Existing perf metrics:** `src/gateway/gateway-request-metrics.ts:152-159` emits `gateway.perf_snapshot` every 60s — per-method latency p50/p95/p99/max (reservoir sampling) + event-loop delay (`monitorEventLoopDelay`) + throughput + error rate. **This IS in the EventStore but is not visualized on `/reliability`** (no latency KPI/chart consumes it).

---

## 5. Gap Detail — Exact Insertion Points

All emit helpers are best-effort / never-throw, so these are safe additions.

### Tier 1a — Swallowed-error emit sites

| # | File:Line | Current behavior | Suggested event | cat / sev |
|---|---|---|---|---|
| 1.1 | `src/llm/gateway.ts:150-165` | 5xx → silent fallback | `provider.fallback` | gateway / high |
| 1.2 | `src/providers/inference-proxy.ts:93-99` | upstream error → 502, log only | `provider.upstream_error` | gateway / high |
| 2.1 | `src/web/outbound.ts:120-126` | WhatsApp send fail → log+rethrow | `message.send_failed` (channel: whatsapp) | message / medium |
| 2.2 | `src/channels/impl/signal/send.ts:192-201` | no try/catch | `channel.signal_send_error` | channel / medium |
| 2.3 | `src/channels/impl/line/send.ts:174-199` | `.catch()` log only | `channel.line_message_error` | channel / medium |
| 2.4 | `src/channels/impl/slack/send.ts:99-127` | catch → retry, no event on hard fail | `channel.slack_send_error` | channel / medium |
| 3.1 | `src/gateway/server/ws-connection.ts:260-270` | handshake timeout → log | `connection.handshake_timeout` | connection / medium |
| 3.2 | `src/gateway/server/ws-connection.ts:186-189` | socket error → log+close | `connection.socket_error` | connection / medium |
| 3.3 | `src/gateway/server/ws-connection.ts:196-258` | close → log | `connection.closed` (metadata: cause) | connection / low-med |
| 5.1 | `src/events/turso-sync.ts:184-191` | sync fail → log+backoff | `system.turso_sync_failed` (after N) | system / high |
| 4.2 | `src/memory/extract-memories-runner.ts:101-103` | log only | `memory.extraction_failed` | memory / low |
| 6.3 | `src/memory/extract-memories.ts:154-160` | parse fail → log | `memory.extraction_parse_failed` | memory / low |
| 7.1 | `src/platform/cron/service/timer.ts` (executeJob) | TBD | `cron.job_failed` | cron / medium |

### Tier 1b — Diagnostic→Reliability bridge (the big win)

Add a listener that subscribes to `onDiagnosticEvent()` (`src/infra/diagnostic-events.ts:192-195`) and maps **failure/anomaly** diagnostic events into the EventStore via `emitEvent()`. Map only the signal-bearing ones (not every `model.usage` — that's high volume; sample or aggregate it):

| Diagnostic event | → EventStore event | cat / sev |
|---|---|---|
| `webhook.error` | `webhook.error` | channel / medium (per-channel via metadata) |
| `session.stuck` | `session.stuck` | session / high |
| `tool.loop` (level≥warn) | `tool.loop` | tool / high |
| `queue.lane.*` (when queueSize>threshold) | `queue.backlog` | system / medium |
| `run.attempt` (attempt>1) | `agent.retry` | agent / low |
| `message.processed` (outcome=error) | `message.error` | message / medium |

Also bridge `agent-events` `error` stream (`src/infra/agent-events.ts`) → `agent.run_error` (agent / high).

This single bridge closes the webhook-health, queue-depth, stuck-session, tool-loop, and retry gaps **at once**, because the gateway already emits all of it — it just isn't persisted.

---

## 6. Recommendations (Phased)

### Tier 1 — Pure emit additions (feed existing charts, no UI work)
1. **Diagnostic→reliability bridge** (§5 Tier 1b) — new file `src/infra/diagnostic-reliability-bridge.ts`, wired at gateway startup next to `initReliability()`. **Highest ROI.**
2. **Swallowed-error emits** (§5 Tier 1a) — ~13 catch-block additions.
3. **Surface `gateway.perf_snapshot`** — it's already persisted; add a Latency KPI + percentile chart that reads it. (Small hub change.)

These immediately enrich the Sankey, timeline, top-events, and severity donut — no schema or RPC changes, because they use existing categories/severities.

### Tier 2 — Derived KPIs unlocked by Tier 1
- **LLM latency KPI** (p50/p95/p99 from `model.usage`/`perf_snapshot`)
- **Per-channel error rate** (group `webhook.error`/`channel.*_send_error` by `metadata.channel`)
- **Reconnect/flap tracking** (count `connection.closed` with abnormal cause per window)
- **Queue depth gauge** (latest `queue.backlog`)
- **Stuck-session count** KPI

### Tier 3 — New UI surfaces (larger)
- Per-channel health drill-down panel
- SLA/uptime % (rolling 24h/30d)
- Cost forecasting on Agents tab
- Anomaly auto-flagging (the sparklines already compute 6σ — surface breaches as events)

---

## 7. Risk Notes
- All emit helpers are best-effort and never throw — Tier 1 is low-risk.
- ⚠️ The gateway agent config Zod schema is `.strict()` — but **events are not config**, so no schema risk for emission. The risk is only if you add new *config keys* (e.g. thresholds) — gate those behind optional fields.
- Rate-limiting: `emitReliabilityEvent` is 60s/event-name; `emitEvent` is 5s for tool/message. The bridge for high-volume events (`model.usage`, `queue.lane.*`) must **aggregate or threshold** before emitting, or it will be rate-limit-dropped and/or bloat the store. Respect the retention/size guard (`emitter.ts:270-292`).
- Deploy: gateway DEV→netcup via `setup/utilities/deploy-bot-prd.sh`. Build from a clean worktree (parallel WIP has bitten prod before — see memory).

---

## 8. File Index
- Gateway events: `src/events/{store,emitter,types}.ts`, `src/logging/reliability.ts`
- Diagnostic/agent streams: `src/infra/{diagnostic-events,agent-events,heartbeat-events,system-events}.ts`
- Perf metrics: `src/gateway/gateway-request-metrics.ts`
- Reliability RPCs: `src/gateway/server-methods/reliability.ts`
- Hooks: `src/hooks/`, `src/gateway/hooks-event-log.ts`, `src/plugins/event-bus.ts`
- Hub page: `minion_hub/src/routes/(app)/reliability/+page.svelte`, `src/lib/state/reliability/reliability.svelte.ts`, `src/lib/components/reliability/*`
