# Implementation Plan: Sandbox block kit (049)

Spec: [spec.md](./spec.md). One hub slice, one meta docs slice.

## Constitution check
- I Spec before code: this directory + board stub `specs/2026-11-08-sandbox-block-kit-spec.md`.
- II AS-IS/TO-BE/DELTA with anchors: spec.md.
- III One hub PR from worktree `~/.cache/claude-tmp/hub-sandbox-kit` (branch `feat/sandbox-component-kit`, base `master`); gates in the foreground, one at a time (svelte-check is memory-heavy).
- IV Required build steps: design gates (`lint:design && lint:tokens`), Paraglide for every new string (`i18n:compile`), RBAC unchanged (`settings:manage` on all sandbox routes; data reads keep `runQuery`'s gates), no new routes (route contract untouched).
- V Data tag: migration adds one nullable column and ships with its seed fixture (`migration-seed-pairing`). Owner merges.

## Design (my calls, in order of consequence)
1. **Native rendering, not an in-iframe kit.** The shared components are Svelte; the only way to use them as-is is to render blocks in the hub DOM. The sandbox stays for custom code. Safety: a block is data, validated server-side, rendered through text bindings; the only executable path remains the iframe.
2. **Four kinds, one `source` grammar.** `kpi` (value + optional `compare`, `trend`, `target`), `chart` (preset + measures over a dimension or time bucket), `table` (select + order + limit), `list` (dimension + metric, ranked bars). `progress` is `kpi` with `target`; `sparkline` is `kpi` with `trend`.
3. **Period windows are computed in the browser at query time** (inclusive from/exclusive to, local time, rolling presets), so the compiler stays parameter-only and a block re-queries fresh on every load. `bucket` goes into SQL (`date_trunc`) because grouping 1,000 raw rows client-side would cap the series.
4. **Schema = zod, in `$lib/sandbox/blocks/schema.ts`,** imported by the client tools (JSON Schema via `z.toJSONSchema`) and the server routes (parse). Registry-aware checks (column exists, type fits) live server-side in `src/server/sandbox/blocks.ts` because `DATASETS` is server-only.
5. **Chart option builder is pure** (`chart-option.ts`): takes the query result + resolved `chartColors()` + formatter, returns an `EChartsOption`; `Chart.svelte` applies theme defaults, resize, reduced-motion and the a11y table.
6. **Money** formats through `formatMoney`/`formatMoneyShort` with `currency` (default `PEN`, documented limit).

## Slices
| Slice | Repo | Branch → base | Content |
|---|---|---|---|
| S1 | minion_hub | `feat/sandbox-component-kit` → `master` | migration + seed, compiler `bucket`, block schema/query/chart-option/format modules, server validation, routes, `BlockView` + 4 block components, `ElementFrame` switch, tools + manifest, canvas/library, i18n, tests |
| S0 | minion-meta | `spec/049-sandbox-block-kit` → `dev` | this directory, board stub, followups proposal, spec index |

## Key files (hub)
- `supabase/migrations/20261108000000_sandbox_elements_spec.sql`; `scripts/qa/seed/tenancy.ts`, `matrix.ts`, `seed.contract.test.ts`
- `src/server/sandbox/query-compiler.ts` (+ test) — `bucket`
- `src/server/sandbox/sandbox.service.ts` — `spec` column, size
- `src/server/sandbox/blocks.ts` (+ test) — registry validation
- `src/routes/api/sandbox/elements/+server.ts`, `[id]/+server.ts` — `spec` in zod bodies
- `src/lib/sandbox/blocks/{schema,query,chart-option,format}.ts` (+ tests)
- `src/lib/components/sandbox/BlockView.svelte`, `blocks/{KpiBlock,ChartBlock,TableBlock,ListBlock}.svelte`
- `src/lib/components/sandbox/ElementFrame.svelte`, `LibraryPanel.svelte`
- `src/lib/sandbox/{tools,canvas,library,host.svelte}.ts` (+ tests)
- `src/lib/assistant/turn-router.ts` (manifest text)
- `messages/en.json`, `messages/es.json`

## Test strategy
Pure modules first (schema, query, chart-option, format, compiler bucket, server validation), then route tests, then one mounted `BlockView` test with a stubbed `fetch`. Gates: `bunx vitest run <files>`, then `bun run check`, `bun run lint:design && bun run lint:tokens`, `bun run i18n:compile`, `bun run build`. The full `bun run test` runs only with `SUPABASE_DB_URL` unset (memory: integration tests hit prod otherwise).
