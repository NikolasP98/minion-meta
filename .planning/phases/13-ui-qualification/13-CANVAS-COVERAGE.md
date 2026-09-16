# 13-CANVAS-COVERAGE — canvas/chart consumer inventory (UI-06)

**September11 qualification update:** The inventory below describes its original source snapshot. Its old native-test limitations and source-regex canaries are superseded by23 passing mounted/native-engine cases and21 real browser cases across the recorded runs. Current supported table mapping also includes horizontal category axes, formatted scalar/object values and named keyboard scrolling for wide alternatives. Unsupported mappings fail closed. See13-04-SUMMARY.md current section and the exact root manifest. Consumer and workshop gaps below remain open; the inventory is not whole-canvas certification.

Source candidate: `minion_hub` `origin/master` @ `1df0a921` (includes PR #245 / 13-01), worktree
`/home/nikolas/.cache/claude-tmp/hub-13-04`, branch `feat/ui-chart-accessibility`.

Scope of this document: **inventory only**, per 13-04-PLAN.md Task 2. It records what nonvisual
and reduced-motion coverage every canvas/chart consumer in the hub actually has today, so that
later evidence-driven consumer gap plans have a concrete starting list. Listing a consumer here
does not fix it, and this document does not close UI-06 — the plan's own readiness note is
explicit that "whole-canvas closure is NOT in scope" for 13-04.

## 1. Shared `Chart.svelte` (ECharts) — 11 consumer files, 23 chart instances

`src/lib/components/charts/Chart.svelte` now has, for every instance regardless of caller:

- `role="img"` + `aria-label` on its container (caller-supplied `ariaLabel`, else the generic
  translated `a11y0_chartRegion` = "Chart").
- `prefers-reduced-motion` read at mount and on live change; `animation:false` forced into the
  ECharts option when set, overriding whatever the caller asked for.
- A real `<details><summary>` text/table alternative built from the actual `xAxis`
  (`type:'category'`) + `series[].data` values, when the option fits that shape. Category values
  are rendered through the same `axisLabel.formatter` the visible axis uses, so the table never
  drifts from what's drawn. Series get a caller-supplied `name` as their column header, else a
  translated `a11y0_chartSeriesN` fallback.

What the shared component does **not** attempt: charts whose option doesn't fit the
category-axis + series-array shape (pie, sankey, scatter, graph) get the name/description only —
no table is fabricated for them. Legend-toggle and item-click interactions remain pointer-only
(ECharts' own event model); the table alternative supplies the underlying values without
requiring those interactions, but there is no keyboard path to actually toggle a legend series —
tracked as a gap below, not solved by this slice.

| # | File | Chart instances | `ariaLabel` passed? | Option shape fits the table contract? | Status after this slice |
|---|---|---|---|---|---|
| 1 | `src/lib/components/crm/CrmSentimentTrend.svelte` | 1 | **Yes** — `crm_insights_sentiment_trend()` | Yes (category xAxis + 1 named series) | **Wired.** Named region, real "Date"/"Customer sentiment" table, series named via existing i18n string. First fully-wired consumer per 13-04-PLAN.md Task 1. |
| 2 | `src/lib/components/agents/AgentMemoryPanel.svelte` | 1 (`scatterOptions`) | No | Scatter series — does not fit the category/series table shape | Gets the generic "Chart" name only; no table. Gap. |
| 3 | `src/lib/components/reliability/ActivityLogTable.svelte` | 2 (`timelineOptions`, `chartOptions`) | No | Not verified per-option in this pass | Generic name only. Gap. |
| 4 | `src/lib/components/reliability/AgentActivityPanel.svelte` | 2 (`proactivityChart`, `toolChart`) | No | Not verified per-option in this pass | Generic name only. Gap. |
| 5 | `src/lib/components/reliability/AgentLlmAnalytics.svelte` | 5 (`modelChart`, `channelChart`, `providerTokenChart`, `sourceChart`, `agentChart`), each with `onItemClick` | No | Not verified per-option in this pass | Generic name only; existing `onItemClick` callbacks preserved unchanged. Gap. |
| 6 | `src/lib/components/reliability/GatewayHealthPanel.svelte` | 1 (`chartOptions`) | No | Not verified per-option in this pass | Generic name only. Gap. |
| 7 | `src/lib/components/reliability/LatencyPanel.svelte` | 1 (`chartOptions`) | No | Not verified per-option in this pass | Generic name only. Gap. |
| 8 | `src/lib/components/reliability/PerformanceMonitorPanel.svelte` | 1 (`trendOptions`) | No | Not verified per-option in this pass | Generic name only. Gap. |
| 9 | `src/routes/(app)/finances/+page.svelte` | 4 (`revenueOpts` with `onLegendToggle` + `notMergeUpdate={false}`, `avgTicketOpts`, `topProductsOpts`, `topClientsOpts`) | No | Not verified per-option in this pass | Generic name only; `onLegendToggle` callback preserved unchanged. Gap. |
| 10 | `src/routes/(app)/reliability/+page.svelte` | 3 (`sankeyOptions` with `onItemClick`, plus 2 more) | No | `sankeyOptions` is explicitly a sankey shape — will not get a table even if labeled | Generic name only. Gap; sankey needs a different nonvisual strategy than a category/series table (a node/edge list), not attempted here. |
| 11 | `src/routes/(app)/socials/campaigns/[campaignId]/+page.svelte` | 1 (`spendOpts`) | No | Not verified per-option in this pass | Generic name only. Gap. |
| 12 | `src/routes/(app)/socials/+page.svelte` | 2 (`spendOpts`, `campaignOpts`) | No | Not verified per-option in this pass | Generic name only. Gap. |

**Task-equivalent for each "Gap" row**: add a caller-supplied `ariaLabel` (and `tableCategoryLabel`
where relevant) at the `<Chart>` call site, exactly as this slice did for `CrmSentimentTrend`; for
shapes that don't fit the category/series table (scatter, sankey, graph), a bounded follow-up plan
needs to design what a text alternative even means for that chart type before wiring it — this
slice does not invent that design.

## 2. Sparkline / other chart primitives — not touched by this slice

- `src/lib/components/charts/EChartsSparkline.svelte` — separate component from `Chart.svelte`,
  not in this slice's owned files. Already sets `animation:false` and `silent:true`
  unconditionally (no reduced-motion branching needed — it never animates), but has no
  `role="img"`/`aria-label` and no text alternative. Used for small inline trend indicators across
  the dashboard; a real fix needs a compact accessible-name contract appropriate to an inline
  sparkline, not the same table pattern as a full chart.
- `src/lib/components/charts/Sparkline.svelte` — not inspected in this pass; not in this slice's
  owned files.

## 3. Workshop canvas — Pixi/Rapier + the pixel-office renderer (whole-canvas, out of scope)

Verified in this pass (`tests/e2e/ui-audit/canvas-accessibility.spec.ts` "Workshop canvas —
inventory-only" group, run against the actual source files, not a mock):

| File | Role | Reduced-motion awareness | Nonvisual/ARIA affordances | Keyboard |
|---|---|---|---|---|
| `src/lib/components/workshop/WorkshopCanvas.svelte` (1917 lines) | Owns the `PIXI.Application`, mounts `startGameLoop`, presumably wires Rapier2D physics | **None** — zero `matchMedia`/`prefers-reduced-motion` in the file | `role="application"` + `aria-label={m.workshop_canvasAriaLabel()}` on the canvas host, and one `role="status"` element elsewhere in the file (not characterized further in this pass) | Not characterized in this pass |
| `src/lib/workshop/pixel/game-loop.ts` (53 lines) | Plain `requestAnimationFrame` update/render loop, delta-time capped at 0.1s, runs unconditionally while mounted | **None** | None | N/A (no DOM, pure canvas 2D draw loop) |
| `src/lib/workshop/habbo-renderer.ts` (554 lines) | Canvas 2D sprite/tile renderer for the pixel-office view | **None** | **None** — zero `aria-*`/`role=`/`tabindex` in the file | None |
| `src/lib/workshop/habbo-element-sprite.ts`, `src/lib/workshop/renderer-adapter.ts` | Sprite/adapter helpers consumed by the above | Not characterized in this pass | Not characterized in this pass | Not characterized in this pass |

**Why this is out of scope here**: 13-04-PLAN.md's own readiness note says whole-canvas closure
needs evidence-driven consumer gap plans, and the plan's boundaries forbid inventing that
design mid-slice. The `role="application"`/`aria-label` on `WorkshopCanvas.svelte` predates this
slice (not added here) and is a partial start, not coverage — an `application` landmark tells
assistive tech "this region manages its own keyboard model," which is not true today (no
`tabindex`, no keydown handling found), and the continuous physics/sprite animation loop has no
`prefers-reduced-motion` gate at all, unlike the chart fix in this slice.

**Task-equivalent for a follow-up plan**: (a) gate `startGameLoop` and the Pixi ticker on
`prefers-reduced-motion` — likely freezing sprite/physics interpolation to its settled state
rather than stopping the loop outright (agents still need to reflect live state); (b) design and
wire an actual keyboard model for the `role="application"` region, or downgrade the role until one
exists; (c) design a nonvisual equivalent for "what is happening in the office" (e.g. an
`aria-live` activity feed) — a full data table is not the right shape for a spatial/physics scene
the way it is for a line chart.

## 4. Evidence and environment note

This inventory's game-loop/habbo-renderer/WorkshopCanvas claims are backed by direct source
inspection plus the 3 canary assertions in `canvas-accessibility.spec.ts` (`not.toMatch` on the
absence of `matchMedia`/`aria-*`/`tabindex`), which are deliberately written to fail the day
someone adds that handling — a passing shared-Chart-component test elsewhere in this slice does
not and cannot certify these files; the canaries exist so a future change that touches them is
forced to update this document too. `bunx vitest run` was not usable to verify `Chart.svelte`
itself in this environment; see 13-04-SUMMARY.md for the exact blocked-gate evidence and the
Playwright/production-fixture substitute used instead.


## 2026-09-12 resumed qualification

Current Hub integrated source:77445c01ec38657c767d6f011e77148be3cc4ccf. This addendum supersedes old missing-engine rows only where explicitly listed. Historical inventory remains a discovery map, not a claim that every caller was requalified.

| Actual surface | Verified evidence | Remaining task |
|---|---|---|
| Shared Chart and sentiment | Prior23 mounted/native and21 browser cases; real table mapping and ECharts reduced motion | Concrete consumer drilldowns/legend and unsupported graph alternatives: UI-C1 |
| Workshop agent controls and task dialog |18 browser cases over real controls/OfficeState at mobile/desktop widths; native focus/Escape and callback identity | Full Workshop composition, authenticated save/provider completion |
| Pixel game loop and OfficeState | Lifecycle regression reproduced before fix; spawn/despawn and bubble expiry continue with decorative movement paused | Actual simulation scheduler/full route acceptance |
| Classic and Habbo agent sprites | Native WebGL state assertions for pulse/reaction initially and after preference changes | Full composed scene integration |
| Habbo element hover | Native position/scale/alpha and cleanup assertions | Element keyboard actions: UI-K1 |
| Rapier physics | Actual WASM advances; manual movement remains accepted with reduced motion | Physics/scheduler policy is unchanged, not broadly certified |
| Relationships, elements, camera | Exact pointer handlers inventoried in UI-K1 | Keyboard equivalence and shared action state, undo/save, view-mode coverage |
| Reliability chart consumers | Exact handlers inventoried in UI-C1 | Keyboard filter/detail/legend/Sankey equivalence |

Native motion fixture:9 cases across all three browser engines, zero skipped. Root adopts the bounded action, ownership, negative-case and acceptance scopes in13-REMAINING-CONSUMER-PLANS.md. All older unqualified consumer rows remain open; the original audit task is fulfilled by evidence plus explicit gap plans, not by claiming these gaps implemented.
