---
id: 2026-08-22-hub-load-nav-performance-spec
title: Hub load & nav performance — prod config gap, layout decoupling, bundle diet, RUM monitoring
stage: spec
status: approved
pass: 3
next_slice: 5
created: 2026-08-22
updated: 2026-08-29
repos: [minion_hub]
type: infra
relationship: extends
related: [2026-07-17-hub-performance-optimization-plan, 2026-08-13-crm-customers-server-pagination-spec, 2026-07-06-hub-tanstack-consolidated-execution, 2026-08-21-hub-datatable-server-mode-test-gap-spec, 2026-08-22-crm-rank-query-prod-latency]
verdict: approved
tags: [infra, ux, security]
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
  not re-spec it. **Pass-2 update:** its S5 landed (hub #163, `0e442ff9`); the payload went
  12,741 KB → 78 KB in prod. S6 (channel options from server source, CSV export endpoint,
  select-all-matching) is still open there.
- `2026-07-17-hub-performance-optimization-plan` Phases 0–2 shipped; its Phase 3 items
  (CSS diet, modulepreload, edge locale-redirect, SSR login shell) were explicitly
  evidence-gated. Slice 2 here produces that evidence; Phase 3 items graduate into work
  only if RUM data implicates them.
- `2026-07-06-hub-tanstack-consolidated-execution` (+ virtual/query/pacer children) have
  `status: unknown` — Slice 8 reconciles them so the pagination train stops guessing.
- `2026-08-21-hub-datatable-server-mode-test-gap-spec` (approved) owns the DataTable
  server-mode test debt this program's CRM work exposed.
- `2026-08-22-crm-rank-query-prod-latency` (proposal, draft) owns the CRM rank-query cost
  that Slice 5 of the pagination spec uncovered — deliberately NOT a slice here; see §0.1.

## 0.1 Pass-2 disposition (2026-08-29) — APPROVED for the remaining slices

**Verdict: approved.** The program is real, already half-delivered, and the unshipped half
is still the correct next work. Pass 1 was written *before* implementation and was never
updated; four of its eight slices shipped to prod the same day it was authored, so the
pass-1 AS-IS described a hub that no longer exists. This pass re-verifies every claim
against hub `master` at `1b47e8ce` (2026-08-28) and against merged PRs, records what
shipped with evidence, and leaves the remaining slices executable.

Slice ledger — verified 2026-08-29 against hub master `1b47e8ce`:

| Slice | State | Evidence (verified this pass unless noted) |
|---|---|---|
| S1 prod config gap | **shipped (code); env half unverified from here** | `src/server/db/with-org-core.ts:61-64` = ONE `select set_config(...)×4`; `pg-pool.ts` `DEFAULT_POOL_SIZE = 5`, prod `idle_timeout: 120`. hub PR #162 `14bfce72`. Vercel prod env (`SUPABASE_DB_RLS_POOL_SIZE=5`, `SUPABASE_DB_POOL_SIZE=8`) was set on 2026-08-22 per the session record but **cannot be re-verified without Vercel access** — see the S1 residual below. |
| S2 RUM + server timing | **shipped, exceeded** | `src/lib/server/server-timing.ts` (`createServerTimingHandle`) wired at `hooks.server.ts:12,503,528`; it since grew a request-local stage recorder + `PerformanceSample` persistence. `hooks.client.ts:33` `capture_performance: { web_vitals: true }`; `+layout.svelte:71` `nav_timing`. hub PR #162 `14bfce72`. |
| S3 layout↔nav decoupling | **shipped, with one deliberate divergence** | `applyRouteAccessGuard` lives in `hooks.server.ts:201` and runs at both auth call sites (`:186`, `:358`); `(app)/+layout.server.ts:68` reads the pathname under `untrack`, `:157` records the guard's move. hub PR #166 `1988ef09`. **Divergence:** S3 specified `data-sveltekit-preload-data="tap"`; `src/app.html:9` is back to `"hover"` — tap measurably delayed the click-to-content path (prefetch-then-click rendered in 0.35 s vs 1.5 s cold). Hover is the accepted end state; the pass-1 text was wrong. |
| S4 shell diet | **shipped in part — DoD unmet, remainder moved into S5** | Supabase browser client dynamic-imported inside `signOut()` (`user.svelte.ts:94-97`); FloatingAssistant/carta-md moved behind the layout's idle `{#await import}`; `vite.config.ts:82-90` `optimizeDeps.include` incl. `lucide-svelte`. hub PR #162 `14bfce72`. **NOT done:** no `manualChunks` pass in `vite.config.ts`, no committed shell-size measurement script in `scripts/`, and the ≤700 KB target was not reached — the post-S4 ad-hoc measurement was 1,538 KB, of which 815 KB is the both-locale Paraglide chunk. Both remainders are now S5's DoD. |
| S5 one-locale Paraglide | **open — next slice** | `package.json:18` still `@inlang/paraglide-sveltekit: ^0.16.1` (the package is deprecated; `svelte.config.js` already carries a manual preprocessor shim for it). The catalog is build-generated (`i18n:compile` → `src/lib/paraglide/`, untracked), so the byte claims must be re-measured, not assumed. |
| S6 SSR re-enable | **open — human merge gate** | `src/routes/+layout.ts:18` still `export const ssr = false`. |
| S7 HTTP-first WS routes | **open — anchors moved** | `/reliability` gained a trivial `+page.server.ts` (RBAC comment only, returns `{}`); the RPCs moved out of the page into `$lib/state/reliability/*`, but every load is still gated on `conn.connected` (`reliability/+page.svelte:1159,1170,1188`). The premise holds; the pass-1 line/RPC-count anchor does not. |
| S8 reconcile stale statuses | **open** | `specs/index.json` still carries `status: unknown` for `2026-07-05-hub-tanstack-virtual`, `2026-07-06-hub-tanstack-{consolidated-execution,query,pacer,ai-assessment,db-store-assessment}` and `2026-07-17-hub-performance-optimization-plan`. |

Work that shipped under this program but was never specced (recorded here so the program's
history is honest, no action implied):

- **Deploy-skew reload** — hub #167 `60eb0db4`: `kit.version.pollInterval: 300_000` +
  `beforeNavigate` full-page reload when `updated.current`. An `ssr=false` tab ran the
  pre-deploy bundle forever, so users never received any of the fixes above without a
  manual hard refresh. This was the largest single cause of "the new nav isn't recognized".
- **CRM rank-query cost** — hub #164 `21bc5b61` (page-query cache) and #165 `229493a6`
  (fingerprint normalization so SSR and the API share cache entries), then #168 `9a565455`
  (`messages_crm_agg_covering_idx`, 49.5 s → 0.66 s) and the autovacuum reloptions +
  failed-query surfacing in #170 `50b5a3e4`. Owned by proposal
  `2026-08-22-crm-rank-query-prod-latency`, which already records the regression and the
  durable fix; not re-specced here.

**S1 residual (the only ledger item without an owner):** the prod-env half of S1 has no
durable check. The RLS-pool-size fix from the 2026-07-17 plan sat unapplied in prod for a
month precisely because nothing compares intended runtime config against what Vercel
serves, and this run could not verify it either (no Vercel credentials in the factory
environment). Filed as `proposals/2026-08-29-hub-prod-runtime-config-drift-check.md`.

## 1. AS-IS

### 1.1 Verified 2026-08-29 (hub master `1b47e8ce`) — what the remaining slices face

1. `src/routes/+layout.ts:18` still sets `ssr = false` app-wide → SvelteKit returns an
   empty shell without running any server load, then the client fetches `__data.json` and
   re-runs the whole handle chain. Two serial round trips before any content. (S6)
2. Paraglide is still `@inlang/paraglide-sveltekit ^0.16.1` with a single compiled catalog
   containing both locales, statically imported by ~436 modules — every `en` user
   downloads the `es` catalog and vice versa. (S5)
3. `/reliability` renders nothing until the WS handshake completes: its `+page.server.ts`
   returns `{}` and all aggregate loads sit behind `if (serverId && conn.connected)`. (S7)
4. `vite.config.ts` has no `manualChunks`; no committed script measures the shell's byte
   budget, so S4's ≤700 KB claim is unfalsifiable as it stands. (S5, folded)
5. Five perf-adjacent specs still carry `status: unknown` in `specs/index.json`. (S8)

### 1.2 Verified 2026-08-22 and since fixed — kept for provenance

- Cold load measured ~172 JS files ≈ 2.98 MB uncompressed + 422 KB CSS for `/home`
  (shell alone 1,248 KB JS / 314 KB CSS, 225 KB render-blocking global CSS).
- `(app)/+layout.server.ts` read `url.pathname` untracked-free → the entire layout bundle
  (permissions, organizations, workspaces incl. a paperclip HTTP hop, hosts, preferences,
  brain agent ids — 12–16 round trips) re-ran on **every** navigation, multiplied by
  hover preload. Fixed in #166.
- Prod ran `SUPABASE_DB_RLS_POOL_SIZE="1"` and `SUPABASE_DB_POOL_SIZE="2"`, serializing
  523 `withOrgCore` call sites through one pooler connection per isolate; prod
  `idle_timeout: 20`; `with-org-core.ts` issued separate `set_config` statements. Code
  fixed in #162; env values changed the same day (see the S1 residual above).
- `@supabase/ssr`+`supabase-js` (212 KB) and carta-md+KaTeX (338 KB) sat in the shell.
  Removed in #162.
- No request-layer server timing existed (only a >3 s `console.warn`); PostHog had
  `capture_performance` nowhere in code (27 `$web_vitals` events/7 d, 7 with LCP); Vercel
  Speed Insights collected but surfaced nowhere. Fixed in #162 (Speed Insights still
  unsurfaced — acceptable, PostHog is the store).
- `/crm/customers` shipped a 12,740 KB roster, 4.3–4.7 s warm fetch, 11.2 s to rendered
  rows, 199 MB JS heap → after the pagination spec's S5 plus the cache/fingerprint and
  index/autovacuum fixes: 78 KB payload, 1.7 s total / 695 ms server, 45 MB heap.

Known and accepted: ~350 ms geographic floor Peru↔iad1 (decision recorded 2026-06-16 —
stay in us-east; out of scope here). `CACHE_BACKEND="valkey"` is set and each GET pays
~100 ms iad1→Netcup Europe; Sentry has `SENTRY_DSN` in prod but no `sentrySvelteKit()`
vite plugin and no client SDK (unchanged, out of scope).

## 2. TO-BE

Achieved (S1–S4, verified in prod 2026-08-22, re-verified in code 2026-08-29):

- Org-txn setup is one round trip; pools are 5/8 with a 120 s idle timeout.
- The `(app)` layout bundle runs on document load and explicit invalidation only — never
  as a side effect of a pathname change; route access is decided fail-closed in hooks.
- Every response carries `Server-Timing`; PostHog owns `$web_vitals`, `nav_timing`, and a
  sampled `server_timing` event; the >3 s layout warning is a PostHog event.
- Supabase-js and carta-md/KaTeX are out of the shell.

Remaining:

- Cold load: the document request carries rendered content (SSR on for all routes except
  the existing per-route opt-outs).
- Shell JS ≤ 450 KB uncompressed with one locale's catalog only, proven by a committed
  measurement script rather than an ad-hoc count.
- Data-gated routes render server data first; WS upgrades them live.
- The board tells the truth about which perf specs shipped.
- Invariants (unchanged from pass 1): RBAC/module gating semantics stay fail-closed;
  i18n behavior unchanged for both locales; no route loses data when WS is down (strictly
  better: HTTP fallback); design-lint debt does not increase.

## 3. DELTA → slices

Numbered transitions: (1) prod pool/idle/set_config gap → S1 **shipped**. (2) no owned
RUM/server timing → S2 **shipped**. (3) layout re-runs per nav → S3 **shipped**. (4) shell
carries supabase-js + carta-md/KaTeX → S4 **shipped**; its unproven byte budget and the
missing `manualChunks`/measurement script transfer to S5. (5) both locales ship to every
user, and the shell has no enforced budget → S5. (6) empty-shell cold load → S6. (7) WS
handshake gates first data → S7. (8) perf spec statuses unknown → S8. CRM roster payload
(the 9th delta) is owned by the pagination spec; the CRM rank-query cost (10th, surfaced
by that work) is owned by proposal `2026-08-22-crm-rank-query-prod-latency`.

### Slice 1 — Prod runtime config gap closure — SHIPPED (hub #162 `14bfce72`)

**Topics:** `infra`, `hardcoded`

Set `SUPABASE_DB_RLS_POOL_SIZE=5` and `SUPABASE_DB_POOL_SIZE=8` in Vercel production
(check Supabase pooler max-client headroom first: pool × expected concurrent isolates must
stay under the pooler cap). Bump `pg-pool.ts` prod `idle_timeout` 20→120 s. Port the
single-statement `set_config` batching into `with-org-core.ts` (one
`select set_config(...), set_config(...), set_config('role',...)` —
`set_config('role', ..., true)` ≡ `SET LOCAL ROLE`, verified 2026-08-02). Env changes
require a redeploy to take effect.

Outcome: code merged with a test asserting the txn setup is a single statement; prod
verified live via `server-timing: app;dur=7` on `/en/home`. **Open residual:** the env
half has no durable verification — see §0.1 and
`proposals/2026-08-29-hub-prod-runtime-config-drift-check.md`.

### Slice 2 — RUM + route-level server timing — SHIPPED (hub #162 `14bfce72`)

**Topics:** `infra`, `ux`

PostHog `capture_performance: { web_vitals: true }` pinned in `src/hooks.client.ts`; SPA
`nav_timing` capture across `beforeNavigate`/`afterNavigate` in `src/routes/+layout.svelte`
with route id and duration; a `Handle` in `hooks.server.ts` that records `event.route.id` +
ms, emits `Server-Timing`, and captures a sampled server-side PostHog event
(`SERVER_TIMING_SAMPLE_RATE`, default 0.1); the >3 s layout warn is now an
`app_layout_slow_load` capture. Five unit tests cover the handle.

Residual DoD (do not reopen a slice for it — carry it into the S5/S6/S7 PRs): the
before/after PostHog dashboard (p75 LCP/INP per route, `nav_timing` p75, server p75 by
route id) still needs to be built and linked from the next slice's PR and `Minion Docs`.
Every event it needs is already flowing.

### Slice 3 — Decouple the (app) layout load from navigation — SHIPPED (hub #166 `1988ef09`)

**Topics:** `logic`, `infra`

`decideRouteAccess` moved into `hooks.server.ts` beside `applyModuleAvailabilityGuard`
(both auth branches, gated by `isAppPageRequest`, permissions cached 2 m, same
`error(deniedStatus)` contract); the layout's pathname reads are wrapped in `untrack`, so
the bundle re-runs only on explicit `depends` invalidation. A nav progress bar
(`navigating.to` pending >120 ms, reusing the existing `conn.connecting` bar) replaced the
0–2 s frozen content area.

Divergences from the pass-1 text, both deliberate: `data-sveltekit-preload-data` stays
`"hover"` (tap made clicks feel slower — hover-then-click renders in 0.35 s), and the
per-domain `depends` split for `hosts`/`workspaces`/`brainAgentIds` was **not** done
because `untrack` removed the per-nav re-run that motivated it. If S2's dashboard later
shows invalidation storms, reopen it as its own board item.

### Slice 4 — Shell bundle diet — SHIPPED IN PART (hub #162 `14bfce72`)

**Topics:** `ui`, `deps`

Done: supabase browser client dynamic-imported inside `signOut()`; carta-md/KaTeX loaded
with `FloatingAssistant` in the layout's existing idle import group; `optimizeDeps.include`
with `lucide-svelte`.

Not done, transferred to S5 (so nothing here is an undocumented open end): the
`manualChunks` pass, the committed build-output measurement script, and the ≤700 KB shell
target itself. The ad-hoc post-S4 measurement was 1,538 KB with 815 KB of it the
both-locale Paraglide catalog, which is exactly what S5 removes — measuring the shell
before S5 lands would only re-measure Paraglide.

### Slice 5 — Ship one locale, not two (and put the shell on an enforced budget)

**Topics:** `deps`, `infra`

The compiled Paraglide catalog statically bundles `en` + `es` for everyone (~815 KB of a
~1,538 KB shell as last measured). Preferred path: upgrade off the deprecated
`@inlang/paraglide-sveltekit ^0.16.1` to Paraglide 2 (per-message modules, per-locale
tree-shaking) — note `svelte.config.js` already carries a manual preprocessor shim for the
deprecated package, so the upgrade also retires that workaround. Fallback if the upgrade
is disruptive: split the compiled `en`/`es` catalogs into separate lazy chunks keyed by the
locale route prefix. `/es` must stay fully functional, and nothing may SSR-bake a fixed
locale (known gotcha: module-scope `m.x()` bakes `'en'`).

Folded in from S4: add the `manualChunks` pass for the worst remaining shared chunks, and
commit a `scripts/` measurement script that computes the shell's uncompressed JS bytes
from the build output (static-import closure of the entry + `nodes/0` + the `(app)` layout
node) so the budget is machine-checkable and re-runnable, not an ad-hoc count. Use
code-level markers, never string greps, when asserting a dependency is out of the shell —
message keys and Spanish copy inside the catalog chunk false-positive on names like
`carta` or `floatingAssistant`.

DoD: the script is committed and printed in the PR; an `en` page load's JS graph contains
zero `es` catalog bytes (script-verified); combined shell ≤ 450 KB uncompressed; i18n e2e
for both locales green; route-contract counts unchanged.

### Slice 6 — Re-enable SSR app-wide

**Topics:** `infra`, `edge-case`

Delete `ssr = false` from `src/routes/+layout.ts:18`; keep the existing per-route opt-outs
(`flow-editor`, `agents/workshop/[id]`). Audit the shell graph for module-scope
`window`/`document` access (the classic SPA-rot class) and fix with `browser` guards or
`onMount`. This collapses the double round trip and makes every existing `streamed:` block
pay off on cold load.

Riskiest slice: land behind a short-lived env flag (`PUBLIC_SSR_DISABLED=1` escape hatch
honored by the layout) so rollback is an env flip, and remove the flag once S2's dashboard
confirms FCP improvement. **This slice requires a human merge gate** — an app-wide render
mode flip is not an automatic merge, regardless of green CI. Note that #167's version-skew
reload changes the risk shape in both directions: open tabs now pick up a bad deploy
quickly, and they also cannot be left on the old bundle as an accidental fallback.

DoD: prod document response for `/en/home` contains rendered app markup (not the empty
shell); S2 dashboard shows cold-load LCP p75 improvement; both locales and one
WS-dependent route verified manually in a prod preview.

### Slice 7 — HTTP-first data for WS-gated routes

**Topics:** `unwired`, `ux`

`/reliability`'s aggregate RPCs are read-only. They now live in `$lib/state/reliability/*`
(`loadData` / `loadFiltered` in `reliability/+page.svelte`, gated on `conn.connected` at
`:1159`, `:1170`, `:1188`) rather than as inline `sendRequest` calls — re-read that module
before designing, the pass-1 "8 sendRequest calls at `:1149-1178`" anchor is stale. Add
HTTP read endpoints (mirror `api/reliability/architecture/+server.ts`) backed by the same
gateway calls server-side, load them from the page's `+page.server.ts` (currently a stub
returning `{}`, streamed), and let the WS connection upgrade to live data when it arrives.
Apply the same pattern to sessions/overview/home feed only if S2 data shows they matter.

DoD: `/reliability` renders populated KPIs with WS blocked (devtools offline-WS test); no
duplicate fetch when WS connects (guard test).

### Slice 8 — Reconcile stale perf-spec statuses (board hygiene)

**Topics:** `board`, `hygiene`

Resolve `status: unknown` on `2026-07-05-hub-tanstack-virtual`,
`2026-07-06-hub-tanstack-{consolidated-execution,query,pacer,ai-assessment,db-store-assessment}`
and `2026-07-17-hub-performance-optimization-plan` by inspecting master for each spec's
landmarks (T1–T10; Phases 0–2 markers), then set `shipped`/`superseded`/`parked` with
`evidence` links and regenerate `specs/index.json`.

DoD: none of those specs carries `status: unknown`; the pagination spec's "if T2 landed"
uncertainty is answered in its sidecar or body.

## 4. Out of scope

- Region/geography migration (Peru↔iad1 floor) — decided against 2026-06-16; unchanged.
- Moving Valkey out of Europe — only reopens if S2 data shows cache-GET latency dominating
  a hot path; record the finding on the board first.
- CRM customers server pagination S5/S6 — owned by `2026-08-13-crm-customers-server-pagination-spec`.
- CRM rank-query cost, its covering index and autovacuum tuning — owned by proposal
  `2026-08-22-crm-rank-query-prod-latency`.
- Prod runtime-config drift detection — owned by proposal
  `2026-08-29-hub-prod-runtime-config-drift-check`.
- Gateway-side performance, minion_site performance, dev-machine DX beyond the
  `optimizeDeps` line in S4.
- New storage for perf metrics (the dead `reliability-events` table stays dead; PostHog +
  Speed Insights are the stores).

## 5. Verification (end-to-end)

Run after each slice and at program end, from a real browser session logged into prod.
Measure on a hard-reloaded tab: after a deploy, an open SPA tab is pinned to the old
bundle until the version-skew reload fires, and old-tab numbers silently describe the
previous deployment.

1. S2 dashboard: p75 LCP, INP, `nav_timing`, and server p75 per route — screenshot/link
   before starting a slice and after each landing. The program's exit criterion is p75
   warm nav server time < 500 ms and cold-load LCP p75 < 2.5 s on /home, /crm, /finances.
2. Shell budget: the S5 measurement script's total ≤ 450 KB uncompressed, and the `/en/...`
   graph free of `es` catalog bytes (script-verified, not string-grepped).
3. `Server-Timing` per route (the header shipped in S2 is now the cheapest measurement
   tool: `curl -sI https://hub.minion-ai.org/en/<route>` → `server-timing: app;dur=…`),
   plus the `fetch('/en/<route>/__data.json')` timing loop for /home, /crm, /finances,
   /reliability — `active_org` is httpOnly, so set the org via `POST /api/active-org`
   in-session first. Warm p50 recorded in each slice's PR.
4. Route-access/RBAC suites + both-locale i18n e2e green; design gates
   (`DESIGN_LINT_BASE_REF=origin/master bun run lint:design && bun run lint:tokens`) do
   not increase debt.
5. Verify the deployment you think you measured: `vercel inspect hub.minion-ai.org`
   resolves the alias to a specific build — "the newest deployment is Ready" is not proof
   that it is the one serving.
