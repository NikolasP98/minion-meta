---
id: 2026-07-22-personal-org-differentiation-spec
title: Personal Org Differentiation — Spec (v2)
stage: spec
status: unknown
pass: 1
created: 2026-07-22
updated: 2026-07-30
repos: [minion-meta]
---

# Personal Org Differentiation — Spec (v2)

Date: 2026-07-22
Status: CONSULTED — Codex (sol/xhigh) verdicts folded in; see "v2 revisions" section,
which OVERRIDES the corresponding v1 sections below. Implementation follows the
revised WP0–WP6 breakdown.
Prior art: `specs/2026-07-19-org-kind-segregation-spec.md`, `minion_hub/src/lib/org-kind.ts`

## Goal

Orgs have `kind: 'business' | 'personal'` (Supabase `organizations.kind`, default `business`).
The hub today only hides a few modules per kind. This spec makes personal orgs a genuinely
different product surface while sharing core functionality:

1. **CRM** → personal, relationship-first; de-emphasize the sales funnel; add a
   relationship-graph subpage reusing the /overview graph stack.
2. **Finances** → personal-finances oriented; new connector path: bank-statement upload +
   NLP parsing via an autonomous agent (gateway-delegated).
3. **Socials** → DEFERRED entirely for personal (hidden for now; later: personal accounts
   centralization, maybe personal-brand ad tracking).
4. **Agent stack unchanged** for both kinds: agents, brains, autonomous, builder, workshop,
   capabilities, sessions, prompt tools.
5. **Hidden/blocked for personal**: customer support (`/support`) — but voice calls and
   channels stay; memberships; team; sales orders (`/sales`); socials (`/socials`, module
   id `ads`). Plus the already-hidden `pos`, `stock`, `workforce`.
6. **Sidebar nav groups rewritten** per kind.

## Current state (recon findings)

- Policy: `src/lib/org-kind.ts` — `ORG_KIND_POLICY`:
  business hides `['pulse']`; personal hides `['pos','stock','workforce']`.
  `isModuleVisibleForKind(moduleId, kind)`; unknown kind degrades to business.
- Kind flow: Supabase `organizations.kind` → `loadOrganizationsForUser` /
  `getTenant` → `(app)/+layout.server.ts` returns `activeOrgKind` → Sidebar/Topbar/OrgPicker.
- Nav: `src/lib/components/layout/sections.ts` — `getSections()` (static core:
  `organization` group [Home, Overview, Team], `agents` group) +
  `BUILTIN_PLUGIN_ITEMS` (each with business `category`) + `PLUGIN_NAV_GROUPS`
  (Marketing, Operations, Finance, Branding, Customer Support, Tools) +
  `getDynamicPluginsSections(entries, enabledByPluginId, orgKind)` which gates per
  item on `enabledByPluginId` and `isModuleVisibleForKind`. Channel plugins collapse
  into a "Channels" link under Customer Support.
- **Asymmetry (bug-class)**: kind-based route 404 exists ONLY for `/pulse` and
  `/settings/pulse` (per-route `getTenant` check). `personal.hiddenModules` entries are
  nav-hidden but their routes are still reachable (only RBAC-gated).
- CRM: funnel axis = `crm_contacts.custom_fields._funnel`
  (`lead→opportunity→customer→loyal`; `crm-funnel.ts`, `CrmFunnel*.svelte`,
  `FunnelStagePill`); revenue ranking via `crm-finance.service.ts` (party-spine join to
  `fin_invoices`). Relationship-side: contacts, conversations analysis/vectors, journey,
  insights (sentiment/word cloud), Connections panel (`connections.service.ts` — counts
  linked records per module through party spine `parties` + facet `party_id` FKs).
- /overview graph: 3 clean layers — `build-graph.ts` (pure transform →
  `GraphNode`/`GraphEdge`), `simulation.ts` (d3-force), `renderer.ts` (PixiJS).
  A new build transform can reuse sim + renderer unchanged.
- Finances: connector registry `src/server/finance/connector.ts` (pull-oriented
  `pullPages`); SUSII is the only connector. Durable job layers: finance-specific
  (`finance-sync.service.ts` + jobs table) and generic `bg-runtime.ts`
  (`registerJobHandler`/`enqueueJob`/`runTick` over `bg_jobs`, cursor-resumable) —
  brains `brain_ingest` uses the generic one.
- Upload infra exists: `api/files` multipart → `file.service.ts` → B2/S3 via
  `storage/blob.ts`. NO server-side PDF/DOCX parser anywhere in hub. Heavy media parsing
  precedent: hub delegates to gateway RPC (`media.transcribe` / Whisper); hub holds no
  model keys.

## Design

### A. Policy extension + centralized kind guard

1. Extend `ORG_KIND_POLICY`:
   - `personal.hiddenModules`: add `support`, `memberships`, `sales`, `ads`, `team`.
     (Keep `pos`, `stock`, `workforce`.) `channels` stays visible for personal.
   - Optional per-kind extras later (e.g. `business.hiddenModules` stays `['pulse']`).
2. **Centralize route enforcement**: in `(app)/+layout.server.ts`, after resolving
   `activeTenant`, derive the top-level module id from the canonical path and
   `throw error(404)` when `!isModuleVisibleForKind(moduleId, kind)`. This replaces the
   per-route pulse guards and closes the pos/stock/workforce gap in one place.
   Path→module mapping must handle `socials→ads` and any other aliasing (the same
   mapping `sections.ts` uses: `item.moduleId ?? first path segment`).
3. `team` is a core-nav route (organization group), not a plugin item — the static
   `getSections()` must also filter by kind (make it kind-aware), and `/team` gets the
   same central 404.

### B. Sidebar nav groups (personal)

Business keeps the current grouping. Personal gets its own group set (proposal —
consult item):

| Group | Items |
|---|---|
| (core) My Space | Home, Overview, Pulse |
| People | CRM ("People"?), Channels (moved out of Customer Support), Scheduling |
| Money | Finances |
| Work | My Work (`/work`) |
| Agents | (unchanged agent group: Copilots, Autonomous, Workshop, Capabilities, …) |

Implementation: kind-aware `PLUGIN_NAV_GROUPS` + per-item category override when
`orgKind === 'personal'` in `sections.ts` (data-only change; Sidebar rendering
untouched). Channels link must survive the hidden `support` category for personal.

### C. CRM personal variant

1. **De-emphasize funnel for personal orgs** (gate on `activeOrgKind`):
   - Hide funnel ribbon + funnel column/pills on dashboard, customers list, contact
     detail; hide funnel auto-analyze action.
   - Hide revenue-ranked framing where it reads sales-y; keep the data (finance bridge
     still works — personal orgs may still track who they paid/got paid by).
   - Keep: contacts, conversations, journey, insights, Connections, tags, cleanup.
2. **New subpage `/crm/graph` — relationship graph** (personal-first; decide whether
   business gets it too — default: available for both, nav-labelled differently):
   - New `build-crm-graph.ts` transform emitting the same `GraphNode`/`GraphEdge`
     shapes; reuse `simulation.ts` + `renderer.ts` unchanged.
   - Nodes: the org owner (center), parties/contacts (ringed by relationship strength
     or recency), channels as small nodes (optional).
   - Edges: contact↔party links (party spine), shared-channel edges, and
     conversation-frequency-weighted org↔contact edges (message counts already
     available via CRM services).
   - Server load: reuse `contactConnections()` / contacts list + party spine queries;
     new `+page.server.ts` under `/crm/graph`.

### D. Finances personal variant

1. **Surface**: same dashboard/invoices/products/settings skeleton; for personal orgs
   relabel copy where sales-oriented ("Invoices" → "Transactions"? — consult item on
   whether to relabel or restructure).
2. **Bank-statement connector (upload + NLP), personal-first**:
   - Upload: reuse `POST /api/files` (category `finance-statements`) → B2.
   - Ingest: new generic `bg-runtime` handler `statement_ingest` (NOT a
     `FinanceConnector.pullPages` impl — that interface is pull-oriented). Job advance:
     fetch blob → extract text → LLM-parse lines → map to canonical records → persist
     batch (reuse `upsertInvoicesBatch` or new transactions persistence — see open
     question) → cursor-resume per chunk.
   - NLP/agent: delegate parsing to the gateway (like `media.transcribe`) — e.g. an
     `llm-task` RPC with a structured-output schema (date, description, amount,
     direction, category, counterparty). Hub keeps no model keys.
   - v1 formats: CSV + pasted text; PDF deferred (no parser in hub; gateway-side
     markitdown is a later step).
   - Settings UI: personal orgs see "Upload statement" in finances settings instead of
     SUSII connector config.
3. **Open data-model question (consult)**: personal transactions ≠ sales invoices.
   Options: (a) reuse `fin_invoices` with a `direction/type` discriminator; (b) new
   `fin_transactions` table feeding the same dashboard aggregates. Leaning (b)-lite:
   new table, minimal columns, party-spine `party_id` nullable — but consult.

### E. Pulse notifications fix (in flight, separate diff)

Badge sums join-requests + pulse proposals; popover and /notifications page render only
join-requests. Fix: render `pulse.items` in `NotificationsPopup.svelte` (state module +
`/api/pulse/proposals` already exist), include pulse in /notifications page for
personal orgs, refresh badge on approve/dismiss.

## Phasing (Sonnet implementation waves)

- **P1 — Gating + nav** (small, ships first): policy extension, centralized kind-404
  in layout.server (delete per-route pulse guards), kind-aware `getSections()` +
  personal nav groups, Channels regrouping. Tests: layout.server.test.ts extension.
- **P2 — CRM personal**: funnel gating by kind + `/crm/graph` build transform + page.
- **P3 — Finances personal**: `statement_ingest` bg handler + upload UI + gateway
  llm-task parse + persistence + dashboard wiring.
- Each phase: `bun run check`, `bun run lint:design && bun run lint:tokens`, focused
  tests; final Codex diff review before commit.

## Non-goals

- Socials personal-brand features (deferred).
- Business-side nav changes beyond what gating requires.
- PDF statement parsing (v1 is CSV/text).
- Migration of existing business orgs; `kind` default stays `business`.

## v2 revisions (Codex sol/xhigh consult verdicts — these OVERRIDE v1 above)

Overall: v1 was NO-GO as written. Corrections:

### R1. Enforcement boundary = hooks, not layout load (overrides §A.2)
SvelteKit runs parent/child loads concurrently — a layout throw does NOT stop a child
page load's queries (svelte.dev/docs/kit/load#Implications-for-authentication).
Enforce kind access in `hooks.server.ts` `finishApp` (after identity+tenant resolve,
before `resolve(event)`; hooks.server.ts:160,184), covering page routes AND
user-facing API routes including READS (current hook only capability-checks mutating
APIs, hooks.server.ts:296). Longest-prefix semantic resolver (`/settings/pulse→pulse`,
`/socials→ads`, `/settings/team→team`, `/workforce→workforce` though RBAC cap is
`projects`) — do NOT reuse nav's `moduleId ?? firstSegment` shortcut. Fail CLOSED on
unknown kind at the enforcement boundary (org-kind.ts:13 business-fallback is fine for
UI only). Keep existing pulse per-route guards until hook coverage is tested.
Server-token/cron routes (hooks.server.ts:226) handled explicitly. Kind comes from the
already-loaded organizations bundle — no extra `getTenant` round trip.

### R2. Personal nav grouping (overrides §B)
| Group | Items |
|---|---|
| My Space | Home, Pulse, Overview, My Work |
| Relationships | People (=CRM item), Scheduling, Channels, Voice Calls |
| Money | Finances (omit group label if single item) |
| Agents | unchanged |
| Tools | remaining permitted dynamic plugins |

Voice Calls currently lands in Customer Support via `PLUGIN_CATEGORY_OVERRIDES`
(sections.ts:279) and Channels is inserted post-assembly (sections.ts:366) — personal
placement is a hub-side display map; do NOT alter gateway plugin categories. Installed
plugin entries must also be kind-gated (sections.ts:351 gap). Add org-kind to
`canViewPath` (can.svelte.ts:14) so palette/hotkeys/settings-nav (GNav.svelte:18,
SettingsNav.svelte:27) stop offering Team/Stock/POS/Workforce to personal orgs.

### R3. CRM graph v1 (overrides §C.2)
Nodes: center ("Me"/org) + ≤60 contacts ranked by recency then message count +
optional channel nodes. Edges: center→contact (width `1+min(5,ln(1+msgCount))`,
opacity=recency decay); contact→channel per identity. NO party edges (party_id is an
identity bridge, not a relationship) and NO shared-channel contact↔contact edges
(near-clique noise). Data: contact identities (pg-crm-schema.ts:77) joined to
messages — rank query precedent at crm-contacts.service.ts:333; consult transcript has
a ready SQL derivation (per_channel + ranked CTEs, limit 60).
Renderer reuse is OVERSTATED in v1: `GraphNode.kind` is an overview-specific union and
renderer has fixed rings/styling (renderer.ts:31,146) — lightly parameterize rings/
presentation config (preferred) rather than mapping onto org/user/integration kinds.
Register `crm.graph` RBAC subresource (route-access-registry.ts:29 currently absent).

### R4. Personal finance data model (resolves §D.3)
NEW tables, no invoice discriminator (fin_invoices is structurally a sales document;
dashboards join stock COGS — finance.service.ts:622,631):
- `fin_statement_imports`: id, org_id, file_id?, source_kind(csv|text),
  content_sha256, parser_version, status(queued|parsing|done|failed), next_chunk,
  row/inserted/rejected counts, error fields, UNIQUE(org_id, content_sha256).
- `fin_transactions`: id, org_id, import_id, source_row, posted_on, description,
  signed_amount numeric(18,2) (sign = direction — no separate direction column),
  currency?, counterparty?, category?, reference?, party_id? (soft spine bridge),
  confidence?, warnings jsonb, raw jsonb, UNIQUE(import_id, source_row),
  INDEX(org_id, posted_on DESC), INDEX(party_id).
CRM bridge: new `ContactCashflow {inflow, outflow, net, transactions,
lastTransactionAt}` joined on party_id — do NOT touch business `ContactFinance`
(crm-finance.service.ts:31). No automatic fuzzy counterparty linking in v1.
Personal finances nav: Dashboard / Transactions / Import+Settings — do NOT just
relabel Invoices/Products.

### R5. Statement parsing (overrides §D.2 transport)
Deterministic CSV parsing FIRST (skip LLM when headers/formats resolve); LLM fallback
via gateway `drones.execute` RPC with a new registered `statement-parser-v1` drone
(typed schema, gateway-owned prompt/model; drones.ts:51,150; hub client
gateway-rpc.ts:303). `llm-task` is an OPTIONAL AGENT TOOL, not a hub-facing RPC — v1
assumption was wrong. Deterministic `runId = statement:{importId}:{chunkIndex}`.
Contract `StatementParseV1`: every input row appears exactly once in `rows` or
`rejected`; server validates row numbers, decimals, dates, currency.
Upload via dedicated `POST /api/finances/statement-imports` (NOT raw `/api/files` —
no finance capability/MIME/size/hash checks there; api/files/+server.ts:15). Status
`GET /api/finances/statement-imports/:id`; explicit retry reusing the import; undo =
delete transactions by import_id. Idempotency: sha-256 of exact bytes (CRLF-normalized
for pasted text) + UNIQUE constraints; do NOT dedupe globally on date/desc/amount.
Register the handler import in `/api/jobs/tick` (+server.ts:5 side-effect imports).
bg-runtime marks thrown errors failed immediately and ignores `attempts`
(bg-runtime.ts:127) — explicit retry, don't expand the runtime in v1.

### R6. Cross-module semantics (answers v1 Q6 — substantial breakage)
Kind-hidden ≠ module-disabled today (`isModuleEnabled` treats absent row as enabled,
modules.service.ts:26). Define ONE helper and use it in services + UI:
`effectiveModuleEnabled(kind, appModuleStates, featureId) =
 isModuleVisibleForKind(featureId, kind) && appModuleStates[featureId] !== false`.
Do NOT mutate app_modules on kind change. Known leaks to fix: CRM Connections counts
(connections.service.ts:94,145), global search, scheduling bookings loading stock
accruals + "Create sales order" → `/sales` (scheduling/bookings/+page.server.ts:36,
+page.svelte:114), finance dashboard COGS from hidden stock, settings nav, assistant
actions + cron jobs needing effective-kind checks. (Scheduling coupling is
Stock/Sales/fin-products — not Support as v1 guessed.)

## Revised work packages (replaces v1 Phasing)

- **WP0 — Access semantics + tests**: shared path/API→feature resolver; hook-level
  page + user-API enforcement; fail-closed unknown kind; tests for localized paths,
  `/settings/pulse`, aliases, `/work` vs `/workforce`, API GET/write; keep pulse
  guards temporarily. *(Merges with routing-simplification spec Option A/W1-W2.)*
- **WP1 — Nav + hidden-path cleanup**: personal grouping (R2); Channels+Voice Calls
  preserved; kind in `canViewPath`; palette/chords/settings-nav/search/Connections/
  scheduling Stock-Sales actions/assistant/cron via `effectiveModuleEnabled` (R6).
- **WP2 — CRM personal semantics**: stop computing funnel/revenue payloads for
  personal where undisplayed; gate funnel actions/APIs not just components;
  `ContactCashflow` type.
- **WP3 — CRM graph** (separable): `crm.graph` RBAC subresource; bounded aggregate
  query; center/contact/channel graph; reuse simulation, parameterize renderer.
- **WP4 — Transactions/import core**: migrations + RLS + grants + schema tests;
  upload/status/retry/undo APIs; deterministic CSV + pasted text; personal dashboard.
- **WP5 — Gateway parse fallback** (optional, cross-repo): `statement-parser-v1`
  drone in `minion`; capability probe; versioned contract; deploy gateway BEFORE
  enabling hub feature.
- **WP6 — Downstream integration**: CRM cashflow bridge + Connections counts;
  assistant/query surfaces; brains corpus inclusion decision; cache invalidation.

## v1 consult questions (answered above)

1. Centralized kind-404 placement → R1. 2. Nav grouping → R2. 3. Graph edges → R3.
4. Finance data model → R4. 5. NLP contract → R5. 6. Cross-module breakage → R6.
