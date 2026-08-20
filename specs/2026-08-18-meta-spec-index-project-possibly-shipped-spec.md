---
id: 2026-08-18-meta-spec-index-project-possibly-shipped-spec
title: Establish G0 reconciliation contracts before projecting them
stage: spec
status: review
pass: 2
created: 2026-08-18
updated: 2026-08-20
proposal: 2026-08-17-meta-spec-index-project-possibly-shipped
verdict: changes_requested
repos: [minion-factory, minion-meta, minion-base]
relationship: depends-on
related: [2026-08-17-sdlc-phase-gates-scoring-spec, 2026-08-18-base-kanban-possibly-shipped-surface-spec]
possibly_shipped: https://github.com/NikolasP98/minion-meta/pull/43
---

# Establish G0 reconciliation contracts before projecting them

## 0. Product

The requested amber shipment-review flow is not live. The current factory writer does not emit
`possibly_shipped`, `evidence`, or `link_review`, and the proposed board consumer is not merged.
Projecting those fields in minion-meta first would therefore publish a dead contract and falsely
document it as operational.

This artifact has returned to spec review. No implementation slice may start until an approved
cross-repo plan defines the producer, projection, and consumer in dependency order.

## 1. Relationship recommendation

**Recommended classification: `depends-on`.** The minion-meta projection depends on both a real
minion-factory producer contract and a compatible minion-base consumer contract. The prior
`extends` classification incorrectly treated those dependencies as shipped.

- `2026-08-17-sdlc-phase-gates-scoring-spec` describes the intended G0 behavior, but its named
  writer behavior is not present on the verified factory revision.
- `2026-08-18-base-kanban-possibly-shipped-surface-spec` remains an unmerged consumer plan, not a
  shipped compatibility guarantee.

## 2. AS-IS → TO-BE → DELTA

### AS-IS — verified repository state

- `NikolasP98/minion-factory@a45b225b:agent/reconcile.sh:122-179` reconciles proposals only.
  Repository-wide search on current factory `main` finds no `possibly_shipped` or `link_review`
  writer.
- `scripts/spec-index.mjs` does not project `possibly_shipped`, `evidence`, or `link_review`, and
  `specs/TEMPLATE.md` does not define them. That is correct while no live writer/consumer contract
  exists.
- `NikolasP98/minion-base` PR #13 is open, with no merge commit or `mergedAt`. Verified current
  `main` (`ccc5db78`) contains no `possibly_shipped` or `link_review` consumer.
- The earlier delegated gate record claiming the base surface was shipped was false. Both
  compatibility premises named by the previous spec's stop gate are contradicted.

### TO-BE — desired contract and invariants

- One approved cross-repo spec defines exact field names, scalar shapes, lifecycle semantics, and
  ownership for the factory writer, meta projection, and base consumer.
- The writer and consumer exist before, or land atomically with, the projection. No template may
  identify a nonexistent writer and no projected field may be operationally dead.
- Each slice re-verifies prerequisite commit/PR state immediately before implementation. A false
  prerequisite stops execution and returns the artifact to review.

### DELTA — reordered slices

1. **Slice 0 — compatibility recon and approval gate:** verify factory `main`, base `main`, and PR
   state; record exact revisions and approve one cross-repo field/lifecycle contract. This slice
   changes planning artifacts only.
2. **Slice 1 — producer contract:** implement and test the approved G0 writer in minion-factory.
   Do not touch minion-meta or minion-base. The producer must demonstrate emitted fixtures for
   every approved field and absence on non-matches.
3. **Slice 2 — committed projection:** only after Slice 1 is merged, project and document the
   approved fields in minion-meta with hermetic present/absent tests and regenerate the index.
4. **Slice 3 — consumer contract:** land the compatible minion-base type, rendering, and human
   disposition flow. Slice 2 and Slice 3 may instead be made atomic if the approved plan requires
   that no projected-but-unconsumed interval exist.

The original projector-only Slice 1 is withdrawn. It must not be rerun until this reordered plan
passes review, and then only the newly approved Slice 1 is eligible for implementation.

## 3. Slice 0 definition of done

- Record immutable factory and base revisions plus the current status of every prerequisite PR.
- Cite code anchors proving the current writer and consumer behavior.
- Resolve whether projection and consumption must land atomically.
- Define exact field values, clearing rules, retry/idempotency behavior, and the human decision
  path.
- Receive pass-2 approval with no unresolved cross-repo premise.

## 4. Cross-repo impact and stop gates

| Surface | Required transition | Hard gate |
|---|---|---|
| `minion-factory` | Add the real G0 writer and tests in Slice 1. | Stop if verified `main` differs from Slice 0 evidence or the field contract is not approved. |
| `minion-meta` | Project only the merged writer contract in Slice 2. | Stop if Slice 1 is not merged or the consumer cannot accept the exact shape. |
| `minion-base` | Consume and act on the projected contract in Slice 3. | Stop if its prerequisite PR is open, stale, or incompatible. |

## 5. Out of scope for this review-fix branch

- Implementing factory writer behavior, meta projection, or base UI/backend behavior.
- Treating an open PR, an approved spec, or a delegated assertion as shipped evidence.
- Adding speculative frontmatter fields to `specs/TEMPLATE.md` or `specs/index.json`.
- Starting Slice 2 or Slice 3.

## 6. Verification for the corrected planning state

```bash
node scripts/spec-index.mjs
node scripts/proposal-index.mjs
git diff --check
rg -n 'status: review|verdict: changes_requested' \
  specs/2026-08-18-meta-spec-index-project-possibly-shipped-spec.md
! rg -n 'possibly_shipped|link_review' scripts/spec-index.mjs specs/TEMPLATE.md
```

Passing these checks proves only that the invalid projector implementation was removed and the
artifact returned to review. It does not approve or implement the reordered slices.
