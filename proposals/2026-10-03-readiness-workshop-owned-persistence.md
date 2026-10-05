---
id: 2026-10-03-readiness-workshop-owned-persistence
title: Preserve owned Workshop state through failed and overlapping operations
stage: proposal
status: approved
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [ui, data, logic, test]
type: fix
---

# Workshop owned persistence

The user authorized all readiness findings and their blast-radius corrections. HC-037 was found while reviewing HC-026 native card semantics and direct consumers. Approval covers local implementation after the required spec reviews; merge and production writes retain their existing gates.

## AS-IS

At Hub0020b673, `src/lib/state/workshop/workshop.svelte.ts:410-475` ignores autosave HTTP rejection, publishes any completed workspace load without request/owner fencing, and resets current shared state before a new workspace POST acknowledges. `routes/(app)/agents/workshop/+page.svelte:42-60` has no visible pending/error ownership for open/create/delete. These are source-confirmed defects; no production mutation was performed to reproduce them.

## TO-BE

Preserve the existing workspace until creation is acknowledged. Validate and publish workspace snapshots only for the current canonical actor/org, selected save and request generation. Give autosave and list actions truthful pending/failure/unknown outcomes with read-only recovery where write outcome is uncertain. Preserve canvas/undo/conversation behavior and namespace the persisted active-save identity by its actual owner.

## DELTA and proof

Write a bounded lifecycle spec covering shared Workshop state, active-save storage, canvas/autosave consumers and list/detail route effects. Reproduce rejected creation, reversed load completions, actor/org rotation, failed autosave and duplicate activation with real state/runtime tests and synthetic browser fixtures. Verify adjacent canvas, undo and conversation flows. Attach exact before/after receipts to HC-037; native keyboard/card changes alone do not close it.
