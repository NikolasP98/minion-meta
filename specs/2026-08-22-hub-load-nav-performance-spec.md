---
id: 2026-08-22-hub-load-nav-performance-spec
title: Hub load & nav performance — prod config gap, layout decoupling, bundle diet, RUM monitoring
stage: spec
status: draft
pass: 1
created: 2026-08-22
updated: 2026-08-22
repos: [minion_hub]
type: infra
relationship: extends
related: [2026-07-17-hub-performance-optimization-plan, 2026-08-13-crm-customers-server-pagination-spec, 2026-07-06-hub-tanstack-consolidated-execution, 2026-08-21-hub-datatable-server-mode-test-gap-spec]
tags: [infra, ux]
---

# Hub load & nav performance — prod config gap, layout decoupling, bundle diet, RUM monitoring

## 0. Product

In the user's words: "The website is reported to be VERY slow to use and navigate." This
spec is the load/navigation performance program for minion_hub production
(hub.minion-ai.org). It closes the gap between what earlier perf work designed and what
actually runs in prod, removes the largest measured cold-load and per-nav costs, and puts
real-user monitoring (PostHog web vitals + route-level server timing, alongside the
already-collected Vercel Speed Insights) in place so improvement is proven with numbers,
not vibes.

Relationship to existing board items (folded, not duplicated):

- `2026-08-13-crm-customers-server-pagination-spec` (implementing) stays the owner of the
  CRM roster payload fix — its S5 (flip `/crm/customers` to server mode) and S6 remain the
  single biggest per-page win (>10 MB → <300 KB). This spec depends on it landing and does
  not re-spec it. Open PRs #158 (S3+S4) and #161 (test-gap slice 1) are its blockers.
- `2026-07-17-hub-performance-optimization-plan` Phases 0–2 shipped; its Phase 3 items
  (CSS diet, modulepreload, edge locale-redirect, SSR login shell) were explicitly
  evidence-gated. Slice 2 here produces that evidence; Phase 3 items graduate into work
  only if RUM data implicates them.
- `2026-07-06-hub-tanstack-consolidated-execution` (+ virtual/query/pacer children) have
  `status: unknown` — Slice 8 reconciles them so the pagination train stops guessing.

## 1. AS-IS (verified 2026-08-22)

Cold load (`GET /en/home`, measured on the Jul-30 prod build):

1. `src/routes/+layout.ts:17` sets `ssr = false` app-wide → SvelteKit returns an **empty
   shell without running any server load** (verified against kit's
   `runtime/server/page/index.js` shell branch).
2. Browser downloads ~172 JS files ≈ **2.98 MB uncompressed + 422 KB CSS** for /home
   (shell alone: 1,248 KB JS / 314 KB CSS; 225 KB of it render-blocking global CSS).
3. Only then does the client fetch `__data.json`, re-running the whole handle chain plus
   the `(app)` layout bundle (~12–16 DB/HTTP round trips). Nothing overlaps; every
   `streamed:` block starts after step 2's multi-MB download.

Per-navigation: `(app)/+layout.server.ts:61,157,178` reads `url.pathname`
(`decideRouteAccess`, onboarding check) → SvelteKit re-runs the **entire layout bundle on
every nav**: permissions (2–3 PostgREST calls), organizations, workspaces (includes a
paperclip HTTP hop with a 2 s timeout), hosts (4–6 queries), preferences, brain agent ids,
then the page's own load which typically `await parent()` first.
`data-sveltekit-preload-data="hover"` (`src/app.html:9`) fires that bundle speculatively
per sidebar hover.

Prod runtime config (pulled from Vercel `--environment=production` 2026-08-22):

- `SUPABASE_DB_RLS_POOL_SIZE="1"` — all org-scoped reads (523 `withOrgCore` call sites,
  `src/server/db/pg-pool.ts:136`) serialize through ONE pooler connection per isolate,
  including the layout's parallel loads. The known fix (→5, cf. the Jul-17 plan's root
  cause) never reached prod.
- `SUPABASE_DB_POOL_SIZE="2"` (code default is 5).
- `CACHE_BACKEND="valkey"` is correctly set; each GET pays ~100 ms iad1→Netcup Europe.
- `pg-pool.ts:49` prod `idle_timeout: 20` — a warm isolate idle >20 s re-pays connection
  setup.
- `src/server/db/with-org-core.ts:51,55` still issues **separate** `set_config`
  statements per transaction; the single-statement batching from the 2026-08-02 round
  (7→4 RTT) only ever landed on feat/level, never master.

Bundle composition (prod build, uncompressed): `chunks/Dedcj4Nn2.js` **798 KB** = the
Paraglide catalog with **both** locales statically imported
(`src/lib/paraglide/messages.js:3-4`; `import * as m` from 436 files; present in 160/177
route nodes). `@supabase/ssr`+`supabase-js` **212 KB** in the shell via
`src/lib/state/features/user.svelte.ts:3` (used only for `signOut()`). carta-md+KaTeX
**338 KB** in the shell via the eagerly imported `FloatingAssistant`
(`(app)/+layout.svelte:12` → `FloatingAssistant.svelte:38`). No `manualChunks`, no ISR,
zero `setHeaders` in real loads. PixiJS/Rapier/ECharts/xyflow are already correctly lazy.

WS-gated data: `/reliability`, `/sessions`, `/overview`, home feed render nothing until
`fetchHostToken` → JWT prefetch → WS open → `connect.challenge` → `connect` → then (for
reliability) 8 RPCs (`reliability/+page.svelte:1149-1178`).

Monitoring: no request-layer server timing exists (the sole prod signal is a >3 s
`console.warn` in `(app)/+layout.server.ts:197-200`). PostHog is idle-deferred with
`capture_pageview: false` and **no `capture_performance` in code** — `$web_vitals`
arrives only via remote config and only on hard loads (27 events/7d, 7 with LCP).
Vercel Speed Insights IS installed and captures client-nav CWV (`+layout.ts:6-15`) but is
surfaced nowhere. Sentry server SDK is wired with `SENTRY_DSN` set in prod but has no
`sentrySvelteKit()` vite plugin (no source maps/tracing) and no client SDK.

Known and accepted: ~350 ms geographic floor Peru↔iad1 (decision recorded 2026-06-16 —
stay in us-east; out of scope here).

## 2. TO-BE

- Cold load: document request carries rendered content (SSR on for all routes except the
  existing per-route opt-outs), shell JS ≤ 700 KB uncompressed, one locale's catalog only.
- Navigation: the `(app)` layout bundle runs once per session/document and on explicit
  invalidation only — never as a side effect of pathname change; route access decided in
  hooks from already-loaded module state.
- Prod runtime: RLS pool ≥5, general pool ≥8 (bounded by Supabase pooler headroom),
  idle_timeout 120 s, org-txn setup in one statement.
- Data-gated routes render server data first; WS upgrades them live.
- Monitoring: PostHog owns `$web_vitals` in code plus a `nav_timing` event per SPA nav and
  a server-timing handle recording `event.route.id` durations; a before/after dashboard
  exists; the >3 s layout warning goes to PostHog, not stdout.
- Invariants: RBAC/module gating semantics unchanged (guard still fail-closed in hooks);
  i18n behavior unchanged for both locales; no route loses its data on WS-down (strictly
  better: HTTP fallback); design-lint debt does not increase.

## 3. DELTA → slices

Numbered transitions, each owned by a slice below: (1) prod pool/idle/set_config gap →
S1. (2) no owned RUM/server timing → S2. (3) layout re-runs per nav + hover preload →
S3. (4) shell carries supabase-js + carta-md/KaTeX → S4. (5) both locales ship to every
user → S5. (6) empty-shell cold load → S6. (7) WS handshake gates first data → S7.
(8) TanStack spec statuses unknown → S8. CRM roster payload (the 9th delta) is owned by
the pagination spec's S5/S6 and intentionally absent here.

### Slice 1 — Prod runtime config gap closure

**Topics:** `infra`, `hardcoded`

Set `SUPABASE_DB_RLS_POOL_SIZE=5` and `SUPABASE_DB_POOL_SIZE=8` in Vercel production
(check Supabase pooler max-client headroom first: pool × expected concurrent isolates must
stay under the pooler cap — record the arithmetic in the PR). Bump `pg-pool.ts` prod
`idle_timeout` 20→120 s. Port the single-statement `set_config` batching into
`with-org-core.ts` (one `select set_config(...), set_config(...), set_config('role',...)`
— `set_config('role', ..., true)` ≡ `SET LOCAL ROLE`, verified 2026-08-02). Env changes
require a redeploy to take effect. DoD: values live in prod (env pull shows them), code
merged with a test asserting the txn setup is a single statement, before/after
`__data.json` timings for /home, /crm, /finances recorded in the PR.

### Slice 2 — RUM + route-level server timing (measure before optimizing further)

**Topics:** `infra`, `ux`

PostHog: pin `capture_performance: { web_vitals: true }` in `src/hooks.client.ts` config;
add SPA `nav_timing` capture (start in `beforeNavigate`, stop+capture in the existing
`afterNavigate` block in `src/routes/+layout.svelte` with route id and duration). Server:
new `Handle` in `hooks.server.ts` wrapping `resolve(event)` — records `event.route.id` +
ms, emits a `Server-Timing` header, and captures a sampled server-side PostHog event
(sample rate env-tunable, default 5–10%); replace the stdout-only >3 s layout warn with a
PostHog capture. Build one PostHog dashboard (p75 LCP/INP per route, `nav_timing` p75,
server p75 by route id) and link it in the PR + `Minion Docs`. DoD: events visible in
PostHog project 129899 from a prod session; dashboard link recorded; unit test for the
timing handle.

### Slice 3 — Decouple the (app) layout load from navigation

**Topics:** `logic`, `infra`

Move `decideRouteAccess` into `hooks.server.ts` next to `applyModuleAvailabilityGuard`
(module states already live in `locals`); move the personal-agent onboarding check into
the onboarding route's own load; remove every `url` read from `(app)/+layout.server.ts` so
the layout bundle stops re-running per nav. Change `data-sveltekit-preload-data` to
`"tap"`. Split invalidation: move `hosts`/`workspaces`/`brainAgentIds` behind their own
`depends` keys in subtree layouts (or dedicated endpoints) so `invalidate('app:hosts')`
stops re-fetching permissions/orgs/prefs. Guard semantics must remain fail-closed and
covered by the existing route-access tests (extend, don't weaken). DoD: server-timing
events (S2) show layout load absent on plain navs; route-access test suite green; a nav
between two module routes issues ≤2 org-scoped queries (assert via a pg query counter in
a test harness or documented prod trace).

### Slice 4 — Shell bundle diet (mechanical)

**Topics:** `ui`, `deps`

Dynamic-import supabase browser client inside `signOut()`
(`src/lib/state/features/user.svelte.ts`); lazy-load `MarkdownMessage`/carta-md inside
`FloatingAssistant`'s open panel (`{#await import(...)}`); add
`optimizeDeps.include: ['lucide-svelte']` (dev nav speed); add a `manualChunks` pass for
the worst shared chunks. DoD: prod build shell (root+app layout nodes) ≤ 700 KB
uncompressed JS (from 1,248 KB), measured by a build-output script committed with the PR;
no route regresses in the route-contract counts.

### Slice 5 — Ship one locale, not two

**Topics:** `deps`, `infra`

The 798 KB Paraglide chunk statically bundles `en` + `es` for everyone. Preferred path:
upgrade to Paraglide 2 (per-message modules, per-locale tree-shaking); fallback if the
upgrade is disruptive: split `messages/en.js` / `messages/es.js` into separate lazy
chunks keyed by the locale route prefix. Must keep `/es` fully functional and SSR-bake
nothing to a fixed locale (known gotcha: module-scope `m.x()` bakes 'en'). DoD: an `en`
page load's JS graph contains zero `es` catalog bytes (verified by build-output grep);
i18n e2e for both locales green; shell drops by ≥350 KB beyond S4's target or the
combined S4+S5 shell is ≤ 450 KB.

### Slice 6 — Re-enable SSR app-wide

**Topics:** `infra`, `edge-case`

Delete `ssr = false` from `src/routes/+layout.ts`; keep the existing per-route opt-outs
(`flow-editor`, `agents/workshop/[id]`). Audit for module-scope `window`/`document`
access in the shell graph (the classic SPA-rot class); fix by `browser` guards or
`onMount`. This makes the document request run server loads (collapsing the double round
trip) and makes every existing `streamed:` block pay off on cold load. Riskiest slice —
land behind a short-lived env flag (`PUBLIC_SSR_DISABLED=1` escape hatch honored by the
layout) so rollback is an env flip, and remove the flag once S2's dashboard confirms FCP
improvement. DoD: prod document response for `/en/home` contains rendered app markup
(not the empty shell); S2 dashboard shows cold-load LCP p75 improvement; both locales and
one WS-dependent route verified manually in prod preview.

### Slice 7 — HTTP-first data for WS-gated routes

**Topics:** `unwired`, `ux`

`/reliability`'s 8 `sendRequest` RPCs are read-only aggregates. Add HTTP read endpoints
(mirror `api/reliability/architecture/+server.ts`) backed by the same gateway calls
server-side, load them in the page's server load (streamed), and let the WS connection
upgrade to live data when it arrives. Apply the same pattern to sessions/overview/home
feed only if S2 data shows they matter. DoD: `/reliability` renders populated KPIs with
WS blocked (devtools offline-WS test); no duplicate fetch when WS connects (guard test).

### Slice 8 — Reconcile stale perf-spec statuses (board hygiene)

**Topics:** `board`, `hygiene`

Resolve `status: unknown` on `2026-07-06-hub-tanstack-consolidated-execution`,
`-virtual`, `-query`, `-pacer`, and `2026-07-17-hub-performance-optimization-plan` by
inspecting master for each spec's landmarks (T1–T10; Phases 0–2 markers), then set
`shipped`/`superseded`/`parked` with `evidence` links and regenerate `specs/index.json`.
DoD: none of the five carries `status: unknown`; the pagination spec's "if T2 landed"
uncertainty is answered in its sidecar or body.

## 4. Out of scope

- Region/geography migration (Peru↔iad1 floor) — decided against 2026-06-16; unchanged.
- Moving Valkey out of Europe — only reopens if S2 data shows cache-GET latency dominating
  a hot path; record the finding on the board first.
- CRM customers server pagination S5/S6 — owned by `2026-08-13-crm-customers-server-pagination-spec`.
- Gateway-side performance, minion_site performance, dev-machine DX beyond the
  `optimizeDeps` line in S4.
- New storage for perf metrics (the dead `reliability-events` table stays dead; PostHog +
  Speed Insights are the stores).

## 5. Verification (end-to-end)

Run after each slice and at program end, from a real browser session logged into prod:

1. S2 dashboard: p75 LCP, INP, `nav_timing`, and server p75 per route — screenshot/link
   before starting S3+ and after each landing; the program's exit criterion is p75 warm
   nav server time < 500 ms and cold-load LCP p75 < 2.5 s on /home, /crm, /finances.
2. Payload check: `document.querySelectorAll('script[src]')` + build-output script totals
   for shell ≤ 450–700 KB per S4/S5 targets; `/en/...` graph free of `es` catalog.
3. `fetch('/en/<route>/__data.json')` timing loop (the 2026-08-02 recipe; active_org is
   httpOnly — set org via `POST /api/active-org` in-session first) for /home, /crm,
   /finances, /reliability: warm p50 recorded in the PR of each slice.
4. Route-access/RBAC suites + both-locale i18n e2e green; design gates
   (`DESIGN_LINT_BASE_REF=origin/master bun run lint:design && bun run lint:tokens`) do
   not increase debt.
