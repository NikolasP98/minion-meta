---
id: 2026-10-19-hub-optimistic-everywhere
title: Every reversible hub edit updates instantly (finish the createOptimistic rollout)
status: in-spec
created: 2026-10-19
updated: 2026-10-20
repos: [minion_hub]
tags: [ui, ux, logic]
value: 8
effort: L
source: specs/028-hub-app-feel-shell
---

# Optimistic interactions everywhere

## AS-IS
The owner rule is "visual feedback = trust" (`createOptimistic()` + `Toggle pending`, `createAutosave`), but the 2026-10-18 shell survey found no TanStack `onMutate` and many controls still wait on the server round trip before changing.

## TO-BE
Every reversible edit (toggles, selects, tags, renames, reorders, status changes) reflects on the next paint with a pending state and rolls back with a message on rejection. Creation, money and stock postings keep their explicit receipts.

## DELTA
Inventory the remaining DB-backed controls that bind `data.*` + `invalidate()` (grep + design-lint rule), migrate per module through `createOptimistic`/`createAutosave`, and add a lint ratchet so new non-optimistic controls fail CI.

## Implementation

Implementation and qualification are tracked in
`specs/2026-10-20-hub-app-backlog-spec.md`. The candidate is [Hub PR #575](https://github.com/NikolasP98/minion_hub/pull/575)
on `feat/app-backlog`. Merge and deployment remain owner-gated.
