---
id: 2026-11-20-stock-drift-patterns
title: Learn from count differences — where stock drifts and what to recommend
status: draft
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
effort: L
source: 135-stock-checkpoints
tags: [data]
---

# Learn from count differences

## Problem (owner's words)

2026-11-20, on stock checkpoints (spec 135): "I think this might help with implementing ML models that track displacement to find recommendations or patterns for the moving data".

## AS-IS

- Before spec 135 there is no recognizable count. Differences between the shelf and the system are absorbed by hand-written adjustments ("Ajuste Minion-Flowww", STE-2026-00336…00344) or receipts typed to land on a number (STE-2026-00635). Nothing can be learned from them.
- The 2026-11-18 FACES count shows the signal exists:
  - INIBO counted about 16 U more than the system. Recorded doses run above what is actually used.
  - Ácido Desoxicólico counted 6 ml less.
  - Saypha Volume Plus counted 1 less, with no explanation.

## TO-BE (sketch)

Once spec 135 keeps consecutive checkpoints per item and warehouse, the drift between two counts is attributable:

    counted(t2) − counted(t1) = Σ movements in (t1, t2] + drift

Movements are grouped by source: appointments per treatment, sales, receipts, transfers. Possible outputs, each its own spec later:

- **Recipe calibration**: "Botox Full Face uses about 34 U of INIBO in practice, the recipe says 36 to 48."
- **Leak detection**: an item whose drift is consistently negative between counts, by staff or by day of the week.
- **Count scheduling**: count most often the items that drift most.
- **Reorder hints**: consumption rate per item from appointments and sales, adjusted by the measured drift.

## Out of scope

Everything until spec 135 has produced at least a few counts per item. Model choice. Any automatic change to recipes or stock: outputs are suggestions a person accepts.

## DELTA

None now. Spec 135 already keeps the inputs: counted quantity, system quantity at the counted time, and a link to the previous checkpoint.

## Definition of done (for this proposal)

A spec exists once FACES has three or more counts for its top 10 items. That spec defines one output from the list above, with an evaluation on that data.

## Notes

AI features are a premium tier (owner rule); this would ship as one.
