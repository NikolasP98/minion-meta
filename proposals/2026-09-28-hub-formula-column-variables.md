---
id: 2026-09-28-hub-formula-column-variables
title: Named variables and visual formatting in formula columns
status: done
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

## Qualification status

Implementation is review-approved at Hub commit `049bb8f8c73b8ade42599321a5d3a96d201d6908`. Focused UI, backend, PostgreSQL, authenticated loopback HTTP and final-head browser qualification passed. The review confirmed that a permitted visible V1 expression edit preserves a hidden external legacy secondary presentation; explicit presentation changes and conversion to V2 remain forbidden for that restricted state.

Hub PR #403 merged through the authorized workflow at 2026-09-29 03:30:42 UTC as squash commit `2c39b3494b8cfe05f131d42d512fe2db13c85b02`. Final-head CI run `36517049538` passed all jobs, and preview deployment `6725968007` succeeded at `https://minion-jrc824ec5-nikolasp98s-projects.vercel.app`. Earlier hosted checks on `84043dd` passed test and check/build, while its QA stack exposed the legacy-expression compatibility regression subsequently fixed before merge. Production deployment `6726033312` succeeded for the merge SHA at 2026-09-29 03:34:00 UTC. The reviewed and merged source trees are identical. Post-merge CI run `36517458901` passed. A fresh browser request to the canonical production login route rendered the complete sign-in page after deployment; authenticated feature flows were qualified against the local QA stack.
