---
id: 2026-11-20-hub-stock-checkpoints-spec
title: Stock checkpoints — staff count the shelf, an owner/admin locks it, nothing from before the count moves that stock again
stage: spec
status: draft
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
verdict: approved
type: feature
tags: [ui, data]
---

# Stock checkpoints

## 0. Product

Staff count the shelf in a "Conteo físico" screen; an owner or admin validates and locks it. Locking
posts the adjustment and freezes a checkpoint per counted item: from then on, nothing that physically
happened before the count (completing an old appointment, voiding an old sale, a repair) moves that
item's stock again. Reminders ask for a count every 30 days (configurable) and nudge owners to lock
waiting drafts.

The canonical [Spec Kit specification](135-stock-checkpoints/spec.md) contains the AS-IS evidence
(FACES' hand-made "Ajuste…" entries, the 1,500-landing receipt, the 2026-11-18 repair that returned
690 U of Dysport the count already reflected), TO-BE invariants, DELTA and acceptance scenarios.

## Verification

- Plan, research and FigCraft as-is/to-be demo: next (`/speckit-plan`), planned together with spec 134.

## Out of scope

Cycle-count scheduling per category, barcode scanning, cost recomputation for skipped lines, undoing a locked count.

## Human gates

Tagged `data`: the owner approves this spec before code and merges each PR.
