---
id: 2026-09-27-hub-column-presentation-admission
title: Extend column presentation to native and other custom columns
status: draft
created: 2026-09-27
updated: 2026-09-27
repos: [minion_hub]
tags: [ui, data, security]
---

# Further column presentation admission

## AS-IS

The calculated-column formatting slice (2026-09-27-hub-calculated-column-formatting-spec) supplies a reusable presentation contract, formatter and editor but deliberately admits only numeric formula definitions. Native table descriptors and other custom types do not expose those settings.

## TO-BE

After separate type/permission review, native and other custom columns reuse the same organization-scoped formatting controls where their declared types support them. The user explicitly deferred this expansion until after calculated columns.

## DELTA

Define native column identity, presentation persistence and ownership/RBAC; preserve canonical currency and sensitive-field masking; admit number/date/text/boolean/select settings only where meaningful; migrate native custom renderers without losing badges, warnings, secondary data or domain actions. Keep numeric sort/export/filter semantics and formatting-only changes independent of stored values. Do not replace active native renderers with inferred presentation heuristics. The numeric-formula admission boundary carries the matching TODO(handoff).
