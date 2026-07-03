# Minion Hub — ERP + Agent-Native Audit & Improvement Roadmap

**Date:** 2026-07-02
**Scope:** minion_hub data layer (CRUD/ACID), module interconnection, connectors (SUSII), role-based UX, MCP surface, AI-Brains design, Stock module design.
**Method:** 4 parallel codebase audits (data layer, interconnection/connectors, RBAC, agent-native surfaces). All findings verified against source with file:line refs.

---

## 0. Executive summary

The foundation is stronger than expected: org-scoped RLS via `withOrgCore` GUC transactions, a generic connector interface already abstracted away from SUSII, one RBAC matrix driving nav + layout + API hooks, a working MCP server in the gateway with a dispatcher and dynamic registry, and a party spine that links CRM/Finance/Scheduling/Support/Projects.

The gaps cluster into five themes:

1. **Write-boundary rigor** — no schema validation (zod) on API writes, no optimistic locking, audit log covers support/sales/workflow but **not finance or CRM CRUD**.
2. **Everything is cron-polled** — no event bus; "invoice created → notify" style automation is impossible without polling. This blocks agent-reactive automation.
3. **Agents are read-only** — MCP + tools cover CRM reads only. 13 of 17 hub modules have **zero** tool coverage; no write-capable tools; artifacts are static renders with no mutation bridge; agents cannot create flows.
4. **Role-aware UI is server-only** — buttons render for everyone and 403 on click; no custom roles; multi-role backend exists but no UI.
5. **AI-Brains and Stock don't exist** — but both have clear foundations to build on (per-agent knowledge-graph + pgvector; party spine + fin_products + doc_audit_log + naming_series + workflow).

Priority order recommended: **P0 write-boundary hardening → P1 MCP write surface → P2 event bus → P3 role-aware UI → P4 AI-Brains → P5 Stock module.** P1 is the highest-leverage item for the agent-native vision; P0 is its prerequisite (you don't want agents writing through unvalidated endpoints).

---

## 1. CRUD / ACID improvements (P0)

### What's already good
- Multi-table writes are transactional: `upsertInvoicesBatch` (finance.service.ts:38–178), `reconcileParties` (party.service.ts:132–258), `createBooking` (scheduling-bookings.service.ts:178–287) all run inside a single `withOrgCore` tx.
- No cross-DB writes exist (Turso reads are telemetry/fallback only). Two-DB discipline is holding.
- Idempotency is solid: uid-based bookings with `onConflictDoNothing`, set-based dedup on invoice batches, unique constraints on identities/tags/reminders/orders.

### Gaps and fixes

| # | Gap | Evidence | Fix |
|---|-----|----------|-----|
| 1.1 | **No structured validation at write boundaries.** API routes do ad-hoc `typeof` guards; body shapes (nodes/edges JSON, custom_fields) are trusted. | `api/flows/+server.ts:69–87` and pattern repeated across routes | Adopt zod at the API boundary. One `parseBody(schema, request)` helper in `src/server/api/validate.ts`; each route declares its schema next to the handler. Do NOT build a framework — one helper + per-route schemas. Agents will hit these endpoints via MCP, so this is a trust-boundary requirement, not polish. |
| 1.2 | **No optimistic locking.** Concurrent edits last-write-win silently — acceptable for prefs, not for invoices/orders/tickets once agents also write. | all services; no `updated_at` in WHERE clauses | Add `updatedAt` check to the shared update paths of the doc-like modules (sales, support, projects, crm detail): `WHERE id=$1 AND updated_at=$2`, return 409 on 0 rows. UI already refetches on error paths. Skip it for telemetry/prefs. |
| 1.3 | **Audit trail is partial.** `doc_audit_log` exists (polymorphic, field-diffs) but finance writes and crm-contacts CRUD never log. Each service must remember to call it manually. | support/sales/workflow log; finance.service.ts does not | Lazy root-cause fix: one `auditedWrite(tx, refType, refId, op, changes, ctx)` helper and call it from finance upserts (sync-sourced rows can log `actor='connector:susii'`) and crm-contacts create/update/delete. This also gives agent writes provenance for free — every agent mutation gets `actor='agent:<id>'`. Non-negotiable before P1. |
| 1.4 | **Sync → reconcile is split across transactions.** If `reconcileParties` fails after `upsertInvoicesBatch`, invoices sit unlinked until next sync. | finance-sync.service.ts:88–102 | Accept it (reconcile is idempotent backfill and the comment says so) but add a cheap safety net: the finance tick already runs every minute — have it call `reconcileParties` for orgs whose last reconcile errored. No saga machinery. |
| 1.5 | **Soft-delete filtering is convention, not enforcement.** `deleted_at IS NULL` must be remembered per query. | crm-contacts.service.ts:35 | Add a drizzle helper (`activeContacts` prefiltered view or a `notDeleted(table)` condition constant) and grep-sweep existing queries once. Consider a PG view for the read path if misses recur. |
| 1.6 | **Migration/schema drift risk.** Schema lives in `pg-*-schema.ts`, migrations are hand-written SQL in `/supabase/migrations/` — nothing correlates them. | 5 migration files vs ~60 tables | Add a CI step that diff-checks `drizzle-kit generate --dry` output against an empty diff (generate-only, never push). Cheap drift alarm. |

---

## 2. Module interconnection (P2)

### What's already good
- **Party spine** (`pg-party-schema.ts`, `party.service.ts:132–259`): doc_number → phone9 identity hierarchy, all five business modules carry `party_id`, reconcile is set-based and idempotent, runs post-sync + post-harvest + manual endpoint.
- **Connections panel** (`connections.service.ts`) is config-driven with live counts and module gating via `app_modules`.

### Gaps and fixes

| # | Gap | Fix |
|---|-----|-----|
| 2.1 | **No event bus — all automation is cron ticks** (6 tick endpoints, 1-min Vercel/netcup cron). Cross-module reactions (invoice paid → CRM lifecycle update → notify) are impossible without polling. | Use what's already under you: **Postgres LISTEN/NOTIFY on the Supabase core DB**, emitted from inside `withOrgCore` transactions (`pg_notify('hub_events', json)`), consumed by ONE long-lived listener (the flows-runner on netcup is already a persistent Node process — add the listener there). Ship 3 events first: `invoice.upserted`, `booking.created`, `ticket.status_changed`. Do NOT add Temporal/queue infra; the tick endpoints remain the durable fallback. This is also the trigger source for agentic automations (§5). |
| 2.2 | **Messages/chat not on the party spine.** WA identities link via `crm_contact_identities` but the ledger has no party mapping; Connections panel can't show "chat history" per party. | Add a "Comms" connections group counting ledger messages via `crm_contact_identities.external_id`. No schema change needed — it's a join, not a new column. |
| 2.3 | **Connections panel missing groups:** reminders, tasks-as-assignee, messages. | Extend `connections.service.ts` config — it was built for exactly this. |
| 2.4 | **Analytics staleness after sync.** CRM revenue computed on-read, uncached; finance dashboard Valkey-cached with no cross-module invalidation. | Piggyback on 2.1: the `invoice.upserted` event handler busts the CRM revenue cache tag too. Skip rollup tables until a dashboard measurably can't compute on-read. |
| 2.5 | **Phone-fallback mis-linking ceiling** (shared family phone, no DNI). | Known + documented in party.service. Leave as-is; revisit with union-find only if support burden appears. |
| 2.6 | **`parties.type='agent'` never populated.** | Populate when agents get assigned to proj_tasks — one line in the assignment path. Makes agents first-class ERP actors (needed for stock module's "who moved stock" too). |

---

## 3. Connectors (P2, shared with §2)

### What's already good
- `FinanceConnector` interface (`src/server/finance/connector.ts`) is **already generic**: `pull/pullPages/count`, registry Map, self-registration. SUSII specifics are isolated in client/mapper/connector files.
- Durable job model: `fin_sync_jobs` with page-cursor resume, time-budgeted `advanceJob`, encrypted `secret_refs` + IV, tick-driven recovery. This is the right shape — **reuse it verbatim for every future connector.**

### Gaps and fixes

| # | Gap | Fix |
|---|-----|-----|
| 3.1 | **Connector framework is finance-shaped.** A stock/e-commerce connector (Shopify) pulls products+orders+inventory, not just invoices. | Generalize the *job* machinery, not the interface: rename/extract `fin_sync_jobs` pattern into `sync_jobs(source_id, domain, cursor, status…)` when the SECOND connector lands — not before. For now, document the recipe (client + mapper + connector + register + tick) in a `connectors/README.md`. |
| 3.2 | **No inbound webhooks.** Polling-only is fine for SUSII; Shopify/Stripe-class sources push. | Add one generic `POST /api/connectors/[sourceId]/webhook` route that verifies a per-source secret and enqueues a sync job (reusing the existing job runner rather than processing inline). Defer until a push-capable connector exists. |
| 3.3 | **Page-level all-or-nothing retry.** One bad row fails the page. | Reuse the gateway's proven fix (message-ledger poison-batch): per-row SAVEPOINT inside the page tx, log rejects to `doc_audit_log` with `op='sync_reject'`. Only do this if SUSII actually produces poison rows — check job failure history first. |
| 3.4 | **Connector health invisible in UI.** Job states live in DB; no admin surface for "last sync, rows, failures per source". | Small `/finances/sources` status card reading `fin_sync_jobs` — also becomes the pattern for the stock connector's UI. |

---

## 4. Role-based UI/UX (P3)

### What's already good (verified compliant with the "one matrix" rule)
- One capability matrix drives: layout view-gate (`(app)/+layout.server.ts:89–92`), central API write-gate (`hooks.server.ts:226–233` — every POST/PUT/PATCH/DELETE under 11 business prefixes), nav filtering (`canClient` in Sidebar/Topbar/section navs). **No ungated business API routes were found.**
- Field-level masking (`shouldMaskSensitive` → maskPii) enforced on CRM/finance/scheduling reads; `ownerFilter` (if_owner) enforced across crm/sales/support (24 usages).

### Gaps and fixes

| # | Gap | Fix |
|---|-----|-----|
| 4.1 | **Buttons render for everyone; unauthorized users get a 403 after clicking.** This is the single biggest "doesn't feel like a real ERP" issue. | Permissions already reach the client (`page.data.permissions` powers nav). Add a `can(module, action)` client helper (thin wrapper over the same data) and sweep the doc pages: CRM detail edit/delete (`crm/[contactId]/+page.svelte:258–260`), sales/support/projects action buttons, EditableGrid mutation affordances, export buttons (`export` is already an action in the matrix — it's just not consulted client-side). Render disabled-with-tooltip rather than hidden for edit-tier actions, hidden for delete/manage. This is a sweep, not a redesign. |
| 4.2 | **No custom roles** — 5 system roles only; `permission_roles` catalog exists but no create UI. | Add "duplicate role as custom" in `/settings/roles`. The rules engine already resolves arbitrary role keys; this is UI + one insert. |
| 4.3 | **Multi-role per user supported in backend, invisible in UI.** | Surface as a multi-select chip list on the member row. Low effort, unblocks real org structures (e.g. "manager in scheduling, viewer in finance" via two scoped roles). |
| 4.4 | **if_owner / field_level enforced app-side only.** Phase 3/4 DB-tier RLS predicates planned but not built. | Keep app-side for now — the write path already funnels through `withOrgCore` + the hooks gate. Do the RLS predicate work when agent-originated writes land (P1), because agents bypass the SvelteKit hooks layer if they hit the gateway → hub API directly; verify the gateway→hub API path (`/api/gateway/insight` style) resolves capabilities per acting user, and extend `apiWriteCapability` coverage to any new gateway-facing write endpoints. |
| 4.5 | **ERPNext parity gaps:** role profiles, per-user record permissions, doc sharing. | Defer. Custom roles (4.2) + multi-role (4.3) cover the SME cases you actually have. Revisit when a customer asks. |

---

## 5. Full MCP surface + agent-native platform (P1 — highest leverage)

### Current state (verified)
- Gateway MCP server exists: HTTP + SSE at `/mcp/*` (`minion/src/gateway/mcp/`), bearer/JWT/OAuth-PKCE auth, identity resolver with scopes/orgId, dynamic registry with `tools/list_changed` notifications, dispatcher routed through the normal gateway request path (all auth gates apply).
- Registered today: 3 core introspection tools + 8 artifact-builder tools + plugin RPCs flagged `mcp: true`. **All read-only.**
- Agent data tools: CRM only (`crm_insight`, `crm_query`, `crm_search` → hub `/api/gateway/insight`). Finance, scheduling, support, sales, projects, memberships, work, settings, notifications, team: **zero coverage.**
- FloatingAssistant has page-context (17 route hints) but can only read + emit navigation links.
- Artifacts: DB-stored HTML bundles (agent_artifacts + revisions), builder agent, static render only — no postMessage→gateway bridge.
- Flows: full trigger/action runtime (trigger-manager.ts, LangGraph runner) but **no `flows.create` RPC** — agents cannot author automations.

### Build plan

**5.1 Module tool packs (the bulk of the work, but mechanical).**
For each module ship a read tool + the 2–3 highest-value write tools, as gateway tools with `mcpExport: true` (same pattern as `knowledge_graph`), all calling hub APIs with the acting user's JWT so RBAC + audit apply:

| Module | Read | Writes |
|---|---|---|
| finance | `finance_query` (invoices/payments/products, date-range, aggregates) | — (finance is connector-sourced; no agent writes v1) |
| scheduling | `bookings_query` | `booking_create`, `booking_reschedule`, `booking_cancel` |
| support | `tickets_query` | `ticket_create`, `ticket_update_status`, `ticket_comment` |
| sales | `orders_query` | `order_update_status` |
| projects | `projects_query` | `task_create`, `task_assign`, `task_update_status` |
| crm (extend) | existing 3 | `contact_update`, `contact_tag` |
| notifications | — | `notify_user` (respects notification templates/rules) |
| settings/admin | `org_settings_get` | owner-scoped only, defer writes |

Design rules: (a) every write tool round-trips through the hub API so `apiWriteCapability`, zod (1.1), audit (1.3), and RLS fire identically for humans and agents; (b) tool schemas ARE the zod schemas from 1.1 — write once, use at both boundaries; (c) actor recorded as `agent:<id>` in doc_audit_log.

**5.2 Hub pages as MCP resources.** Expose a `hub_pages` MCP resource (route map + per-page context schema — the `assistant-context.ts` route hints, formalized) so any MCP client (Claude, the assistant, external agents) can know what pages exist and deep-link. Cheap: the data already exists in `assistant-context.ts`.

**5.3 Artifact live bridge.** Define one postMessage protocol between artifact iframes and the host: `{type:'gateway.call', method, params}` → host validates method against a per-artifact allowlist (stored on the artifact row) → forwards over the existing WS → returns result. This turns artifacts from static renders into live micro-apps and is the concrete mechanism for "users change UI in real-time with agents." The `kind: 'live'` enum value is already reserved in the schema.

**5.4 Agentic flow creation.** Add `flows.create` / `flows.update` gateway RPCs (the hub `/api/flows` POST already exists with IDOR checks — expose it) + a `flow_builder` tool that takes trigger + nodes. Combined with §2.1's PG events as new trigger types (`hub:invoice.upserted` etc.), agents can then build "when a booking is created, send a WhatsApp confirmation and open a prep task" end-to-end.

**5.5 Assistant mutations.** Once 5.1 tools exist, the FloatingAssistant's personal agent gets them automatically (it's a gateway agent). Add a confirm-before-write UX in the chat panel (render a proposed-action card; user taps confirm → tool executes). Do not build a separate action system.

---

## 6. AI-Brains (P4)

**Goal:** users build isolated, org-scoped knowledge bases that both agents and users can reference.

### Foundations that exist
- Gateway knowledge-graph: typed memory (entity/fact/preference), FTS5 + sqlite-vec, `knowledge_graph` tool already `mcpExport: true` — but per-agent, no sharing, no UI, hard-delete only.
- Supabase PG already runs pgvector (`agent_memories` from memory-RAG work).
- "brain" is already an agent archetype in the hub (disco avatars) — the UX concept exists.

### Design (lazy version that actually delivers the vision)

**Schema (Supabase PG, org-scoped, RLS like everything else):**
```
brains            (id, org_id, name, description, icon, visibility: org|private, created_by, …)
brain_documents   (id, brain_id, org_id, title, source_type: upload|url|note|module_ref, source_ref, content_md, status, …)
brain_chunks      (id, brain_id, document_id, org_id, chunk_text, embedding vector, meta jsonb)
brain_access      (brain_id, principal_type: role|agent|user, principal_id, level: read|write)
```
Reuse: `doc_audit_log` for change history (fixes the KG's no-audit-trail gap), `naming_series` if brains need human IDs, RBAC module `brains` in the existing matrix (nav+route+API from the one matrix, per project rules — RBAC is a required build step).

**Pipeline:** upload/URL/note → markitdown-style extraction → chunk → embed (OpenRouter/gateway embed path — NOT the on-VPS qmd embedder; that caused the CPU-storm outage) → pgvector. Ingestion runs as `bg_jobs` (the workshop background runtime already exists) so big uploads don't block requests.

**Module-ref documents:** `source_type='module_ref'` lets a brain "subscribe" to live hub data (e.g. "product catalog brain" referencing fin_products) — re-embedded on the §2.1 events. This is the differentiator vs a generic RAG tool: brains that stay current with ERP data.

**Access:** `brain_access` rows decide which agents/roles can read/write each brain — this is the "isolated" requirement. Gateway tool `brain_search(brain_id, query)` + `brain_remember(brain_id, …)` check access via the acting identity; MCP-exported so external clients get it too.

**Hub UI `/brains`:** card grid (reuse autonomous-agents page pattern), detail page = documents list + search-test box + access panel + audit tab. Skip graph visualization v1 (the site's ECharts knowledge graph can be lifted later).

**Explicitly deferred:** user-defined object types, cross-org sharing, graph viz, brain-to-brain links.

---

## 7. Stock management module (P5) — ERPNext-based

Modeled on ERPNext's stock architecture (immutable stock ledger + cached bins + document-driven movements). *(I'm confident on the general ERPNext model; verify field-level details against ERPNext docs if you want 1:1 parity.)*

### Schema (Supabase PG, `stk_*`, org-scoped RLS)
```
stk_items        (id, org_id, code unique(org,code), name, uom, item_group, is_stock_item,
                  reorder_level, reorder_qty, valuation_method: fifo|moving_avg,
                  fin_product_id → fin_products, …)          -- bridge to existing catalog
stk_warehouses   (id, org_id, name, parent_id nullable)       -- tree, one root per org
stk_entries      (id, org_id, human_id via naming_series, type: receipt|issue|transfer|adjustment,
                  status: draft|submitted|cancelled, party_id nullable (supplier/customer),
                  posted_at, created_by, …)
stk_entry_lines  (id, entry_id, item_id, qty, uom, rate, from_warehouse_id, to_warehouse_id)
stk_ledger       (id, org_id, item_id, warehouse_id, entry_id, qty_delta, qty_after,
                  valuation_rate, value_delta, posted_at)     -- APPEND-ONLY, never updated
stk_bins         (org_id, item_id, warehouse_id, qty, valuation_rate, updated_at,
                  PK(org_id,item_id,warehouse_id))            -- cache, rebuildable from ledger
```

### Rules (this is where ACID earns its keep — apply §1 from day one)
- **Submit is the only thing that writes the ledger.** Draft entries are freely editable; `submit` runs in ONE `withOrgCore` tx: insert ledger rows + upsert bins + audit log + `pg_notify('stk.entry_submitted')`. Cancel inserts reversing ledger rows (ERPNext-style) — never deletes.
- **Negative-stock guard** in the same tx (`bins.qty + delta >= 0` unless org setting allows).
- **Bins are a cache:** a `rebuildBins(orgId, itemId?)` maintenance function replays the ledger — your recovery story for any drift.
- **Ledger is the audit trail** — plus `doc_audit_log` for document-level status changes, reusing `workflow_transitions` for draft→submitted→cancelled.
- **Valuation:** moving average only in v1 (`ponytail:` FIFO queues deferred until someone needs FIFO costing).

### Integration points (all reuse)
- **Party spine:** suppliers/customers on entries via `party_id` — Connections panel gets a "Stock" group.
- **Finance:** `stk_items.fin_product_id` links to the SUSII-synced catalog; a §2.1 event handler can auto-draft an `issue` entry when an invoice with stock items lands (org-configurable, off by default).
- **Reorder alerts:** the notifications tick already exists — add a rule: `bins.qty <= items.reorder_level` → notification. No new cron (remember: new ticks must be in the hooks.server.ts unauth allowlist if added).
- **RBAC:** `stock` module in the matrix (view/create/edit/delete/export/manage), `/api/stock` added to `API_WRITE_PREFIXES` — required build step.
- **Agent tools (P1 pattern):** `stock_query` (levels, movements, valuation) + `stock_entry_create` (draft only; submit stays human/role-gated v1).
- **AI-Brains:** inventory brain via `module_ref` → agents answer "what's running low?" over chat channels.
- **UI:** `/stock` — items grid (EditableGrid), warehouse tree, entry form (stepper like /book), ledger view per item, bin levels dashboard card.

### Deferred (v2+)
Batch/serial numbers, multi-UOM conversion, purchase-receipt/delivery-note doc types (fold into receipt/issue for now), landed costs, stock reconciliation import, quality inspection.

---

## 8. Sequenced roadmap

| Phase | Work | Why this order |
|---|---|---|
| **P0** | zod write validation (1.1) + audit-log completion (1.3) + optimistic locking on doc modules (1.2) | Prerequisite for letting agents write. Small, mechanical. |
| **P1** | Module tool packs + MCP export (5.1), hub_pages resource (5.2), assistant confirm-to-write (5.5) | The agent-native unlock; everything routes through P0's hardened boundary. |
| **P2** | PG LISTEN/NOTIFY event bus (2.1) + cache invalidation (2.4) + flow trigger types (feeds 5.4) | Turns the platform reactive; enables agentic automations. |
| **P3** | Role-aware UI sweep (4.1), custom roles (4.2), multi-role UI (4.3) | ERP-grade feel; independent of P1/P2, can parallelize. |
| **P4** | AI-Brains (§6) | Depends on P0 (RBAC module pattern) + P2 (module_ref freshness). |
| **P5** | Stock module (§7) | Depends on P0 discipline + P2 events + P1 tool pattern; biggest net-new build. |
| Ongoing | Artifact live bridge (5.3), agentic flows (5.4) | Ship alongside P1/P2 as the flashy layer once plumbing is in. |

Cross-cutting rules that keep applying: new tables → Supabase PG only; new ticks → hooks.server.ts allowlist; every new page/API → RBAC matrix; i18n keys for all new UI; embeddings never on the VPS-local qmd path.
