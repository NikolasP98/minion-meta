---
id: 2026-11-08-sandbox-block-kit-spec
title: Sandbox block kit — deterministic, typed building blocks from the shared UI library
stage: spec
status: implementing
verdict: pending
pr: 642
type: feature
pass: 1
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub, minion-meta]
tags: [logic, data, ui]
---

## 0. Product

**Spec Kit feature:** [`specs/049-sandbox-block-kit/`](049-sandbox-block-kit/spec.md), with plan.md and tasks.md alongside.

**Owner brief (2026-11-08):** the `/sandbox` assistant can already create elements; their quality must improve. Make the hub's shared components the building blocks, make authoring near-deterministic (typed tools with required/optional params and presets), declare the data connections instead of coding them, and keep the result consistent with the rest of the hub.

**What ships:** a `block` element kind stored as JSON (`sandbox_elements.spec`), four assistant tools (`sandbox.block_kpi|chart|table|list`) whose schemas derive from one zod grammar, preset enums for chart type, value format, tone, period and bucket, a pure query builder on top of the existing RBAC-gated query compiler (plus `date_trunc` bucketing), and native rendering through `Chart`, `DataTable`, `ProgressBar`, `Sparkline`, `Chip`, `Skeleton` and `EmptyState`. Custom html/css/js elements keep working.

**Slices:** S1 hub `feat/sandbox-component-kit` → `master` (migration + seed, compiler, grammar, server validation, rendering, tools, i18n, tests). S0 meta docs.

## Verification

- **SC-001** block tools derive from the grammar: `src/lib/sandbox/blocks/schema.test.ts`, `src/lib/sandbox/tools.test.ts` (hub #642).
- **SC-002** pure query builder: `src/lib/sandbox/blocks/query.test.ts`; compiler `bucket`: `src/server/sandbox/query-compiler.test.ts`.
- **SC-003** server refuses bad specs with a field path: `src/routes/api/sandbox/server.test.ts`.
- **SC-004** seeded KPI block: `scripts/qa/seed/seed.contract.test.ts` (`tenancy.sandbox.kpi`, runs on the QA stack / CI `qa-stack` job).
- **SC-005** gates on the PR tree: `bun run check` 0/0, targeted vitest 142 passed, `lint:design` + `lint:tokens` green, `i18n:compile` run; `bun run build` and the full suite are qualified by CI on hub #642 (local box OOM at the adapter step).
- Post-merge: open `/sandbox` on the QA stack, confirm the seeded "Tickets (30 days)" tile renders with a delta chip, then ask the assistant for "sales per week as an area chart" and confirm a `sandbox.block_chart` call lands without a custom element.
