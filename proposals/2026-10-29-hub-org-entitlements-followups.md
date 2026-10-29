---
id: 2026-10-29-hub-org-entitlements-followups
title: Org entitlements — open ends deferred from spec 043
status: draft
created: 2026-10-29
updated: 2026-10-29
repos: [minion_hub, minion, minion-meta]
spawned_spec: 2026-10-29-hub-org-entitlements-spec
tags: [security, data, permissions]
effort: L
source: specs/043-hub-org-entitlements
---

# Org entitlements: open ends

Spec 043 (`specs/043-hub-org-entitlements/`, design.md §Risks & Mitigations) gates AI per org with a plan. These items were accepted or deferred on purpose. Items with a code site get a matching `TODO(handoff)` when the slice that touches the file lands (design.md S2–S4, tasks.md). Risk numbers (Rn) refer to the design's table.

**AS-IS → TO-BE → DELTA** is stated per item. AS-IS anchors are hub `origin/master` 812a4b0a and gateway `origin/DEV` 191d9a69d8a, as verified in the design review; they describe the state after spec 043 ships.

## Deferred, needs work

1. **R1 — Gateway background AI is not gated.** AS-IS: cron agent runs (`server-core/server-cron.ts`, `platform/cron/isolated-agent/run.ts`), heartbeats (`infra/heartbeat-runner.ts:1088`, `web/auto-reply/heartbeat-runner.ts:162`), webhook agent runs (`gateway/server/hooks.ts`), gateway Pulse generation and the alert-watcher plugin run for any org; crons and agents created while Premium keep running after a downgrade, and a Base admin can write heartbeat or cron config through `config.*`. TO-BE: these paths skip agents whose org lacks `ai`. DELTA: needs spec 042 S1 (agent → org binding via `personal_agents.gateway_id`), then an org check before each run. Pointer: `TODO(handoff)` in `server-cron.ts`, `heartbeat-runner.ts` (both), `hooks.ts`. Severity High.
2. **R2 — Channel types outside the mirror are never gated.** AS-IS: only `whatsapp`, `telegram`, `discord` are hydrated (`HYDRATABLE_TYPES`, `channel-hydrate.ts:29`; `channel-publish.service.ts:103`); Slack, Signal, iMessage, LINE, WATI, meta-graph and extension channels always run the agent. TO-BE: every channel account carries `aiEnabled`. DELTA: extend hydration (or a separate per-account entitlement map) to every type. Pointer: `TODO(handoff)` in `channel-hydrate.ts`. Severity High.
3. **R3 — `gateway.hubMetrics` unset leaves the mirror empty.** AS-IS: with no `hubMetrics`, no channel reply is gated. TO-BE: a gateway without it either refuses to start in multi-tenant mode or reports the gap. DELTA: today it is a launch precondition (design Q4) checked by hand; add a startup warning or health-check field. Severity High.
4. **R4 — Dashboard sockets keep stale `features`.** AS-IS: the hub fetches a fresh JWT only on WebSocket handshake; nothing calls `auth.refresh`; the gateway checks `exp` only at handshake. TO-BE: a plan change reaches open dashboards within a bounded time. DELTA: a periodic `auth.refresh` from `gateway.svelte.ts` (or a gateway-side expiry sweep). Severity Medium.
5. **R6 — Any member of any org can read the shared gateway token.** AS-IS: `POST /api/servers/[id]/token` hands an org-less `operator.admin` token to every Premium-org browser (pre-existing). TO-BE: no browser holds the shared token. DELTA: needs item 6 first; then the endpoint refuses all browsers. Pointer: `TODO(handoff)` in `src/routes/api/servers/[id]/token/+server.ts`. Severity High (pre-existing).
6. **R8 — Gateway plugin UIs need the shared token.** AS-IS: `PluginControlCenter.svelte` (`/plugins/[id]`, `/channels/[id]`), `/settings/plugins` and `PluginSlotHost` iframe entries on `/account/connections` call `fetchHostToken`; spec 043 hides them for orgs without `ai`, so plugin-only settings are out of reach for Base orgs. TO-BE: plugin UIs authenticate with the hub JWT. DELTA: a JWT path for plugin UIs, then drop the `ai` key from the `/plugins` and `/settings/plugins` manifest entries. Pointer: `TODO(handoff)` in `src/lib/state/features/hosts.svelte.ts` and `src/lib/modules/availability.ts`. Severity Medium. **Update 2026-10-29 (spec 045):** the plugin iframe never used the token, because every plugin RPC goes through the hub's `forwardRpc`. Spec 045 A3 stops fetching it for plugin pages. Once A3 ships, drop the `ai` key from these entries.
7. **Refresh-only channel signal.** AS-IS: a plan change reaches channel replies only at the next 5-minute mirror tick, because `signalChannelChange` restarts channel runtimes (`events-http.ts:75` → `channel-mirror-compare.ts:139-144` → `channel-mirror.ts:74-85`). TO-BE: `setOrgPlan` can push a refresh that updates `aiEnabled` without a restart. DELTA: a new event type that re-hydrates the mirror without calling `applyChannelRestart`. Severity Low.
8. **R20 — AI plugin flow actions are a named list.** AS-IS: `AI_PLUGIN_ACTION_METHODS` (`alertWatcher.classify`, `alertWatcher.suggest`) lives in `langgraph-server/src/flow/compile-flow.ts` and the hub palette; a new AI action is missed until added. TO-BE: plugin manifests declare `ai: true` on flow nodes. DELTA: add the manifest field, read it in runner and palette, delete the list. Do this when a third AI action appears. Pointer: `TODO(handoff)` in `compile-flow.ts`. Severity Low.
9. **R10 — Channel setup needs `operator.admin` on JWT sessions.** AS-IS: `config.*` writes, `channels.whatsapp.pair`, `channels.*.validateToken` need admin scope, so non-admin members of any org cannot configure channels when `PUBLIC_GATEWAY_JWT_AUTH` is on (pre-existing). TO-BE: an org owner/admin can configure their own org's channels. DELTA: map org RBAC (`settings:manage` or a channel capability) to a scoped gateway permission. Severity Medium (pre-existing).
10. **R13 — Flows with a null `tenant_id` run AI nodes.** AS-IS: `/api/internal/flows/[id]` returns `aiEnabled: true` and logs. TO-BE: every flow has an org. DELTA: backfill `flows.tenant_id`, then make it NOT NULL. Pointer: `TODO(handoff)` in `src/routes/api/internal/flows/[id]/+server.ts`. Severity Low.
11. **R14 — The Gmail auto-labeler is AI and not gated.** AS-IS: `minion/src/hooks/gmail-auto-label.ts` writes AI summaries and labels into email-ledger rows for operator-configured mailboxes. TO-BE: it skips mailboxes of orgs without `ai`. DELTA: needs the mailbox → org mapping. Pointer: `TODO(handoff)` in `gmail-auto-label.ts`. Severity Low.
12. **R19 — Dormant gateway tier system.** AS-IS: `capability_tiers`, `middleware/quota.ts` and the free-tier `planTier` JWT claim remain unused by hub orgs (decision F). TO-BE: removed, or reused deliberately. DELTA: confirm no live caller of the free-tier path, then delete. Pointer: `TODO(handoff)` in `minion/src/gateway/capability-api.ts`. Severity Low.
13. **Per-method gateway tiers.** AS-IS: the gateway checks only the `ai` group. TO-BE: a Premium-lite plan can allow chat but not flows (or similar). DELTA: when a second paid plan exists, map feature keys to method groups in the allowlist.
14. **DB-editable plan overrides.** AS-IS: the plan → feature table is `PLAN_DEFAULTS` in code; changes need a PR and a deploy. TO-BE: an admin can grant or remove a feature for one org without a deploy. DELTA: an additive `plan_features`/override table plus an editor on `/orgs/plans`, in the PR that first needs it (design §Alternatives, decision B).
15. **Per-plan spend caps.** AS-IS: `ai_usage` meters spend per org; no ceiling exists. TO-BE: a plan can cap monthly AI spend. DELTA: a cap per plan and a check at the chokepoint.
16. **Site pricing copy.** AS-IS: the site's Personal plan promises "one agent", which conflicts with Base having no AI. TO-BE: site copy matches the plans. DELTA: owner decision, then a `minion_site` copy change.

## Accepted, no action planned unless it bites

17. **R5 — Two fail-open exceptions on lookup error.** The JWT issuer omits claims (that dashboard session is not enforced on the gateway); the token endpoint, with no cached answer, returns the shared token. Both log `lookup_error`. A third, by owner decision (S2 audit): the gateway channel mirror (`/api/internal/channels/resolved`) answers a lookup error with the instance's last answer for the org, else `aiEnabled: true` (`orgAllowsForConfig`), so an outage never stops a paying org's replies. The flows runner config fetch (`/api/internal/flows/[id]`) follows the same rule. Revisit if `lookup_error` shows up in production logs.
18. **R11 — Skipped one-off AI jobs are not redone after an upgrade.** Tick-driven re-scans catch up; a specific skipped `brain_ingest` or corpus job must be re-run by the user.
19. **R12 — Model calls with no request and no org are not enforced** (scripts, platform jobs). The CI inventory test forces each call site to declare its gate.
20. **R15 — `CACHE_BACKEND=memory` delays plan changes** on other Vercel instances by up to 5 minutes. Production uses `noop`.
21. **R17 — A plan listing a child key without its parent grants nothing.** Pinned by an evaluator test.
22. **R18 — A partial non-empty mirror hydrate replaces the mirror.** Existing behavior.
23. **R21 — Existing personal agents of a downgraded org stay provisioned.** Their chat and channel paths are gated.
24. **R22 — Agent-memories ingest and recall check the gateway's owning org,** not the agent's org, because those routes authenticate with the gateway server token. Agent runs for Base orgs are already gated upstream.
25. **Runner default `aiEnabled = true` when absent.** Safe only while `langgraph-server` binds `127.0.0.1` and is reached only by the co-located gateway. Revisit if the runner is ever exposed.

## Out of scope

Billing, checkout and automatic plan changes; a rule editor in the admin page.

## Definition of done

Each numbered item in "Deferred, needs work" is either shipped through its own spec (and its `TODO(handoff)` removed) or moved to "Accepted" with an owner note.
