---
id: 2026-10-15-agent-harness-restoration
title: Agent harness — restore the dead hub tool bridge, fix the JEV gate, then widen the agent surface
status: draft
created: 2026-10-15
updated: 2026-10-15
repos: [minion_hub, minion, minion-meta]
tags: [security, logic, data]
value: 9
effort: L
---

# Agent harness restoration

Audit: `audits/2026-10-15-agent-harness/00-synthesis.md` (A–E reports alongside).

## Owner ask (verbatim, 2026-10-15)

> "run a full diagnostic and audit of the agent harness. Make sure ALL available actions/tools
> for the entire site/api/mcp are available (mcp for external agents to connect to). Check for
> ANY gaps in the agent capabilities, make sure JEV properly classifies user requests, tools are
> properly fed to the agent and that the agent can do literally anything given the user has the
> needed RBAC for them."

## AS-IS (measured 2026-10-15)

- **Every gateway→hub tool call is a 403 in production.** `resolveGatewayPrincipal`
  (`minion_hub/src/server/auth/assistant-principal.ts:95-185`) requires
  `personal_agents.gateway_id` = the gateway behind the server token; 11/11 rows are NULL
  because `personal-agent-provisioner.ts:114` passes `serverId: ''`. Owner's agent hit it on
  2026-10-13 (`crm_insight` → 403). Introduced by the 2026-09-09 containment
  (`2026-09-09-assistant-query-delegation-restoration`), whose restoration half was never built.
- `crm_query` is a permanent 503 (`ASSISTANT_SQL_DISABLED`) but still advertised and ranked #1.
- Two CRM tools exist but are absent from `TOOL_ORDER` (`minion/src/agents/minion-tools.ts:79`).
- JEV gate (`minion_hub/src/lib/assistant/turn-router.ts:163-174`) ignores `decision.mode`; 2 of
  the 5 production turns were starved. `/home` routes `ui.choice` replies through the classifier.
- Agent write surface ≈ 20 of 368 human write pairs (5%); 11 of 22 RBAC modules unreachable;
  in-app forms fill-only (no submit).
- `/mcp` exists (gateway) but exports 0 hub tools; no headless per-user identity.
- SECURITY (report E): `gateway/google-adc` + `google-identities` hand any platform user's decrypted
  Google refresh token to any org's gateway token (no ownership check in the gateway branch,
  admin-client lookup by `user_id` only); `gateway/channel-identities` lists every channel
  identity mapping to any logged-in member (tenant-ctx-only gate, unfiltered query). The agent
  bridge checks capability only; the human path also checks module-enabled, owner scope and
  field masking (0 of 48 gateway endpoints call `isModuleEnabled`). `pos-sale` asks `pos:edit`
  where the till asks `pos:create`.
- SECURITY (report C): gateway treats any `tool-permissions` 404 as "legacy hub" and skips all gating
  (`minion/src/agents/tool-search/hub-capabilities.ts:44`); custom-tool scripts receive the raw
  server token (`custom-tools.ts:229`); `tool-save` lets an agent self-assign its tool permission.
- Usage: 5 routed turns / 30 d (PostHog), 18 tool calls (gateway) — no traffic to calibrate from.

## TO-BE

- A personal agent is provisioned WITH its org's production gateway assignment, and the 11
  existing rows are backfilled once by the owner (dry-run → apply, invariant: every active
  personal agent of an org with a `prd` gateway has `gateway_id` set; no row changes org).
  The resolver stays fail-closed as written.
- Every registered hub tool is instantiated (`TOOL_REGISTRY ⊆ TOOL_ORDER` is a test).
- A turn classified as mode M always receives M's manifest; button-reply turns never lose
  forms/pages; `changelog` ≥ 0.45; destructive/record turns always see the write-tool inventory.
- 404 on `tool-permissions` fails closed; custom tools run with a scoped per-run credential;
  `notify-user` is capability-gated; a published tool's permission is set by an admin, not the
  agent.
- A generic agent action path defers to `apiWriteCapability` so new hub writes are agent-
  reachable without a gateway deploy; forms gain `submit`.
- `/mcp` serves the `mcpExport` hub tools to a caller authenticated with a per-user JWT, list
  filtered by that identity; RBAC + audit stamp unchanged through the existing bridge.

## DELTA (slices; each is its own PR with tests)

| Slice | Repo | Change | Proof |
|---|---|---|---|
| S0a | hub | provisioner resolves the org's `prd` gateway and writes `gateway_id`; `createPersonalAgent` refuses `serverId: ''` | provisioner test: new row carries gateway_id; resolver test passes for a provisioned agent |
| S0b | hub (script) | `scripts/backfill-personal-agent-gateway.ts` dry-run default, `--apply`, run twice, asserts invariant | owner runs via `!`; before/after counts in PR body |
| S0c | gw | add `search_crm_conversations`, `crm_conversation_themes` to `TOOL_ORDER`; test `TOOL_REGISTRY ⊆ TOOL_ORDER` | vitest `src/agents/tool-search src/agents/tools/hub` |
| S0d | gw + hub | retire `crm_query` advertisement + envelope prose (or point at a typed endpoint when S4 lands) | envelope test; no `crm_query` in `tools/list` |
| S1 | hub | turn-router: mode ⇒ manifest; `/home` callbacks unrouted; `changelog` 0.45; data prose on `data‖forms`; prior-mode carry; commit the 46-probe live test | `turn-router.test.ts` + live probe file |
| S2a | hub | hotfix: `google-adc`/`google-identities` require the target user to be a member of the gateway's org (404 otherwise); `channel-identities` requires `serverId` or admin | negative tests; **human merge gate** |
| S2 | gw + hub | `isModuleEnabled` + owner scope + field masking inside `requireAssistantCapability`; `tools:view` on `query/custom-tools`; memories/ingest gated; `pos-sale` → `pos:create`; parity test `actions/* capability == apiWriteCapability(human path)`; 404 ⇒ fail closed; scoped credential for custom tools; `requireAssistantCapability('comms','create')` on `notify-user`; `tool-save` permission admin-only | unit tests + negative controls; **human gate at approval and merge** |
| S3 | hub + gw | `POST /api/gateway/actions/dispatch {route, method, body}` → `resolveAssistantPrincipal` → `apiWriteCapability` → internal fetch; gateway `hub_action` tool with a route manifest; `FormBinding.submit` | route-contract test; RBAC negative controls per module; **security review** |
| S4 | hub | typed dataset queries replacing raw SQL (SEC-06 item 1) | persona negative controls |
| S5 | gw + hub | headless per-user JWT (`/api/gateway/jwt` token-auth path or OIDC), `seedAgentToolsFromRegistry`, `tools.invoke`, identity-filtered `tools/list` | `mcp-server.e2e.test.ts` extension |
| S6 | gw | JIT ranks on user text; per-key index; then `tools.selection.mode: on` | tool-search tests |

**Out of scope:** rewriting the in-app prompt-driven `minion-ui` protocol as native client
tools (proposal `2026-09-02-gateway-client-tools-webmcp-bridge` stays draft); a hub-side MCP
server; the four orphan bridge endpoints without gateway tools (product decision).

## Shipped from this audit (2026-10-15)

- S0c — gateway **#329 MERGED** `39be924dc` (DEV): `search_crm_conversations` + `crm_conversation_themes` in `TOOL_ORDER`, test `TOOL_REGISTRY ⊆ TOOL_ORDER`.
- S1 (D1 D2 D4 D6) — hub **#540 MERGED** `7d917ed06`: winning mode loads its manifest; `/home` button replies keep the full envelope; `changelog` 0.45; write-tool inventory on `data‖forms`.
- S2a — hub **#541 OPEN**, label `security`, human merge gate: `google-adc`/`google-identities` require org membership (non-member → 404 / empty), `channel-identities` requires server token or admin. Note: `channel-identities` is not in the server-token path allowlist, so the gate is admin-only in practice; `TODO(handoff)` left for the unscoped list.

## S0 design constraint (measured 2026-10-15, blocks S0a/S0b)

`personal_agents.gateway_id` is ONE column, but 3 of the 11 users are members of several orgs
with different `prd` gateways (the owner: 4 orgs, 3 gateways). `resolveGatewayPrincipal`
requires the row's gateway to equal the calling gateway, so a user's agent is reachable from
exactly one gateway. Every personal agent actually runs on the FACES gateway container today,
so the only rule that restores service without widening trust is "the gateway the agent was
provisioned on" — `netcup-faces-prd` (`a64274a8…`) for all 10 active rows; the 1 pending row
(`bri…`) has no org membership and stays unassigned. Multi-org users then need either
per-(user, org) assignment rows or a resolver that accepts any `prd` gateway of an org the
user is a member of. That is an owner decision (question 1 below), not an implementation detail.

## Open questions for the owner

1. Which gateway should an org's personal agents bind to when the org has both `dev` and `prd`
   rows (`c9e8dc46…` has `netcup-prd` + `protopi-dev`)? Proposed: `channel = 'prd'`.
2. S3 is a new generic write path; SEC-06 requires human gates at approval and merge. Approve
   the design before any code.
3. S5 identity: short-lived JWT minted from a hub session (owner-visible token page) vs OIDC
   issuer. Proposed: hub-minted JWT, 1 h, org-scoped, revocable.
