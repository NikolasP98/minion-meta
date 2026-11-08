# Tasks: Sandbox block kit (049)

Spec: [spec.md](./spec.md) · Plan: [plan.md](./plan.md). Tests first inside each phase. `[P]` = parallel-safe.

## Phase 1: Data (S1, hub)
- [x] T001 Migration `20261108000000_sandbox_elements_spec.sql`: `alter table public.sandbox_elements add column if not exists spec jsonb;`
- [x] T002 Seed: `tenancy.sandbox.kpi` fixture (a `kpi` block on `pos.tickets`, business org, default page) in `scripts/qa/seed/tenancy.ts` + `matrix.ts`; contract test asserts the row and that `spec->>'type' = 'kpi'`.
- [x] T003 Test first: compiler `bucket` → `date_trunc`, grouped and projected under the column name; non-timestamp column → 400 `bucket`; PII guard. Then implement in `query-compiler.ts`.
- [x] T004 Service: `spec` in `elementColumns`, `rowToElement`, insert/update (`coalesce` with jsonb), `assertSize` counts `JSON.stringify(spec)`.

## Phase 2: Block grammar (S1, hub, pure)
- [x] T010 [P] Test first, then `src/lib/sandbox/blocks/schema.ts`: zod `source`, `period`, `kpi|chart|table|list` specs, `BLOCK_KINDS`, `blockToolSchemas()` (JSON Schema with `required`).
- [x] T011 [P] Test first, then `blocks/query.ts`: `periodWindow(range, now)`, `previousWindow`, `blockQueries(spec, now)` → `{ value, compare?, trend? }` / `{ rows }` as `QuerySpec`s.
- [x] T012 [P] Test first, then `blocks/format.ts`: `formatValue(n, format, currency)`; `blocks/chart-option.ts`: `chartOption(spec, result, colors, fmt)` for every preset.
- [x] T013 Test first, then `src/server/sandbox/blocks.ts`: `validateBlockSpec(spec, findDataset)` → field-path errors (`SandboxQueryError`).
- [x] T014 Routes: `spec` in POST/PATCH zod bodies (`blockSpecSchema.nullable().optional()`), server validation before `upsertElement`; `server.test.ts` cases (400 on bad column, 201 on good spec).

## Phase 3: Rendering (S1, hub, UI — governance skill rules apply)
- [x] T020 `BlockView.svelte`: loads via `blockQueries` + `/api/sandbox/query`, `Skeleton` while loading, `EmptyState tone="error"` on failure, dispatches by kind; re-runs on spec change.
- [x] T021 [P] `blocks/KpiBlock.svelte`: `.t-*` roles, value via `formatValue`, delta `Chip` (success/danger/neutral), `Sparkline` for `trend`, `ProgressBar` for `target`.
- [x] T022 [P] `blocks/ChartBlock.svelte`: `Chart` + `chartOption` + `chartColors()`; `ariaLabel` = title.
- [x] T023 [P] `blocks/TableBlock.svelte`: `DataTable variant="plain"`, columns from the result (`money` columns from `format` map), dates via `formatDate`.
- [x] T024 [P] `blocks/ListBlock.svelte`: ranked `ProgressBar` rows with label + formatted value.
- [x] T025 `ElementFrame.svelte`: `{#if element.spec}<BlockView/>{:else}<iframe/>` under the shared header; `host.svelte.ts` record type gains `spec`.
- [x] T026 i18n keys (en + es) for block states and library kind labels; `bun run i18n:compile`.
- [x] T027 Mounted test `BlockView.svelte.test.ts`: kpi renders the formatted value and the delta from a stubbed `fetch`; error text on 403.

## Phase 4: Agent surface (S1, hub)
- [x] T030 Test first, then `tools.ts`: four `sandbox.block_*` tools from `blockToolSchemas()`, body `{title, w, h, spec}`; `upsert_element` description says "custom only".
- [x] T031 `turn-router.ts` sandbox manifest: blocks first, presets listed, custom only when no kind fits; `turn-router.test.ts` stays green.
- [x] T032 [P] `canvas.ts` spec-aware `describeElement` (+ test); `library.ts` copies `spec` (+ test); `LibraryPanel` shows the kind.

## Phase 5: Qualify + ship
- [x] T040 Gates, foreground, one at a time: targeted vitest (142 passed) → `bun run check` (0/0) → `lint:design && lint:tokens` (green). `bun run build` and the full `bun run test` did NOT complete locally (adapter-vercel OOM at the default 4 GB heap on a box with ~2 GB free) — CI on hub #642 qualifies both.
- [x] T041 Draft PR **hub #642** `feat(sandbox): typed block kit — KPI, chart, table and list built from the shared UI library` against `master`; body names spec 049 and the migration.
- [x] T042 Meta: board stub, followups proposal, `node scripts/spec-index.mjs`, `node scripts/proposal-index.mjs` (or the repo's equivalent), PR to `dev`.
