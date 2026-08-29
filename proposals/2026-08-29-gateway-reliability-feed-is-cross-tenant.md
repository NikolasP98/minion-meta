---
id: 2026-08-29-gateway-reliability-feed-is-cross-tenant
title: "Gateway reliability data is org-blind on every path — buffer, live broadcast and hub metrics push"
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion, minion_hub]
tags: [security, permissions]
effort: L
source: 2026-08-22-hub-load-nav-performance-spec pass-5 review (S7 H1/H2)
---

# Gateway reliability data is org-blind on every path

## Problem

Hub's `/reliability` page shows gateway reliability events and aggregates to anyone whose
org role grants `reliability:view`. The gateway that produces those events has no concept
of an organization at all, so what the page shows is every event on that gateway — from
every tenant sharing it. Nothing about this is new or introduced by a pending change; it
is how the surface works today.

This was found while reviewing Slice 7 of `2026-08-22-hub-load-nav-performance-spec`
(moving those reads server-side for cold-load performance). That spec now explicitly does
**not** own the fix: a performance slice cannot carry a multi-repo tenancy program, and
three review rounds trying produced a contract that could not execute. This proposal owns
it. The identity half is coupled to `2026-07-19-channel-scoping-fix-plan`, parked with an
execution hold that says exactly this work may only resume as coordinated `minion` +
`minion_hub` work with deployment access — never as a single-repository run.

## AS-IS (evidenced)

Read at gateway `minion` `DEV` `bd55137100aceaf193ab99a827302d3f865b50e7` and hub `master`
`1b47e8ced0751eeb301c9a24d16082f36fe48f78` — both branch heads on 2026-08-29.

1. **No org identity exists in the gateway.** `orgId`, `organizationId`, `accountOrgs` and
   `orgDisabled` appear nowhere under `src/` or `extensions/` except
   `src/infra/provider-usage.fetch.claude.ts` (an Anthropic billing org, unrelated).
   `ConnectParamsSchema` (`src/gateway/protocol/schema/frames.ts:20-68`) carries no `jwt`
   and no `orgId` and is `additionalProperties: false`; `message-handler.ts:209-218`
   validates it and rejects a connect frame carrying either, *before* authentication. Hub
   writes `channels.accountOrgs` and `plugins.orgDisabled` into the gateway's config blob
   (`channel-sync.service.ts:98-102`, `pg-plugin-org-schema.ts:3-12`) and no gateway code
   reads them. The JWT contract was evidently designed at some point and never landed on
   the gateway: `@minion-stack/shared`'s `buildConnectParams`
   (`packages/shared/src/gateway/connect-params.ts:52-68`, on `dev` before this proposal)
   still emits top-level `jwt` / `userId` fields, and hub's `gateway-rpc.ts` comments refer
   to a `ws-jwt-auth.ts` that does not exist in the gateway repo. Any caller that actually
   passes a `jwt` today gets its connect frame rejected before authentication.
2. **The buffer is process-global.** `ReliabilityRingBuffer`
   (`src/logging/reliability-buffer.ts:5-69`) is one 1,000-entry ring filtered only by
   category/since/limit, and `src/gateway/server-methods/reliability.ts:4-25` answers
   `reliability.events` / `reliability.summary` from it without reading any client
   identity.
3. **The live broadcast is unguarded.** `src/logging/reliability.ts:33-43` calls
   `broadcastFn("reliability", event, { dropIfSlow: true })`;
   `src/gateway/server-core/server-broadcast.ts:9-17,41-55,93-117` scope-guards only
   `exec.approval.*`, `device.pair.*` and `node.pair.*`, so `hasEventScope` returns `true`
   for `reliability` and the frame is sent to every connected client. Hub consumes it
   directly (`src/lib/services/gateway.svelte.ts:852-855` → `pushReliabilityEvent`) and
   appends it to the displayed feed and KPIs.
4. **A third egress.** The same emit forwards each event to
   `getHubMetricsPushClient().pushEvent(event)` (`src/gateway/hub-metrics-push.ts:104-109`),
   which buffers up to 10,000 events and flushes them to the hub.
5. **Most events have no org to attribute to even if identity existed.** All 19 production
   `emitReliabilityEvent` call sites at that SHA: `gateway/server-methods/browser.ts`
   ×3 (the only connection-scoped ones — the request's `client` is in scope),
   `gateway/server-core/server-cron.ts` ×4 (`sessionKey` = `cron:<jobId>`),
   `logging/diagnostic.ts` ×3 (channel / sessionKey / chatId),
   `agents/auth-profiles/startup-check.ts` ×4, `…/refresh-scheduler.ts` ×3 and
   `…/oauth.ts` ×2 (process- or profile-scoped; no request at all).
6. **The hub audience is per-org, not operator.** `reliability:view` is a platform view
   permission any org's role matrix can grant (`src/lib/permissions.ts:85-90`), enforced by
   the central RBAC guard that `(app)/reliability/+page.server.ts:3-4` describes as
   "replacing the old admin-only super-view check".

**The one premise not verified here:** that two or more orgs are in fact served by one
gateway process in production. Hub's own code assumes it ("the gateway is multi-tenant",
`channel-sync.service.ts:98-102`; "plugins are installed globally on the shared gateway",
`pg-plugin-org-schema.ts:3-12`), but confirming the deployed topology needs gateway access
this proposal's author did not have. If every org has a dedicated gateway process, the
severity drops to "the audience is wrong" (item 6) and items 1–5 become hardening. Confirm
this first — it decides how much of the work below is urgent.

## TO-BE

A tenant sees reliability data for their own organization and nothing else, on every path
that carries it — buffered query, live broadcast, and the hub metrics push — or the
surface is honestly restricted to operators of the gateway. Invariants: no caller-asserted
identity is ever trusted (PR #237 on `minion-ai` FAILed that shape CRITICAL); events with
no tenant owner are never silently folded into a tenant response; and the page never
degrades to an empty 200 that reads as "all healthy".

## DELTA

1. Confirm the deployed topology (one shared gateway vs one per org) and record it. Decide
   with a human whether the product needs per-org reliability data at all.
2. **If not:** narrow the hub surface to an explicit platform/gateway-operator gate,
   label the data gateway-wide in the API and the UI, and stop there. This alone closes the
   tenant-facing exposure and needs no gateway change.
3. **If yes:** the gateway program, whose clauses only work together —
   a validated identity credential on the connect handshake (a new explicit field, never a
   relaxation of `additionalProperties`, with real issuer/signature verification);
   `client.orgId` set only from that validated claim; write-time attribution with a named
   trusted source *per producer class* from AS-IS item 5, and an explicit `global` class
   for what no tenant owns; filtering of the ring buffer/query handlers, of the live
   broadcast, and of the hub metrics push; and tests driven through at least one real
   producer per class — a same-gateway two-org query-isolation test *and* a same-gateway
   two-org subscription test where org A never receives org B's broadcast frame. Injecting
   tagged events straight into the buffer proves nothing about the 19 real producers.
4. Coordinate with `2026-07-19-channel-scoping-fix-plan`: its parked P1 is the same
   identity problem, and its execution hold governs how this may be dispatched.

## Out of scope

- Hub `/reliability` performance work (HTTP-first loading) — owned by
  `2026-08-22-hub-load-nav-performance-spec` S7, which is scoped to not widen this.
- Reliability data retention/storage (the dead `reliability-events` table stays dead).
- Every other gateway broadcast event; they deserve the same audit, but this proposal is
  about the one with a verified tenant-facing consumer.

## Definition of done

The deployed topology is recorded; a human has chosen the operator-only or the tenant-scoped
path; and either (a) the hub surface is behind an operator gate with the data labeled
gateway-wide, or (b) the gateway program in DELTA 3 has shipped and deployed with its
handshake, query-isolation and subscription tests green in `minion`'s own suite against the
SHA that serves hub traffic. Both paths keep the `security` human gates at approval and
merge.
