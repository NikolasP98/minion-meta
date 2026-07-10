# Agent Tool Architecture v2 — JIT + RBAC + SDK — Implementation Spec

**Date:** 2026-07-09 (v2, supersedes the v1 draft in this file)
**Status:** BUILD — executing this session via parallel subagents
**Repos:** `minion/` (gateway, branch DEV) + `minion_hub/` (branch dev)
**Research basis:** deep-research `wf_a1722ffd-d30` (memory: `agent-tool-scaling-research-2026-07`) — JIT disclosure saves ~85–98% tool tokens AND raises accuracy; flat retrieval beats mandatory group-gates by 2–4pp; elbow ~40–60 tools (catalog-specific); favorites must be a bounded re-rank.

## 0. Session goals (user's asks, restated)

1. **All tools migrated** to a new format + runtime: every tool carries RBAC-permission metadata + JIT-friendly description; runtime selects tools per turn instead of loading all schemas.
2. **Tools ↔ RBAC**: tools declare a required hub permission (`module.action`); the acting user's hub capabilities gate what the agent can see/use. JIT-loaded.
3. **New tools**: interactive artifact replies (buttons/callbacks, telegram-style) + action packs (notes&todos, events, email, module actions).
4. **/home agent** reaches all RBAC-permitted tools; tool-use rows in chat show the tool + its permission provenance.
5. **Tool SDK**: users create new tools via the `/tools/[id]` editor; Run actually executes; Publish registers the tool into the agent catalog; everything visible at `/capabilities`.
6. **Editor UI**: fullscreen (fix crop), variables section becomes tabs: Env Vars / System Vars / Module Vars / Database Vars.

## 1. Recon facts the design stands on (verified 2026-07-09)

### Gateway (`minion/`, DEV)
- **Registry:** 53 `.meta.ts` tools (hub 23, sessions 6, knowledge 5, auth 4, misc 4, automation/media/ui/web 2, messaging/skills/workspace 1). Codegen `pnpm generate:tools` → `_registry.generated.ts` (lazy `import()` table) + `_groups.generated.ts`. `ToolMeta` at `src/agents/tool-governance/tool-meta.ts:26-66` — has `groups/display/condition/requires/mcpExport/multi/modulePath`, **no permission field**.
- **Groups:** `group:automation(2) gws(4) memory(1+2 manual) messaging(1) minion(53) nodes(1) sessions(6) ui(2) web(2)` + manual `group:fs(4)`/`group:runtime(2)` merged at `tool-governance/tool-policy.ts:22-33` (fs/runtime/memory tools are NOT in the registry).
- **Assembly is per-turn already:** `runEmbeddedPiAgent` (per incoming turn) → `runEmbeddedAttempt` (`pi-embedded-runner/run/attempt.ts:108`) → `resolveRunEnvironment` (`run/attempt-env.ts:109-149`) → `createOpenClawCodingTools` (`pi-tools/pi-tools.ts:164`; base fs/exec + channel tools + `createMinionTools` L434 + policy pipeline L475-476). **User message = `params.prompt` on `EmbeddedRunAttemptParams` — present in attempt.ts but not forwarded to the tool build. The JIT hook point is `attempt-env.ts:109-149`.**
- **Policy:** `resolveAgentToolPolicy`/`isToolAllowed` (`gateway/server-methods/tools.ts:35-91`); profiles `minimal|coding|messaging|full` (`tool-governance/tool-policy.ts:37-54`); `expandToolGroups` L109 (one-level). RPCs `tools.status` (returns `{tools: ToolStatusEntry[], groups, profile}`), `tools.update`, `tools.overrides.set`, `tools.reload`.
- **Gateway has NO hub-role knowledge.** Only `resolvedHubUserId` (threaded to gws/hub tools). Any RBAC gating must fetch capabilities from the hub.
- **Embedders exist:** `src/memory/embedding/embeddings.ts` `createEmbeddingProvider()` — `local|gemini|voyage|openai` + remote-fallback + FTS-only null fallback. Config: `agents.defaults.memorySearch` (`zod-schema.agent-runtime.ts:469+`). Reuse verbatim.
- **Buttons precedent:** `message-tool.ts:202-215` — `buttons: Button[][]`, `Button={text, callback_data, style?}` (telegram inline keyboard). Callback return path: telegram `callback_query` → `buildSyntheticTextMessage` (`bot-handlers.ts:863`, `bot-handlers/synthetic.ts:13`) → normal reply pipeline. **We reuse this exact shape.**
- **MCP:** `registerMcpTool` (`gateway/mcp/registry.ts:103`), seeds in `seed.ts` + `artifact-tools-seed.ts` (gw.* pack live). `tools/list` unpaginated (`protocol.ts:94`) — fine at ~53, keep exported set curated.
- **Config = Zod** (`src/config/zod-schema.*.ts` + `types.*.ts`); tool config in `types.tools.ts`; `tools.reload` RPC clears config cache; tools rebuild next turn anyway.
- **Hub REST from gateway:** `hub-common.ts` `hubGet/hubPost` → `/api/gateway/*` with Bearer serverToken + `agentId`. Gate `hubToolsAvailable(agentId)` = `agentId.startsWith("personal-")` (brain- agents also resolve hub-side; keep the existing gate).

### Hub (`minion_hub/`, dev)
- **Tool editor `/tools/[id]`:** `src/routes/(app)/tools/[id]/+page.svelte` + `_components/{EditorToolbar,CodeEditorPane,ConsolePane,GatewayToolView}.svelte`. Dual-mode (gateway tool → read-only view; else custom IDE). **Run = stub** (`runTool()` L132-148, setTimeout printing "Execution not yet connected to gateway."). **Publish = inert** (`publishBuiltTool` `builder.service.ts:397` sets status only). **Crop root cause:** app layout wraps pages in a non-flex `.h-full`; `.ide-split{flex:1}` (L317-323) has no flex-col parent → collapses. Fix = page-level `h-full flex flex-col` wrapper (pattern: `capabilities/+page.svelte:38`).
- **Custom tools store:** Postgres `builtTools` via `@minion-stack/db/pg` (NOT the legacy sqlite mirror in `src/server/db/schema/builder.ts`). Shape: `name/description/scriptCode/scriptLang(javascript|python|bash)/envVars(JSON str)/status(draft|published)/gatewayId/tenantId/createdBy`. Service `builder.service.ts` (get 354 / update 365 / delete 388 / publish 397 / list 344), API `/api/builder/tools[/id]` gated by `requireCoreCtx` only — **no RBAC** (violates the RBAC-required rule).
- **/capabilities:** `capabilities/+page.svelte`, tabs `tools|skills|mcps`; `BuilderHub.svelte` merges gateway `tools.status` (WS) + `loadBuiltTools()` → `unifiedTools` tagged `source:'gateway'|'custom'` → `ToolsGrid` flat cards.
- **RBAC:** `rbac.service.ts` MODULES L38-61 (20 modules, **no `tools`**), ACTIONS `[view,create,edit,delete,export,manage]`, `Capabilities.can(module,action)`, `resolveCapabilities(orgId,profileId)`. `resolveAssistantPrincipal` = `src/server/auth/assistant-principal.ts:92` (personal- + brain- agents); `requireAssistantCapability` = `api/gateway/_shared/action-auth.ts:22`.
- **/api/gateway surface:** actions/{booking-*×4, contact-tag, contact-update, notify-user, order-update-status, pos-sale, stock-*×2 (+issue-from-service), task-create, task-update, ticket-*×3}; query/{bookings,finance,orders,pos,projects,stock,tickets}; top-level {brain-*, channel-identities, email-ledger, google-*, insight, jwt, pages}. **No notes/todos endpoints; no tool-permissions endpoint; no custom-tools endpoint.**
- **Chat pipeline:** `blocks.ts` ChatBlock = `text|thinking|tool|image`; `ChatBlocks.svelte` toolRow L86 renders `{id,name,input}`+`toolResults[id]`. Live tool events = `agent` frames (`gateway.svelte.ts:749`, cap `tool-events`), `payload.data={phase,name,toolCallId,args,result,isError}` → `chat.liveTools`. Send = `sendChatMsg` → `chat.send {sessionKey, message}` — **plain string only**. **No artifact-in-chat, no buttons — all net-new.** `ArtifactHost` exists (sandboxed iframe, `chrome={false}` variant) but is not chat-wired.
- **Notes:** shared `notes` table, `NOTE_KINDS=['note','todo','easel']`, `createNote(ctx,{kind,title,color,data})`, only session-cookie routes. Notes has no RBAC module → agent endpoints use `resolveAssistantPrincipal` directly, scope by `principalId` as userId (precedent: email-ledger).

## 2. Architecture

### 2.1 Layers (per-turn, evaluated with the incoming user message)

```
full catalog (registry + fs/runtime/memory + hub custom tools)
 └─(L1) HARD GATES                                  security boundary
     a. agent tool policy      isToolAllowed (exists)
     b. user RBAC capabilities tool.permission vs hub capability snapshot (NEW)
     └─(L2) JIT shortlist       top-k by relevance vs params.prompt (NEW)
         + alwaysOn spine       message, search_tools, load_tools, session core
         + session-loaded set   tools the agent load_tools'd earlier this session
         └─(L3) only those tools instantiate → schemas enter prompt
             meta-tools search_tools/load_tools = agent-driven recovery (filesystem nav)
```

Favorites re-rank (L4 of v1) is **deferred** — not in this session's scope; the seam is the score-combine step in `selectTools`.

### 2.2 Pinned cross-repo contracts (builders: do NOT drift from these)

**C1 — `ToolMeta.permission`** (gateway `tool-meta.ts`):
```ts
permission?: { module: string; action: 'view'|'create'|'edit'|'delete'|'export'|'manage' }
```
Absent/undefined = no hub permission required (gateway-native tool; still gated by agent policy). Every hub-touching tool MUST declare one. Codegen serializes it into `_registry.generated.ts`; `tools.status` entries expose it.

**C2 — Hub capability snapshot** `GET /api/gateway/query/tool-permissions?agentId=` (hub, NEW):
```json
{ "principalId": "...", "orgId": "...", "role": "owner",
  "modules": { "crm": ["view","create","edit"], "finance": ["view"], ... } }
```
Auth: `resolveAssistantPrincipal` (no capability gate — this IS the capability read). Implementation: serialize `capabilities.visibleModules()` × ACTIONS via `capabilities.can()`. Gateway caches per agentId, TTL 60s, fail-CLOSED for `permission`-carrying tools when the fetch fails (native tools unaffected).

**C3 — Custom tools feed** `GET /api/gateway/query/custom-tools?agentId=` (hub, NEW):
```json
{ "tools": [{ "id": "...", "name": "stock_report", "description": "...",
  "scriptLang": "javascript|python|bash", "scriptCode": "...",
  "envVars": {"KEY":"val"}, "permission": {"module":"stock","action":"view"} }] }
```
Published + org-scoped only (org resolved from principal). Auth: `resolveAssistantPrincipal`.

**C4 — Notes endpoints** (hub, NEW):
- `POST /api/gateway/actions/note-create` `{ kind:'note'|'todo'|'easel', title, content?, todos?: {text,done?}[], color?, confirm:true }` → creates via `createNote` with `userId=principalId`. todos map into the note `data` shape the NotesPanel expects (builder must copy the exact shape from the existing notes UI code).
- `GET /api/gateway/query/notes?kind=&q=&limit=` → `{ notes: [{id,kind,title,preview,updatedAt}] }`.
Auth: `resolveAssistantPrincipal` directly (no notes module in RBAC — same pattern as email-ledger).

**C5 — Gateway RPC `tools.custom.run`** (gateway, NEW — powers the editor Run button):
```
params: { lang: 'javascript'|'python'|'bash', script: string, env?: Record<string,string>, timeoutMs?: number (cap 30_000) }
result: { output: { stream:'stdout'|'stderr', line:string }[], exitCode: number, durationMs: number }
```
Executes via child process (`node -e` / `python3 -c` / `bash -c`) with injected env (user env vars + system vars, §2.5), cwd = a scratch dir, output capped (~64KB). Operator/admin connection scope only (same gate class as config-editing RPCs — builder: match how `tools.update` or config RPCs authorize and use the strictest available).

**C6 — Interactive artifact chat tool** `chat_artifact` (gateway, NEW):
```ts
input: { title?: string, html: string, buttons?: {text:string, callback_data:string, style?:'danger'|'success'|'primary'}[][] }
```
Execute = returns `{ ok:true }` (the tool call itself is the payload — the hub renders from the tool_use block). Hub: `ChatBlocks.svelte` special-cases `block.name === 'chat_artifact'` → sandboxed iframe (`sandbox="allow-scripts"`, `srcdoc={html}`, theme vars injected like ArtifactHost does) + button rows under it. Button click → `sendRequest('chat.send', { sessionKey, message: callback_data, idempotencyKey })` (same path as `sendChatMsg`; prefix nothing — callback_data IS the message, telegram-synthetic precedent). Buttons disable after click within that block.

**C7 — `tools.status` extension** (gateway): each `ToolStatusEntry` gains `permission?` (from meta) and the response gains `groupDescriptions: Record<string,string>`. Hub `ToolsStatusReport` type updated to match.

**C8 — Selection config** (gateway `types.tools.ts` + `zod-schema.agent-runtime.ts` or `zod-schema.ts` tools section):
```ts
tools.selection?: { mode?: 'off'|'shadow'|'on' (default 'shadow'), k?: number (default 20),
                    alwaysOn?: string[] (default ['message','search_tools','load_tools']) }
```
`shadow` = full set still served, but selection is computed + logged (hit/miss of actually-called tools) so we can measure our elbow. `on` = only alwaysOn ∪ top-k ∪ session-loaded instantiate.

**C9 — System/module/database variables** (editor tabs; hub UI + gateway injection):
- **Env Vars** — user-defined KV (existing `builtTools.envVars`), editable, secret-maskable.
- **System Vars** — read-only, injected by the gateway at run: `MINION_AGENT_ID, MINION_ORG_ID, MINION_USER_ID, MINION_GATEWAY_URL, MINION_HUB_URL, MINION_TOOL_ID, MINION_TOOL_NAME`.
- **Module Vars** — read-only reference list: the hub module API surface the tool may call (`MINION_HUB_TOKEN`-authenticated `/api/gateway/query/*` + `/actions/*` paths with one-line descriptions), filtered to modules the org enables. Rendered as copyable rows, not editable.
- **Database Vars** — read-only reference: org-scoped context values injected as `MINION_DB_*` (org name, currency from fin_settings, timezone, locale). Start with those 4; the tab renders whatever the endpoint returns.
- Hub gets `GET /api/builder/tools/variables` returning `{ system:[{key,description}], module:[{key,path,description}], database:[{key,value,description}] }` so tabs are data-driven.

### 2.3 JIT selection runtime (gateway)

New dir `src/agents/tool-search/`:
- `tool-index.ts` — build at first use (lazy singleton), rebuild on config reload: for each registry entry + manual tools + custom hub tools, text = `"<id>. <title>. <description>. groups: <group names + descriptions>"`. Embed via `createEmbeddingProvider` using `agents.defaults.memorySearch` config; hold `Float32Array` per tool id. **Fallback:** no provider → lexical scorer (token overlap + substring bonus) — never a hard dependency.
- `select-tools.ts` — `selectTools({ prompt, allowedIds, k, alwaysOn, sessionLoaded })` → `{ activeIds, scores, mode }`. Pure ranking; unit-test cosine/lexical + tie-break (stable by TOOL_ORDER).
- `session-loaded.ts` — in-memory `Map<sessionKey, Set<toolId>>` with sliding TTL (~2h); written by `load_tools`, read by selection; never persisted.
- Hook: `attempt-env.ts` — forward `params.prompt`; after `createOpenClawCodingTools` returns, when `mode==='on'` filter the array to `activeIds` (keep every non-registry base tool the policy pipeline already approved: fs/exec/process stay policy-governed — JIT filtering applies to registry + custom tools only, the base coding tools are the "spine" of coding agents; for the personal agent the profile already excludes them where appropriate). `shadow` mode: compute + log via existing diagnostics/log path: `{turnId, catalog, allowed, k, activeIds, calledTools[], hits, misses}`.
- Meta-tools (registry, always-on): `search_tools {query}` → ranked `{id, title, description, groups, permission, allowed}` (RBAC-filtered, no schemas); `load_tools {ids?: string[], group?: string}` → adds to session-loaded set, returns confirmation + the loaded tools' one-line descs (schemas appear next turn — the tool result must SAY that).

### 2.4 RBAC linking (both repos)

- Gateway: `hub-capabilities.ts` in tool-search/ — `getHubCapabilities(agentId)` → C2 endpoint via `hubGet`, 60s TTL cache, single-flight. Applied in the L1 gate: a tool with `permission` is dropped when `!caps.modules[module]?.includes(action)`. Fail-closed on fetch error (permission tools drop, log once per TTL).
- Every hub tool meta annotated (WP-1 does all 23 + new packs): e.g. `finance_query → finance.view`, `task_create → projects.create`, `ticket_* → support.*`, `booking_* → scheduling.*`, `contact_* → crm.*`, `pos_sale → pos.create`, `stock_* → stock.*`, `notify_user → comms.create`, `brain_* → brains.view/edit`, `notes_* → none` (principal-scoped personal data, mirrors endpoint auth), `chat_artifact → none`, `custom:<id> → its stored permission`.
- Hub: add `'tools'` to MODULES (label "Tool Studio", ADMIN_MODULES, default matrix: owner/admin manage, others none) + gate `/api/builder/tools*` with `requireOrgCapability(…,'tools', 'view'|'edit'|'manage')` (whatever the hub's session-side RBAC gate helper is — builder: find the non-assistant equivalent used by other admin APIs) + `tools.custom.run` proxy respect.
- `/capabilities` + `/tools/[id]` (GatewayToolView) show the permission badge and whether the current user's role passes.

### 2.5 Tool SDK (custom tools end-to-end)

Flow: create in editor → Run (iterate) → Publish → agent uses it.
- **Run:** editor calls gateway RPC `tools.custom.run` (C5) over the existing WS client (same as `tools.status` today). Console pane streams… v1: single response render (no streaming) — the RPC returns the full output array; keep the console line renderer.
- **Publish:** stays `status='published'` (existing) — registration is PULL-based: the gateway's custom-tool loader (below) fetches published tools, so publish + next turn = live. Add hub-side cache invalidation already present; also call gateway RPC `tools.reload` fire-and-forget so the index rebuilds.
- **Gateway custom-tool loader** `src/agents/tool-search/custom-tools.ts`: `loadCustomTools(agentId)` → C3 endpoint (TTL 60s cache) → for each, synthesize an `AnyAgentTool`:
  - name `custom_<slugified name>` (collision-suffixed), description from record, parameters = `{ input?: string }` (v1: free-text arg; the script receives it as `MINION_TOOL_INPUT`).
  - execute = same child-process runner as `tools.custom.run` (shared impl `run-script.ts`), env = envVars + system vars + `MINION_TOOL_INPUT`.
  - subject to L1 RBAC via its `permission` + L2 shortlist like any tool.
  - Merged into the catalog inside `createMinionTools` result path or appended in `attempt-env.ts` (builder picks the cleaner seam; must flow through the policy pipeline so allow/deny applies; group = `group:custom`).
- **SDK docs page:** the editor's default script becomes a commented template showing available vars (per C9) + input convention. A `SDK.md`-style help panel is OPTIONAL — skip unless trivial.

### 2.6 Action packs (gateway tools; hub endpoints where missing)

| Tool | Backing | permission |
|---|---|---|
| `notes_create` (kind note/todo/easel, todos[], canvas=easel empty) | C4 POST | none (principal-scoped) |
| `notes_query` | C4 GET | none |
| `events` pack | ALREADY EXISTS as booking tools? — builder inventories `src/agents/tools/hub/`; gaps only. If booking_create/list missing, add wrapping existing `/api/gateway/actions/booking-*` + `query/bookings` | scheduling.* |
| `email_send` | wraps existing gws gmail send path (builder: locate the gws helper used by hooks; if a clean helper is absent, implement via `gws_exec`-equivalent internal call; if that's brittle, SKIP send and note it) | comms.create |
| `email_recent` | hub email_ledger — READ endpoint missing; add `GET /api/gateway/query/email-ledger` (summary/tags/domain/subject only, NEVER contents — same privacy contract as the ledger) | comms.view |
| `module_action` | generic: `{endpoint: enum of whitelisted /actions/* names, payload: object, confirm:true}` → hubPost. Covers long-tail modules without 17 more metas. Whitelist = the actions inventory in §1. | resolved per-endpoint via a static map in the tool |
| `chat_artifact` | C6 | none |

## 3. Work packages (subagent assignments)

Each WP is a self-contained brief; builders read this spec section + pinned contracts. Gateway WPs must not touch: `extensions/meta-graph|whatsapp/minion.plugin.json`, `src/agents/embedded-*templates.generated.ts`, `src/config/schema-parity.test.ts`, `src/config/types.budgets.ts` (pre-existing dirty files, other agents' work). Never `git add -A`; commit only your files. Hub gate: `bun run check` 0 errors/0 warnings + `bun run i18n:compile` after message changes. Gateway gate: `pnpm generate:tools` after meta changes, `pnpm tsgo`, targeted `pnpm test` for touched areas.

- **WP-1 (gateway, opus) — JIT runtime + migration.** §2.2 C1/C7/C8 + §2.3 + §2.4 gateway half. Extend ToolMeta + codegen; annotate ALL hub tool metas with `permission`; GROUP_DESCRIPTIONS (one line per group incl. fs/runtime/custom); tool-index + selectTools + session-loaded + shadow logging; `search_tools`/`load_tools` meta-tools (registry, alwaysOn); hub-capabilities fetch (fail-closed); config keys; `tools.status` extension; wire hook in attempt-env.ts (mode off/shadow/on; default **shadow**, `agents.list[personal].tools.selection.mode` may set on later). Unit tests: selection ranking, policy∧permission gate, group expand.
- **WP-2 (hub, sonnet) — agent-facing endpoints + RBAC module.** C2 tool-permissions, C3 custom-tools, C4 notes endpoints, email-ledger read (§2.6), `'tools'` RBAC module + gate `/api/builder/tools*`, `GET /api/builder/tools/variables` (C9). Follow existing endpoint patterns (task-create for actions, tickets for query). Server tests where the dir has them.
- **WP-3 (gateway, opus, after WP-2 merges) — custom-tool runtime + run RPC + action packs + chat_artifact.** C5 RPC + shared `run-script.ts`; custom-tools loader (§2.5); `notes_create/notes_query/email_recent/email_send/module_action/chat_artifact` tools per recipe (meta+impl, `pnpm generate:tools`, TOOL_ORDER + buildToolOptions); inventory existing booking tools first, fill gaps only.
- **WP-4 (hub, sonnet) — tool editor UI.** Fullscreen wrapper fix; Run → `tools.custom.run` via WS `sendRequest` with env vars from state (render output/exit code in ConsolePane); variables TABS (C9, data-driven from the variables endpoint; Env editable as today, others read-only w/ copy); Publish also fires `tools.reload` (fire-and-forget); permission picker on the tool (module+action dropdowns stored on builtTools — coordinate with WP-2's schema addition; if the pg package column is missing, store in `executionConfig`/`validationRules` JSON — builder checks `@minion-stack/db/pg` builtTools columns and uses an existing JSON column rather than a schema migration if one fits).
- **WP-5 (hub, sonnet) — /capabilities + chat display.** Capabilities cards: permission badge + allowed-for-me indicator + group descriptions (from C7) + custom tools section already merged. ChatBlocks: toolRow shows permission badge (lookup from tools.status map loaded per agent) and `chat_artifact` render branch (C6: sandboxed srcdoc iframe + buttons + click→chat.send callback_data + disable-after-click). i18n en/es for all new strings.
- **WP-6 (orchestrator) — QA + commits.** browser-harness on :5173: editor fullscreen, tabs, Run round-trip, publish→capabilities, /home ask that triggers a hub tool (verify tool row + badge), chat_artifact button click round-trip. Gateway restart locally as needed. Scoped commits both repos.

**Parallelization:** WP-1 ∥ WP-2 → then WP-3 ∥ WP-4 ∥ WP-5 → WP-6. Hub WPs 2/4/5 touch disjoint areas but same repo — run 4∥5 only if file sets don't overlap (4 = tools/[id]+api/builder, 5 = capabilities+chat); acceptable.

## 4. Decisions

- **D1 — Retrieval default, navigation optional** (search_tools/load_tools escape hatch, never a mandatory group hop). Per research.
- **D2 — Gateway-local in-memory vectors** (53–150 tools = tiny; no hub pgvector round-trip).
- **D3 — Custom shortlist model-agnostic; Anthropic Tool Search Tool = later accelerator.**
- **D4 — k/alwaysOn/mode are config**, default mode `shadow` this session; flip personal agent to `on` after QA shows shadow hit-rate ≥ current behavior.
- **D5 — Custom tools execute on the gateway host via child process, admin-authored only** (RBAC `tools` module gates authoring; same trust model as config/skills). No container sandbox v1 — `ponytail:` ceiling documented; upgrade path = firejail/container when non-admin authoring is allowed.
- **D6 — Publish is pull-based registration** (gateway fetches published customs per TTL + reload nudge). No push pipeline.
- **D7 — Favorites re-rank deferred** (unstudied; seam kept in selectTools).

## 4.5 — v2.1 addendum: Mini-IDE + builder-agent + SDK flashlight (2026-07-09 late)

**User ask (verbatim):** "the tool editor should look and feel like a mini IDE with draggable components such as variables/constants from other integrations, as well as db queries (allow db query intellisense if possible; I want an agent to be able to be in charge of this builder/section. create a tool for it to scavenge different SDKs endpoints, basically a flashlight to see into different plugin sdks, exposed variables that they can access data from, either from the gw or any other system thats registered"

### Contracts (continue numbering)

**C10 — CodeMirror 6 editor.** Replace the `<textarea>` in CodeEditorPane with CM6 (new deps, minimal set: `@codemirror/state`, `@codemirror/view`, `@codemirror/autocomplete`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/lang-javascript`, `@codemirror/lang-python`, `@codemirror/lang-sql`, `@codemirror/legacy-modes` for shell). Per-language highlighting; one dark/light-token-aware theme built from hub CSS vars. Value stays bound to the page's `scriptCode` state (autosave/Run/Publish untouched). Completion sources (all client-side, from data already fetched): MINION_* system vars, module endpoint paths, DB tables + columns (C11), env-var keys the user defined. SQL completion active inside string literals containing `select`/`from` (cheap heuristic) and in a dedicated SQL context — table→columns from C11.

**C11 — Schema catalog** `GET /api/builder/tools/schema-catalog` (session, tools.view) AND mirrored `GET /api/gateway/query/sdk-catalog` (agent-facing, `requireAssistantCapability('tools','view')`, superset — see C15). Shape: `{ tables: [{ name, columns: [{name, type}] }] }` derived **offline** via drizzle `getTableColumns()` over the org-scoped business tables exported by `@minion-stack/db/pg` (no live DB introspection). Exclude auth/system tables (user/session/account/verification/jwks).

**C12 — Draggable chips.** Every variable row (all tabs) and every query-snippet card is `draggable="true"`; drop into the editor inserts at the drop position the language-appropriate accessor: JS `process.env.KEY`, Python `os.environ["KEY"]`, Bash `"$KEY"`; snippet cards insert their full snippet text. CM6 handles drop position natively (`dropCursor` extension); the chip sets `dataTransfer` text to the resolved insertion string for the current language.

**C13 — Queries palette.** 5th tab "Queries": one card per `/api/gateway/query/*` endpoint with a ready-to-run fetch snippet in the current language, e.g. JS:
```js
const res = await fetch(`${process.env.MINION_HUB_URL}/api/gateway/query/notes?agentId=${process.env.MINION_AGENT_ID}`, { headers: { Authorization: `Bearer ${process.env.MINION_HUB_TOKEN}` } });
```
plus one card per DB table with a commented SQL SELECT template (documented as reference for the intellisense — no raw-SQL execution endpoint exists yet; the fetch snippets are the executable path). **Gateway change:** custom-tool env injection gains `MINION_HUB_TOKEN` (the hub server token) so these snippets actually run — acceptable under D5's admin-authored trust model; document in the tab.

**C14 — Builder-agent tools.** The agent can drive the builder: hub `POST /api/gateway/actions/tool-save` (`requireAssistantCapability('tools','manage')`) — `{id?, name, description?, scriptLang, scriptCode, envVars?, permission?, publish?, confirm:true}` → creates/updates a builtTool (permission into executionConfig.permission), optionally publishes; returns `{ok, toolId, status}`. Plus `GET /api/gateway/query/custom-tools?status=all` extension (drafts included) for the agent to list its own work. Gateway tools: `tool_builder_save` + extend the existing custom-tools list path. Both metas carry `permission: {module:'tools', action:'manage'}` / `('tools','view')`.

**C15 — `sdk_inspect` (the flashlight).** Gateway tool, read-only, meta permission `('tools','view')`. Input `{ source?: 'all'|'tools'|'plugins'|'rpc'|'mcp'|'skills'|'hub-modules'|'db-schema', query?: string }`. Returns a structured catalog (filtered by `query` substring where given):
- `tools`: native registry metas (id, title/description, groups, permission) — meta-only, no factory instantiation.
- `plugins`: loaded plugins/extensions + their RPC methods + tools + config surface (per recon).
- `rpc`: gateway server-method names.
- `mcp`: listMcpTools() entries (name, description, method).
- `skills`: installed skills w/ descriptions (reuse skills.status source).
- `hub-modules` + `db-schema`: proxied from hub `GET /api/gateway/query/sdk-catalog` (module endpoint list from C9 + tables from C11).
Output capped (~32KB) with per-source counts; description tells the agent this is its flashlight for discovering what it can reach.

### Work packages (wave 3)

- **WP-7 (hub, opus) — mini-IDE.** C10 + C12 + C13 UI: CM6 swap, theme, completions, DnD chips, Queries tab. Don't touch endpoints. Files: tools/[id]/* only (+package.json deps, messages).
- **WP-8 (hub, sonnet) — endpoints.** C11 both variants, C14 tool-save + custom-tools?status=all, extend variables endpoint if needed. Server-only.
- **WP-9 (gateway, sonnet) — flashlight + builder tools + token injection.** C15 sdk_inspect, C14 tool_builder_save, MINION_HUB_TOKEN in custom-tool env (C13). After WP-8.

WP-7 ∥ WP-8, then WP-9. Same repo-hygiene/commit/signing rules as §3.

## 5. Definition of done (this session)

- Every registry tool carries permission metadata where hub-backed; codegen enforces shape for future tools.
- With `mode=on` (personal agent QA), instantiated tool count per turn = |alwaysOn ∪ top-k ∪ loaded| and RBAC-denied tools never appear; `search_tools`/`load_tools` recover misses.
- /home: asking for hub data uses the right tool; the tool row shows name + permission badge; `chat_artifact` renders with working buttons.
- Editor: fullscreen; 4 variable tabs; Run executes real scripts with env injection; Publish → tool callable by the agent (visible in /capabilities with CUSTOM + permission badge).
- Checks green: hub `bun run check` 0/0/0; gateway `pnpm tsgo` + touched tests.
