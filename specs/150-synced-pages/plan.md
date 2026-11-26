# Implementation Plan: Synced pages S1 — filters + connections

**Branch**: hub `feat/150-synced-pages-s1` (PR base `master`) · meta `spec/150-synced-pages` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md) | **Proposal**: `proposals/2026-11-25-hub-synced-pages.md`

**Input**: `specs/150-synced-pages/spec.md` (pass 2) + EGM stage 5–7 dispositions (`.local/egm/2026-11-25-synced-pages/`).

## Summary

A new `filter` block kind publishes a page value; data blocks hold up to 6 connections (`listens`)
mapping a value name onto one of their own columns. The browser resolves current values into extra
where-clauses through the existing `blockQueries` → `/api/sandbox/query` path (bound values, RBAC,
org scope unchanged). Wiring problems are computed on the server from the full registry and shipped
with the element list. Connections have their own write so agent edits never drop them. Filter
values live in the URL. All anchors below are hub master `133c4154`.

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, SvelteKit 2 · **Primary Dependencies**: zod 4 (grammar + JSON Schema), drizzle `sql` (compiler), existing hub UI primitives (`Combobox`/`Picker`, `SegmentedControl`, `Chip`, `Button`) · **Storage**: Postgres `sandbox_elements.spec jsonb` (existing column, no migration) · **Testing**: vitest (unit + mounted `*.mounted.test.ts`), Postgres-lane SQL tests, Playwright e2e on the QA stack, a11y gates (spec 137) · **Target Platform**: hub on Vercel (Chromium, Firefox, Safari 18) · **Project Type**: web app (SvelteKit full stack) · **Performance Goals**: filter change → connected blocks updated < 2 s on QA (SC-001) · **Constraints**: ≤ 20 where entries per query, ≤ 100 `in` values (existing limits); debounce 250 ms; no extra request before first paint; S1 excludes link state, custom ranges, id labels, page-name input (stage 8) · **Scale/Scope**: pages of ~5–20 elements, admins only.

## Constitution Check

| Principle | Status |
|---|---|
| I. Spec before code | ✅ spec.md pass 2 + this plan + tasks.md before implementation |
| II. AS-IS → TO-BE → DELTA with evidence | ✅ proposal §AS-IS (anchored) + §S1 transitions and proofs |
| III. Slice-scoped delivery | ✅ one hub PR from an isolated worktree off `origin/master`; gates in the foreground before the PR |
| IV. Required build steps | ✅ design tokens + `lint:design && lint:tokens` (filter bar); Paraglide es/en; no new route/API/nav (RBAC unchanged: existing `/sandbox` + `/api/sandbox/*` gates); route contract unchanged; a11y gates (spec 137); RLS-bypass inventory untouched (no new DB caller) |
| V. Security/data human gates | Not tagged security/data (spec Assumptions): no new data surface, no migration. The PATCH change and compiler type check touch a data path ⇒ owner merges the PR regardless (hub admin-merge rule) |

Post-design re-check: ✅ no violations; see Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/150-synced-pages/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md · tasks.md
├── contracts/  (grammar.md, api.md, tools.md, url.md)
└── checklists/requirements.md
```

### Source Code (hub, files touched)

```text
src/lib/sandbox/blocks/
├── schema.ts          # + filterParamsSchema, listensSchema, PageValue; blockSpecSchema gains 'filter'; DATA_KINDS
├── query.ts           # blockQueries(spec, now, bindings); compare with preset range
├── catalog.ts         # + filter description/example; one wired example page
└── format.ts          # (unchanged)
src/lib/sandbox/
├── canvas.ts          # describeElement/canvasSummary: filters section + per-block connections, problems, candidates; skip filters in layout
├── tools.ts           # sandbox.block_filter, listens on block_*, sandbox.wire, list_elements wiring, arrange skips filters
├── host.svelte.ts     # elements + wiring from the server; publish(elements, wiring, capability)
├── values.svelte.ts   # NEW: ValuesSource + localValues (urlValues in S2)
└── library.ts         # componentCopy keeps listens; filters copyable
src/lib/components/sandbox/
├── SyncedPage.svelte  # NEW: filter bar + grid + values source (URL or $state)
├── FilterBar.svelte   # NEW: ordered filters, remove/edit, invalid-value notice
├── filters/DateFilter.svelte, filters/PickFilter.svelte   # NEW
├── BlockView.svelte   # bindings prop, stable key, AbortSignal, fail-closed
├── ElementFrame.svelte, LibraryPanel.svelte              # filters excluded / handled
└── blocks/ListBlock.svelte (and any `spec.source` reader)  # guard for non-data kinds
src/routes/(app)/sandbox/+page.svelte, +page.server.ts    # use SyncedPage; load elements + wiring server-side
src/routes/api/sandbox/elements/+server.ts, [id]/+server.ts # GET returns wiring; PATCH accepts `listens`
src/server/sandbox/
├── blocks.ts          # validateBlockSpec: filter kind; listens checks (exists, not PII, unique var, ≤6, where budget)
├── wiring.ts          # NEW pure: pageWiring(elements, registry) → publishers, per-block bindings/problems/candidates
├── sandbox.service.ts # setListens(ctx, id, listens) — row lock + jsonb_set; upsert keeps stored listens when omitted
├── query-compiler.ts  # value type check for eq/neq/gt/gte/lt/lte/in against column type → 400
└── datasets.ts        # scheduling.bookings: service_name expr column
src/server/mcp/sandbox-tools.ts  # sandbox_block_filter, listens on block tools + sandbox_element_write; wiring in sandbox_elements
src/routes/api/sandbox/query/+server.ts # accept `bucket` (master bug)
messages/{en,es}.json            # filter bar strings
```

**Structure Decision**: existing hub layout; two new pure modules (`page-values.ts` client, `wiring.ts` server) so both are unit-testable without DOM or DB.

## Design

Pass 2 (after EGM stages 8–9; dispositions in `.local/egm/2026-11-25-synced-pages/`). Task-level detail and exact anchors live in [tasks.md](tasks.md); this section states the decisions.

### Grammar — [contracts/grammar.md](contracts/grammar.md)
`BLOCK_KINDS` stays the 4 data kinds. A separate `filter` member joins `blockSpecSchema`; `filterToolSchema()` (envelope `{id?, title}`) produces the filter tool; `blockToolSchemas()` stays data-only. `listens` is optional with no default (absent = keep stored). Cross-element and cross-field checks live in `validateBlockSpec`/`validateListens`, not in zod (zod 4 refinements break `.extend`/`shape` copying).

### Wiring report (server, pure `wiring.ts`)
Computed from the full registry and returned with `GET /api/sandbox/elements`, the page load and MCP `sandbox_elements`. Problems: `no_publisher`, `kind_mismatch`, `conflicting_publishers`; same-kind duplicates are valid (default from the lowest `position`).

### Resolution
`blockQueries(spec, now, bindings = [])`; clauses appended after the block's own; same-column date replaces the own window, other column adds to value/compare/trend; `all` on the same column removes the window and skips compare/trend. Values come from a `ValuesSource` (`values.svelte.ts`): S1 ships `localValues` (filter defaults → empty); S2 adds `urlValues`. One 250 ms debouncer (`$lib/pacer` `createDebouncer`) per page.

### Fail-closed and reloads
BlockView keys its load on `JSON(spec) + version + bindingKey` in an `$effect` with an `AbortController`; a block with connections renders an error (no request) when the wiring is unavailable; a binding with a wiring problem is not applied and the problem shows in the page description.

### Connections write
`setListens` and the kept-listens merge run in one `withOrgCore` transaction with `select … for update`; validation runs on the merged spec; all `upsertElement` invariants (uuid, library guard, `updated_at`, `written_by_key`) apply. PATCH `listens` overrides `spec.listens`. MCP routes `listens` on `sandbox_element_write` through the same function.

### Compiler hardening
`condition(expr, entry, column, i)` checks value forms per column type (see tasks T008); errors name `where.<i>.value`. Also fixes a master bug: `/api/sandbox/query` strips `bucket`, so trend and time-series queries 400 (T009).

### UI
FilterBar (remove + save-to-library; changing a filter = ask the assistant until S4), DateFilter (`Dropdown` of `RANGES` + Clear), PickFilter (`Combobox` single, `MultiSelectFilter` multi, top 200 by count, nulls dropped client-side). SyncedPage owns FilterBar + grid + layout/editing; `+page.svelte` keeps host, page lease, tools and LibraryPanel. `sandbox.arrange` reports filter ids as failed.

### Agent surface — [contracts/tools.md](contracts/tools.md)
In-page: `sandbox.block_filter`, `listens` on `sandbox.block_*`, `sandbox.wire`, `sandbox.list_elements → {elements, wiring}`. MCP: `sandbox_block_filter`, `listens` on block tools and `sandbox_element_write`, wiring in `sandbox_elements`. Page description (`canvasSummary(elements, wiring?, cols)`) lists filters then per-block connections and problems; the manifest tells the model to create filters and connected blocks in one reply.

### Registry
`scheduling.bookings.service_name` = `fin_products.name` via a registry-owned left join on `t.product_id` (no FK needed), same pattern as `pos.ticket_lines.product_name`.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Server-side wiring report | One report for in-page agent, MCP, S4; fail-closed first paint | Client catalog: RBAC-filtered, async, can silently show unfiltered numbers (critic D2) |
| Separate `listens` write | Agent edits must not drop connections; concurrent toggles | Whole-spec replace loses wiring and concurrent writes (critic D1) |
| URL value typing + compiler type check | Bad links would 500 / throw | "Apply as given" crashes on uuid/number/date columns (critic D3) |
