---
id: 2026-11-08-hub-sandbox-block-kit-followups
title: Sandbox block kit — follow-ups after spec 049 slice 1
status: draft
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub, minion-meta]
---

# Sandbox block kit — follow-ups

Open ends left by `specs/049-sandbox-block-kit/` slice 1 (hub `feat/sandbox-component-kit`). Each item is deliberately out of the first slice; none blocks the kit.

## 1. Series split by a second dimension
`stacked-bar` stacks *measures*, not categories. "Sales per week by staff member" needs a `series` column that pivots rows into one series per distinct value. Grammar: `source.series?: string` on `chart`; query builder adds it to `groupBy`; `chart-option.ts` pivots. Test: pivot of 3 weeks × 2 staff → 2 series × 3 points.

## 2. Board-level date control
Every block carries its own `period`. A `DateRangeControls` on the board that overrides each block's window (and re-queries) is the dashboard pattern the rest of the hub uses. Needs: a board-level range in the page state, `blockQueries(spec, now, override?)`, and the spec's `period.range` becoming the default rather than the law.

## 3. Drill-down
A KPI or a bar should open the module's record list filtered the same way (`/pos/tickets?from=…`). Needs a dataset → route map in the registry (`datasets.ts`) and a `href` on the block.

## 4. Currency per row
`format: 'money'` takes an optional ISO `currency` (default `PEN`). Governance says currency is data: when the registry exposes a currency column per dataset, the table block should read it per row and the KPI/chart should refuse mixed currencies instead of summing them.

## 5. Convert the seeded custom element
`tenancy.sandbox.hello` is still a custom html element. Once blocks are the default authoring path, the seed can show both, and production boards can be migrated by an owner-run script (dry-run, reversible).

## 6. Custom-element inference (pre-existing)
`describeElement` still infers datasets and chart type by regex for custom JS (`src/lib/sandbox/canvas.ts`, `TODO(handoff)`). Blocks are exact now; the custom path keeps the limitation noted in `2026-10-16-hub-sandbox-pages-followups`.

## 7. Local build on a memory-starved box
`bun run build` OOMs at the adapter-vercel step with the default 4 GB V8 heap when the host has ~2 GB free. The `check` script already raises the heap to 6 GB; the build script could do the same, or document `NODE_OPTIONS` for local qualification.

## 8. Block catalogue as an API
`sandbox.blocks` returns the kinds, presets and examples in-page. If an external agent (Paperclip, gateway tools) needs the same contract, serve the catalogue from a hub route (`/api/sandbox/catalog`) and wrap it in an MCP server there — not a separate components site. The dev-gallery remains the human-facing storybook; linking each kind to a live example is cheap.
