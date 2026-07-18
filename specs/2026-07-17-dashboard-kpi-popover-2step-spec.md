# Dashboard KPI Popover — 2-Step (hover → click) Design Spec

**Date:** 2026-07-17 · **Status:** DESIGN (implement after the reliability KpiRow refactor lands) · **Scope:** minion_hub dashboards

User directive (verbatim): *"in dashboards with hover popovers like this one, implement a 2-step popover (1. hover 2. click) — hover: shows the visuals, simplified view; click: shows the formulas and calculation behind the result. Try to keep all hover popovers across dashboards consistent with this design. If they don't have formulas/numbers, then keep them at the hover/visuals layer. Visuals are preferably time series data."*

## ⛔ Sequencing (why this is a spec, not a diff yet)

The target — the reliability KPI popover — is **mid-refactor by the other agent (Codex)**: an untracked `src/lib/components/reliability/KpiRow.svelte` (a "one KPI cell" component exposing an `onHover(e, detail)` callback) plus uncommitted `+page.svelte` hunks that `import KpiRow` and render `<KpiRow>` in place of the inline KPI markup. Implementing into `+page.svelte` now collides head-on with that migration.

**Implement only after Codex's KpiRow refactor is committed to `dev`.** Re-read `KpiRow.svelte` + the KPI section of `+page.svelte` at that point; the payload/callback names below may have been renamed.

## Current state (HEAD)

The reliability KPI popover (`reliability/+page.svelte`, the `hoveredKpi` / `showKpiTip` path, markup ~line 1438) is a single **`position: fixed`, `pointer-events-none` hover tooltip** that shows *everything at once*:

- `label` — e.g. HEALTH SCORE
- `texFormula` — LaTeX formula (`<MathFormula>`)  ← *formula layer*
- `texValues` — LaTeX result with numbers substituted  ← *formula layer*
- `spark?` — timeseries breakdown: `series`, `rollAvg`, `mean`, `sigma`, `color`, `statusColor`, `statusLabel`, `rollAvgVal`, `current`, `vsRollGood`, `trendLabel`, `lcl`, `ucl`, `z` (rendered via `KpiSparkline` + legend + 4-stat grid)  ← *visuals layer*
- `note?` — footer, e.g. "weighted: crit ×1 · high ×0.6 · med ×0.3"  ← *formula layer*

`crm/[contactId]/+page.svelte` has the same `MathFormula tex={texSymbolic}` / `texValues` formula-popover pattern (a second surface to unify).

## Target interaction model

Split the single tooltip into two layers keyed off the SAME payload:

| Step | Trigger | Content | Mechanism |
|---|---|---|---|
| 1. **Visuals** | hover (and focus) | `label` + `spark` timeseries (`KpiSparkline` + status label + compact stat grid). A one-line "click for formula →" affordance IF `texFormula` exists. | `pointer-events-none` fixed tooltip (keep current mechanism) |
| 2. **Formula** | click (Enter/Space on focus) | `label` + FORMULA (`texFormula`) + RESULT (`texValues`) + `note`. Optionally the sparkline stays pinned above for context. | **interactive** Zag `Popover` — `pointer-events: auto`, explicit dismissal |

Rules:
- **No formula → hover-only.** A KPI with no `texFormula` (infra vitals / point-in-time values) shows only the visuals tooltip and gets **no click affordance** (no `cursor-help`→`cursor-pointer` change, no "click for formula"). KpiRow already gates the hover affordance on `detail`; extend that to gate the *click* affordance on `detail.texFormula`.
- **Visuals prefer timeseries.** When `spark` exists, the hover layer leads with the `KpiSparkline`. A KPI with neither formula nor spark keeps a plain value tooltip (or none).
- **Consistency.** One shared component owns both layers so every dashboard renders identically.

## Component design

Add `src/lib/components/ui/KpiPopover.svelte` (or `$lib/components/reliability/` if kept domain-local for v1, promote later). It owns:

- the hover tooltip (visuals) — reuse the existing fixed-position + `clamp()` width logic so there's no per-cell jitter;
- the click Popover (formula) — **Zag `Popover` wrapper** (`$lib/components/ui`), which supplies outside-pointerdown + Escape dismissal per the floating-panel dismissal contract (the current tooltip is `pointer-events-none`, so it needs no dismissal; the click layer DOES).

Props: `{ label, spark?, texFormula?, texValues?, note? }` — the existing `detail` payload, unchanged. `KpiRow` keeps emitting `onHover`; add an `onActivate`/click path (or let `KpiPopover` own the trigger element).

Consumers: `reliability/+page.svelte` (KPI row, post-refactor via `KpiRow`), `crm/[contactId]/+page.svelte`, and any future dashboard KPI row (finances, etc.). Audit `rg -l "MathFormula|KpiSparkline" src/routes` before implementing to enumerate the full consumer set.

## Governance (must-hold)

- **Floating-panel dismissal contract**: the click Popover uses the Zag `Popover` wrapper (outside-pointerdown + Escape) — never a `pointer-events-none` div for the interactive layer, never a hand-rolled `{#if open}` with no close path.
- **Layer tokens**: `--layer-popover` (already used). Never numeric z-index.
- **Semantic tokens only**: surfaces `--color-surface-*`/`--color-overlay` + `--shadow-overlay`; status colors via the resolved chart-color path (`cssVar()`), not raw `var()` into canvas.
- **Design-token severity/status ramp** already governs the status colors used in the sparkline stats.
- Gates after implementation: `bun run lint:design && bun run lint:tokens`.

## Open questions (resolve at implement time)

1. Does the sparkline stay pinned in the click/formula layer, or does clicking swap visuals→formula entirely? (Recommend: keep a compact sparkline header so formula has context.)
2. Mobile/touch: no hover — tap = open the formula popover directly (single step). Confirm the touch affordance.
3. Should the shared `KpiPopover` live in `@minion-stack/ui` (cross-repo) or stay hub-local for v1? (Recommend hub-local first, promote if `minion_site` needs it.)
