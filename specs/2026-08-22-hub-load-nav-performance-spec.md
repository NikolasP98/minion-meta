---
id: 2026-08-22-hub-load-nav-performance-spec
title: Hub load & nav performance — prod config gap, layout decoupling, bundle diet, RUM monitoring
stage: spec
status: review
pass: 6
next_slice: 5
created: 2026-08-22
updated: 2026-08-29
repos: [minion_hub]
type: infra
relationship: extends
related: [2026-07-17-hub-performance-optimization-plan, 2026-08-13-crm-customers-server-pagination-spec, 2026-07-06-hub-tanstack-consolidated-execution, 2026-08-21-hub-datatable-server-mode-test-gap-spec, 2026-08-22-crm-rank-query-prod-latency, 2026-07-19-channel-scoping-fix-plan]
verdict: revision-required
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

## 0.1 Disposition (pass 6, 2026-08-29) — NOT approved; human approval gate required

**Verdict: revision-required — awaiting a human.** The program is real, already
half-delivered, and the unshipped half is still the correct next work, but this spec may
not be agent-approved. Pass 3 classified it `security` because Slice 7 crosses
tenant-scoped gateway credential resolution, and both `AGENTS.md` ("Security/data-tagged
work always keeps human gates at approval AND merge") and `specs/TEMPLATE.md` ("`security`
and `data` keep human gates at approval AND merge") make a human the only party who may
approve it. Pass 2's `status: approved` / `verdict: approved` was written by an agent and
is retracted here. **No factory dev run may start any slice of this spec until a human
flips `status`/`verdict`** — `next_slice: 5` records which slice is next, not permission
to run it.

Pass 1 was written *before* implementation and was never updated; four of its eight slices
shipped to prod the same day it was authored, so the pass-1 AS-IS described a hub that no
longer exists. Pass 2 re-verified every claim against hub `master` at `1b47e8ce`
(2026-08-28) and against merged PRs. **Pass 4** repaired four defects the pass-3 review
found, each re-verified against that same `master` SHA before editing:

1. Slice 7 named no fail-closed tenant contract, so the obvious implementation
   (`gatewayCallAsUser`) would inherit `resolveCredentialsForUser`'s fall-through to
   system/env credentials — see §Slice 7, now rewritten with an explicit contract, tests,
   and both human gates.
2. Slice 5's `≤ 450 KB` budget was arithmetically unreachable from this spec's own
   measurements (`1,538 − 815 = 723`). Re-staged in §Slice 5; the 450 KB goal moves to the
   new §Slice 9, gated on evidence that it is reachable.
3. Slice 2 was recorded as shipped while its decision dashboard — the surface S5/S6 are
   supposed to be judged by — does not exist. Now `shipped in part`, with the dashboard a
   named prerequisite of Slice 5.
4. Slice 6 described a rollback Vercel does not offer and named 2 of the 7 existing
   per-route SSR opt-outs. Both corrected against `master` in §Slice 6.

**Pass 5** repaired the defects the pass-4 review found. Each was re-verified live against
gateway `minion` `DEV` `bd55137100aceaf193ab99a827302d3f865b50e7` (confirmed the current
branch head at verification time via `gh api repos/NikolasP98/minion/branches/DEV`, and
still the head at pass 6) and hub `master` before editing, not assumed from the review
text:

5. **Pass 4's S7 contract required a signed JWT the gateway cannot accept, and its
   tenant test proved the wrong thing.** Confirmed on gateway `DEV` `bd551371`:
   `ConnectParamsSchema` (`src/gateway/protocol/schema/frames.ts`) has no `jwt` or
   `orgId` field and is `additionalProperties: false`; `message-handler.ts:209-218`
   validates that schema and rejects the connect frame before authentication runs; a
   recursive listing of the entire repo tree at that SHA contains zero files with `jwt`,
   `oidc`, or `multiTenant` in their path — there is no partial or reverted
   implementation to restore, only the absence pass 4 assumed was recoverable. The
   reliability pipeline confirms the same way: `ReliabilityEventSchema` carries no
   `orgId`, `ReliabilityRingBuffer` (`src/logging/reliability-buffer.ts`) is one
   process-global ring, and `server-methods/reliability.ts` never reads `client.orgId`
   — so even a validated `orgId` claim would have nothing to filter by yet. §Slice 7 is
   now split into a blocking gateway-side prerequisite (new repo scope: `minion`) and
   the hub-side implementation that depends on it, and its tenant test now requires two
   orgs on **one shared gateway**, not two distinct gateways. This is not a new failure
   mode invented for this pass: `specs/2026-07-19-channel-scoping-fix-plan.md` already
   parked its own P1 ("carry org identity on the socket") after `minion-ai` PR #237
   proved, the same way, that adding an org claim to the connect frame without a
   gateway that validates it is a tenant-authorization bypass, not a fix — see that
   spec's execution hold before treating S7's JWT step as a same-repo task.
6. **M1 remains valid as stated:** S5's decision-dashboard artifact is re-homed from
   `Minion Docs` (a separate, non-CLI-registered repository S5's `minion_hub` PR cannot
   commit to) to a tracked location inside `minion_hub` itself — see §Slice 2.

*(Pass 6 supersedes item 5's remedy: the gateway-side prerequisite is no longer a slice of
this spec — see item 7 and §Slice 7. Item 5's finding stands; its fix moved out.)*

**Pass 6** (this one) repairs the two defects the pass-5 review found — both real, both
re-read from gateway `DEV` `bd55137100aceaf193ab99a827302d3f865b50e7` and hub `master`
`1b47e8ce`, still the branch heads on 2026-08-29:

7. The tenant contract covered only the *buffered query* path. `emitReliabilityEvent` also
   broadcasts every event to every connected client through a path with no `reliability`
   scope guard, and forwards it to the hub metrics push client. Filtering
   `reliability.events` alone isolates nothing.
8. "Attribute events with the connecting client's `orgId` at write time" has no runtime
   source: 16 of the 19 production emitters run with no connected client, and the gateway
   has no org identifier anywhere in its source. A synthetic buffer-injection test could
   have gone green while the real feed stayed unattributed.

Rather than add a seventh clause to a gateway program a performance spec should not own,
pass 6 moves that program out to proposal
`2026-08-29-gateway-reliability-feed-is-cross-tenant` (which carries the evidence and
stays coupled to the parked `2026-07-19-channel-scoping-fix-plan` hold) and re-scopes
Slice 7 to the perf work on a path that is executable today — see §Slice 7, path G. The
cross-tenant exposure is pre-existing: it ships now through the browser WS path this slice
inherits, and S7 must not widen it. `repos` drops back to `[minion_hub]` because no
`minion` change is owned here; if the human ratifies path T instead, `minion` goes back in
and the gateway program is handed to the proposal above before any dev run.

Slice ledger — verified 2026-08-29 against hub master `1b47e8ce` and gateway `minion`
`DEV` `bd55137100aceaf193ab99a827302d3f865b50e7`:

| Slice | State | Evidence (verified this pass unless noted) |
|---|---|---|
| S1 prod config gap | **shipped (code); env half unverified from here** | `src/server/db/with-org-core.ts:61-64` = ONE `select set_config(...)×4`; `pg-pool.ts` `DEFAULT_POOL_SIZE = 5`, prod `idle_timeout: 120`. hub PR #162 `14bfce72`. Vercel prod env (`SUPABASE_DB_RLS_POOL_SIZE=5`, `SUPABASE_DB_POOL_SIZE=8`) was set on 2026-08-22 per the session record but **cannot be re-verified without Vercel access** — see the S1 residual below. |
| S2 RUM + server timing | **shipped in part — dashboard outstanding** | `src/lib/server/server-timing.ts` (`createServerTimingHandle`) wired at `hooks.server.ts:12,503,528`; it since grew a request-local stage recorder + `PerformanceSample` persistence. `hooks.client.ts:33` `capture_performance: { web_vitals: true }`; `+layout.svelte:71` `nav_timing`. hub PR #162 `14bfce72`. **NOT done:** the before/after PostHog dashboard — the surface §5 step 1 and S6 use to decide whether a slice helped — does not exist. A code search of `master` finds the capture sites but no dashboard URL, and #162's file list contains no dashboard artifact. It is now a named prerequisite of S5 (see §Slice 2 and §Slice 5). Events are flowing; only the decision surface is missing. |
| S3 layout↔nav decoupling | **shipped, with one deliberate divergence** | `applyRouteAccessGuard` lives in `hooks.server.ts:201` and runs at both auth call sites (`:186`, `:358`); `(app)/+layout.server.ts:68` reads the pathname under `untrack`, `:157` records the guard's move. hub PR #166 `1988ef09`. **Divergence:** S3 specified `data-sveltekit-preload-data="tap"`; `src/app.html:9` is back to `"hover"` — tap measurably delayed the click-to-content path (prefetch-then-click rendered in 0.35 s vs 1.5 s cold). Hover is the accepted end state; the pass-1 text was wrong. |
| S4 shell diet | **shipped in part — DoD unmet, remainder moved into S5** | Supabase browser client dynamic-imported inside `signOut()` (`user.svelte.ts:94-97`); FloatingAssistant/carta-md moved behind the layout's idle `{#await import}`; `vite.config.ts:82-90` `optimizeDeps.include` incl. `lucide-svelte`. hub PR #162 `14bfce72`. **NOT done:** no `manualChunks` pass in `vite.config.ts`, no committed shell-size measurement script in `scripts/`, and the ≤700 KB target was not reached — the post-S4 ad-hoc measurement was 1,538 KB, of which 815 KB is the both-locale Paraglide chunk. The script and `manualChunks` are now S5's DoD; the byte target is split across S5's staged budget and S9. |
| S5 one-locale Paraglide | **open — next slice** | `package.json:18` still `@inlang/paraglide-sveltekit: ^0.16.1` (the package is deprecated; `svelte.config.js` already carries a manual preprocessor shim for it). The catalog is build-generated (`i18n:compile` → `src/lib/paraglide/`, untracked), so the byte claims must be re-measured, not assumed. **Budget re-staged in pass 4:** the pass-2 `≤ 450 KB` DoD was unreachable from this spec's own numbers (`1,538 − 815 = 723 KB` remains after deleting the entire catalog), so S5 now carries a staged, ratcheted budget and the 450 KB goal moved to S9. |
| S6 SSR re-enable | **open — human merge gate** | `src/routes/+layout.ts:17` still `export const ssr = false` (`:18` is `prerender = false`; the pass-2 `:18` anchor was off by one). Seven `(app)` page opt-outs exist on `master`, not the two pass 2 named — enumerated in §Slice 6. |
| S7 HTTP-first WS routes | **open — re-scoped in pass 6 to a `minion_hub` slice (7b), path G** | `/reliability` gained a trivial `+page.server.ts` (RBAC comment only, returns `{}`); the RPCs moved out of the page into `$lib/state/reliability/*`, but every load is still gated on `conn.connected` (`reliability/+page.svelte:1159,1170,1188`). The premise holds; the pass-1 line/RPC-count anchor does not. **`security`-tagged since pass 4.** Pass 5 confirmed the pass-4 JWT contract cannot execute (no `jwt`/`orgId` on `ConnectParamsSchema`, rejected before auth by `message-handler.ts:209-218`). Pass 6 confirmed the rest: no org identifier exists anywhere in the gateway's `src/`/`extensions/`; `emitReliabilityEvent` (`src/logging/reliability.ts:33-43`) broadcasts every event to every connected client through an unguarded path (`server-broadcast.ts:9-17`) and pushes it to `hub-metrics-push.ts:104-109`; and 16 of the 19 production emitters have no connected client to attribute to. The feed is gateway-global on every path, including the browser WS one hub already uses — so tenant partitioning is proposal `2026-08-29-gateway-reliability-feed-is-cross-tenant`, not a slice here, and S7 is scoped to not widen it. |
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

**S1 residual:** the prod-env half of S1 has no
durable check. The RLS-pool-size fix from the 2026-07-17 plan sat unapplied in prod for a
month precisely because nothing compares intended runtime config against what Vercel
serves, and this run could not verify it either (no Vercel credentials in the factory
environment). Filed as `proposals/2026-08-29-hub-prod-runtime-config-drift-check.md`.

## 1. AS-IS

### 1.1 Verified 2026-08-29 (hub master `1b47e8ce`) — what the remaining slices face

1. `src/routes/+layout.ts:17` still sets `ssr = false` app-wide → SvelteKit returns an
   empty shell without running any server load, then the client fetches `__data.json` and
   re-runs the whole handle chain. Two serial round trips before any content. Underneath
   it, seven `(app)` pages already opt out for their own reasons —
   `flow-editor/+page.ts`, `flow-editor/[id]/+page.ts` (both bare `ssr = false`),
   `agents/workshop/+page.ts`, `agents/workshop/[id]/+page.ts` ("PixiJS and Rapier are
   client-only"), and `agents/workshop/{compare,groupchat,leaderboard}/+page.ts` ("gateway
   WS client is browser-only") — plus `login/+layout.ts` and `invite/accept/+layout.ts`
   outside `(app)`. Deleting the root flag server-renders every other route graph for the
   first time. (S6)
2. Paraglide is still `@inlang/paraglide-sveltekit ^0.16.1` with a single compiled catalog
   containing both locales, statically imported by ~436 modules — every `en` user
   downloads the `es` catalog and vice versa. (S5)
3. `/reliability` renders nothing until the WS handshake completes: its `+page.server.ts`
   returns `{}` and all aggregate loads sit behind `if (serverId && conn.connected)`. (S7)
4. `vite.config.ts` has no `manualChunks`; no committed script measures the shell's byte
   budget, so S4's ≤700 KB claim is unfalsifiable as it stands. The only measurement that
   exists is the ad-hoc post-S4 count: 1,538 KB of static-import closure, 815 KB of it the
   both-locale Paraglide chunk — i.e. 723 KB that is *not* Paraglide and that no named
   work in this spec removes. (S5 owns the script and the locale split, S9 the rest)
5. Five perf-adjacent specs still carry `status: unknown` in `specs/index.json`. (S8)
6. S2's events flow but its dashboard does not exist: no PostHog dashboard URL appears in
   hub `master` or in #162, so the program currently has no surface on which to compare a
   slice's before and after. Every DoD below that says "the S2 dashboard shows …" is
   unexecutable until it is built. (prerequisite of S5)

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
- One locale's catalog only, and a committed measurement script that makes the shell's
  byte budget machine-checkable and ratcheted instead of an ad-hoc count (S5). ≤ 450 KB
  uncompressed remains the program's shell goal, but it is S9's target and is contingent
  on S5's per-chunk attribution showing it is reachable — S5's own arithmetic
  (`1,538 − 815 = 723 KB` of non-catalog bytes) says the locale work alone cannot get
  there.
- Data-gated routes render server data first; WS upgrades them live.
- The board tells the truth about which perf specs shipped.
- Invariants (unchanged from pass 1): RBAC/module gating semantics stay fail-closed;
  i18n behavior unchanged for both locales; no route loses data when WS is down (strictly
  better: HTTP fallback); design-lint debt does not increase.

## 3. DELTA → slices

Numbered transitions: (1) prod pool/idle/set_config gap → S1 **shipped**. (2) no owned
RUM/server timing → S2 **shipped in part**; the events landed, the decision dashboard did
not, and building it is a prerequisite of S5. (3) layout re-runs per nav → S3 **shipped**.
(4) shell carries supabase-js + carta-md/KaTeX → S4 **shipped**; its unproven byte budget
and the missing `manualChunks`/measurement script transfer to S5. (5) both locales ship to
every user, and the shell has no enforced budget → S5. (6) empty-shell cold load → S6.
(7) WS handshake gates first data, and moving those reads server-side puts them on a
credential resolver that fails open across tenants → S7b, which pins the reads to the
caller's own org gateway and fails closed instead. The gateway's missing tenant model —
which makes the reliability feed gateway-global on *every* path, including the one the
browser already uses — is not fixed here: it is proposal
`2026-08-29-gateway-reliability-feed-is-cross-tenant`, and S7 is scoped so it does not
widen it. (8) perf spec
statuses unknown →
S8. (9) the shell is still above the program's 450 KB goal after S5's locale work, by at
least the 723 KB of non-catalog bytes S5 does not touch → S9. CRM roster payload (the 10th
delta) is owned by the pagination spec; the CRM rank-query cost (11th, surfaced by that
work) is owned by proposal `2026-08-22-crm-rank-query-prod-latency`.

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

### Slice 2 — RUM + route-level server timing — SHIPPED IN PART (hub #162 `14bfce72`)

**Topics:** `infra`, `ux`

PostHog `capture_performance: { web_vitals: true }` pinned in `src/hooks.client.ts`; SPA
`nav_timing` capture across `beforeNavigate`/`afterNavigate` in `src/routes/+layout.svelte`
with route id and duration; a `Handle` in `hooks.server.ts` that records `event.route.id` +
ms, emits `Server-Timing`, and captures a sampled server-side PostHog event
(`SERVER_TIMING_SAMPLE_RATE`, default 0.1); the >3 s layout warn is now an
`app_layout_slow_load` capture. Five unit tests cover the handle.

**Not done — the decision dashboard.** Every event it needs is flowing, but the
before/after PostHog dashboard does not exist, and pass 2's "carry it into the S5/S6/S7
PRs" gave it no owner: no later DoD required it, while §5 step 1 and S6 both spend it as if it
were there. Pass 4 gives it one owner and one gate — **it is a prerequisite of Slice 5**,
delivered by S5's PR before S5's own DoD is judged:

- a durable PostHog dashboard URL (plus an exported screenshot or dashboard JSON committed
  inside `minion_hub` itself — e.g. `minion_hub/docs/perf/rum-dashboard.md` plus its export
  file — so the artifact survives a PostHog project change. **Not `Minion Docs`:** that tree
  is a separate, non-CLI-registered repository (`AGENTS.md`'s Project Map carries no registry
  row for it) that S5's own `minion_hub` PR cannot commit to; the artifact must live in a
  repository the delivering PR actually touches);
- tiles: p75 LCP and INP per route id, `nav_timing` p75 per route id, `server_timing` p75
  per route id, and `app_layout_slow_load` rate;
- the exact queries and the route-id definitions behind each tile, written down;
- a named baseline window (the ≥7-day period the "before" numbers are read from), recorded
  in the S5 PR so later slices compare against a fixed reference rather than a moving one.

S6 is not eligible to start until that artifact exists — its rollout decision has no other
input.

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

Not done, and re-homed in pass 4 so nothing here is an undocumented open end: the
`manualChunks` pass and the committed build-output measurement script go to **S5**; the
shell *target* itself goes to **S5's staged budget and then S9**, because S4's ≤700 KB
number shared the same flaw as S5's ≤450 KB one — it was never derived from an
attribution of the 1,538 KB the shell actually measured. Of that, 815 KB is the
both-locale Paraglide catalog, which is what S5 removes; the other 723 KB is S9's.

### Slice 5 — Ship one locale, not two (and put the shell on a measured, ratcheted budget)

**Topics:** `deps`, `infra`

**Gate A — measure first, and commit the ruler.** The slice's first commit is the
measurement script, not the Paraglide change. Commit a `scripts/` script that computes the
shell's uncompressed JS bytes from the build output (static-import closure of the entry +
`nodes/0` + the `(app)` layout node), emits a per-chunk breakdown sorted by size, and
compares the total against a budget constant committed alongside it. Run it against
current `master` and paste the baseline — total and top chunks — into the PR before
changing anything. The pass-2 figures (1,538 KB total / 815 KB catalog) came from an
ad-hoc count and are the number to *replace*, not to assume: if Gate A disagrees with
them, Gate C's numbers are re-derived from Gate A's output and the substitution recorded
in the PR. Use code-level markers, never string greps, when asserting a dependency is out
of the shell — message keys and Spanish copy inside the catalog chunk false-positive on
names like `carta` or `floatingAssistant`.

**Gate B — one locale.** The compiled Paraglide catalog statically bundles `en` + `es` for
everyone. Preferred path: upgrade off the deprecated `@inlang/paraglide-sveltekit ^0.16.1`
to Paraglide 2 (per-message modules, per-locale tree-shaking) — note `svelte.config.js`
already carries a manual preprocessor shim for the deprecated package, so the upgrade also
retires that workaround. Fallback if the upgrade is disruptive: split the compiled
`en`/`es` catalogs into separate lazy chunks keyed by the locale route prefix. `/es` must
stay fully functional, and nothing may SSR-bake a fixed locale (known gotcha: module-scope
`m.x()` bakes `'en'`). Also folded in from S4: a `manualChunks` pass for the worst
remaining shared chunks. Note what `manualChunks` can and cannot do — it repartitions
statically imported code across chunk files, it does not remove any byte from the closure
Gate A measures, so it may improve caching but must never be counted toward Gate C.

**Gate C — a staged budget, honestly derived.** The pass-2 DoD demanded ≤ 450 KB, which
this spec's own measurements make impossible for this slice: deleting the *entire*
both-locale catalog leaves `1,538 − 815 = 723 KB`, and only the catalog is in scope here.
S5's budget is therefore the reachable one:

- **Primary (path-independent):** total closure ≤ `baseline − (bytes of the locale the
  user does not load, as measured in Gate A)`. This is the slice's actual claim and holds
  under either the upgrade or the split.
- **Absolute backstop:** ≤ 1,150 KB on the locale-split path (baseline minus ~one
  locale), ≤ 800 KB if the Paraglide 2 upgrade lands and tree-shakes. Whichever path is
  taken, the achieved total is recorded in the PR and written into the script's budget
  constant as a ratchet, so no later PR can regress past it.
- The program's ≤ 450 KB goal moves to **S9**, which is scoped from Gate A's per-chunk
  breakdown rather than from a number nobody has attributed.

**Prerequisite:** S2's decision dashboard (see §Slice 2) ships in this PR — durable URL,
tiles, queries, route-id definitions, and named baseline window — before S5's DoD is
judged. It is the surface S6 is later required to read.

DoD: the measurement script is committed and its baseline + post-change output printed in
the PR; an `en` page load's JS graph contains zero `es` catalog bytes (script-verified,
not string-grepped); the primary budget above holds and the achieved total is written into
the script's ratchet constant; the S2 dashboard artifact exists and is linked; i18n e2e for
both locales green; route-contract counts unchanged.

### Slice 6 — Re-enable SSR app-wide

**Topics:** `infra`, `edge-case`

Delete `ssr = false` from `src/routes/+layout.ts:17` (`:18` is `prerender = false` and
stays). **Preserve all seven existing `(app)` page opt-outs** — pass 2 named two of them;
verified against `master` `1b47e8ce`, the full set is `flow-editor/+page.ts`,
`flow-editor/[id]/+page.ts`, `agents/workshop/+page.ts`, `agents/workshop/[id]/+page.ts`,
`agents/workshop/compare/+page.ts`, `agents/workshop/groupchat/+page.ts`,
`agents/workshop/leaderboard/+page.ts` (PixiJS/Rapier and the browser-only gateway WS
client), plus `login/+layout.ts` and `invite/accept/+layout.ts` outside `(app)`. Re-derive
that list from the tree at implementation time rather than trusting this one; adding a
route between now and then is exactly the failure mode.

Every *other* route graph is server-rendered for the first time, so the audit is not
"the shell graph" as pass 2 said — it is each newly SSR-enabled route's own graph. Audit
for module-scope `window`/`document`/`localStorage` access and browser-only imports (the
classic SPA-rot class) and fix with `browser` guards or `onMount`. This collapses the
double round trip and makes every existing `streamed:` block pay off on cold load.

**Rollback, stated accurately.** `PUBLIC_SSR_DISABLED` is a `PUBLIC_*` value inlined at
build time, and Vercel env changes do not reach a running deployment without a redeploy
(same constraint recorded in `proposals/2026-08-29-hub-prod-runtime-config-drift-check.md`)
— so it is a *deploy-time selector*, not an instant switch, and pass 2's "rollback is an
env flip" was wrong. The real escape hatch is promoting the previous production deployment
(`vercel rollback` / promote the prior build, which still carries `ssr = false`), verified
by re-resolving the alias with `vercel inspect hub.minion-ai.org` afterwards; the flag's
job is to let a *rebuild* opt out without reverting the code. Both paths need someone with
Vercel access — record in the PR which one was rehearsed and how long it took. Remove the
flag once S2's dashboard confirms FCP improvement.

**Human gates:** this slice requires a human merge gate — an app-wide render-mode flip is
not an automatic merge regardless of green CI — and it may not start until S2's dashboard
artifact exists (§Slice 2), because its rollout decision has no other input. Note that
#167's version-skew reload changes the risk shape in both directions: open tabs now pick
up a bad deploy quickly, and they also cannot be left on the old bundle as an accidental
fallback.

DoD: prod document response for `/en/home` contains rendered app markup (not the empty
shell); an authenticated smoke matrix over **every** route in `src/lib/routes/`'s
route-access registry / design manifest, in both `en` and `es`, run against a prod preview
and pasted into the PR — each route either renders or is a recorded, justified opt-out
(a green build and a `/en/home` check do not detect a module-scope browser access on one
ordinary route); the seven opt-outs above still opt out (assert in the route-contract
test); the rollback path rehearsed and timed; S2 dashboard shows cold-load LCP p75
improvement over the baseline window S5 recorded.

### Slice 7 — HTTP-first data for WS-gated routes

**Topics:** `unwired`, `ux`, `security`, `permissions`

`/reliability`'s aggregate RPCs are read-only. They now live in `$lib/state/reliability/*`
(`loadData` / `loadFiltered` in `reliability/+page.svelte`, gated on `conn.connected` at
`:1159`, `:1170`, `:1188`) rather than as inline `sendRequest` calls — re-read that module
before designing, the pass-1 "8 sendRequest calls at `:1149-1178`" anchor is stale. Add
HTTP read endpoints backed by the same gateway calls server-side, load them from the
page's `+page.server.ts` (currently a stub returning `{}`, streamed), and let the WS
connection upgrade to live data when it arrives. Apply the same pattern to
sessions/overview/home feed only if S2 data shows they matter.

**Why this slice is `security`-tagged.** In the browser the WS connection is at least
gateway-bound: `api/servers/[id]/token/+server.ts` hands out a gateway token only after
checking that the gateway row belongs to the caller's active org, and returns 404 for
another org's gateway and 503 (not 404) when the registry is merely unavailable. Moving
the same reads server-side moves them off that check and onto
`src/lib/server/gateway-rpc.ts`, whose `resolveCredentialsForUser` (`:75-121`) falls
through an `(org, channel)` lease **miss or error**, then a per-user lookup **miss or
error**, to PG system-wide credentials and finally to env bootstrap credentials —
`gatewayCallAsUser` (`:295-315`) documents that fallback as intended behaviour. Left
alone, S7 would read *some other org's* gateway during a mapping miss or a registry
outage. That is the risk this slice creates, and clause 3 below is what closes it.

**What passes 4–6 verified, and why pass 6 reshapes the slice instead of adding another
clause.** Pass 4 required a hub-signed JWT carrying `orgId` on every server-side gateway
call. Pass 5 checked that requirement against gateway `minion` `DEV`
`bd55137100aceaf193ab99a827302d3f865b50e7` and found it cannot execute:
`ConnectParamsSchema` (`src/gateway/protocol/schema/frames.ts:20-68`) has no `jwt` and no
`orgId` field and is `additionalProperties: false`; `message-handler.ts:209-218` validates
it and rejects the connect frame *before* authentication. Pass 6 re-read the same SHA
(still `DEV` head on 2026-08-29, alongside hub `master` `1b47e8ce`) and finished the
inventory. Four facts, each read from that source:

1. **The gateway has no tenant model at all.** `orgId`, `organizationId`, `accountOrgs`
   and `orgDisabled` appear nowhere in `src/` or `extensions/` at that SHA except
   `src/infra/provider-usage.fetch.claude.ts` (an Anthropic billing org — unrelated). Hub
   writes `channels.accountOrgs` and `plugins.orgDisabled` into the gateway's config blob
   (`channel-sync.service.ts:98-102`, `pg-plugin-org-schema.ts:3-12`), but no gateway code
   reads them. There is no `client.orgId` for a claim to populate, and no
   session/agent/channel → org map to derive one from.
2. **The live path is unfiltered, not only the buffered one.** `src/logging/reliability.ts:33-43`
   pushes each event into the process-global ring and then calls
   `broadcastFn("reliability", event, { dropIfSlow: true })`.
   `src/gateway/server-core/server-broadcast.ts:9-17,41-55,93-117` scope-guards only
   `exec.approval.*`, `device.pair.*` and `node.pair.*`; `reliability` has no entry, so
   `hasEventScope` returns `true` and the frame goes to **every** connected client. Hub
   consumes exactly that frame (`gateway.svelte.ts:852-855` → `pushReliabilityEvent` →
   `state/reliability/reliability.svelte.ts`), which is the "upgrade to live data" this
   slice keeps. Partitioning `reliability.events` / `reliability.summary` alone leaves this
   path wide open.
3. **There is a third egress.** The same emit forwards to
   `getHubMetricsPushClient().pushEvent(event)` (`src/gateway/hub-metrics-push.ts:104-109`),
   which buffers up to 10,000 events and flushes them to the hub. Any tenant-partitioning
   contract that names only the query path is incomplete by construction.
4. **Almost nothing that emits an event knows whose it is.** All 19 production call sites
   of `emitReliabilityEvent` at that SHA, with the trusted org source each one actually
   has today:

   | Producer | Sites | Trusted org attribution available today |
   |---|---|---|
   | `gateway/server-methods/browser.ts:262,270,278` (via `emitBrowserReliabilityEvent`) | 3 | The request's own `client` is in scope — connection-scoped, so it could carry whatever a handshake validated. There is no such handshake. |
   | `gateway/server-core/server-cron.ts:206,215,224,237` | 4 | `sessionKey` = `cron:<jobId>` and `jobId`. No org in the cron store. |
   | `logging/diagnostic.ts:97,227,309` (webhook error, stuck session, tool loop) | 3 | `channel`, `chatId`, `sessionKey` — none of which the gateway maps to an org. |
   | `agents/auth-profiles/startup-check.ts:43,57,71,88` | 4 | Process startup: no request, no session. |
   | `agents/auth-profiles/refresh-scheduler.ts:79,96,118` | 3 | Scheduled: no request. |
   | `agents/auth-profiles/oauth.ts:267,284` | 2 | Auth profiles are gateway-level, not org-level. |

   So "attribute events with the connecting client's validated `orgId` at write time" is
   executable for **3 of 19** sites, and only after a handshake that does not exist.
   Excluding everything unattributed — the only safe reading — empties the tenant-facing
   feed of cron, auth, startup and stuck-session events, i.e. most of what `/reliability`
   shows. Deriving an org from `channel` / `sessionKey` / `metadata` instead is exactly the
   caller-asserted identity `minion-ai` PR #237 FAILed CRITICAL on
   `specs/2026-07-19-channel-scoping-fix-plan` P1, which is now parked with an execution
   hold: "resume only through a coordinated `minion` + `minion_hub` implementation with
   deployment access… do not redispatch as a single-repository run."

**Pass 6 decision: this performance program does not own the gateway's tenant model.**
Building one is a multi-repo security program with its own AS-IS; three review rounds of
bolting it onto a perf slice produced a contract that could not execute. It is filed as
proposal `2026-08-29-gateway-reliability-feed-is-cross-tenant` (with the evidence above)
and stays coupled to the parked channel-scoping hold for the identity half. What remains
here is the perf work, on one of two paths — **path G is chosen; the human approval gate
this spec already requires is where that choice is ratified or replaced by path T.**

#### Path G (chosen) — treat the reliability feed as what it verifiably is

Gateway-global operational telemetry, presented as such. No `minion` change, so 7b is a
`minion_hub` slice: pass 5's "dispatching S7 as a single-repository run is itself a defect"
was written about the gateway program and applies to path T; it does not apply to path G,
whose blast radius is one hub route and its new endpoints.

The audience has to match the data. `/reliability` is gated today by `reliability:view`, a
per-org role permission any org's role matrix can grant (`src/lib/permissions.ts:85-90`,
enforced by the central RBAC guard that `(app)/reliability/+page.server.ts:3-4` documents
as "replacing the old admin-only super-view check"). Since every number on that page is
gateway-wide, the default under path G is to put the surface back behind an explicitly
platform/gateway-operator gate, and 7b names the exact check it shipped. **Narrowing an
existing surface is a product decision, not an implementation detail** — the human
approval gate ratifies it, and may instead choose to keep `reliability:view` and label the
feed gateway-wide, which changes none of 7b's engineering but leaves the exposure open
under the proposal's ownership. Either way S7b must not *widen* it: that is what clauses
2–6 below enforce.

#### Path T — per-org reliability data (not a slice of this spec)

Only if the product decides tenants must see their own reliability data. That is the
proposal's cross-repo work (`minion` + `minion_hub`), and 7b would then wait for it to
ship **and deploy**. Its clauses are binding *together* — any one alone leaves a hole, as
passes 4–6 each demonstrated:

1. A gateway-validated identity credential in the connect handshake: a new explicit field
   on `ConnectParamsSchema` (never a relaxation of `additionalProperties`), with the
   issuer/signature verification that does not exist anywhere in that repo today.
2. `client.orgId` set **only** from that validated claim, never from a caller-asserted
   connect field — the shape PR #237 rejected, because every hub browser session presents
   the same shared operator token.
3. Write-time attribution with a named trusted source **per producer class** from the
   inventory above, not one rule for all 19: connection identity where the event is
   connection-scoped, authoritative session/agent/job/profile ownership where the gateway
   can prove it, and an explicit `global` class for everything no tenant owns — served
   only on a system-admin surface, never merged into a tenant response.
4. The live broadcast filtered the same way: an org-attributed `reliability` event reaches
   only connections whose validated org matches; `global` events reach only system-admin
   connections. Query filtering without this is not isolation (fact 2 above).
5. `hub-metrics-push` partitioned or explicitly declared system-scope (fact 3 above).
6. Tests, in `minion`'s own suite, against the SHA that will actually serve hub traffic:
   handshake accepts a valid claim and fails **closed** on missing/expired/forged (no
   degrade to anonymous or system scope); a same-gateway two-org **query** isolation test;
   and a same-gateway two-org **subscription** test in which both clients are connected and
   org A never receives org B's broadcast frame. Injecting tagged events into the ring
   buffer proves nothing about the real producers — drive at least one test per class
   through a real one (a browser request, a cron finish, a startup check).

#### Slice 7b — HTTP-first hub implementation (repo: `minion_hub`, path G)

**Contract (binding on the implementation, each clause with its own test):**

1. **Authorization.** Every endpoint's first statement is the capability check path G's
   human gate ratified, called the way `api/reliability/architecture/+server.ts` calls
   `requireOrgCapability`. Mirror that endpoint for RBAC/tenant-context *shape* only — it
   resolves nothing through `gateway-rpc.ts` (`probeArchitecture` is org-scoped PG reads),
   so it is not a template for credential resolution.
2. **Identity comes only from the session.** `profileId`, `orgId` and the build channel are
   derived from authenticated `locals` (`locals.orgId ?? locals.tenantCtx?.tenantId`, and
   the request-ambient channel). No org, profile, gateway id, or channel is ever read from
   a query string, body, or header. Missing tenant context → 401.
3. **Strict, org-qualified credential resolution.** Use a resolver that, once an `orgId` is
   present, resolves *only* the `(org, channel)` lease and the per-user row for that org.
   A miss → 404. An error → 503 with `retry-after`. It must **never** continue to
   `getSystemGatewayCredentials` or the env bootstrap pair, because neither is bound to the
   caller's org. Implement this as a new strict entry point (e.g.
   `resolveCredentialsForOrgStrict`) rather than by adding a flag to
   `resolveCredentialsForUser`, so no existing caller silently changes behaviour.
4. **No invented claims.** There is no org-scoping credential the gateway accepts (fact 1),
   and a `jwt`/`orgId` field on the connect frame is rejected *before* auth by
   `additionalProperties: false`. 7b therefore mints nothing, sends no connect field outside
   the serving gateway's `ConnectParamsSchema`, and does not treat the shared operator token
   as org scoping. Under path G, "which gateway" comes from clause 3 and "who may ask" from
   clause 1 — that is the whole of 7b's org boundary, and the response says so (clause 6).
5. **Fail closed, and distinguish the two failures.** 404 = this org has no gateway for
   this channel; 503 = the registry/lease lookup failed. Never substitute another gateway,
   and never degrade to an empty 200 that the page renders as "all healthy".
6. **No new surface, and no false scoping.** These endpoints are read-only, expose no
   gateway URL or token in their responses, and add no gateway RPC method the WS path did
   not already call. Each response marks its data gateway-wide (e.g. `scope: 'gateway'`)
   and the page says so, so no operator — and no later feature — reads the numbers as
   org-scoped.

DoD (7b): `/reliability` renders populated KPIs with WS blocked (devtools offline-WS test);
no duplicate fetch when WS connects (guard test); and these tests exist and pass —
(a) **mapping miss**: an authenticated caller whose active org has no gateway lease for the
channel gets 404 and *no* gateway call is made with system or env credentials;
(b) **registry outage**: the lease/per-user lookup throwing yields 503 with `retry-after`
and, again, no fallback credentials; (c) **gateway selection**: with org A and org B on
distinct gateways, an org-A session's endpoints resolve org A's gateway credentials and
never the system/env pair — this proves *selection*, which under path G is the only org
claim 7b makes; (d) **audience**: a session lacking the ratified capability gets the route
guard's denial, and the test names the capability actually shipped; (e) **handshake
compatibility**: the connect params the endpoints send validate against the serving
gateway's `ConnectParamsSchema` (assert against that SHA's schema), so no call can regress
to a pre-auth rejection; (f) the response carries the gateway-wide scope marker of clause 6.

**Human gates (required, `security`):** a human approves S7's path choice and design before
any dev run, and a human merges the PR. Neither gate is satisfiable by green CI or by an
agent review verdict.

### Slice 8 — Reconcile stale perf-spec statuses (board hygiene)

**Topics:** `board`, `hygiene`

Resolve `status: unknown` on `2026-07-05-hub-tanstack-virtual`,
`2026-07-06-hub-tanstack-{consolidated-execution,query,pacer,ai-assessment,db-store-assessment}`
and `2026-07-17-hub-performance-optimization-plan` by inspecting master for each spec's
landmarks (T1–T10; Phases 0–2 markers), then set `shipped`/`superseded`/`parked` with
`evidence` links and regenerate `specs/index.json`.

DoD: none of those specs carries `status: unknown`; the pagination spec's "if T2 landed"
uncertainty is answered in its sidecar or body.

### Slice 9 — Close the remaining shell bytes to the 450 KB goal

**Topics:** `deps`, `ui`

S5 removes one locale's catalog and nothing else, which by this spec's own arithmetic
leaves roughly 723 KB of non-catalog shell bytes that no named work touches — 273 KB above
the program's ≤ 450 KB goal. This slice owns that gap, and it is deliberately **not**
scoped until it can be: it starts from S5's committed measurement script and its per-chunk
breakdown, not from a target someone picked.

Steps: run S5's script against the post-S5 build; attribute the top chunks to their
importing modules; name each candidate as *remove* (unused or replaceable dependency),
*lazy* (moved behind an idle/route-level dynamic import, the pattern S4 used for
supabase-js and carta-md/KaTeX), or *load-bearing* (must stay in the shell, with the
reason); then land the named removals. `manualChunks` alone does not count — it
repartitions the closure without shrinking it.

DoD: the attribution table is committed in the PR (chunk → importer → disposition →
bytes); the shell total is ≤ 450 KB uncompressed as measured by S5's script, and the
script's ratchet constant is lowered to the achieved number; no route loses functionality
(route-contract counts unchanged, both-locale i18n e2e green); S2 dashboard shows no LCP
p75 regression. **If the attribution shows ≤ 450 KB is unreachable without removing a
load-bearing dependency, this slice's output is the attribution table plus a revised,
evidence-backed target written back into this spec — not a number gamed to fit.**

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
- The gateway's tenant model — validated org identity on the socket, per-org attribution
  of reliability events, and filtering of the buffered, broadcast and hub-metrics-push
  paths — owned by proposal `2026-08-29-gateway-reliability-feed-is-cross-tenant` and, for
  the identity half, by the parked `2026-07-19-channel-scoping-fix-plan`.
- New storage for perf metrics (the dead `reliability-events` table stays dead; PostHog +
  Speed Insights are the stores).

## 5. Verification (end-to-end)

Run after each slice and at program end, from a real browser session logged into prod.
Measure on a hard-reloaded tab: after a deploy, an open SPA tab is pinned to the old
bundle until the version-skew reload fires, and old-tab numbers silently describe the
previous deployment.

1. S2 dashboard: p75 LCP, INP, `nav_timing`, and server p75 per route — screenshot/link
   before starting a slice and after each landing. **This dashboard does not exist yet**
   (see §Slice 2); S5 builds it, and until then this step is a promise, not a check —
   which is precisely why S6 may not start before S5 lands. The program's exit criterion is
   p75 warm nav server time < 500 ms and cold-load LCP p75 < 2.5 s on /home, /crm,
   /finances, read against the baseline window S5 records.
2. Shell budget: the S5 measurement script's total is at or below the ratchet constant
   committed with it (S5's staged budget, then S9's ≤ 450 KB), and the `/en/...` graph is
   free of `es` catalog bytes (script-verified, not string-grepped).
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
