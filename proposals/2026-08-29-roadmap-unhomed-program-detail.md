---
id: 2026-08-29-roadmap-unhomed-program-detail
title: Roadmap program detail that has no committed home (SDLC-CONTRACT.md, PR order 1-26, gates G0-G8)
status: draft
created: 2026-08-29
updated: 2026-08-29
repos: [minion-meta, minion-factory]
tags: [infra]
---

# Roadmap program detail with no committed home

## Problem

`specs/2026-08-18-sdlc-transformation-roadmap.md` pass 1 ended with:

> Full milestone detail (M0–M9 deliverables, schemas, exit criteria, PR order
> 1–26, stage gates G0–G8) lives in the user's program message of 2026-08-18 and
> is reproduced in each milestone spec at implementation fidelity.

The second half of that sentence is true for most milestones — the specs in the
roadmap's §4 table do carry the detail, and ten of the twelve ordered proposals
resolve to real files. The first half is a dangling reference to
an off-repo chat message, which the `AGENTS.md` SDLC contract forbids as a state
location. Pass 2 voided the delegation and this proposal tracks what was left
without a home.

## AS-IS (evidenced 2026-08-29)

Three named artifacts resolve to nothing in the repositories:

1. **`SDLC-CONTRACT.md`** — named as an M1 deliverable by
   `specs/2026-08-18-agent-instruction-parity-and-repo-policy-spec.md:42`. No file
   of that name exists in minion-meta or minion-factory; the only hit across the
   whole meta checkout is that one citation. The lifecycle contract it described
   does exist, as the "SDLC Contract (normative)" section of `AGENTS.md`, and the
   machine-readable registry exists as `repo-policy.yaml` + `scripts/repo-policy.mjs`.
   So the M1 *outcome* shipped under different names, and only the citation is stale.
2. **"PR order 1–26"** — no committed artifact enumerates 26 ordered PRs. The
   factory has merged well past PR #153 without ever referencing this sequence.
3. **"Stage gates G0–G8"** — no committed artifact defines G6, G7, or G8. The live
   ladder is G0–G5 in `specs/2026-08-17-sdlc-phase-gates-scoring-spec.md`, whose
   semantics are not known to match. Two ladders sharing the `G0` label is a
   collision, not a synonym.

## TO-BE

Either each item has a committed definition, or it is retired as a label. No third
state. Invariant that must not change: the roadmap's milestone ordering, principles,
ladder and predicates stay exactly as they are — this is about naming and homes, not
about program content.

## DELTA

1. Decide `SDLC-CONTRACT.md`: create the file, or amend the parity spec's citation
   to point at `AGENTS.md` + `repo-policy.yaml`. Recommended: amend the citation,
   since the outcome already shipped and a second contract file would compete with
   `AGENTS.md` for authority.
2. Decide "PR order 1–26": reconstruct it from the merged factory PR history as a
   committed appendix, or retire the phrase. Recommended: retire — the milestone
   table in the roadmap's §4 already provides the ordering that the phrase implied,
   and reconstructing a sequence nobody followed adds no control.
3. Decide `G0–G8`: define G6–G8 in a milestone spec (and reconcile G0–G5 semantics
   against the phase-gates spec), or leave the roadmap's §10 disambiguation as the
   final answer. Recommended: leave §10 standing.

Each decision is one edit plus a spec re-pass; none of them touches product code.

**Out of scope:** changing any milestone, governing principle, autonomy rung, or
acceptance predicate; re-scoring the frozen 46/100 and 72/100 baselines; the
milestone-ordering deviation, which is
[`2026-08-29-roadmap-milestone-order-deviation`](2026-08-29-roadmap-milestone-order-deviation.md).

## Definition of done

- `grep -rn 'SDLC-CONTRACT' specs/ proposals/` either resolves to a real file or
  returns no stale citation.
- `grep -rn 'PR order 1' specs/ proposals/` returns either a committed enumeration
  or nothing.
- `grep -rnE '\bG[6-8]\b' specs/ proposals/` returns either a definition or nothing.
- The roadmap spec's §1.3 list shrinks to the items still undecided, or the section
  is removed once all three are closed.
