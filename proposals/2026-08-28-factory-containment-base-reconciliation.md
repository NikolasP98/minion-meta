---
id: 2026-08-28-factory-containment-base-reconciliation
title: Containment base reconciliation — controller-owned merges for behind-base resumes
status: approved
created: 2026-08-28
updated: 2026-08-28
repos: [minion-factory]
tags: [infra]
---

# Containment base reconciliation — controller-owned merges for behind-base resumes

Slice 3 of the moving-origin reliability strategy (2026-08-27 Codex + Fable
consult; PR 1 = minion-factory#110, PR 2 = #111 shipped the admission caps,
push-cause classification, and B0/H0 dispatch authority).

## Problem

Containment-v2's publisher is already correct — candidate ancestry validation
plus exact `--force-with-lease` (`runner/src/containment-effects.ts:357-371`)
— but its preparation step requires the freshly fetched base to already be an
ancestor of a resumed branch (`agent/factory-prepare-workspace.sh:70-86`). An
ordinary behind-base PR therefore fails before the factory ever gets a chance
to integrate the base. On the legacy path the same gap surfaces as agents
rebasing published branches (15 of 18 audited non-fast-forward failures).

## Proposed implementation

Per the strategy's target control loop:

- A reusable controller checkpoint that, when the branch head is unchanged and
  only the base advanced, performs a **clean `git merge` of the live base into
  the candidate deterministically — no model call**. Merging preserves both
  the published head and the base as ancestors, so the existing exact-lease
  publish still applies.
- A merge conflict routes to **one bounded conflict-resolution phase** (a
  dedicated worker phase with the conflict as its only task), never a restart
  of the whole run.
- Rebase of a published factory branch stays forbidden (invariant I6);
  test/review evidence binds the exact `{testedBase, candidate}` pair (I3).
- Activation stays behind the existing drill gate: temporary bare-repo drills
  proving base advance, remote fast-forward, divergent rewrite, ambiguous
  accepted push, conflict, crash/restart, idempotent replay — then a
  one-repo canary before widening `FACTORY_CONTAINMENT_V2=1`.

The full state contract, control-loop diagram, and invariants live in the
reviewed strategy doc
(`.lavish/factory-moving-origin-reliability-strategy-2026-08-27.html`).
