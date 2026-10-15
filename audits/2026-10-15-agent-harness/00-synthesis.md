# Agent harness audit — synthesis (2026-10-15)

Owner ask (verbatim): "run a full diagnostic and audit of the agent harness. Make sure ALL
available actions/tools for the entire site/api/mcp are available (mcp for external agents to
connect to). Check for ANY gaps in the agent capabilities, make sure JEV properly classifies user
requests, tools are properly fed to the agent and that the agent can do literally anything given
the user has the needed RBAC for them."

Scope audited: hub `origin/master` `4fe89934`, gateway `origin/DEV` `f2de5e00534`, production
Supabase, production gateway transcripts (FACES + default containers, 30 days), PostHog
`assistant_route`, Vercel runtime logs. Five parallel read-only audits (A–E) plus a live
diagnostic. Nothing was changed.

## Verdict

**The requirement is not met, and the largest failure is live, not architectural.** The
agent's hub tools have been dead in production since the 2026-09-09 security containment:
every gateway-originated call into the hub is refused with a 403 because no personal agent
carries the gateway assignment the resolver demands. On top of that, the agent reaches ~5% of
the product's write surface by design, the JEV gate discards the classification it just paid
for, two implemented tools are never instantiated, and the MCP server exposes zero business
capabilities to external agents.

## 0. Live production findings (verified, not inferred)

| # | Finding | Evidence |
|---|---|---|
| L1 | **Every gateway→hub tool call returns 403 `ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED`.** `resolveGatewayPrincipal` requires `personal_agents.gateway_id` to equal the gateway resolved from the server token. **11 of 11** `personal_agents` rows have `gateway_id NULL` (10 active, 1 pending). The provisioner passes `serverId: ''`, so it never writes one. | hub `src/server/auth/assistant-principal.ts:95-185`; `personal-agent-provisioner.ts:114`; `personal-agent.service.ts:110`; Supabase query 2026-10-15 |
| L2 | The owner's own agent hit L1 on 2026-10-13 16:17Z: `crm_insight` → `{"error":"insight fetch failed: 403"}`; the model then "tried searching for tools" and gave up. | FACES gateway transcript `personal-nk7u…/sessions/d6e8cbf6….jsonl` |
| L3 | `crm_query` (the only general data tool) is a **permanent 503** (`ASSISTANT_SQL_DISABLED`) yet is still advertised with a 2 KB schema, recommended by the envelope, and ranked #1 by `search_tools`. 3 of 3 calls in 30 days failed. | hub `api/gateway/query/+server.ts:10`; transcripts |
| L4 | `search_tools "delete stock item product inventory"` returned only `crm_query`: no delete/void/close tools exist. | transcripts |
| L5 | **Usage is near zero**, which is why L1 went unnoticed for five weeks: PostHog `assistant_route` = 5 turns / 30 d / 1 org; gateway = 8 personal-agent sessions, 14 user turns, 18 tool calls (4 hub-bridge failures). | PostHog SQL; transcript scan |
| L6 | The hub cache layer logs `CONNECT_TIMEOUT aws-1-us-east-2.pooler.supabase.com:6543` on the same minute as L2 — the pooler was flapping; unrelated to L1 but worth knowing. | Vercel runtime logs 2026-10-13 16:12Z |

Why L1 exists: proposal `2026-09-09-assistant-query-delegation-restoration.md` made the
resolver fail closed on purpose and said "Do not backfill or relax missing assignments
automatically". The restoration half (provisioner persists the assignment; a lifecycle for
it) was never built. The resolver is correct; the provisioner is the defect.

## 1. Coverage: what the agent can and cannot do (report A)

| Measure | Count |
|---|---|
| Hub human write surface (route, method) pairs | **368** |
| …with any agent path | **≈20** (19 `actions/*` + `brain-remember`) |
| Gaps | **≈348 (95%)** |
| RBAC cells (22 modules × 6 actions) with any agent tool | ≈25 of 132 (19%) |
| Modules with zero agent path | **11 of 22**: memberships, ads, pulse, agents, channels, flows, marketplace, reliability, workspace, settings, users |
| In-app forms the agent can fill / submit | 8 / **0** |

Top gaps by value: POS shift open/close (the existing `pos_sale` tool hard-fails "no open
shift" with no recovery) · void/refund/tender-correct · **create a customer** (can update,
cannot create) · POS appointments (booking tools gate on `scheduling`, not `pos`) · any
finance write · stock entry submit/cancel · catalog item/price creation · HR leave ·
memberships/plans · team & access admin.

Structural cause: every agent action is a hand-written hub endpoint + gateway tool + meta
+ codegen, in two repos, behind a deploy; `module_action` is a 17-string allowlist, not a
dispatcher. The authorization half of "anything" already exists (`apiWriteCapability`
maps any `/api/<module>/...` write to its capability); the routing half does not.

Surplus to treat as risk: `actions/tool-save` lets an agent create a custom tool, choose
its own declared permission, and publish it in one call; the gateway runs the stored
script via `spawn` with no sandbox and (report C, S2) hands it the raw gateway↔hub server
token.

## 2. JEV turn router (report B)

Classification is good: mode correct on 44/46 live probes; Spanish and typos fine; fail-open
airtight; p50 ≈ 225 ms; 46 unit tests pass. **The gate throws the classification away.**

| # | Defect | Fix size |
|---|---|---|
| B-D2 | `turn-router.ts:163-174` never reads `decision.mode`; a `navigate` turn with `pages` 0.29 gets core only. 4/46 probes and **2 of the 5 real production turns** were starved this way. | 3 lines: the winning mode always earns its manifest |
| B-D1 | `/home/+page.svelte:1039,1142` routes `ui.choice` ("Do it for me") through the classifier → `brain` only, no forms, no pages. The floating assistant bypasses correctly; `/home` does not. | small |
| B-D4 | `changelog` threshold 0.6; the canonical turn scored 0.61 today (0.94 on 10-12). | set 0.45 |
| B-D3 | `brain` noul is not a usable signal (loaded 24/46, needed ~4); wording must change. | reword + re-probe |
| B-D6 | Gateway-only writes (ticket comment, void, shift close) have no manifest; destructive turns get `data` only. | gate data prose on `data‖forms` |
| B-D7 | No history in classifier state: "sí", "viernes 3pm", "12" mid-form → core only. | carry prior mode |
| B-D5, D8, D9, D10 | weak-match pages marker · no rate limit on `/api/assistant/route` · nested 1500 ms budgets · calibration has no traffic (commit the 46-case probe as the instrument) | small |

## 3. Tool feeding (report C)

| # | Defect | Fix size |
|---|---|---|
| C-D1 | `search_crm_conversations` and `crm_conversation_themes` are implemented, tested, permissioned — and **missing from `TOOL_ORDER`** (`minion-tools.ts:79`), so never instantiated on any channel, while the envelope tells the model to call them by name and `/crm/insights` is built on them. | 2 lines + a `TOOL_REGISTRY ⊆ TOOL_ORDER` test |
| C-D2 | `crm_query` always fails (= L3). | delete or replace with typed endpoint |
| C-D3 | JIT relevance is ranked on the **4.3 KB envelope**, not the user's text (`chat-rpc.ts:305` → `attempt-env.ts:164`). Harmless while `tools.selection.mode` is `shadow`; with `on`, a vague turn yields **zero hub tools** (C-D7). | rank on user text; all-zero ⇒ full L1 |
| **C-S1 SECURITY** | `hub-capabilities.ts:44`: any 404 from `query/tool-permissions` ⇒ `legacyHub` ⇒ **all permission gating skipped**. The 2026-10-11 outage 404'd every hub route for ~11 h. | explicit probe, fail closed |
| **C-S2 SECURITY** | `custom-tools.ts:229` injects the raw gateway↔hub `serverToken` into unsandboxed user-authored scripts. | per-run scoped credential |
| C-S3 | `module_action` carries no permission and reaches 17 write endpoints; the hub enforces, the gateway's L1 is advisory. | document; add permission |
| C-D4/D5/D6 | cross-agent index pollution · `load_tools` rejects custom ids · `mode:"off"` empties `search_tools` | small |

RBAC metadata is clean: every `module.action` on a tool meta exists in the hub; the
permissions fetch is 60 s TTL and fails closed on error (except S1). WebMCP proposal
(2026-09-02) is unimplemented for the hub: no `clientTools` on `chat.send`.

## 4. MCP for external agents (report D)

The transport exists: gateway `POST|GET /mcp` (Streamable HTTP, hand-rolled, OAuth 2.1 DCR
+ PKCE opt-in). It exposes **~19 read-only infra tools and zero hub business capabilities**.

| # | Gap |
|---|---|
| D-G1 | 30 hub tools carry `mcpExport: true` and nothing registers them; the flag is dead metadata. |
| D-G2 | `McpPanel.svelte` tells the owner `/mcp` serves those 30; the real list is disjoint. |
| **D-G3 blocking** | No per-user identity: shared token and OAuth both resolve to `operator.admin`; only OIDC JWT carries scopes/org, and `/api/gateway/jwt` is cookie-only, so a headless client cannot obtain one. **Exporting the write tools before this = one leaked gateway token is unscoped write access to every org.** |
| D-G4/G5 | OAuth store in-memory, refresh tokens never expire; `tools/list` not filtered by identity although metas carry `permission`. |
| D-G6 | 4 bridge endpoints (`pos-sale`, `booking-complete`, `stock-issue-from-*`) have no gateway tool. |

Smallest design (reuse, not build): seed the registry's `mcpExport` tools into `/mcp`,
one `tools.invoke` gateway method, `fixedParams` on the MCP entry, identity-filtered
`tools/list` — RBAC and audit stamp run unchanged through the existing bridge. Hard
dependency: a headless per-user JWT path (G3) first.

## 5. RBAC parity (report E)

The RBAC engine is sound and fail-closed, and `assistant-principal.ts` is careful (22 pinned
tests; the org is never taken from the request). But the agent bridge is a second, thinner
implementation of the human path: the human path enforces capability, module-enabled, owner
scope and field masking; `requireAssistantCapability` enforces **capability only**.
409 targeted tests pass.

| # | Finding | Status |
|---|---|---|
| **E-S1 CRITICAL** | `gateway/google-adc` + `google-identities`: the gateway branch skips the ownership check and the lookup filters on `user_id` only via `supabaseAdmin()` (no RLS). **Any org's gateway server token → any platform user's decrypted Google refresh token.** | confirmed by reading (`google-adc/+server.ts:24-36`, `supabase-credential.ts:23-46`); not exercised live. All gateways today are owner-operated, so exposure is latent, not known. |
| **E-S2 CRITICAL** | `gateway/channel-identities`: docstring says server token or admin, code checks `getTenantCtx` only, query has no org/user filter. **Any logged-in member lists every channel identity mapping** (user id, provider, phone/Telegram id). | confirmed by reading (`channel-identities/+server.ts:12-18`, `channel-identity.service.ts:37-41`); reads the legacy Turso table — row count unknown. |
| E-S3 HIGH | `query/custom-tools` returns `scriptCode` + unsealed `envVars` without `tools:view` on the default path. | |
| E-S4 HIGH | CRM owner scope applied at 14 human call sites, **0** agent ones (`contact-update`, `contact-tag`, `search-crm-conversations`, `crm-conversation-themes`, `insight`). | |
| E-S5 HIGH | `search-crm-conversations` returns raw message content with no field-level masking. | |
| E-S6 HIGH | `isModuleEnabled` in 109 human API files, **0** of 48 gateway endpoints: a disabled module still reads/writes through the agent. One check inside `requireAssistantCapability` closes it for all 48. | |
| E-S7 HIGH | `agent-memories/recall|delete`, `messages/ingest` gate on `tenantCtx` alone: any viewer can read/delete another user's agent memories and write the message ledger. | |
| E-S8–S10 | `insight` ORs `crm:view`/`finance:view` yet returns revenue; 6 writes carry no `agentActor` stamp; `order-update-status`/`ticket-update` skip `statusChangeBlocked`; `gateway/pages` anonymous. | |

Over-restriction: **E-O1** `actions/pos-sale` asks `pos:edit` while the till asks
`pos:create`, so a create-only cashier (the FACES role shape) rings sales in the UI and gets
403 from the agent. Five writes ask `create` where the human POST defaults to `edit`;
`tool-save` asks `manage` where the human needs `create`+`manage`; forms are offered on
`canViewPath` (view) not a write capability, so a fill can end in a 403 submit.

Trust model: no forwarded user credential on the bridge (only `?agentId=`), so a leaked
gateway token is org-wide impersonation at the highest member's level, with no expiry,
rotation or nonce. `api/internal/workshop/saves/[id]/authority` already shows the shape of
the fix (machine token + `x-minion-user-jwt`). `resolveMemberPrincipal` picks `rows[0]` when
no org is requested, ignoring the user's active org.

Highest-leverage single tests: each `actions/*` capability equals
`apiWriteCapability(<human path>, <method>)`; `isModuleEnabled` inside
`requireAssistantCapability`.

## 6. Ranked program (what "make sure" costs)

| Slice | Closes | Risk class | Size |
|---|---|---|---|
| **S0 Restore the bridge** — provisioner assigns the org's `prd` gateway on create; one-off backfill of the 11 rows (owner-run, dry-run first); retire or re-point `crm_query`; add the 2 missing tools to `TOOL_ORDER` | L1 L2 L3 C-D1 C-D2 | data write to prod (backfill) | S |
| **S1 JEV gate** — mode earns its manifest; `/home` callbacks bypass routing; changelog 0.45; data prose on `data‖forms`; prior-mode carry; commit the probe as a live test | B-D1 D2 D4 D6 D7 D10 | none | S |
| **S2a Security hotfix** — `google-adc`/`google-identities` scoped to the gateway's org; `channel-identities` requires server token or admin | E-S1 E-S2 | security (human merge gate) | XS — PR in flight |
| **S2 Security hardening** — `isModuleEnabled` + owner scope + field masking inside `requireAssistantCapability`; 404 ⇒ fail closed; scoped per-run credential for custom tools; `tools:view` on custom-tools; `notify-user` capability; `tool-save` cannot self-assign permission; memories/ingest gated; `pos-sale` asks `pos:create`; capability-parity test against `apiWriteCapability` | E-S3…S10, E-O1, C-S1 S2 S3, A surplus | security (human gates) | M |
| **S3 Generic action dispatcher** — one hub `actions/dispatch` deferring to `apiWriteCapability` + one gateway tool with a route manifest; retire the 17-string allowlist; forms gain `submit` | A top-10 and the long tail | security review (new generic write path) | M–L |
| **S4 Typed reads** — replace `crm_query` with versioned dataset queries (SEC-06 item 1) | L3 | security | M |
| **S5 MCP export** — headless per-user JWT, then seed hub tools into `/mcp` with identity-filtered list | D-G1…G5 | security | M |
| **S6 JIT on** — rank on user text; per-key index; then flip `tools.selection.mode` | C-D3 D4 D5 D7 | none | S |

S0 and S1 are the only slices that change what users experience this week; without S0
nothing else matters because every hub tool call is a 403.

## Not verified
- No browser end-to-end run of an assistant turn (the tree was mid-edit by another session).
- Report A counted tool existence, not per-turn availability; C covers availability.
- The `/mcp` endpoint was not probed live; public exposure through the Netcup proxy is unknown.
- E-S1 and E-S2 were confirmed by reading the handlers, not by exercising them against a live instance.
