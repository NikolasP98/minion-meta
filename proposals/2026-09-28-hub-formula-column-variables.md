---
id: 2026-09-28-hub-formula-column-variables
title: Named variables and visual formatting in formula columns
status: approved
created: 2026-09-28
updated: 2026-09-28
repos: [minion_hub]
spawned_spec: 2026-09-28-hub-formula-column-variables-spec
tags: [ui, data, security]
---

# Formula column variables

## AS-IS

Hub stores one scalar formula per custom property. Presentation v1 formats that scalar and optionally another property's scalar as a secondary caption. The manager exposes one expression followed by primary/secondary formatting controls. PR #396 preserves partial numeric captions and qualifies incomplete sources with one accessible warning.

## TO-BE

The user confirmed visual formatting controls and formula variables only. One column contains an ordered list of independently typed formulas. One variable needs no name; two or more require unique names. Dragging changes left-to-right presentation order. Formatting targets stable variable identity through the displayed name. Simple/complex states follow the variable count automatically.

## DELTA

Add versioned inline variable rules and presentation, atomic validated writes, permission-aware projections, combined preview/evaluation, an ordered variable editor, and per-variable visual formatting. Preserve existing formulas, explicit primary scalar semantics, RBAC, type guards, calculation quality and user data. Qualify through local QA, independent Sol review, CI and the already-authorized merge/deploy workflow.
