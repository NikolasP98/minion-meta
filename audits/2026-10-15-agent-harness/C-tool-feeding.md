# C — Tool feeding: gateway → hub personal agent

Read-only audit, 2026-10-15.
Gateway: `/home/nikolas/.cache/claude-tmp/gw-audit` @ `f2de5e00534` (origin/DEV).
Hub: `/home/nikolas/.cache/claude-tmp/hub-audit` @ `4fe89934` (origin/master).
Spec: `specs/2026-07-09-agent-tool-scaling-architecture.md` (status: `unknown`).

## Verdict

**Tools are NOT properly fed. Three live defects break feeding today, independent of JIT:**

1. **D1 — two implemented CRM tools can never be selected.** `search_crm_conversations` and
   `crm_conversation_themes` are in the registry, have metas, permissions, hub endpoints,
   `buildToolOptions` cases and unit tests — but are missing from `TOOL_ORDER`, the hand-written
   list `createMinionTools()` iterates. They are never instantiated on any channel. The hub's own
   per-turn envelope **tells the model to call both by name**, so the model is instructed to use
   tools that do not exist. The `/crm/insights` panel is built entirely around them.
2. **D2 — `crm_query`, the agent's main data tool, always fails.** The gateway POSTs
   `/api/gateway/query`, which the hub has reduced to a hard `503 ASSISTANT_SQL_DISABLED`. The tool
   still ships a ~2 KB Postgres schema in its description every turn, and the envelope recommends
   it for "any sorting/grouping/date-range/percentage question".
3. **D3 — the JIT relevance query is the 4.3 KB context envelope, not the user's question.** The
   hub sends `message = user text + "\n\n" + envelope`; `attempt-env.ts` passes that whole string as
   the ranking prompt. Ranking is therefore near-constant across turns. On a silent UI-result
   follow-up turn the prompt is the envelope **alone** — zero user intent.

JIT L2 is currently in `shadow` by default, so D3 only misranks `search_tools` output today — but
flipping `tools.selection.mode: "on"` (the spec's goal, and what the k=20 cap exists for) makes D3
and D5/D6 actively hide hub tools. **Do not turn L2 on before D3/D5/D6 are fixed.**

RBAC metadata itself is in good shape: every `module.action` on a tool meta exists in the hub's
`MODULES`/`ACTIONS`, and the hub enforces the matching capability per endpoint via
`requireAssistantCapability`. The real RBAC weaknesses are a 404 fail-open (S1) and an
unpermissioned parallel write path (S3).

---

## 1. Registry → hub turn reachability

64 registry tools. 36 are hub-facing (`group:minion`, hub REST or hub DB). All hub tools are gated
on `hubToolsAvailable(agentId)` = `agentId.startsWith("personal-") && getHubRest()`.

Legend: **hub turn** = a `chat.send` from the hub dashboard. **WA/TG** = the same personal agent
reached over WhatsApp/Telegram.

| Tool | Permission (meta) | Hub turn | WA/TG | Notes |
|---|---|---|---|---|
| `search_crm_conversations` | crm.view | **NO** | **NO** | **D1** — missing from `TOOL_ORDER`; envelope advertises it |
| `crm_conversation_themes` | crm.view | **NO** | **NO** | **D1** — same; `/crm/insights` panel depends on it |
| `crm_query` | — | yes (broken) | yes (broken) | **D2** — hub endpoint is a 503 stub |
| `crm_insight` | — | yes | yes | hub `insight` checks crm.view OR finance.view; tool meta declares none ⇒ L1 never filters it |
| `crm_search` | — | conditional | conditional | gated on `gateway.memorySync.enabled`, **not** on a personal agent — different gate from every other CRM tool |
| `finance_query` | finance.view | yes | yes | matches `query/finance` |
| `bookings_query` | scheduling.view | yes | yes | matches |
| `tickets_query` | support.view | yes | yes | matches |
| `orders_query` | sales.view | yes | yes | matches |
| `projects_query` | projects.view | yes | yes | matches |
| `stock_query` | stock.view | yes | yes | matches |
| `email_recent` | comms.view | yes | yes | matches `query/email-ledger` |
| `hub_pages` | overview.view | yes | yes | **M1** — endpoint is deliberately public static route metadata; the meta permission is stricter than the data. A role without `overview.view` loses the tool for nothing |
| `booking_create` | scheduling.create | yes | yes | matches |
| `booking_reschedule` / `booking_cancel` | scheduling.edit | yes | yes | matches |
| `ticket_create` | support.create | yes | yes | matches |
| `ticket_update` / `ticket_comment` | support.edit | yes | yes | matches (`ticket_comment` meta says `create`, endpoint requires `edit` — **M2**, endpoint is stricter) |
| `order_update_status` | sales.edit | yes | yes | matches |
| `task_create` | projects.create | yes | yes | matches |
| `task_update` | projects.edit | yes | yes | matches |
| `contact_update` / `contact_tag` | crm.edit | yes | yes | matches |
| `stock_entry_create` | stock.create | yes | yes | matches |
| `notify_user` | comms.create | yes | yes | **M3** — `actions/notify-user` resolves the principal but requires **no** capability. L1 is stricter than the hub, and `module_action` reaches the same endpoint with no permission at all |
| `brains_list` / `brain_search` | brains.view | yes | yes | endpoints check brains.view |
| `brain_remember` | brains.edit | yes | yes | matches |
| `notes_create` / `notes_query` | — (by design) | yes | yes | principal-scoped; endpoints check principal only — consistent |
| `module_action` | — (by design) | yes | yes | **S3** — 17 allowlisted write endpoints, no L1 permission |
| `tool_builder_save` | tools.manage | yes | yes | matches `actions/tool-save` |
| `sdk_inspect` | tools.view | yes | yes | matches `query/sdk-catalog` |
| `chat_artifact` | — | yes | yes | hub renders the tool_use block; **a WA/TG turn emits a block nothing can render** |
| `search_tools` / `load_tools` | — | yes | yes | alwaysOn; see D5/D6 |
| `message`, `cron`, `gateway`, `nodes`, `sessions_*`, `subagents`, `agents_list`, `web_*`, `gws_*`, `image`, `tts`, `browser`, `canvas`, `skill_view`, `session_status`, `summarize`, `knowledge_graph`, `update_behaviour`, `architect_pipeline`, `venture_studio` | — | yes | yes | not hub-facing; unaffected by L1 |
| hub endpoints with **no** tool: `pos-sale`, `stock-issue-from-invoice`, `stock-issue-from-service`, `booking-complete` | — | via `module_action` only | same | invisible to `search_tools`, so the agent cannot discover them |
| custom tools (`custom_<slug>`) | per-tool, optional | yes | yes | see §3; **cannot be re-loaded via `load_tools`** (D5) |

### Selection-path caps

- `k = 20` (`apply-selection.ts:31`), `alwaysOn = ["message","search_tools","load_tools"]` (`:30`),
  `mode = "shadow"` (`:32`).
- A hub-linked personal agent's L1 catalog is ~55 registry tools + N custom tools. With `mode: "on"`
  and 60+ candidates, **~35 tools are dropped per turn** and recoverable only by
  `search_tools` → `load_tools` → *next* turn (a two-turn round trip the user pays for).
- `search_tools` returns at most 25 results (`search-tools-tool.ts:15`).

---

## 2. RBAC flow

Path: `applyJitToolGate` → `getHubCapabilities(agentId)` → `hubGet("query/tool-permissions")` →
hub `resolveAssistantPrincipal` → `resolveCapabilities(org, principal)` → `{modules: {mod: [actions]}}`.

- **Cache**: 60 s TTL per `agentId`, single-flight (`hub-capabilities.ts:14,76-104`).
- **Fetch skipped entirely** when no tool in the array carries a permission (`apply-selection.ts:105`) — correct.
- **Fail-closed on error**: `caps === null` ⇒ every permission-carrying tool dropped, logged once per
  TTL window. Correct.
- **Hub-side auth is strong**: `resolveGatewayPrincipal` requires a unique gateway row whose `orgId`
  equals the token's tenant, plus an `active` `personal_agents` row bound to that gateway. Possession
  of the server token grants no implicit delegation and no cross-org reach.
- **Permission-id match**: every module used by a tool meta (`scheduling, brains, crm, comms, finance,
  overview, sales, projects, stock, support, tools`) and every action (`view, create, edit, manage`)
  exists in `rbac.service.ts` `MODULES`/`ACTIONS`. **No invalid ids.** The only divergences are the
  three M-items in the table (direction: meta stricter than endpoint, except `ticket_comment`).

### S1 — SECURITY: any hub 404 disables RBAC gating entirely

`hub-capabilities.ts:44-45`

```ts
if (typeof obj.error === "string" && /request failed: 404/.test(obj.error)) {
  return { modules: {}, legacyHub: true };   // → permissionAllowed() returns true for everything
}
```

`hubGet` synthesizes `request failed: 404` whenever the response is not JSON-parseable with a 404
status — which is exactly what SvelteKit returns for a route that is missing **or misrouted**. The
2026-10-11 production incident (`hub-prod-404-login-outage-2026-10-11`) had every hub route 404 for
~11 hours; in that state every permission-gated tool would have been served to every role,
un-gated, with only a `legacyHub` flag in memory to show it. The intent (tolerate a hub that
predates C2) is legitimate but the signal is unsafe.
**Fix direction:** make the legacy probe explicit and one-shot — require a positive marker from the
hub (e.g. a versioned `GET /api/gateway/query/tool-permissions` that answers `{supported:false}`),
or pin `legacyHub` behind a config flag; never infer "no enforcement possible" from a bare 404.

### S2 — SECURITY: published custom tools receive the gateway↔hub server token

`custom-tools.ts:226-230` injects `MINION_HUB_TOKEN = rest.serverToken` into the env of a
user-authored script, run by `node -e` / `python3 -c` / `bash -c` with **no sandbox**
(`run-script.ts` header: "D5 ceiling: no container sandbox v1 — admin-authored tools only"). The
*editor* RPC `tools.custom.run` is admin-gated (`server-methods/tools.ts:338`), but the *loader*
runs published tools for **any** hub-linked personal agent. A script that prints `$MINION_HUB_TOKEN`
hands the caller the gateway's hub credential; combined with `?agentId=personal-<other uuid>` on the
same gateway, that is lateral movement to any other member's capabilities in the same org
(cross-org is blocked by `gateway.orgId !== tokenOrg`).
**Fix direction:** don't hand the raw server token to scripts — mint a short-lived,
principal-and-permission-scoped token per run, or proxy `/api/gateway/*` calls back through the
gateway so the script never holds a credential. Until then, document the publish gate as an
admin-trust boundary and verify `/api/builder/tools*` requires `tools.manage`.

### S3 — `module_action` is an unpermissioned parallel path around L1

`module-action-tool.meta.ts` carries no `permission`, by design ("the hub enforces per-endpoint
RBAC"). The hub does. But the consequence is that **L1 is advisory for writes**: when the capability
fetch fails (fail-closed), all 17 dedicated write tools vanish while `module_action` survives and
can still reach all 17 endpoints. And `notify_user`'s endpoint (M3) checks nothing, so a role
without `comms.create` loses `notify_user` at L1 and regains it verbatim through `module_action`.
**Fix direction:** either give `module_action` a coarse permission (e.g. `overview.view` plus
per-endpoint hub enforcement, which it already has) and add `requireAssistantCapability` to
`actions/notify-user`, or state explicitly in the spec that L1 is a prompt-economy filter and the
hub is the only security boundary. Today the spec calls L1 a "security boundary" (§2.1), which it
is not.

---

## 3. Custom user tools, end to end

`hub /tools/[id]` editor → `tools.custom.run` RPC (admin-gated, gateway-local child process) →
Publish (`actions/tool-save`, requires `tools.manage`) → `builtTools` row with
`executionConfig.permission` → gateway `loadCustomTools` polls
`GET /api/gateway/query/custom-tools` (published-only, **no module gate**, 60 s TTL) → one synthesized
`custom_<slug>` tool per record, appended after plugin tools (`minion-tools.ts:422`) → flows through
the policy pipeline and the JIT gate (L1 via the `CUSTOM_TOOL_INFO` WeakMap).

**Yes, a published custom tool is executable end to end.** Execution happens **in the gateway
process**, as the gateway's own uid, via `runToolScript`: minimal env (process.env not inherited),
throwaway temp cwd, own process group, 30 s hard cap, 64 KB output cap, SIGKILL on timeout.
**There is no sandbox** — no container, no firejail, no seccomp, no network restriction. A published
JS/Python/bash tool has the gateway's full filesystem and network reach. Per-tool `permission` is
optional; a published tool with none is callable by every member of the org (`permissionAllowed`
returns `true` when `permission` is undefined).

### D5 — a custom tool, once dropped by JIT, can never be recovered

`load-tools-tool.ts:42` filters requested ids to `id in TOOL_REGISTRY`. Custom tools are **not** in
`TOOL_REGISTRY` (that is the documented reason `CUSTOM_TOOL_INFO` exists). So `search_tools` will
happily return `custom_foo` (the index holds it), and `load_tools` answers
`unknown: ["custom_foo"]` + "No known tool ids to load". With `mode: "on"`, a custom tool outside
top-k is unreachable for the rest of the session.
**Fix direction:** have `load_tools` accept any id present in the current tool index
(`getIndexedEntry(id)`), not only registry ids.

---

## 4. The two tool channels and how they diverge

**Channel A — gateway-native `tool_use`.** Registry + plugin + custom tools; schemas enter the
provider request in `attempt-env.ts:162-169`; results return in-run. Works on every channel.

**Channel B — the in-app `minion-ui` prompt protocol.** `chat.send` carries text only, so page tools
are described in prose inside the envelope (`briefing.ts`), the model emits ```` ```minion-ui ````
JSON fences, `ui-blocks.ts` parses them out of the final reply, `runner.ts` executes them against the
in-page WebMCP-shaped registry (`model-context.ts`), and `dispatch.ts` feeds results back as a
**silent follow-up turn**, capped at `MAX_CHAIN = 3` (`dispatch.ts:15`). Tools: `hub.navigate`,
`hub.pages`, `ui.guide`, `ui.choice`, `fill_<form_id>`.

**Proposal status check:** `proposals/2026-09-02-gateway-client-tools-webmcp-bridge.md` is still
`status: draft`, and **step 2 is not implemented for the hub**. `clientTools` exists in the gateway
only on the OpenResponses HTTP surface and the CLI (`gateway/openresponses-http.ts:306,464-523`,
`pi-embedded-runner/run/params.ts:80`, `cli/commands/agent.ts:168`). There is **no** `clientTools`
parameter on `chat.send` and **no** `ui.tool.request`/`ui.tool.result` frame anywhere in the
gateway. The hub's TODO(handoff) comments in `ui-blocks.ts` and `dispatch.ts` are accurate.

### Divergences

1. **Channel B exists only in the browser.** A WhatsApp/Telegram turn on the same session gets no
   `minion-ui` tools, no envelope, no page list. Nothing tells the model which channel it is on, so a
   model that learned the fence protocol in-app can emit a fence over WhatsApp, where it is rendered
   as literal text (`ui-blocks.ts` stripping is client-side only).
2. **`chat_artifact` is the mirror case**: a native tool whose payload only the hub can render. Over
   WA/TG the tool_use succeeds and the user sees nothing useful.
3. **`hub.pages` (UI tool) vs `hub_pages` (native tool)** describe the same route map through two
   channels with different auth (native: `overview.view` at L1; UI: in-page, ungated) and different
   latency (native: in-run; UI: one turn late via the follow-up).
4. **Results arrive one turn late and only conditionally.** `needsFollowUp()` (`runner.ts:20-45`)
   decides whether the model ever learns what happened. A successful `fill_` with no `missing`/
   `note` returns **nothing** to the model, which then has no evidence its action took effect.
5. **The chain cap silently truncates.** At `chain >= 3` `dispatch.ts:26` deletes the counter and
   returns without sending results — the model's last batch of UI calls executed and it is never
   told. No marker reaches the transcript.
6. **Two independent relevance gates, unaware of each other.** The hub's JEV turn router withholds
   envelope sections (`pages`, `forms`, `data`, `brain`, `changelog`) by free-text classifier
   thresholds (`turn-router.ts`); the gateway's JIT withholds *schemas* by free-text ranking. The
   router fails open (null ⇒ full envelope) — good — but a turn can end up with the `data` prose
   withheld while the native data tools are present, or vice versa. Nothing reconciles them.
7. **The silent follow-up turn is a full gateway turn**: it re-runs the whole JIT gate with the
   envelope-only prompt (D3), persists ~1–2 KB in the transcript, and counts against the 3-chain cap.

---

## 5. Further JIT defects

### D4 — cross-agent index pollution (`tool-index.ts:159-168`)

`STATE` is a module-level singleton keyed only by a catalog-text signature; `ensureToolIndex` is
called per turn with that turn's **L1-gated** catalog. Two concurrent turns from different agents
have different catalogs, and the second caller hits:

```ts
if (BUILDING) { await BUILDING; return; }   // returns without indexing ITS catalog
```

It then ranks against the other agent's index. `rankTools` filters candidates to
`state.entries.has(id)`, so any tool absent from the other agent's catalog gets **no score at all**
and (in `mode: "on"`) is filtered out of the turn. `search_tools` has the inverse leak: it lists
`listIndexedIds()` and stamps every row `allowed: true` (`search-tools-tool.ts:44`) — which can be
another agent's permitted set.
**Fix direction:** key the index per catalog signature in a small `Map` (or per agentId) instead of a
single global, and make the single-flight per key.

### D6 — `mode: "off"` silently breaks `search_tools`

`applyJitToolGate` returns before `ensureToolIndex` when mode is `off` (`apply-selection.ts:100-102`),
so `STATE` stays `null`, `listIndexedIds()` returns `[]`, and `search_tools` reports no tools exist.
It works today only because the default is `shadow`.

### D7 — a vague turn with `mode: "on"` yields zero hub tools

With the lexical fallback (no embedding provider configured) and a query of only stopwords, every
`lexicalScore` is `0`; `selectTools` then breaks the all-ties sort by `TOOL_ORDER`, so top-20 is
literally the first 20 entries of `TOOL_ORDER`: `browser, canvas, nodes, cron, message, tts,
gateway, agents_list, sessions_*, subagents, update_behaviour, skill_view, session_status, gws_*,
web_search`. **Not one hub tool.** Combined with D3 (the query is mostly a constant envelope), the
ranking is close to this degenerate case on every turn.
**Fix direction:** rank on the user's message only (have the hub send the envelope in a field the
gateway excludes from `params.prompt`, or strip the `[In-app assistant context …]` block before
ranking), and treat an all-zero score vector as "no opinion ⇒ serve the full L1 set".

### Also

- Hit/miss feedback for shadow-mode calibration is an acknowledged TODO seam
  (`apply-selection.ts:133-134`), so the "measure the elbow" purpose of shadow mode is not yet
  served by data — only `activeIds` is logged.
- `mcpExport: true` on ~19 metas is read by nothing but the `tools.list` RPC response
  (`server-methods/tools.ts:148,205`). No MCP export surface consumes it.
- The generator (`scripts/generate-tool-registry.ts`) validates only `id` + `factory`. It does not
  check `TOOL_ORDER` membership (root cause of D1) and does not enforce permission presence for
  hub-backed tools, which the spec's DoD claims ("codegen enforces shape for future tools").

---

## 6. Tests

```
cd /home/nikolas/.cache/claude-tmp/gw-audit
pnpm vitest run src/agents/tool-search src/agents/tools/hub
```

**PASS — 6 files, 157 tests, 9.8 s.** (node_modules symlinked from the primary checkout.)
Note what the green does *not* cover: no test asserts `TOOL_REGISTRY ⊆ TOOL_ORDER` (D1 would be a
2-line test), none exercises `load_tools` with a custom-tool id (D5), none runs two agents through
`ensureToolIndex` concurrently (D4), and `hub-tools.test.ts` builds the orphaned tools directly by
factory, which is why D1 is invisible to it.

---

## 7. Fix order (smallest first)

| # | Fix | Where |
|---|---|---|
| 1 | Add the two ids to `TOOL_ORDER` + a test asserting `TOOL_REGISTRY ⊆ TOOL_ORDER` | `minion-tools.ts:79`, D1 |
| 2 | Decide `crm_query`: re-enable a typed hub endpoint, or delete the tool and its envelope prose | D2 |
| 3 | Rank on the user's message, not the envelope; all-zero scores ⇒ serve full L1 set | `attempt-env.ts:164`, D3/D7 |
| 4 | `load_tools` accepts any indexed id | `load-tools-tool.ts:42`, D5 |
| 5 | Replace the 404 ⇒ `legacyHub` inference with an explicit capability probe | `hub-capabilities.ts:44`, **S1** |
| 6 | Per-key tool index; build the caller's own catalog | `tool-index.ts:159`, D4 |
| 7 | Stop handing `serverToken` to custom-tool scripts; scope a per-run credential | `custom-tools.ts:229`, **S2** |
| 8 | `requireAssistantCapability('comms','create')` on `actions/notify-user`; state L1's real status in the spec | hub + spec §2.1, **S3**/M3 |
