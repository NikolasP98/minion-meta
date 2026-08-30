---
id: 2026-08-29-gateway-reliability-feed-is-cross-tenant
title: "Reliability is the one gateway surface the org rail never reached — no attribution, no filtering, unguarded broadcast"
status: draft
created: 2026-08-29
updated: 2026-08-30
repos: [minion, minion_hub]
tags: [security, permissions]
effort: M
source: 2026-08-22-hub-load-nav-performance-spec pass-5 review (S7 H1/H2)
---

# Reliability data is not org-scoped, on a gateway where everything else is

## Problem

The gateway has a working multi-tenant identity rail: hub mints a JWT with `orgId` claims,
the gateway validates it against configured OIDC issuers, and org-tagged resources
(agents, channel accounts, plugin settings, shells, alerts) are filtered per connection.
Reliability events are the exception — they carry no org, the read handlers ignore the
caller's org, and the live broadcast has no guard. Hub's `/reliability` page shows them to
anyone whose org role grants `reliability:view`, so on a shared gateway every tenant sees
every tenant's reliability events, messages, session/agent identifiers and metadata.

Found while reviewing Slice 7 of `2026-08-22-hub-load-nav-performance-spec` (moving those
reads server-side for cold-load performance). That spec explicitly does **not** own the
fix — a perf slice cannot carry a cross-repo tenancy change — and is scoped to not widen
the exposure. This proposal owns it.

**Read the repo id carefully.** The gateway is `NikolasP98/minion-ai` (fleet registry:
`node scripts/repo-policy.mjs show minion` → `remote: NikolasP98/minion-ai`, development
branch `DEV`). `NikolasP98/minion` is a **fork whose last push was 2026-04-11** and does
not contain the multi-tenant work; three review rounds of the spec above, and its own
passes 4–5, drew wrong conclusions from it.

## AS-IS (evidenced)

Read at gateway `NikolasP98/minion-ai` `DEV` `293a1aad1bd5609e94247067332a6a41eae7f6be`
and hub `master` `1b47e8ced0751eeb301c9a24d16082f36fe48f78` — both heads on 2026-08-29.

**The rail that works:**

1. `ConnectParamsSchema` (`src/gateway/protocol/schema/frames.ts:64-71`) accepts an
   optional `jwt` and a trusted-proxy `userId`. `src/gateway/server/ws-jwt-auth.ts`
   `resolveJwtAuth` validates the JWT against the configured OIDC issuers
   (`src/gateway/auth/auth-jwt.ts` → JWKS) and derives `userId`, `role`, `orgId`,
   `assignedAgentIds`, `jti` from *validated claims*. Token/password without a JWT is
   Case 2: **admin**.
2. `src/gateway/org-scope.ts` `orgScopeVisible` gates org-tagged resources — deliberately
   fail-open: no client org (shared-token/admin connection) sees everything, and an
   untagged resource is visible to every org.
3. Hub mints and presents the JWT: `/api/gateway/jwt` + `src/server/services/gateway-jwt.service.ts`,
   gated by `PUBLIC_GATEWAY_JWT_AUTH` (`src/lib/services/gateway.svelte.ts:191-210`). Its
   own comments say `oidcIssuers` IS configured, and that falling back to shared-token auth
   means org scoping "fails open and other orgs' accounts leak in".

**The gap:**

4. **No org attribution on reliability events.** `emitReliabilityEvent`
   (`src/logging/reliability.ts:14-27,61-64`) rate-limits in one process-global map keyed
   only by event type and returns before forwarding to the unified event store (`emitEvent`).
   `emitEvent` has a second process-global limiter (`src/events/emitter.ts:34-58,120-129`)
   keyed only by `category:event`, and it too returns before storage. Neither limiter knows
   the producer's org, so org A can consume org B's slot before attribution, persistence,
   broadcast or durable sync. Neither `src/events/store.ts` nor `src/events/types.ts` has an
   org column — `grep -rn "orgId" src/events/` is empty — so surviving records cannot be
   filtered by tenant afterwards.
5. **Every query alias ignores the caller.** `src/gateway/server-methods/reliability.ts`
   answers `reliability.events` / `reliability.summary` from `getEventStore()` filtered by
   category, severity, event mode, time window and paging only. `client.orgId` is never
   read and `orgScopeVisible` is never applied. The same record is also exposed from the
   unified store by `events.list`, `events.get`, `events.summary`, `events.timeline` and
   `events.stream` (`src/gateway/server-methods/events.ts:18-123`). Those ordinary
   `operator.read` handlers are also tenant-blind; filtering only `reliability.*` would
   leave the record readable by list, id and aggregate through `events.*`.
6. **Both live event names have no guard.** `emitReliabilityEvent` also calls
   `broadcastFn("reliability", …)`; `src/gateway/server-core/server-broadcast.ts` filters
   only by `EVENT_SCOPE_GUARDS` / `EVENT_PREFIX_SCOPE_GUARDS` (`exec.approval.*`,
   `device.pair.*`, `node.pair.*`, `debug.step.*` — no `reliability` entry) and by
   `assignedAgentIds`, where events without an `agentId` pass through. Most reliability
   events have none. Hub appends the frame straight to the displayed feed and KPIs
   (`gateway.svelte.ts:852-855` → `pushReliabilityEvent`). In addition, `emitEvent`
   broadcasts the inserted record as `events.new`, and `events.stream` tells clients to
   subscribe to that name. The broadcaster allows unknown names, so guarding only the
   legacy `reliability` frame leaves the same record live on `events.new`.
7. **No single write seam to attribute at.** ~61 production `emitReliabilityEvent` call
   sites across ~30 files: startup (`server-startup.ts` ×5, `auth-profiles/startup-check.ts`
   ×4, `boot.ts` ×2), scheduled/system (`server-cron.ts` ×4, `refresh-scheduler.ts` ×3,
   `model-health-check.ts` ×3, `config-reload.ts` ×3, `server-plugins.ts` ×3),
   agent/session (`tool-loop-detection.ts` ×5, `pi-tools` ×3, `parallel-fanout.ts` ×2,
   `diagnostic.ts` ×3), and a handful inside a connected request
   (`server-methods/browser.ts` ×3, parts of `server.impl.ts` ×4). That wrapper inventory is
   not the complete producer boundary: `trackToolExecution`, `trackToolRepair` and
   `trackSkillExecution` (`src/logging/reliability.ts:107-134,152-169,175-201`) and JWT
   connect success/failure paths (`src/gateway/server/ws-jwt-auth.ts:68-76,94-102,122-130,
   143-151`) call unified `emitEvent` directly. Because `reliability.events` reads the
   unified store without a default category restriction, these records belong to both read
   surfaces. One "use the connecting client's org" rule does not fit most producers, and
   inventorying only wrapper callers leaves common tool/auth activity unattributed.
8. **The hub audience is per-org, not operator.** `reliability:view` is a platform view
   permission any org's role matrix can grant (`src/lib/permissions.ts:85-90`), enforced by
   the central RBAC guard that `(app)/reliability/+page.server.ts:3-4` describes as
   "replacing the old admin-only super-view check".
9. **The durable path discards originating-org identity.** `src/events/turso-sync.ts`
   resolves one `tenantId` from `servers` for the gateway process and writes every local
   record under that server-level tenant. Hub `unified_events` has no originating-org
   column, and `/api/reliability/insights` deliberately queries the gateway server's
   telemetry tenant rather than the viewer's active org. On a shared gateway, every
   linked tenant's Insights aggregates therefore fold in every org's records even after
   the in-memory store is partitioned.

**The one premise not verified here:** that two or more orgs are in fact served by one
gateway process in production. Hub's code assumes it ("the gateway is multi-tenant",
`channel-sync.service.ts:98-102`; "plugins are installed globally on the shared gateway",
`pg-plugin-org-schema.ts:3-12`), and `org-scope.ts` says the gateway "is installed once and
shared" — but confirming the deployed topology needs gateway access this proposal's author
did not have. If every org has a dedicated process, severity drops to "the audience is
wrong" (item 8) and the rest is hardening. Confirm first; it sets the urgency.

## TO-BE

A tenant sees reliability events and aggregates for their own organization and nothing
else across every query alias, both live event names, and the durable Insights path — or
the entire surface is honestly restricted to operators of the gateway. Invariants:
`orgId` still comes only from a validated JWT claim,
never a caller-asserted connect field (`minion-ai` PR #237 FAILed that shape CRITICAL);
events no tenant owns are never folded into a tenant response; and the page never degrades
to an empty 200 that reads as "all healthy".

## DELTA

1. Confirm the deployed topology (one shared gateway vs one per org) and record it. Decide
   with a human whether tenants need their own reliability data at all.
2. **If not:** narrow the hub surface to an explicit platform/gateway-operator gate, label
   the data gateway-wide in API and UI, and stop. No gateway change.
3. **If yes:** make the unified `emitEvent` boundary require a discriminated trusted scope:
   `{ kind: 'tenant', orgId }`, `{ kind: 'multi-org', orgIds }`, or
   `{ kind: 'global' }`; no overload or default may permit omitted attribution. Inventory
   **every direct `emitEvent` caller and every `emitReliabilityEvent` caller**, then give
   each producer class from AS-IS item 7 a *named trusted attribution source* — connection
   identity where the event is
   connection-scoped, the agent's or channel account's existing `orgIds` tag
   (`org-scope.ts`, `account-scope.ts`) where it is agent- or channel-scoped, and an
   explicit `global` class for startup/cron/system events served only to a system-admin
   surface. Resolve that trusted scope **before either process-global rate limiter**.
   Tenant-scoped limiter keys include org plus category/event; a multi-org limiter uses a
   canonical sorted, deduplicated org-set key; global/admin events use a separate explicit
   namespace. Persistence retains every ownership membership (an `orgIds` representation,
   or per-org fan-out carrying one stable logical-event id), so a resource owned by A and B
   is visible to both without double-counting admin aggregates and remains invisible to C.
   Never collapse plural `orgIds` ownership to one canonical org. Apply that scope
   consistently to `reliability.*` and to every alias in
   `events.list/get/summary/timeline`; a cross-org `events.get` returns the same not-found
   response as an unknown id, without an existence oracle. Scope `events.stream` to the
   validated org (or admin-gate it) and guard **both** `reliability` and `events.new`, so
   an attributed event reaches only matching connections and a global event reaches only
   admins. Mind `orgScopeVisible`'s fail-open default: an admin/shared-token connection
   sees everything, so the hub paths must present the org JWT.
   Partition every cached tenant-scoped aggregate by the validated org identity as well
   as any gateway/server namespace required by the process-wide and shared Redis/Valkey
   deployment. Admin/global results use a separate, explicit namespace; they must never
   share a key with an org-scoped result. This applies to every cached alias in
   `reliability.*` and `events.summary/timeline` (and to any newly cached alias).
4. The local SQLite transition includes both the new fresh-database `CREATE TABLE` shape
   and an idempotent upgrade that runs **before statements referencing the new field are
   prepared** (`PRAGMA table_info` plus guarded `ALTER TABLE`, or a versioned equivalent).
   Pre-existing unattributed rows are legacy-global/admin-only unless ownership is
   independently provable; never backfill them to a guessed tenant or include them in a
   tenant aggregate. Surface migration/store failures to health diagnostics rather than
   silently converting an incompatible installed schema into event loss.
5. Preserve the same authoritative attribution across the durable boundary: include the
   originating org in `turso-sync`, migrate hub `unified_events` plus its dedupe/index
   contract, and scope `/api/reliability/insights` by the authorized active org. Keep
   `global` records on an explicit admin-only query. Until that end-to-end path ships,
   disable or operator-gate Insights on a shared gateway rather than returning combined
   aggregates to tenants.
6. Tests driven through *real direct writers* (JWT connection/auth, tool/agent activity,
   and an explicit global event) plus wrapper producers, and same-gateway two-org isolation
   through **all** `reliability.*` and
   `events.*` query aliases, and subscriptions asserting that neither `reliability` nor
   `events.new` crosses orgs. Add an end-to-end producer → local store → Turso sync → hub
   Insights test proving org A cannot change org B's aggregate. Injecting tagged events
   directly into a store proves nothing about the producers or either sync boundary.
   For every cached query alias, add a warm-cache regression in the same gateway/cache
   instance: org A primes identical parameters, org B requests them within the TTL, and B
   receives only B's aggregate without clearing or mocking the cache between requests.
   Add a three-org shared-resource regression: `[orgA, orgB]` is visible to A and B,
   invisible to C, and counted once in admin aggregates. Add a real-producer rate-limit
   regression in one gateway instance: org A and org B emit
   the same event inside **both** limiter windows without clearing either map; both records
   are stored and delivered only to their authorized audiences. A same-org duplicate in
   the same windows is still suppressed, proving the intended throttle was preserved. Add
   an upgrade test that opens a pre-change SQLite database, initializes twice, then inserts
   and queries a newly scoped event; initialization is idempotent and no legacy row enters
   any tenant aggregate.
7. Coordinate with `2026-07-19-channel-scoping-fix-plan`: its parked P1 is the same identity
   surface, and its execution hold governs dispatch (coordinated gateway + hub work with
   deployment access, never a single-repository run).

## Out of scope

- Hub `/reliability` performance work (HTTP-first loading) — owned by
  `2026-08-22-hub-load-nav-performance-spec` S7, scoped to not widen this.
- Reliability data retention/storage policy and the dead `reliability-events` table.
- Unrelated unguarded broadcast payloads. `events.new` is explicitly in scope because it
  is a second live alias of the reliability record under review.

## Definition of done

The deployed topology is recorded; a human has chosen the operator-only or the tenant-scoped
path; and either (a) every hub entry point, including Insights, sits behind an operator gate
with the data labeled gateway-wide, or (b) DELTA 3–6 have shipped and deployed with
attribution preserved before both rate limiters and across local storage, every query/live
alias and durable sync. The same-gateway rate-limit, query, warm-cache-per-alias, dual-event
subscription and Insights isolation tests are green against
the gateway and hub SHAs that serve production. Both paths keep the `security` human gates
at approval and merge.
