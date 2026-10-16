# Feature Specification: Sandbox pages — agent-built custom visuals over configurable data endpoints

**Feature Dir**: `specs/010-hub-sandbox-pages` | **Repos & PR bases**: minion_hub → `master` (POC runs locally first) · minion-meta → `dev` (this spec)
**Created**: 2026-10-15 | **Status**: Draft | **Tags**: security, logic | **Human gates**: owner approves this spec before the POC merges; owner merges. The POC itself runs on `dev:local` only.
**Input**: Owner, 2026-10-15 (verbatim, abridged): "I want Users to be able to request custom html pages. They decide what shows onscreen … a super lightweight library that compiles html/css/js … the agent builds the whole page layout or component-elements (in their own file; referenced in the main page). The agent would use the available endpoints … and expose those endpoints to the sandbox page … in the page/element it builds, it implements any calculations. So the api doesnt return very specific endpoints … giving highly configurable endpoints (with their own default limits) … eg. base endpoint pulls 100 customers, but through configuration, it returns … customers born in 2000 and later, name starts with "S" … verify if this hot-load functionality is viable … use echarts, which is part of the base packages. But deal with tree-shaking … Build a POC in the organization page group. For now, only visible to admin role, but first run locally … chat with the popout agent, it knows that its in the sandbox page and gets to create custom charts. Make sure API endpoints for these special queries are supported and the agent knows how/when to use them, where to find them. Jev here is big for classification."

## AS-IS / TO-BE / DELTA (evidence, hub `origin/master` 4fe89934 + #540)

**AS-IS.**
- The Organization sidebar group has three items (Inicio `/home`, Resumen `/overview`, Equipo `/team`): `src/lib/nav/modules.ts:581-588`, `src/lib/nav/routes.ts:94-115`. Admin-only pages exist via `'role:admin'` in `src/lib/routes/route-access-registry.ts:126` (`/notifications`).
- The hub sends no Content-Security-Policy (no `csp` in `svelte.config.js`, no header in `hooks.server.ts`), so a sandboxed `<iframe srcdoc>` is unconstrained by the host today.
- ECharts 6.1 is a dependency (`package.json:74`) imported whole (`from 'echarts'`, 15 sites) into the app bundle; `node_modules/echarts/dist/echarts.min.js` exists. Nothing serves it as a standalone asset.
- The floating assistant already has a WebMCP-shaped in-page tool registry: `registerTool/registerTools(…, {signal})` (`src/lib/assistant/model-context.ts:54,83`), tools execute in the browser from ```` ```minion-ui ```` fenced JSON (`ui-blocks.ts:26`, `runner.ts:47`), and **every registered tool's schema is listed in the core envelope** by `uiToolsBriefing(getTools(), …)` (`assistant-context.ts:131`). Tools are registered once from `(app)/+layout.svelte:57`; no page registers its own.
- The JEV turn router classifies mode + five nouls (`turn-router.ts:70-125`); its state is `ui_locale` + the text only (`assistant-router.service.ts:45-47`) — the classifier does not know which page the user is on. Hub #540 made the winning mode always load its manifest.
- Business tables are not declared in Drizzle (memory: schema lives only in Postgres); human reads go through hand-written services. Real columns (information_schema, 2026-10-15): `crm_contacts(id, org_id, display_name, profile_id, owner_id, source, custom_fields, created_at, party_id, human_id, deleted_at)`, `pos_tickets(id, org_id, human_id, shift_id, party_id, crm_contact_id, customer_name, status, subtotal, discount, total, currency, submitted_at, voided_at, created_by)`, `pos_ticket_lines(id, org_id, ticket_id, kind, fin_product_id, description, qty, unit_price, discount, total)`, `pos_payments(id, org_id, ticket_id, shift_id, method, amount, paid_at)`, `fin_invoices(id, org_id, number, issued_at, client_name, client_doc_number, client_email, currency, subtotal, tax, discount, total, status, client_id)`, `fin_products(id, org_id, code, name, category, unit_price, active, kind)`, `sched_bookings(id, org_id, start_time, end_time, status, title, attendee_name, attendee_email, attendee_phone, crm_contact_id, product_id, kind_id, party_id)`, `stk_items(id, org_id, code, name, uom, item_group, reorder_level)`, `stk_bins(org_id, item_id, warehouse_id, qty, valuation_rate)`.
- RBAC primitives for a query layer exist: `requireOrgCapability(locals, module, action)` (`rbac.service.ts:1258`), `resolveOwnerScope(locals, module)` → `{scoped, column, profileId}` (`:457-467`), `shouldMaskSensitive(locals, module)` (`:437`), `withOrgCore(scope, fn)` (`src/server/db/with-org-core.ts:158`) for RLS-scoped SQL.
- Agent-side arbitrary SQL is disabled (`ASSISTANT_SQL_DISABLED`); spec 002 proposes typed dataset queries. No general, parameterized, RBAC-aware read endpoint exists for the browser either.

**TO-BE.**
- A new admin-only page `/sandbox` in the Organization group hosts a grid of user-owned **elements**. Each element is `{id, title, html, css, js, w, h}` rendered inside its own sandboxed iframe (`sandbox="allow-scripts"`, no same-origin, `srcdoc`) so element code can never touch the hub DOM, cookies or network. Elements re-render instantly on save (the "hot-load": swap `srcdoc`; no Vite, no Svelte compile).
- Element code talks only to a tiny **bridge** injected into the srcdoc (`window.minion`): `minion.query(spec)` → the host performs `POST /api/sandbox/query` with the user's session and posts rows back; `minion.ready(fn)`, `minion.theme` (the hub's semantic tokens as CSS variables), `minion.echarts` resolved from an allowlisted vendor asset. Calculations (e.g. gross margin) live in the element's JS, as the owner asked.
- **Configurable data endpoint**: one endpoint, `POST /api/sandbox/query`, takes a declarative spec over a server-owned **dataset registry** — `{dataset, select?, where?: [{col, op, value}], orderBy?, limit? (default 100, max 1000), groupBy?, aggregate?: [{fn, col, as}]}` — compiled to parameterized SQL against an allowlist of columns per dataset, inside `withOrgCore` (RLS), gated by the dataset's RBAC module (`view`), owner-scoped and masked by the same helpers the human path uses. `GET /api/sandbox/datasets` returns the catalog (dataset → columns with types and a one-line meaning). Datasets in the POC: `crm.contacts`, `pos.tickets`, `pos.ticket_lines`, `pos.payments`, `finance.invoices`, `finance.products`, `scheduling.bookings`, `stock.items` (joined to bins for `qty_on_hand`).
- **Agent integration (context engineering)**: the `/sandbox` page registers page-scoped tools for the lifetime of the page — `sandbox.datasets` (catalog), `sandbox.preview` (run a query spec, ≤20 rows, returns shape + sample), `sandbox.upsert_element`, `sandbox.remove_element`, `sandbox.list_elements` — so their schemas appear in the envelope only while the user is on the sandbox (progressive disclosure: the catalog and samples are fetched by tool call, never inlined). A new JEV manifest `sandbox` (mode `record_action`, noul "Is the user asking to create, change, or remove a chart, table or visual element on the page they are on?") injects the element-authoring protocol (runtime API, size/theme rules, "preview before you build") only on building turns; the classifier state gains `page: <route>` so it knows the user is in the sandbox.
- **Tree-shaking decision**: element code never imports from the app bundle. Allowlisted runtime libraries are served as whole files via Vite asset URLs (`import echartsUrl from 'echarts/dist/echarts.min.js?url'`), so nothing is tree-shaken away and the app bundle is unchanged; the srcdoc CSP (`script-src 'unsafe-inline' <hub origin>`) allows only those assets. Adding a library = one line in the vendor allowlist.
- Storage: table `sandbox_elements(id, org_id, page, title, html, css, js, w, h, position, created_by, updated_at)`; POC page = `default`.

**DELTA.** Slices: S1 data layer (registry + query compiler + endpoints + tests with low-privilege persona). S2 page + iframe host + bridge + vendor asset + element CRUD + migration/seed + RBAC/nav/route-contract/i18n. S3 agent: page-scoped tools, `sandbox` JEV manifest + state route, briefing text. S4 local proof: an admin asks the floating assistant on `/sandbox` for "gross margin by product this month" and gets a working ECharts bar chart element.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin asks the assistant for a chart and gets a live element (Priority: P1)
On `/sandbox`, the admin types "show me gross margin by product for this month as a bar chart". The assistant calls `sandbox.datasets`, previews `pos.ticket_lines` joined data, writes an element whose JS queries the data and computes margin, and the element renders with ECharts.
**Acceptance**: Given an admin on `/sandbox` with a seeded org, when the request is sent, then within one assistant reply an element appears rendering a bar chart with one bar per product, and `sandbox_elements` holds one row.

### User Story 2 - Configurable endpoint answers a filtered question without a bespoke route (Priority: P1)
**Acceptance**: `POST /api/sandbox/query {dataset:'crm.contacts', where:[{col:'display_name',op:'startsWith',value:'S'},{col:'created_at',op:'gte',value:'2000-01-01'}], limit:50}` returns ≤50 matching rows for a member with `crm:view`, 403 without it, owner-scoped rows for an owner-scoped role, and masked PII columns for a low field level.

### User Story 3 - Element isolation (Priority: P1)
**Acceptance**: an element whose JS tries `fetch('/api/me')`, `parent.document`, or `document.cookie` fails (network blocked by CSP + sandbox; no same-origin), while `minion.query` succeeds.

### User Story 4 - Chat on the sandbox page stays cheap (Priority: P2)
**Acceptance**: "thanks" on `/sandbox` loads no `sandbox` manifest; "add a pie of payment methods" loads it.

### Edge Cases
- Query spec with an unknown column/op/dataset → 400 naming the field; no SQL executed.
- `limit` above max is clamped to 1000; aggregate without groupBy returns one row.
- Element JS throws → the iframe shows the error inline; other elements unaffected.
- Non-admin visiting `/sandbox` → 404 (registry `role:admin`); nav item hidden.
- Theme switch → elements re-render with new tokens.

## Requirements *(mandatory)*
- **FR-001** Dataset registry: id, RBAC module, table/base SQL, org column, allowed columns `{name, type, pii?, meaning}`, default order, owner column.
- **FR-002** Query compiler: validates spec against the registry, emits parameterized SQL (ops: eq, neq, gt, gte, lt, lte, in, between, like, startsWith, isNull), groupBy + aggregates (count, sum, avg, min, max), limit default 100 / max 1000, statement timeout 5 s.
- **FR-003** `POST /api/sandbox/query` and `GET /api/sandbox/datasets`: `requireAuth`, dataset module `view` capability, `withOrgCore`, owner scope, PII masking; errors are field-named 400s.
- **FR-004** `/sandbox` page (admin-only via registry `'role:admin'`), Organization nav item + palette route, route-design manifest screen, i18n keys (EN/ES), design tokens only.
- **FR-005** Element host: iframe `sandbox="allow-scripts"`, srcdoc built from a fixed template (CSP meta, theme CSS vars, bridge script, vendor script tags, user html/css/js); postMessage RPC with per-element ids and request ids; host rejects messages from other frames.
- **FR-006** Vendor assets: `echarts` via `?url` import; allowlist in one module; bridge exposes `minion.echarts` lazily.
- **FR-007** Element CRUD: `GET/POST /api/sandbox/elements`, `PATCH/DELETE /api/sandbox/elements/[id]`, admin-only in POC (`requireAdmin`), org-scoped; migration + seed matrix entry.
- **FR-008** Page-scoped assistant tools registered with the page's abort signal: `sandbox.datasets`, `sandbox.preview`, `sandbox.upsert_element`, `sandbox.remove_element`, `sandbox.list_elements`.
- **FR-009** JEV: manifest `sandbox` (threshold initial 0.5, mode `record_action`); classifier state line `page: <canonical route>`; envelope section (gated) with the authoring protocol; a one-line core hint on `/sandbox` ("you are in the Sandbox; call sandbox.datasets before building").
- **FR-010** Local proof script/notes: `bun run dev:local`, admin persona, the US1 prompt, screenshot.

## Success Criteria *(mandatory)*
- **SC-001** US1 passes on `dev:local` with the seeded org (screenshot in the PR).
- **SC-002** Query endpoint tests: 1 happy path per dataset, 3 negative controls (no capability → 403, unknown column → 400, limit clamp), owner-scope and masking cases.
- **SC-003** Isolation test (browser): the three forbidden accesses fail, `minion.query` works.
- **SC-004** Envelope size on `/sandbox` for a `chat` turn ≤ the pre-feature `chat` envelope + 200 chars.
- **SC-005** All hub gates green: prettier, svelte-check, `lint:design && lint:tokens`, route-contract tests, targeted vitest.

## Clarifications
- Q: Page-per-user or per-org? A: per-org `default` page in the POC; elements carry `created_by` (ASSUMPTION — owner to confirm).
- Q: Can elements write data? A: No. Read-only in the POC; writes would reuse the dispatcher (spec 004) later.
- Q: Who may author elements? A: admin role only in the POC (owner's words); a `sandbox` RBAC module later.
- Q: "Lightest framework"? A: none — vanilla HTML/CSS/JS inside the iframe plus the 2 KB bridge; ECharts is the only runtime library. Svelte in the iframe would need a compiler at runtime and buys nothing for charts.
- [NEEDS CLARIFICATION: should elements be shareable to non-admin members in a later slice, and does that require a per-element RBAC module rather than role:admin?]

## Assumptions
- `withOrgCore` sets RLS for the org; the registry's org column filter is defence in depth.
- The seeded local org has enough POS data for a margin chart (qa seed matrix `pos` domain).
