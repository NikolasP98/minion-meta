---
id: 2026-08-29-gateway-reliability-feed-is-cross-tenant
title: "Reliability is the one gateway surface the org rail never reached — no attribution, no filtering, unguarded broadcast"
status: draft
created: 2026-08-29
updated: 2026-08-29
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
   (`src/logging/reliability.ts`) rate-limits per event type and forwards to the unified
   event store (`emitEvent`). Neither `src/events/store.ts` nor `src/events/types.ts` has an
   org column — `grep -rn "orgId" src/events/` is empty — so nothing recorded can be
   filtered by tenant afterwards.
5. **The read handlers ignore the caller.** `src/gateway/server-methods/reliability.ts`
   answers `reliability.events` / `reliability.summary` from `getEventStore()` filtered by
   category, severity, event mode, time window and paging only. `client.orgId` is never
   read and `orgScopeVisible` is never applied.
6. **The live broadcast has no guard.** `emitReliabilityEvent` also calls
   `broadcastFn("reliability", …)`; `src/gateway/server-core/server-broadcast.ts` filters
   only by `EVENT_SCOPE_GUARDS` / `EVENT_PREFIX_SCOPE_GUARDS` (`exec.approval.*`,
   `device.pair.*`, `node.pair.*`, `debug.step.*` — no `reliability` entry) and by
   `assignedAgentIds`, where events without an `agentId` pass through. Most reliability
   events have none. Hub appends the frame straight to the displayed feed and KPIs
   (`gateway.svelte.ts:852-855` → `pushReliabilityEvent`).
7. **No single write seam to attribute at.** ~61 production `emitReliabilityEvent` call
   sites across ~30 files: startup (`server-startup.ts` ×5, `auth-profiles/startup-check.ts`
   ×4, `boot.ts` ×2), scheduled/system (`server-cron.ts` ×4, `refresh-scheduler.ts` ×3,
   `model-health-check.ts` ×3, `config-reload.ts` ×3, `server-plugins.ts` ×3),
   agent/session (`tool-loop-detection.ts` ×5, `pi-tools` ×3, `parallel-fanout.ts` ×2,
   `diagnostic.ts` ×3), and a handful inside a connected request
   (`server-methods/browser.ts` ×3, parts of `server.impl.ts` ×4). One "use the connecting
   client's org" rule does not fit most of them.
8. **The hub audience is per-org, not operator.** `reliability:view` is a platform view
   permission any org's role matrix can grant (`src/lib/permissions.ts:85-90`), enforced by
   the central RBAC guard that `(app)/reliability/+page.server.ts:3-4` describes as
   "replacing the old admin-only super-view check".

**The one premise not verified here:** that two or more orgs are in fact served by one
gateway process in production. Hub's code assumes it ("the gateway is multi-tenant",
`channel-sync.service.ts:98-102`; "plugins are installed globally on the shared gateway",
`pg-plugin-org-schema.ts:3-12`), and `org-scope.ts` says the gateway "is installed once and
shared" — but confirming the deployed topology needs gateway access this proposal's author
did not have. If every org has a dedicated process, severity drops to "the audience is
wrong" (item 8) and the rest is hardening. Confirm first; it sets the urgency.

## TO-BE

A tenant sees reliability events and aggregates for their own organization and nothing
else, on both the query and the live path — or the surface is honestly restricted to
operators of the gateway. Invariants: `orgId` still comes only from a validated JWT claim,
never a caller-asserted connect field (`minion-ai` PR #237 FAILed that shape CRITICAL);
events no tenant owns are never folded into a tenant response; and the page never degrades
to an empty 200 that reads as "all healthy".

## DELTA

1. Confirm the deployed topology (one shared gateway vs one per org) and record it. Decide
   with a human whether tenants need their own reliability data at all.
2. **If not:** narrow the hub surface to an explicit platform/gateway-operator gate, label
   the data gateway-wide in API and UI, and stop. No gateway change.
3. **If yes:** add an org column to the event store; give each producer class from AS-IS
   item 7 a *named trusted attribution source* — connection identity where the event is
   connection-scoped, the agent's or channel account's existing `orgIds` tag
   (`org-scope.ts`, `account-scope.ts`) where it is agent- or channel-scoped, and an
   explicit `global` class for startup/cron/system events served only to a system-admin
   surface; filter `server-methods/reliability.ts` by `client.orgId`; and add a
   `reliability` entry to the broadcast guards so an attributed event reaches only matching
   connections. Mind `orgScopeVisible`'s fail-open default: an admin/shared-token
   connection sees everything, so the hub paths must present the org JWT.
4. Tests driven through *real* producers (at least one connection-scoped, one agent/session,
   one global), plus a same-gateway two-org **query** isolation test and a same-gateway
   two-org **subscription** test where org A never receives org B's frame. Injecting tagged
   events into the store proves nothing about the 61 call sites.
5. Coordinate with `2026-07-19-channel-scoping-fix-plan`: its parked P1 is the same identity
   surface, and its execution hold governs dispatch (coordinated gateway + hub work with
   deployment access, never a single-repository run).

## Out of scope

- Hub `/reliability` performance work (HTTP-first loading) — owned by
  `2026-08-22-hub-load-nav-performance-spec` S7, scoped to not widen this.
- Reliability data retention/storage policy and the dead `reliability-events` table.
- Every other unguarded broadcast event; they deserve the same audit, but this proposal is
  about the one with a verified tenant-facing consumer.

## Definition of done

The deployed topology is recorded; a human has chosen the operator-only or the tenant-scoped
path; and either (a) the hub surface sits behind an operator gate with the data labeled
gateway-wide, or (b) DELTA 3–4 have shipped and deployed with their attribution,
query-isolation and subscription tests green in the gateway's own suite against the SHA that
serves hub traffic. Both paths keep the `security` human gates at approval and merge.
