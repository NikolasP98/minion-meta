# Hub Performance Optimization Plan — 2026-07-17

Goal: make navigation snappy. Today a nav = blank CSR shell → ~1 MB eager JS boot → `__data.json` → PG work behind tiny pools. Both sides measured (agents audited server loads + built client chunks); numbers below are from the live build/prod.

## Diagnosis (measured)

**Server — every client-side navigation re-runs the full `(app)` layout bundle** because the load reads `url.pathname` (route guard + onboarding check). Per nav for a non-admin: ~5 PG-core queries (one an org transaction) + 3–4 Supabase PostgREST calls + 1 Paperclip HTTP — none cached (`shareInflight` only dedupes concurrent calls within 2 s). On top, the CRM dashboard adds: `resolveCapabilities` **3×/nav uncached** (~6–9 PostgREST calls just for RBAC), `listModuleStates` **2×/nav** as full org transactions, and two heavy uncached aggregates recomputing the same `CONTACT_PARTY`/`inv` CTE.

**The killer**: `getRlsPgClient()` defaulted to **`max: 1`** (`pg-pool.ts:123`) — every `withOrgCore` transaction app-wide serialized through a single connection. This is the root cause of the CRM/finances 500s and "idle in transaction" wedges (the 20 s guard from `4c6cdd38` bounds the damage; it doesn't remove the queue).

**Client — first paint waits on ~1,026 KB of eager JS**, dominated by ONE mistake: `BugReporter.svelte` does `import * as m from '$lib/paraglide/messages'`, dragging the **495 KB both-locales message chunk into node 0** (it ships on `/login` too). Heavy libs (pixi/rapier/echarts/three/prosemirror) are already correctly route-lazy. posthog-js (213 KB) fetches during bootstrap; gateway boot is a 5-step serial waterfall (prefs → hosts → token → jwt → connect); the Google Fonts stylesheet is render-blocking; app CSS is one 218 KB blocking sheet.

**Edge functions — honest verdict**: the slow part is PG-bound org-scoped loads, which cannot move to edge runtime cheaply (postgres-js/pooler + node APIs). Edge is the wrong lever here; caching + pools + bundle diet are the levers. Revisit edge only for the locale-redirect/shell hop (Phase 3) after the real weights are cut.

## Phase 0 — Config (SHIPPED tonight)

| Change | Status |
|---|---|
| `SUPABASE_DB_POOL_SIZE=10` (was default 5) | ✅ prod env, deployed `b407da8c` |
| `SUPABASE_DB_RLS_POOL_SIZE=5` (was **1**) | ✅ prod env, deployed `11a7f143` |
| `idle_in_transaction_session_timeout=20s` guard in `withOrgCore` | ✅ `4c6cdd38` |
| `CACHE_BACKEND=valkey` + `VALKEY_URL` | verified already set in prod |

## Phase 1 — Server quick wins (hours, no architecture change)

| Change | Where | Impact |
|---|---|---|
| Memoize `resolveCapabilities` per-request (stash on `locals`) AND `cached()` by `keys.hub('caps',{t,u})` w/ role-change tag invalidation | `rbac.service.ts:310-406`, `permissions.service.ts:119` | kills ~6–9 PostgREST calls/nav — highest-volume waste |
| `cached()` `contactFinanceMap` + `crmRevenueSummary` (tags: crm+finances, ttl 2m/swr 30s — the sibling finance.service loaders already do exactly this) and merge their duplicated CTE into one query | `crm-finance.service.ts:42-126` | CRM dashboard load: 2 heavy aggregates → cache hits |
| `cached()` `listModuleStates` (org-level, near-static; today 2 full org-txns per CRM nav) | `modules.service.ts:27-31` | −2 org transactions/nav on module-gated pages |
| Cache the Paperclip `companies.list` map by tag (near-static; today a live HTTP hop with 2 s timeout on the layout critical path) | `workspaces.service.ts:56` | −1 HTTP hop/nav |

## Phase 2 — Client quick wins (SHIPPED 2026-07-17, hub dev `42180edc` — node-0 eager JS 1205KB → 479KB; deploy to master pending)

Implementation notes: BugReporter alone wasn't the anchor — gateway.svelte.ts, hosts.svelte.ts, ToastItem (via Toaster) and config.svelte.ts (via gateway → config-schema) all chained the messages chunk into node 0. The restart state machine moved to `state/config/restart.svelte.ts` to break the gateway→config-editor edge. Per-locale paraglide splitting remains open (needs the paraglide-js 2.x migration — 0.16 compiles both locales into one graph).

| Change | Where | Impact |
|---|---|---|
| Get the messages chunk out of node 0: lazy-load `BugReporter` (open-on-click) and audit other node-0 `import * as m` offenders; then split Paraglide per-locale (lazy second locale) | `+layout.svelte`, `BugReporter.svelte:4` | **~450 KB off first paint** — biggest single win |
| Lazy-load shell overlays on first open/idle: CommandPalette, ShortcutsOverlay, FloatingAssistant, LiveRunWidget, GNav, HostsOverlay, VoxelShader | both layout files | ~50–100 KB + faster hydration |
| posthog-js init behind `requestIdleCallback` instead of client `init()` hook | `hooks.client.ts:23` | 213 KB off the boot path |
| Parallelize gateway boot: `Promise.all(prefs, hosts)`; overlap token + jwt fetches | `+layout.svelte:78-81`, `gateway.svelte.ts:200` | −2–3 serial RTT to first live data |
| De-dup @vercel/analytics (imported statically AND dynamically) | `+layout.ts:8` vs `+layout.svelte:27` | node-0 diet |
| Self-host Pixelify Sans (preloaded woff2) instead of Google Fonts stylesheet | `app.html:7-13` | removes render-blocking cross-origin hop |

## Execution log & scope decisions (2026-07-17, orchestrated)

After P0/P1/P2 shipped, the plan was re-filtered against *what users actually feel* and *what fits this codebase's architecture*. Not every listed item survived that filter — building the ones that didn't would have been speculative or architecture-fighting complexity.

**SHIPPED this pass (hub `c53123fc` → master/prod):**
- **Streamed CRM + finances dashboard loads** (`99f03155`, was Phase 3.3). Loads return fast (auth gate + cheap sync fields only); the heavy aggregate is a SvelteKit streamed promise the page renders with `{#await}` + `Skeleton`. Auth/RBAC (requireCoreCtx 401, isModuleEnabled 404, ownerFilter, shouldMaskSensitive) stays synchronous pre-return. Per-page `$derived` → `buildView(data)` inside `{:then}` via `{@const}`, reactivity preserved. **Verified in an authed browser**: both dashboards stream + render under `ssr=false`; finances Cumulative toggle rescales the chart live (proves buildView reactivity); no error state.
- **Slow-layout-load prod log** (`c53123fc`): `(app)/+layout.server.ts` warns when total load > 3s (the existing `traceLayoutLoad` was dev-only) — regression guardrail in Vercel function logs, quiet on healthy requests.

**DEFERRED, with reasons (revisit on evidence, not by default):**
- **1.5 summary tables (`crm_contact_stats` finance rollup)** — (a) SWR (30s) on the Phase-1 caches already serves cold-expiry hits stale-instant + background-revalidate, so the 3.9s cold path is largely NOT user-visible; (b) a `crm_contact_stats` table ALREADY EXISTS in prod (message-activity rollup: message/inbound/outbound/channels counts, NO rls, unreferenced in code) — a strong signal the parallel session is doing overlapping rollup work; a second finance-stats table risks collision/duplication; (c) adding org-scoped RLS to prod revenue data shouldn't be done speculatively. Revisit when the slow-load log proves cold-load is user-felt AND after coordinating with the parallel session's rollup work.
- **2.5 TanStack Query on dashboards** — VIOLATES this repo's own `specs/2026-07-06-hub-tanstack-query.md §0` scope boundary + the `queryClient` doc comment ("never wrap load-gated business pages"), and re-introduces the client-fetch-of-load-data anti-pattern the 2026-05-13 canonical-load-flow refactor deliberately removed. The felt pain is first-load, not back/forward nav. Streaming (shipped) addresses the same cold-load feel without the boundary violation.
- **2.5 Supabase Realtime invalidation** — premature; TTL + SWR + tag invalidation already cover freshness; adds a live subscription to maintain for no measured need.
- **3.1 decouple layout from url** — Phase 1 caching already made the url-driven rerun cheap; further decoupling is subtle RBAC-gating risk for low marginal gain.
- **3.2 SSR/prerender `/login`** — fights the load-bearing global `ssr=false` + the carefully-built auth-redirect/canonical-load flow; login isn't the stated pain (users are logged in). High risk / low value.
- **3.4 CSS diet** — MEASURED and rejected: the app-wide `runtime.css` is 219KB raw but **30KB gzipped** (2819 rules), render-blocking but one fast RTT + sub-10ms parse. Trimming Tailwind v4's generated utilities is high-risk (breaks styles) for a few-KB payoff. Not worth it.
- **3.5 modulepreload node 2** — fiddly under `ssr=false` (no SSR head to inject route-node preloads into; filenames are hashed), marginal payoff. Skipped.

**Measurement:** Vercel Web Analytics AND Speed Insights are BOTH already enabled on the project (verified 2026-07-17 via the Vercel API — `webAnalytics`/`speedInsights` both `hasData: true`, enabled since ~Feb 2026; `/_vercel/insights/script.js` + `/_vercel/speed-insights/script.js` both serve 200 on prod). The earlier "insights script 404s" note was WRONG — it was the user's Firefox content-blocker refusing the analytics request client-side (cosmetic console noise), not a server outage. Vitals ARE flowing. Caveat: content-blocker users don't send vitals (inherent to client analytics, not fixable).

**Bottom line:** the user's stated complaint ("navigating takes a while to load and hydrate") is addressed — hydrate by P2 boot diet (node-0 1205→479KB), load by P1 caching + streamed dashboards (instant skeleton paint). Further optimization should be **measurement-driven** (the new slow-load log + the already-live Web Analytics/Speed Insights), not speculative.

## Phase 3 — Structural (days, sequenced after 1–2) — see Execution log above for what shipped vs deferred

1. **Decouple the layout auth bundle from `url`**: once caps/modules are cached (Phase 1), the url-driven rerun is cheap; go further by having the route guard consume cached permissions so the 8-call bundle isn't url-gated at all (targeted `invalidate('app:*')` already exists).
2. **SSR or prerender the signed-out entry** (`/login`, public pages): today even login waits on the full JS boot. A rendered login shell paints instantly.
3. **Streamed loads + skeletons for dashboards**: return fast critical data, stream the heavy aggregates (SvelteKit streaming promises) so CRM/finances paint in <1 s and fill in.
4. **CSS diet**: 32.7 KB source → 218 KB compiled single blocking sheet; audit generated utilities/token layers.
5. **`modulepreload` node 2** (the (app) shell is guaranteed-needed after node 0).
6. **Edge reconsideration (only if still needed)**: move the i18n locale redirect + shell serving to edge; keep data on node. Expected minor vs the above.

## Measurement / guardrails

- Web vitals already flow to PostHog + Vercel Speed Insights + Vercel Web Analytics (all three live and collecting; verified 2026-07-17 — the earlier "Web Analytics script 404s" was content-blocker noise, not a real outage).
- Add a server timing log line per layout load (duration + cache hit/miss counts) so regressions are visible in function logs.
- Budget targets: node-0 eager JS < 450 KB; layout `__data.json` p50 < 300 ms warm; CRM dashboard data p50 < 800 ms warm.

## Rejected / deferred

- **Wholesale edge-function migration** — PG-bound loads can't go edge without replacing the data layer (PostgREST/HTTP driver); the measured bottlenecks are cache/pool/bundle, not compute location.
- **Re-splitting Vercel functions** — split functions 404 locale-prefixed URLs (2026-07-16 incident); any future split must ship with locale-aware routes.
- **Service worker/app-shell caching** — revisit after Phase 2; adds staleness complexity during the current rapid-deploy cadence.

## Technology options evaluated (2026-07-17 addendum)

Context for verdicts: single-tenant-ish scale today (one active org, ~2k CRM parties, 1.4k invoices, a handful of concurrent users), serverless SvelteKit on Vercel, Supabase PG behind a transaction pooler, Valkey already deployed, gateway VPS (netcup) with an always-on WS, cron ticks already wired (netcup → hub endpoints).

| Technology | What it buys | Fit at current scale | Verdict |
|---|---|---|---|
| **Summary tables / materialized views** (PG) | Dashboard CTEs (CONTACT_PARTY, revenue rollups) become indexed point-reads; compute moves off the request path entirely. Refresh via the existing cron ticks or triggers on invoice/contact writes. | Perfect — the aggregates scan the same few thousand rows on every load. | **ADOPT (Phase 1.5)** — biggest structural server win after caching. `crm_contact_stats` + `fin_period_rollups`, refreshed by the ticks that already exist. |
| **Wider Valkey adoption** (existing `cached()` + tags) | Same infra, more coverage: RBAC caps, module states, Paperclip map, CRM aggregates (Phase 1); add cache warming (tick pre-warms dashboard keys after invalidation) and negative caching. | Already deployed and proven; marginal cost ~zero. | **ADOPT** — this *is* Phase 1. Warming via existing crons. |
| **TanStack Query on the client** (already a dependency!) | Client-side cache of load data between navigations — back/forward navs render instantly from memory, refetch in background. Pairs with the `depends()`/invalidate design. | Installed for the (app) shell already (`QueryClientProvider`); barely used for route data. | **ADOPT (Phase 2.5)** — wrap the hot dashboards' client reads; zero new infra. |
| **Supabase Realtime (CDC)** | Push DB changes to clients → targeted cache invalidation instead of TTL expiry; live dashboards. | In-stack (same Supabase project), no new infra; low volume. | **ADOPT selectively** — one channel for crm/finance table changes → client invalidates TanStack/Query + server tags. Do after Phase 1/2. |
| **Kafka / Redpanda** | Durable event log, multi-consumer fan-out, CDC pipelines, replayability. | Massive operational overkill: no multi-service consumers, no replay requirement, event volume is tens/minute. Everything Kafka would do here is covered by Valkey pub/sub–streams, Supabase Realtime, or pg LISTEN/NOTIFY. | **REJECT at this scale.** Revisit only if the platform becomes genuinely multi-service event-driven (several independent consumers needing replay). |
| **Valkey Streams / pub-sub as a lightweight bus** | Queue/fan-out semantics on infra we already run (bg jobs, cache-invalidation broadcast across function instances). | Good fit if/when background jobs outgrow cron ticks. | **HOLD** — adopt when a real queue need appears (e.g. SUSII sync fan-out); don't build ahead of need. |
| **pg LISTEN/NOTIFY** | In-DB change signaling, zero new infra. | Serverless functions can't hold listeners; the netcup gateway could and relay via its WS. | **HOLD** — only as the trigger source for Realtime-style invalidation if Supabase Realtime disappoints. |
| **Vercel Edge Config / KV** | Ultra-fast reads at the edge for near-static config (module toggles, feature flags, kill switches). | Small win; module states will already be Valkey-cached. Adds a second config store to keep in sync. | **SKIP for now** — Valkey covers it; revisit if flags need edge-time reads (e.g. locale redirect logic). |
| **Supabase read replica** | Offload heavy dashboard reads from the primary. | Current bottleneck was connection *count*, not primary CPU; replicas add lag + cost. | **DEFER** until sustained read load actually saturates the primary. |
| **ISR / CDN caching of data** | Cache `__data.json` at the CDN. | All data is auth'd + org-scoped → `private`; CDN can't share it. | **REJECT** (client cache via TanStack Query achieves the intent). |
| **Dedicated always-on server (move off serverless)** | Persistent pools, in-process cache, LISTEN/NOTIFY, no cold starts — the netcup VPS already runs the gateway this way. | Real option: hub's pain (pools, cold starts, per-instance caches) is serverless-shaped. But it trades away Vercel's deploy pipeline + preview flow. | **DEFER, keep visible** — if Phases 0–2 don't hit the latency budgets, hosting the hub next to the gateway on the VPS (or Fly) is the honest structural fix. |

**Recommended sequence stays**: Phase 0 (done) → Phase 1 caching (incl. summary tables as 1.5) → Phase 2 bundle diet → TanStack client cache + Realtime invalidation (2.5) → re-measure against budgets before considering hosting changes. Kafka stays out.
