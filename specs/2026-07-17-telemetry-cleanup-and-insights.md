# Telemetry Cleanup, Monitoring Redesign & Reliability Insights

**Date:** 2026-07-17 · **Author:** orchestrator + 3 recon subagents (gateway-telemetry, posthog/sentry, insights-UX) · **Scope:** hub Turso `unified_events`, gateway emit pipeline, PostHog/Sentry division of labor, new `/reliability` Insights tab.

> Goal (user, verbatim): *"clean up the telemetry DB from any noise … not to remove items for the sake of minimizing usage, but to make more relevant items stand out more … set up agents that check logs from turso/sentry/posthog periodically to propose fixes/solutions based on REAL data. We currently hold a lot of data points, but no action."*

---

## 1. Executive summary

The hub's prod Turso is **170 MB / 25 tables**, and telemetry is essentially all of it: `unified_events` = **215,971 rows** and `gateway_heartbeats` = **68,809 rows**. Everything else combined is <50 rows. (`reliability_events`, the table in the hub schema dir, is **dead — 0 rows**; the live table the gateway writes is `unified_events`.)

The problem is **not** redundancy with PostHog/Sentry (they barely overlap — see §4). It's two things:

1. **Signal-to-noise ≈ 0.3 %.** 77 % of rows are `info`, another 18 % `low`. On a typical 5,000-row day only **0–43 rows** are `high`/`critical`. The actionable events are buried.
2. **Zero remote retention.** The gateway prunes only its *local* edge SQLite; nothing ever deletes from the remote `unified_events`/`gateway_heartbeats`. It grows ~**3–6k rows/day, unbounded** (was ~1.4k/day before the 2nd gateway replica doubled `perf_snapshot`).

The fix is threefold and is the opposite of "delete to save space": **(a)** stop persisting non-events at the source, **(b)** add a hub-owned tiered retention/rollup so a year of history stays queryable at ~1 % of the rows, and **(c)** surface the surviving signal in a new **Insights** tab that turns the corpus into ranked proposed actions. (c) is built and shipped this session; (a) and (b) are specced here with exact diffs and gated on your go-ahead (they touch a shared prod DB + a gateway redeploy).

---

## 2. Census (read-only, 2026-07-17)

| Table | Rows | Note |
|---|---|---|
| `unified_events` | 215,971 | the telemetry corpus (Apr 8 → Jul 18, ~3.3 mo) |
| `gateway_heartbeats` | 68,809 | 1 row / 30s / server, never pruned |
| everything else | <50 total | marketplace/users/prefs/orgs — not telemetry |

**Top events (share of all rows):** `gateway.perf_snapshot` 58,486 (27 %), `auth.connect.success` 35,136 (16 %), `heartbeat.skipped` 21,951 (10 %), `gateway.ws_slow_response` 17,735 (8 %), `channel.connected` 13,028, `channel.disconnected` 12,664, `channel.error` 8,193, `memory.recall` 7,830, `agent.run.start/end` ~7k each, **`agent.llm.usage` 6,151 (cost data — keep)**, `pi-agent.pre-prompt-build` 5,607.

**Severity:** info 165,878 · low 39,726 · high 8,345 · medium 2,022 · critical 0.
**Metadata bloat:** `perf_snapshot` alone = 17.3 MB of JSON (avg 311 B/row).
**Scope:** 1 tenant, 1 server_id, 29 agents (single-tenant today — retention must still be tenant-scoped for when that changes).

---

## 3. Recommended cleanup actions

### 3a. Source-side (gateway) — stop persisting non-events

The ingest funnel is clean: every row goes `emitEvent()` (`minion/src/events/emitter.ts:120`) → local SQLite → 30s batch `INSERT OR IGNORE` into Turso (`minion/src/events/turso-sync.ts:135`). Only `tool`/`message` categories are rate-limited; ~15 high-frequency `info` events persist per-occurrence. Prioritized by row-volume impact:

| # | Event (share) | Action | Where | Effect |
|---|---|---|---|---|
| 1 | `gateway.perf_snapshot` (27 %) | **Widen window 60s → 300s** (it's already a rollup) | `minion/src/gateway/gateway-request-metrics.ts:37` (`DEFAULT_INTERVAL_MS`) | 5× fewer rows, percentiles still valid |
| 2 | `heartbeat.skipped` (10 %) | **Don't persist** `status === "skipped"` (a heartbeat that didn't happen isn't an event; keep the live listener) | `minion/src/logging/heartbeat-events.ts:54-73` | −22k/quarter |
| 3 | `gateway.ws_slow_response` (8 %) | **Drop** — redundant with `perf_snapshot`'s p95/slowestMethods (the code comment says snapshot replaced it) | `minion/src/gateway/ws-log.ts:388` | −18k/quarter |
| 4 | `auth.connect.success` (16 %) | **Sample / only-on-new-session** (keep every `auth.connect.failure`) | `minion/src/gateway/ws-jwt-auth.ts:72,126` | −30k/quarter |
| 5 | `channel.connected`/`disconnected` (12 %) | **Aggregate** reconnect churn into a per-channel stability summary; keep `channel.error`/`.stopped`/`.needs_relink` | `minion/src/gateway/server-channels.ts:263,314` | −25k/quarter |
| 6 | `pi-agent.pre-prompt-build` (3 %) | **Don't persist** (self-described diagnostic; behind a debug flag) | `minion/src/agents/.../get-reply-run.ts:380` | −5.6k/quarter |
| 7 | `memory.recall` (4 %) | **Sample 1-in-N** or roll into a periodic recall-summary | `minion/src/memory/knowledge-graph.ts:183` | −7.8k/quarter |

**Never touch (signal):** `agent.llm.usage` (cost), `agent.run.*`, all `*.error`/`*.failure`, everything `high`/`critical`. Combined, 1+2+3 alone cut ~**45 %** of volume with zero signal loss.

> These require a **gateway redeploy** (Docker Swarm, prod). Not applied — awaiting go-ahead.

### 3b. Hub-side — tiered retention + rollup (the missing piece)

There is **no** remote retention today. `events.service.ts` already ships an unused `pruneOldEvents(ctx, serverId, olderThan)` — it just needs a scheduler. Recommended policy (runs as a **hub netcup cron tick**, since the hub owns the Turso and the gateway is only one of N writers):

- **Raw retention by tier:** `info`-severity gateway/heartbeat/auth → keep **30d**; `agent`/`memory`/`tool` → **90d**; `high`/`critical` + all `*.error/*.failure` + `agent.llm.usage` → **≥1yr**.
- **Rollup before delete:** older `info`/`low` rows collapse into one daily aggregate row per `(tenant, category, event, severity)` with count (+ summed tokens / percentiles for usage/perf). A year of daily summaries ≈ 1 % of the raw rows and stays queryable.
- **Stopgap** (before rollup lands): a single guarded `DELETE FROM unified_events WHERE severity='info' AND category IN ('gateway','heartbeat','auth') AND occurred_at < now-30d` reclaims the bulk immediately.

> A destructive first pass on a shared prod DB needs explicit confirmation; the tick is built dry-run-first (reports what it *would* prune before any delete is enabled).

---

## 4. Monitoring redesign — Turso vs PostHog vs Sentry

Reality (audited, not assumed):

- **PostHog** — fully wired & live in **hub** (product analytics: `$pageview`, `user_signed_in/up`, `skill_*`/`agent_created`, `marketplace_*`, plus client+server `captureException`). **Dormant in gateway** (`POSTHOG_API_KEY` unset → 3 "dream" events emit nowhere). Site uses Vercel Analytics instead.
- **Sentry** — wired & live in **gateway only** (`SENTRY_DSN` set; unhandled rejections, fatals, and reliability `critical`/`high` bridged in via `minion/src/logging/reliability.ts:87`; auto LLM-span tracing). **Hub and site have no Sentry at all** — their server crashes rely on best-effort PostHog `captureException`.

**There is almost no redundancy.** The only deliberate overlap is severe reliability events → Turso (full record) **and** Sentry (alerting tail). Nothing in Turso should be dropped *because PostHog/Sentry has it* — they carry different populations.

**Clean division of labor (route/emphasize, don't delete):**

| Tool | Owns | An agent goes here for… |
|---|---|---|
| **Turso `unified_events`** | operational system-of-record: perf, connection/heartbeat lifecycle, LLM usage+cost, tool/agent/memory outcomes | *what happened & how often* (frequency, trends, cost) |
| **Sentry** | exceptions, crashes, unhandled rejections, sampled agent/LLM traces w/ stack context | *why a specific failure happened* |
| **PostHog** | human/UI behavior: pageviews, sign-in, skill/agent creation, marketplace funnel | *what users did* |

**Two concrete monitoring improvements (recommended):**
1. **Add the SvelteKit Sentry SDK to the hub** (+ optionally site). This is the single biggest gap vs. your "we should be using Sentry" intent — right now hub/site crashes are invisible to Sentry.
2. Either **wire the gateway `POSTHOG_API_KEY`** or delete its 3 dead "dream" events — currently neither on nor useful.

---

## 5. From data → action: the autonomous log-reading agents

The end goal is agents that periodically read Turso/PostHog/Sentry and propose fixes. The groundwork shipped this session is the **`ProposedAction` contract** + the **Insights tab** that renders it (§6). A real agent replaces the v1 heuristic detectors without any UI change — it emits the same `ProposedAction` shape.

**Read access for a future agent (audited):**
- **Turso** — hub already reads `unified_events` directly (`getDb()`); the new `/api/reliability/insights` endpoint is exactly the query surface an agent reuses. ✅ ready.
- **PostHog** — a **PostHog MCP is available** in this environment (`mcp__posthog__authenticate`) → an agent can OAuth and query insights. No stored read key needed.
- **Sentry** — **no** programmatic read path today (only the ingest DSN). Needs a `SENTRY_AUTH_TOKEN` + the Sentry API/MCP before an agent can read it. ⛔ blocker to note.

Suggested next step: a **hub cron tick** (`/api/reliability/insights/scan`) that runs `computeInsights` per server on a schedule, persists surfaced `ProposedAction`s to a `reliability_actions` table (needs a `packages/db` schema bump), and — for `critical` cards — dispatches a bug-triage/bug-fixer agent (the workforce already has one). That turns the feed from "displayed" into "acted on."

---

## 6. Shipped this session — the Insights tab

New 4th tab on `/reliability` (hub, branch `dev`). Reads the hub-owned `unified_events` copy via a plain API route — **no gateway RPC, no redeploy**, works even when the gateway WS is down.

- **`src/server/services/insights.service.ts`** — `computeInsights(ctx, serverId, {from,to})`: 8 concurrent SQL aggregates + 5 deterministic detectors → a ranked `ProposedAction[]`. Pure detector math (`median`, `deltaPct`, `costOutliers`, `assembleActions`) is unit-tested (`insights.service.test.ts`, 8 cases).
- **`src/routes/api/reliability/insights/+server.ts`** — `GET`, `requireTenantCtx`, mirrors `/api/metrics/connection-events`.
- **`src/lib/state/reliability/insights.svelte.ts`** — `createInsightsState()` (fetch + `createAsyncResource`).
- **`src/lib/components/reliability/InsightsPanel.svelte`** — S/N KPI strip + Proposed Actions feed + top signal clusters + telemetry-by-category bar-row.
- **`ProposedActionsFeed.svelte`** — ranked action cards (status-token severity, per-browser localStorage dismissal).

**v1 detectors** (each → a card, tunable thresholds in one place):

| Detector | Fires when | Card |
|---|---|---|
| `noise_source` | one event ≥15 % of all volume & `info`/`low` | "X is 27 % of all telemetry — reduce cadence / downgrade severity" |
| `recurring_failure` | same `high`/`critical` cluster ≥10× in window | "X recurring N× (trend vs prior window)" |
| `health_regression` | category error-rate ≥1.5× its 7-day baseline | "X error rate regressed A%→B%" |
| `cost_outlier` | agent peak-day tokens ≥3× its median day (≥50k floor) | "Agent Z token usage is an outlier" |
| `reconnect_storm` | channel disconnects >20/hr | "Channel reconnect storm" |

> **Statistical note:** cost outliers use a robust **median-multiple**, not z-score. With only ~1–2 weeks of daily points, a population-σ z-score can't exceed ~√(n−1), so a 3σ gate is literally unreachable for a young agent — the unit test caught this.

**v1 ceilings (deliberate, marked in code):** localStorage dismissal (per-browser, not per-org — a real `reliability_actions` table needs a `packages/db` bump); token-volume as a cost proxy (real $ pricing lives gateway-side); no PostHog/Sentry panels yet (not readable from the hub today — they become new detector sources feeding the same feed).
