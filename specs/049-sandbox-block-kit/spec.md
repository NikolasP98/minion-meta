---
id: 049-sandbox-block-kit
title: Sandbox block kit — deterministic, typed building blocks from the shared UI library
stage: spec
status: implementing
verdict: pending
pr: 642
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub, minion-meta]
tags: [logic, data, ui]
---

# Feature Specification: Sandbox block kit

**Feature Branch**: `spec/049-sandbox-block-kit` (meta) · hub slice branch `feat/sandbox-component-kit` → PR base `master` (`node scripts/repo-policy.mjs show hub`).
**Created**: 2026-11-08 · **Status**: implementing (owner asked for the implementation in the same turn; the owner merges — the hub slice carries a nullable-column migration, so the owner's merge is the data gate of constitution §V).
**Input** (owner, 2026-11-08, verbatim): "I like how the agent is able to create new elements (tested in "/sandbox"). The quality of the elements needs to improve. Use the library in the shared components as available items that the agent can use as building blocks. I want to minimize the thinking that the agent does when creating the user's desired artifacts. It should be close to deterministic, like an mcp/tools that take params and configs (both optional and required), and has presets (like themes and styles preloaded). This is for the layout/ui, but also consider how the agent builds queries and connections to populate the crafted ui. The UI should be consistent with the rest of the sites UI/UX."

**Process note**: the brainstorming question round was skipped because the session runs autonomously (proactive mode) and the owner's brief fixes intent, medium and constraints. Every design call below is marked **(my call)** so the owner can veto it in review.

## AS-IS (observable today; anchors = hub `master` @ `50c9d4e1`)

- **The model writes raw code for every element.** `sandbox.upsert_element` takes `title, html, css, js, w, h` (`src/lib/sandbox/tools.ts:97-110`); the element runs in `<iframe sandbox="allow-scripts">` at a null origin (`src/lib/sandbox/srcdoc.ts`), with ECharts/d3 loaded lazily through the `minion.*` bridge (`src/lib/sandbox/bridge.ts`).
- **The only "design system" an element sees is 36 copied CSS custom properties** (`SANDBOX_THEME_TOKENS`, `srcdoc.ts:15-52`) plus a prose manual in the turn-router manifest (`src/lib/assistant/turn-router.ts:146-187`). None of the hub's shared primitives (`$lib/components/ui`: Chip, ProgressBar, EmptyState, Skeleton, DataTable, Chart, Sparkline…) can run inside the frame, so every KPI tile, table and chart is a hand-rolled copy whose spacing, type roles, money formatting and empty/error states drift from the rest of the hub.
- **Quality depends on the model's judgement each time.** The manifest tells it to "colour the series from `minion.theme`", "catch errors and render the message", "put calculations in the element JS"; a 600-token JS blob per visual is the normal output and the failure mode is a blank box or an off-brand tile (owner: "the quality of the elements needs to improve").
- **Queries are already declarative** (`QuerySpec` in `src/server/sandbox/query-compiler.ts:40-48`: dataset, select, where, orderBy, groupBy, aggregate, limit; registry-only identifiers, RBAC + RLS in `sandbox.service.ts:runQuery`). There is no time bucketing (`date_trunc`) and no period preset, so "sales per day for the last 30 days" means the model computes the date strings and groups rows in element JS.
- **The canvas map infers datasets and chart type from the JS text by regex** (`src/lib/sandbox/canvas.ts:27-31`, `TODO(handoff)` on record).
- **Library entries are html/css/js copies** (`src/lib/sandbox/library.ts:componentCopy`).
- Storage: `sandbox_elements(id, org_id, page, title, html, css, js, w, h, position, created_by, published, …)` (`supabase/migrations/20261016000000_sandbox_elements.sql`, `…000100_…published.sql`). Seed fixture `tenancy.sandbox.hello` (`scripts/qa/seed/tenancy.ts:362-385`).

## TO-BE

A **block** is a sandbox element described by a JSON spec instead of code. The hub renders it natively with its own shared components, so it is pixel-consistent with every other hub page by construction, and the assistant produces it by calling one typed tool per block kind with required/optional parameters and named presets.

### Invariants
- **I1 Typed, deterministic authoring.** Each block kind is one assistant tool (`sandbox.block_kpi`, `sandbox.block_chart`, `sandbox.block_table`, `sandbox.block_list`) whose JSON Schema is generated from the same zod schema the server validates with. Same input ⇒ same stored spec ⇒ same rendering. The model never writes markup, CSS or chart options for a block.
- **I2 Presets, not freedom.** Chart appearance is a `preset` enum (`bar`, `horizontal-bar`, `stacked-bar`, `line`, `area`, `pie`, `donut`); value display is a `format` enum (`number`, `compact`, `money`, `percent`); colour is a `tone` enum mapped to semantic status tokens (`accent`, `info`, `success`, `warning`, `danger`, `neutral`); time windows are `period` presets (`today`, `yesterday`, `last_7d`, `last_30d`, `last_90d`, `this_week`, `this_month`, `last_month`, `this_year`, `all`) with `bucket` (`day`, `week`, `month`). Theme is never a parameter: blocks read the active theme tokens like any hub component.
- **I3 Connections are declared, not coded.** A block's `source` names a dataset, an optional metric/measures, an optional dimension or time bucket, filters and a period. A pure function turns it into `QuerySpec`(s); the query still runs through `/api/sandbox/query` with the user's RBAC, RLS, owner scope and PII masking unchanged (`sandbox.service.ts:runQuery`). Blocks run no code of their own.
- **I4 Server is the trust boundary.** The API validates the spec shape (zod) and the source against the dataset registry (unknown dataset/column, metric on a non-number, bucket on a non-timestamp ⇒ 400 naming the field). A stored spec is JSON; it is rendered through Svelte text bindings only — no `{@html}`.
- **I5 Shared components only.** KPI tile = `.t-*` type roles + `Sparkline` + `ProgressBar` + `Chip`; chart = `$lib/components/charts/Chart.svelte` with `chartColors()`; table = `DataTable variant="plain"` with `money` columns; list = `ProgressBar` rows; loading = `Skeleton`; error/empty = `EmptyState`. `lint:design && lint:tokens` stay green and the changed-file debt does not increase.
- **I6 Coexistence.** Custom html/css/js elements keep working unchanged (same table, `spec` null). The manifest tells the model: block first; custom element only when no block kind fits. Library copy, drag-drop, arrange, canvas map and remove all work for both.
- **I7 Canvas map is exact for blocks.** `describeElement` reads dataset and kind from the spec; regex inference remains only for custom elements.

### User scenarios
- **US1 (P1)** "Show me sales this month" → the assistant calls `sandbox.datasets`, then `sandbox.block_kpi` with `{title, source:{dataset:'pos.tickets', metric:{fn:'sum', col:'total'}, period:{col:'submitted_at', range:'this_month'}, compare:true}, format:'money'}`. A KPI tile renders the money value with the currency symbol, a delta chip versus the previous month, in the hub's type roles.
- **US2 (P1)** "Sales per day for the last 30 days as a chart" → `sandbox.block_chart` with `preset:'area'`, `source:{dataset:'pos.tickets', time:{col:'submitted_at', bucket:'day'}, measures:[{fn:'sum', col:'total'}], period:{col:'submitted_at', range:'last_30d'}}`, `format:'money'`. The chart uses the hub palette, money axis + tooltip formatters, and the a11y data table that `Chart.svelte` already provides.
- **US3 (P2)** "Top products" → `sandbox.block_list` with a dimension + metric; ranked rows with proportional `ProgressBar`s.
- **US4 (P2)** "List the last 20 contacts" → `sandbox.block_table` with `select` columns; a plain `DataTable` with sortable headers and date formatting.
- **US5 (P2)** A bad column name → the tool returns the 400 (`invalid source.metric.col: unknown column "totl" on pos.tickets`); nothing is written; the model corrects without guessing.
- **US6 (P2)** A dataset the viewer may not read → the block renders the same `EmptyState` error text the human routes show ("Your role does not permit 'view' on pos") instead of a blank box.

### Success criteria
- **SC-001** Every block tool's `inputSchema` lists its `required` keys and enumerates every preset; a test asserts the four tools are registered on `/sandbox` and their schemas are derived from the shared zod schemas.
- **SC-002** `blockQueries(spec, now)` is pure and covered for: totals, period window (fixed `now`), compare window, time bucket, dimension + order + limit, table select.
- **SC-003** Invalid specs (unknown dataset, unknown column, metric on text, bucket on number, bad preset) are rejected with 400 and a field path by the API test.
- **SC-004** A seeded KPI block renders on the QA stack (`tenancy.sandbox.kpi` fixture; contract test asserts the row and its spec).
- **SC-005** Hub gates: `bun run check` 0/0, `bun run test` green, `lint:design && lint:tokens` green, `i18n:compile` run.

## DELTA (exact transitions; the test that proves each)
| # | From | To | Proof |
|---|---|---|---|
| D1 | `sandbox_elements` has no spec column | `spec jsonb null` (migration `20261108000000_sandbox_elements_spec.sql`); service reads/writes it; size limit counts its bytes | `scripts/qa/seed/seed.contract.test.ts` (new fixture), `src/routes/api/sandbox/server.test.ts` |
| D2 | `QuerySpec` groups by raw columns only | optional `bucket: {col, unit}` → `date_trunc(unit, expr)` projected as `col` and grouped; timestamp columns only; PII guard applies | `query-compiler.test.ts` |
| D3 | no block schema | `src/lib/sandbox/blocks/schema.ts`: zod schemas per kind + `blockToolSchemas()` via `z.toJSONSchema` | `blocks/schema.test.ts` |
| D4 | model computes windows/groups in JS | `src/lib/sandbox/blocks/query.ts`: `blockQueries(spec, now)` → `QuerySpec[]` (value, compare, trend) | `blocks/query.test.ts` |
| D5 | model writes ECharts options | `src/lib/sandbox/blocks/chart-option.ts`: `chartOption(spec, result, colors, format)` | `blocks/chart-option.test.ts` |
| D6 | routes accept html/css/js | routes also accept `spec` (zod) and the server validates `source` against `DATASETS` (`src/server/sandbox/blocks.ts`) | `server.test.ts`, `blocks.server.test.ts` |
| D7 | `ElementFrame` always renders an iframe | renders `BlockView` when `element.spec` is set; header (save/remove) shared | `BlockView.svelte.test.ts` (kpi with stubbed fetch) |
| D8 | 6 sandbox tools | + 4 block tools generated from the schemas; manifest text prefers blocks | `tools.test.ts`, `turn-router.test.ts` unchanged (manifest gating) |
| D9 | canvas map regex-only | spec-aware `describeElement` | `canvas.test.ts` |
| D10 | library copies html/css/js | copies `spec` too; panel shows the kind | `library.test.ts` |

## Out of scope (ledger → `proposals/2026-11-08-hub-sandbox-block-kit-followups.md`)
- Series split by a second dimension (`stacked-bar` stacks measures, not categories).
- Cross-block filters / a board-level date control (`DateRangeControls`) that re-queries every block.
- Drill-down from a block to the module record list.
- Per-org currency: `format:'money'` defaults to `PEN`; `currency` is an optional parameter until datasets expose a currency column per row in the registry.
- Migrating the existing `tenancy.sandbox.hello` custom element or any production element to blocks.
