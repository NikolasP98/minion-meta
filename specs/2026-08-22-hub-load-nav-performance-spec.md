---
id: 2026-08-22-hub-load-nav-performance-spec
title: Hub load & nav performance — prod config gap, layout decoupling, bundle diet, RUM monitoring
stage: spec
status: review
pass: 9
next_slice: 5
created: 2026-08-22
updated: 2026-08-31
repos: [minion_hub]
type: infra
relationship: extends
related: [2026-07-17-hub-performance-optimization-plan, 2026-08-13-crm-customers-server-pagination-spec, 2026-07-06-hub-tanstack-consolidated-execution, 2026-08-21-hub-datatable-server-mode-test-gap-spec, 2026-08-22-crm-rank-query-prod-latency, 2026-07-19-channel-scoping-fix-plan, 2026-08-31-hub-performance-board-reconciliation-spec]
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
  `status: unknown`. Their reconciliation is meta-repository governance work and is now
  owned by `2026-08-31-hub-performance-board-reconciliation-spec`, not by this hub spec.
- `2026-08-21-hub-datatable-server-mode-test-gap-spec` (approved) owns the DataTable
  server-mode test debt this program's CRM work exposed.
- `2026-08-22-crm-rank-query-prod-latency` (proposal, draft) owns the CRM rank-query cost
  that Slice 5 of the pagination spec uncovered — deliberately NOT a slice here; see §0.1.

## 0.1 Disposition (pass 8, 2026-08-30) — NOT approved; human approval gate required

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
   new §Slice 8, gated on evidence that it is reachable.
3. Slice 2 was recorded as shipped while its decision dashboard — the surface S5/S6 are
   supposed to be judged by — does not exist. Now `shipped in part`, with the dashboard a
   named prerequisite of Slice 5.
4. Slice 6 described a rollback Vercel does not offer and named 2 of the 7 existing
   per-route SSR opt-outs. Both corrected against `master` in §Slice 6.

**Pass 5** repaired the defects the pass-4 review found. Each was re-verified live against
what it *believed* was gateway `DEV` — `NikolasP98/minion` `bd55137100aceaf193ab99a827302d3f865b50e7`,
which pass 6 identified as a stale fork (see item 7) — and hub `master`, not assumed from
the review text:

5. **VOID (see item 7) — "Pass 4's S7 contract required a signed JWT the gateway cannot
   accept, and its tenant test proved the wrong thing."** Read from the fork at
   `bd551371`, where indeed:
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

*(Pass 6 **voids item 5**: it was read from a stale fork of the gateway, not from the
registry's canonical remote — see item 7 and §Slice 7.)*

**Pass 6** (this one) repairs the two defects the pass-5 review found, and — the reason it
is a bigger edit than a fix round should be — corrects the source every gateway claim in
this spec was read from:

7. 🚨 **Passes 4–6 and their reviews all verified the gateway against a stale fork.**
   `NikolasP98/minion` is a fork whose last push was 2026-04-11 (`gh api
   repos/NikolasP98/minion --jq '.fork, .pushed_at'`). The fleet registry names the
   canonical remote — `node scripts/repo-policy.mjs show minion` → `NikolasP98/minion-ai`,
   development branch `DEV`, head `293a1aad1bd5609e94247067332a6a41eae7f6be` on
   2026-08-29. On the canonical repo the multi-tenant auth rail **exists**: `jwt` is an
   accepted connect param, `ws-jwt-auth.ts` validates it against configured OIDC issuers
   and derives `orgId` from validated claims, and `org-scope.ts` gates org-tagged
   resources. Pass 5's "confirmed-absent JWT contract", and the pass-5 review's executable
   `additionalProperties` check that "proved" a `jwt` frame is rejected, are both false
   against the code that actually serves hub traffic. Every gateway anchor in §Slice 7 is
   re-read from the canonical SHA; item 5's finding above is void, and the ledger row is
   corrected in place. `/memory/MINION/factory/2026-08-23-081bc936.md` recorded the real
   state ("the gateway already propagates `orgId`+`userId` from a validated JWT") — reading
   it is what exposed the mismatch.
8. **The reviewer's two findings survive the correction, in reduced form.** Reliability is
   the one surface the org rail never reached: the unified event store has no org column
   (`grep -rn "orgId" src/events/` is empty), `server-methods/reliability.ts` never reads
   `client.orgId`, and `emitReliabilityEvent`'s legacy `broadcastFn("reliability", …)` is
   filtered only by scope guards (no `reliability` entry) and `assignedAgentIds` (events
   without an `agentId` pass through) — so both the buffered *and* the live paths are
   gateway-wide, exactly as the review said. Attribution has no single seam either: ~61
   production emitters across ~30 files, most with no connected client. What is *not* true
   is that this requires building identity from scratch.

Rather than grow a gateway program a performance spec should not own, pass 6 files the
partitioning work as proposal `2026-08-29-gateway-reliability-feed-is-cross-tenant`
(evidence against the canonical repo, coupled to the parked
`2026-07-19-channel-scoping-fix-plan` hold) and re-scopes Slice 7 to the perf work on a
path that is executable today — see §Slice 7, path G. The cross-tenant exposure is
pre-existing: it ships now through the browser WS path this slice inherits, and S7 must not
widen it. `repos` drops back to `[minion_hub]` because no gateway change is owned here; if
the human ratifies path T instead, the gateway repo (`minion-ai`, id `minion`) goes back in
and that work is handed to the proposal before any dev run.

**Pass 7** closes the remaining blast-radius gaps found at exact PR head `508da0d6`.
Every reliability record is also exposed through the unified `events.*` methods and
`events.new`, while the Turso sync and hub Insights path collapse records under one
server-level telemetry tenant. The security proposal now owns every query alias, both live
event names, and the producer → local store → durable sync → active-org Insights boundary;
its tests traverse real producers instead of proving only a tagged-store happy path.
Path G here remains unchanged and honest: it does not claim tenant partitioning.

Pass 7 also records the operator's 2026-08-30 build-cost evidence for future performance
work. Svelte server/client compilation completed locally, but adapter-vercel packaging
exceeded Node's default ~4 GB heap; an 8 GB retry reached ~7.1 GB RSS and was stopped after
~9 minutes. The exact-head hosted check completed in 2m45s and Vercel emitted 1,078 output
items with shared functions around 17.13 MB. Future S5/S8 measurement must record adapter
packaging wall time, peak memory, output count and shared-function size. Once compilation
is clean, do not repeat an unchanged local packaging attempt merely to reproduce the same
resource ceiling; use the hosted exact-head build as release evidence and investigate the
packaging metrics as their own performance result.

**Pass 8** closes the two remaining exact-head review findings. Path T now resolves trusted
event ownership before either process-global rate limiter and partitions both limiter keys,
with cross-org and same-org real-producer proofs. Slice 7b no longer claims a presented JWT
falls back to admin when no issuer accepts it: the server-side caller is independent of the
browser-only public flag, requires a matching serving-gateway issuer, and fails closed with
503 without retrying as shared-token admin. The DoD now proves a completed authenticated
handshake yields the expected validated `orgId`, rather than checking only the connect schema.

**Review-fix round 1** closes the remaining exact-head findings: Path T requires explicit
trusted scope at the unified emission boundary, inventories direct writers, preserves
multi-org membership, and specifies installed-SQLite migration and legacy-row safety. The
unsupported Slice 6 build-time selector claim is removed, and Slice 8's `minion-meta`
repository scope is declared in frontmatter.

**Review-fix round 2** closes the two exact-head findings at `2791569a`. The
meta-repository board reconciliation is split into its own single-repository spec, so this
spec's selected hub-only Slice 5 is queueable under the Factory's one-repository dispatch
contract. Slice 7b now requires all initial reliability RPCs to share one authenticated
transient gateway session and proves the connection and health-probe bound at the lowest
supported per-user connection cap.

Slice ledger — verified 2026-08-29 against hub master `1b47e8ce` and the canonical gateway
`NikolasP98/minion-ai` `DEV` `293a1aad1bd5609e94247067332a6a41eae7f6be` (**not**
`NikolasP98/minion`, the April fork passes 4–5 read):

| Slice | State | Evidence (verified this pass unless noted) |
|---|---|---|
| S1 prod config gap | **shipped (code); env half unverified from here** | `src/server/db/with-org-core.ts:61-64` = ONE `select set_config(...)×4`; `pg-pool.ts` `DEFAULT_POOL_SIZE = 5`, prod `idle_timeout: 120`. hub PR #162 `14bfce72`. Vercel prod env (`SUPABASE_DB_RLS_POOL_SIZE=5`, `SUPABASE_DB_POOL_SIZE=8`) was set on 2026-08-22 per the session record but **cannot be re-verified without Vercel access** — see the S1 residual below. |
| S2 RUM + server timing | **shipped in part — dashboard outstanding** | `src/lib/server/server-timing.ts` (`createServerTimingHandle`) wired at `hooks.server.ts:12,503,528`; it since grew a request-local stage recorder + `PerformanceSample` persistence. `hooks.client.ts:33` `capture_performance: { web_vitals: true }`; `+layout.svelte:71` `nav_timing`. hub PR #162 `14bfce72`. **NOT done:** the before/after PostHog dashboard — the surface §5 step 1 and S6 use to decide whether a slice helped — does not exist. A code search of `master` finds the capture sites but no dashboard URL, and #162's file list contains no dashboard artifact. It is now a named prerequisite of S5 (see §Slice 2 and §Slice 5). Events are flowing; only the decision surface is missing. |
| S3 layout↔nav decoupling | **shipped, with one deliberate divergence** | `applyRouteAccessGuard` lives in `hooks.server.ts:201` and runs at both auth call sites (`:186`, `:358`); `(app)/+layout.server.ts:68` reads the pathname under `untrack`, `:157` records the guard's move. hub PR #166 `1988ef09`. **Divergence:** S3 specified `data-sveltekit-preload-data="tap"`; `src/app.html:9` is back to `"hover"` — tap measurably delayed the click-to-content path (prefetch-then-click rendered in 0.35 s vs 1.5 s cold). Hover is the accepted end state; the pass-1 text was wrong. |
| S4 shell diet | **shipped in part — DoD unmet, remainder moved into S5** | Supabase browser client dynamic-imported inside `signOut()` (`user.svelte.ts:94-97`); FloatingAssistant/carta-md moved behind the layout's idle `{#await import}`; `vite.config.ts:82-90` `optimizeDeps.include` incl. `lucide-svelte`. hub PR #162 `14bfce72`. **NOT done:** no `manualChunks` pass in `vite.config.ts`, no committed shell-size measurement script in `scripts/`, and the ≤700 KB target was not reached — the post-S4 ad-hoc measurement was 1,538 KB, of which 815 KB is the both-locale Paraglide chunk. The script and `manualChunks` are now S5's DoD; the byte target is split across S5's staged budget and S8. |
| S5 one-locale Paraglide | **open — next slice** | `package.json:18` still `@inlang/paraglide-sveltekit: ^0.16.1` (the package is deprecated; `svelte.config.js` already carries a manual preprocessor shim for it). The catalog is build-generated (`i18n:compile` → `src/lib/paraglide/`, untracked), so the byte claims must be re-measured, not assumed. **Budget re-staged in pass 4:** the pass-2 `≤ 450 KB` DoD was unreachable from this spec's own numbers (`1,538 − 815 = 723 KB` remains after deleting the entire catalog), so S5 now carries a staged, ratcheted budget and the 450 KB goal moved to S8. |
| S6 SSR re-enable | **open — human merge gate** | `src/routes/+layout.ts:17` still `export const ssr = false` (`:18` is `prerender = false`; the pass-2 `:18` anchor was off by one). Seven `(app)` page opt-outs exist on `master`, not the two pass 2 named — enumerated in §Slice 6. |
| S7 HTTP-first WS routes | **open — re-scoped in pass 6 to a `minion_hub` slice (7b), path G** | `/reliability` gained a trivial `+page.server.ts` (RBAC comment only, returns `{}`); the RPCs moved out of the page into `$lib/state/reliability/*`, but every load is still gated on `conn.connected` (`reliability/+page.svelte:1159,1170,1188`). The premise holds; the pass-1 line/RPC-count anchor does not. **`security`-tagged since pass 4. Pass 5's gateway evidence is VOID** — it was read from `NikolasP98/minion`, a fork last pushed 2026-04-11, not from the registry's canonical `NikolasP98/minion-ai`. On canonical `DEV` `293a1aad` the JWT rail exists (`jwt` accepted by `ConnectParamsSchema`, validated by `server/ws-jwt-auth.ts` → `orgId` from claims, `org-scope.ts` gating org-tagged resources). What is missing is reliability-specific: no org column in `src/events/store.ts`, `server-methods/reliability.ts` ignores `client.orgId`, and the legacy `reliability` broadcast has no scope guard — so the feed is gateway-wide on both paths. That partitioning is proposal `2026-08-29-gateway-reliability-feed-is-cross-tenant`, not a slice here; S7b is hub-only and scoped to not widen it. |
| S8 remaining shell bytes | **open — after S5 evidence** | S5's committed measurement and per-chunk attribution must establish the executable removal/lazy-loading scope before this slice starts. |

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
   work in this spec removes. (S5 owns the script and the locale split, S8 the rest)
5. Five perf-adjacent specs still carry `status: unknown` in `specs/index.json`; their
   evidence reconciliation is owned by the related single-repository meta spec.
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
  uncompressed remains the program's shell goal, but it is S8's target and is contingent
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
credential resolver that fails open across tenants and on a shared-token admin connection
→ S7b, which pins the read to the caller's own org gateway, carries the org JWT the gateway
validates, and fails closed. The reliability feed's own lack of org partitioning — which
makes it gateway-wide on every path, including the browser one in use today — is not fixed
here: it is proposal `2026-08-29-gateway-reliability-feed-is-cross-tenant`, and S7 is
scoped so it does not widen it. (8) perf-spec status reconciliation is owned by the
related meta-only spec. (9) the shell is still above the program's 450 KB goal after S5's
locale work, by at least the 723 KB of non-catalog bytes S5 does not touch → S8. CRM
roster payload (the 10th
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
shell *target* itself goes to **S5's staged budget and then S8**, because S4's ≤700 KB
number shared the same flaw as S5's ≤450 KB one — it was never derived from an
attribution of the 1,538 KB the shell actually measured. Of that, 815 KB is the
both-locale Paraglide catalog, which is what S5 removes; the other 723 KB is S8's.

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
- The program's ≤ 450 KB goal moves to **S8**, which is scoped from Gate A's per-chunk
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

**Rollback, stated accurately.** This slice creates no build-time SSR selector. The escape
hatch is promoting the previous production deployment
(`vercel rollback` / promote the prior build, which still carries `ssr = false`), verified
by re-resolving the alias with `vercel inspect hub.minion-ai.org` afterwards. A rebuild-based
recovery requires reverting this slice and deploying that revert; changing an otherwise
unused environment value has no effect. Record in the PR how long the previous-deployment
promotion rehearsal took.

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

> **Read this before touching S7: passes 4–6 and their reviews all verified the gateway
> against the wrong repository.** `NikolasP98/minion` is a **fork whose last push was
> 2026-04-11** (`gh api repos/NikolasP98/minion --jq '.fork, .pushed_at'` → `true`,
> `2026-04-11T02:08:54Z`). The fleet registry is the authority:
> `node scripts/repo-policy.mjs show minion` gives `remote: NikolasP98/minion-ai`,
> development branch `DEV`. Every gateway claim below was re-read from
> **`NikolasP98/minion-ai` `DEV` `293a1aad1bd5609e94247067332a6a41eae7f6be`** (head on
> 2026-08-29). The April fork is four months behind and does not contain the multi-tenant
> auth work, which is why pass 5 "confirmed" an absent JWT contract that in fact ships,
> and why the pass-5 review's `additionalProperties` execution check returned a false
> negative. Anchors into `NikolasP98/minion` in passes 4–6 (and in this section before
> pass 6) are void; the ledger row and §0.1 items are corrected in place.

**Why this slice is `security`-tagged.** In the browser the WS connection is org-bound
twice over: `api/servers/[id]/token/+server.ts` hands out a gateway token only after
checking the gateway row belongs to the caller's active org (404 for another org's
gateway, 503 when the registry is merely unavailable), and — when
`PUBLIC_GATEWAY_JWT_AUTH` is on — the dashboard additionally presents a hub-issued JWT
carrying `orgId`/`agentIds` claims (`gateway.svelte.ts:191-210`, minted by
`/api/gateway/jwt` + `src/server/services/gateway-jwt.service.ts`). Moving the same reads
server-side moves them off *both*: `src/lib/server/gateway-rpc.ts` authenticates with a
raw operator token, which `ws-jwt-auth.ts` Case 2 treats as **admin**, and its
`resolveCredentialsForUser` (`:75-121`) falls through an `(org, channel)` lease **miss or
error**, then a per-user lookup **miss or error**, to PG system-wide credentials and
finally to env bootstrap credentials — `gatewayCallAsUser` (`:295-315`) documents that
fallback as intended behaviour. Left alone, S7 reads *some other org's* gateway during a
mapping miss or a registry outage, as an admin connection. Clauses 3 and 4 below are what
close that.

**What the canonical gateway actually provides (`minion-ai` `DEV` `293a1aad`).** The
identity rail exists end to end, which is the opposite of what pass 5 recorded:

1. `ConnectParamsSchema` (`src/gateway/protocol/schema/frames.ts:64-71`) has an optional
   `jwt` field and a trusted-proxy `userId` field. Hub's server-side helper already
   supports it — `gatewayCallAsUser` takes `opts.jwt` and `gatewayCallWithCreds` forwards
   it into the connect frame (`gateway-rpc.ts:141-148,225-245`), documented there as the
   only org-scoping credential, since every hub session holds the same operator token. It
   is opt-in per call: a caller that omits it connects as admin. So the shape 7b needs is
   accepted, not rejected — it simply has to be passed.
2. `src/gateway/server/ws-jwt-auth.ts` `resolveJwtAuth` validates a presented JWT against
   the configured OIDC issuers (`validateGatewayJwt` → JWKS, `src/gateway/auth/auth-jwt.ts`)
   and derives `userId`, `role`, **`orgId`**, `assignedAgentIds` and `jti` from *validated
   claims* — never from a caller-asserted connect field. Token/password without a JWT is
   Case 2: **admin**.
3. `src/gateway/org-scope.ts` `orgScopeVisible` is the resource-side gate, and it is
   explicitly **fail-open**: a connection with no `clientOrgId` (i.e. any shared-token
   admin connection, including hub's server-side helper) sees everything, and a resource
   with no `orgIds` tag is visible to every org. Agents, channel accounts, plugin settings,
   shells and alerts use it.

**What is still missing, and it is exactly the data this slice wants to serve.**
Reliability is the one surface the org rail never reached:

4. **No org attribution before either suppression boundary.** `emitReliabilityEvent`
   (`src/logging/reliability.ts:14-27,61-64`) rate-limits in one process-global map keyed
   only by event type and returns before calling `emitEvent`. The unified emitter has a
   second process-global limiter (`src/events/emitter.ts:34-58,120-129`) keyed only by
   `category:event`, and it returns before storage too. Org A can therefore consume org B's
   slot before attribution, persistence, broadcast or durable sync. Neither
   `src/events/store.ts` nor `src/events/types.ts` has any org column — `grep -rn "orgId"
   src/events/` is empty — so surviving records cannot be filtered by tenant afterwards.
5. **The read handlers never look at the caller.** `src/gateway/server-methods/reliability.ts`
   answers `reliability.events` / `reliability.summary` from `getEventStore()` filtered by
   category, severity, event mode, time window and paging only; `client.orgId` is not read,
   and the org-scope helper of item 3 is not applied.
6. **The live broadcast is not org-filtered either.** `emitReliabilityEvent` still calls
   `broadcastFn("reliability", …)` for legacy hub clients, and
   `src/gateway/server-core/server-broadcast.ts` filters a frame only by
   `EVENT_SCOPE_GUARDS` / `EVENT_PREFIX_SCOPE_GUARDS` (`exec.approval.*`, `device.pair.*`,
   `node.pair.*`, `debug.step.*` — no `reliability` entry) and by `assignedAgentIds`, where
   "events without an `agentId` pass through". Most reliability events have no `agentId`.
   Hub appends that frame straight into the displayed feed and KPIs
   (`gateway.svelte.ts:852-855` → `pushReliabilityEvent`).
7. **Attribution has no single write seam.** There are ~61 production `emitReliabilityEvent`
   call sites at that SHA, spread over ~30 files — startup (`server-startup.ts` ×5,
   `auth-profiles/startup-check.ts` ×4, `boot.ts` ×2), scheduled/system work
   (`server-cron.ts` ×4, `refresh-scheduler.ts` ×3, `model-health-check.ts` ×3,
   `config-reload.ts` ×3, `server-plugins.ts` ×3), agent/session work
   (`tool-loop-detection.ts` ×5, `pi-tools` ×3, `subagents/parallel-fanout.ts` ×2,
   `diagnostic.ts` ×3) and only a handful that run inside a connected request
   (`server-methods/browser.ts` ×3, parts of `server.impl.ts` ×4). A single "use the
   connecting client's `orgId`" rule does not fit most of them; agent- and channel-scoped
   events could instead inherit the `orgIds` tag their agent/account already carries
   (`org-scope.ts`, `account-scope.ts`), and genuinely global ones need an explicit class.

8. **The same records have generic query and live aliases.** `emitEvent` inserts the
   reliability record and broadcasts it as `events.new`; `events.list/get/summary/timeline`
   read the same tenant-blind store, and `events.stream` explicitly points clients at that
   unguarded event name. Filtering only `reliability.*` and the legacy `reliability` frame
   would therefore preserve both a query bypass and a subscription bypass.
9. **Durable Insights loses originating-org identity.** `src/events/turso-sync.ts` writes
   all records from one gateway under the server's single telemetry tenant. Hub
   `unified_events` has no originating-org column, and `/api/reliability/insights` queries
   by that server tenant rather than the active viewer org. A local-only org column cannot
   satisfy tenant isolation on a shared gateway.

So the exposure is real but the delta is much smaller than passes 4–6 assumed: identity,
validation and a resource-scoping helper all exist; reliability events are simply not
attributed and their query, live, and durable aliases are not scoped. Hub's own code
already knows how sharp this edge is — `gateway.svelte.ts:200-205` notes that permanently
disabling the JWT would leave the connection on shared-token auth, where org scoping
"fails open and other orgs' accounts leak in".

**Pass 6 decision: the gateway-side partitioning is not a slice of this performance
program.** It is filed as proposal `2026-08-29-gateway-reliability-feed-is-cross-tenant`
(carrying the evidence above, against the canonical repo) and stays coupled to
`2026-07-19-channel-scoping-fix-plan`'s execution hold, which requires coordinated
gateway + hub work with deployment access rather than a single-repository run. What
remains here is the perf work, on one of two paths — **path G is chosen; the human
approval gate this spec already requires is where that choice is ratified or replaced.**

#### Path G (chosen) — ship the perf win without claiming tenant scoping

No gateway change, so 7b is a `minion_hub` slice. The endpoints pin the read to the
caller's own org gateway (clause 3) and present the org JWT the gateway does validate
(clause 4), but the *contents* of the reliability feed remain gateway-wide until the
proposal's work lands, so the surface says so: each response marks its scope and the page
labels it. Because the data is gateway-wide, the default is to put the page behind an
explicitly platform/gateway-operator gate rather than `reliability:view`, a per-org role
permission any org's role matrix can grant (`src/lib/permissions.ts:85-90`, enforced by
the central RBAC guard that `(app)/reliability/+page.server.ts:3-4` describes as
"replacing the old admin-only super-view check"). **Narrowing an existing surface is a
product decision, not an implementation detail** — the human approval gate ratifies it, or
keeps `reliability:view` with the gateway-wide label and leaves the exposure open under the
proposal's ownership. Either way S7b must not *widen* it, which is what clauses 2–6 enforce.

#### Path T — per-org reliability data (owned by the proposal, not by this spec)

If the product decides tenants must see their own reliability data, the work is: a required
discriminated trusted scope (`tenant`, `multi-org`, or explicit `global`) at the unified
`emitEvent` boundary, with no scope-omitting overload; an exhaustive inventory of direct
`emitEvent` writers as well as wrapper callers; and a named trusted attribution source
**per producer class** from item 7 (connection identity where the event is
connection-scoped, the agent's/account's existing `orgIds` tag where it is agent- or
channel-scoped, and an explicit `global` class
for startup/cron/system events that no tenant owns, served only to a system-admin surface),
resolved before either process-global rate limiter. Tenant limiter keys include the
trusted org plus category/event; global/admin events use a distinct namespace, and a
multi-org limiter uses a sorted, deduplicated org-set key. Persistence retains all org
memberships (an `orgIds` representation or per-org fan-out with a stable logical-event id),
so A and B both see their shared resource, C does not, and admin aggregates count it once.
The local SQLite contract includes the fresh `CREATE TABLE` shape and an idempotent
pre-prepare upgrade (`PRAGMA table_info` plus guarded `ALTER TABLE`, or versioned equivalent).
Legacy unattributed rows remain legacy-global/admin-only unless ownership is independently
provable and never enter tenant aggregates; store/migration failure is health-visible, not
silently swallowed event loss. Apply equivalent
filtering across `reliability.*` and every
`events.list/get/summary/timeline` alias (cross-org `events.get` is indistinguishable from
not found); an org-scoped or admin-only `events.stream`; guards for both `reliability` and
`events.new`; and originating-org preservation through Turso sync, hub `unified_events`,
its dedupe/index contract, and the active-org Insights API. Until the durable path ships,
Insights is disabled or operator-gated on shared gateways. Tests run through at least one
*real direct* producer for JWT auth/connection, tool/agent activity and global activity,
plus wrapper producers — injecting tagged events into the store proves nothing about the
full writer boundary. Every cached tenant-scoped aggregate key includes the validated org
identity plus any gateway/server namespace required by process-wide and shared
Redis/Valkey caches; admin/global results use a distinct namespace. Same-gateway two-org
tests exercise every query alias, both live event names, and producer → sync → Insights
aggregate isolation. For every cached alias, org A primes identical parameters and org B
requests within the TTL without clearing or mocking the cache; B receives only B's
aggregate. A three-org test proves `[A, B]` is visible to both, invisible to C, and counted
once for admins. A pre-upgrade SQLite fixture is initialized twice, accepts new scoped
inserts afterward, and contributes no legacy row to tenant aggregates. In one gateway
instance, a real org-A producer and org-B producer also emit the
same event inside both limiter windows without clearing either map: both records survive
and reach only their audiences, while a same-org duplicate remains suppressed. Note the
fail-open default of
`orgScopeVisible`: an admin/shared-token connection sees everything, so 7b's server-side
calls must present the org JWT or they will read as admin regardless.

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
4. **Present the org claim the gateway validates.** Mint the hub JWT
   (`src/server/services/gateway-jwt.service.ts`, as `/api/gateway/jwt` does for the
   browser) and pass it as `opts.jwt`, so the connection carries a validated `orgId`
   instead of authenticating as a shared-token admin (`ws-jwt-auth.ts` Case 2). Verify
   acceptance against the **serving** gateway SHA, not against a fork or a README. This
   server-side caller does not consult the browser-only `PUBLIC_GATEWAY_JWT_AUTH` flag. The
   serving gateway must have a matching `oidcIssuers` entry: a presented JWT that no issuer
   accepts is rejected (`jwt_validation_failed`), never ignored in favor of Case 2 admin.
   JWT issuance or validation unavailability therefore returns 503 and must not retry
   without the JWT or with shared-token admin credentials. Record the serving issuer state
   in the PR.
5. **Fail closed, and distinguish the two failures.** 404 = this org has no gateway for
   this channel; 503 = the registry/lease lookup failed. Never substitute another gateway,
   and never degrade to an empty 200 that the page renders as "all healthy".
6. **No new surface, and no false scoping.** These endpoints are read-only, expose no
   gateway URL or token in their responses, and add no gateway RPC method the WS path did
   not already call. Each response marks its data gateway-wide (e.g. `scope: 'gateway'`)
   and the page says so, until the proposal's partitioning work makes it org-scoped.
7. **One bounded initial gateway session.** The server-side loader opens at most one
   authenticated transient gateway WebSocket for the complete initial reliability RPC
   set, reuses that session for every call, and closes it after the batch settles. Eight
   independent `gatewayCallAsUser` calls are not acceptable. The batch must not replace
   or disconnect the browser's persistent socket, and partial RPC failure must settle and
   close the transient session without leaking it.

DoD (7b): `/reliability` renders populated KPIs with WS blocked (devtools offline-WS test);
no duplicate fetch when WS connects (guard test); and these tests exist and pass —
(a) **mapping miss**: an authenticated caller whose active org has no gateway lease for the
channel gets 404 and *no* gateway call is made with system or env credentials;
(b) **registry outage**: the lease/per-user lookup throwing yields 503 with `retry-after`
and, again, no fallback credentials; (c) **gateway selection**: with org A and org B on
distinct gateways, an org-A session's endpoints resolve org A's gateway credentials and
never the system/env pair — this proves *selection*, which under path G is the only org
claim 7b makes about *which box*; (d) **audience**: a session lacking the ratified
capability gets the route guard's denial, and the test names the capability actually
shipped; (e) **claim authenticated**: against the pinned serving-gateway configuration,
the endpoints' hub JWT completes a real connect/auth handshake and the resulting connection
carries the expected validated `orgId`; missing/mismatched issuer configuration yields 503
and makes no JWT-less admin retry (schema acceptance alone is insufficient proof);
(f) the response carries the gateway-wide scope marker of clause 6; (g) a focused runtime
test loads the full initial reliability dataset at the lowest supported per-user
connection cap while a persistent browser socket is already connected, observes no more
than one transient authenticated gateway session and one associated health probe, keeps
the persistent socket connected, and proves the transient session closes after both
success and partial failure. The PR records observed connection and health-probe counts.

**Human gates (required, `security`):** a human approves S7's path choice and design before
any dev run, and a human merges the PR. Neither gate is satisfiable by green CI or by an
agent review verdict.

### Slice 8 — Close the remaining shell bytes to the 450 KB goal

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
  of reliability events, and filtering of every query alias, both broadcast names and the
  durable Turso/Insights path — owned by proposal
  `2026-08-29-gateway-reliability-feed-is-cross-tenant` and, for
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
   committed with it (S5's staged budget, then S8's ≤ 450 KB), and the `/en/...` graph is
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
