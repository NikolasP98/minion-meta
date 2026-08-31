---
id: 2026-08-29-roadmap-milestone-order-deviation
title: M7/M8 factory work shipped ahead of its M4/M5 prerequisites
status: in-spec
created: 2026-08-29
updated: 2026-08-31
repos: [minion-factory]
tags: [infra, security]
approved_reason: "Ranked-queue supervisor approval: board-goal-v2 score 89/100, recommendation execute, readiness specification 8/10 and implementation 6/10; live admission threshold 80/100 and readiness threshold 6/10."
spawned_spec: 2026-08-31-roadmap-milestone-order-deviation-spec
---

# M7/M8 shipped ahead of its M4/M5 prerequisites

## Problem

`specs/2026-08-18-sdlc-transformation-roadmap.md` declares a normative critical
path: M4 identity/containment/final-diff, then M5 DAG/multi-repo, then M6 and M7 in
parallel, then M8. Execution ran the other way round. The roadmap's §5 now records
the deviation; this proposal is where reconciling it is tracked.

## AS-IS (evidenced 2026-08-29)

- **M7 shipped.** `2026-08-18-factory-release-rollback-spec` is `status: shipped`.
  Release, promotion, canary and rollback machinery merged across
  `NikolasP98/minion-factory` PRs #71–#153 between 2026-08-22 and 2026-08-28:
  `scripts/promotion/build-release-manifest.mjs`,
  `scripts/promotion/rollback-previous.sh`,
  `scripts/activation/run-scoped-github-canary.sh`, and
  `docs/runbooks/factory-autonomy-activation.md`.
- **M8's discovery half shipped.** `2026-08-18-factory-postmerge-discovery-loop-spec`
  is `status: done`.
- **M4 did not.** `2026-08-18-factory-worker-containment-spec` is `status: approved`
  with `next_slice: 5`; `2026-08-18-factory-capability-separation-spec` is
  `status: draft`. `runner/src/containment-effects.ts` exists but
  `FACTORY_CONTAINMENT_V2=0` in `.env.example`, so containment is not enabled.
- **M5 did not.** `2026-08-18-factory-orchestration-round7-spec` is `status: draft`
  with no implementation.

The ordering existed for a reason: M4 supplies the identity, containment and
final-diff reclassification that M7's release path is supposed to rely on, and
predicates P5, P6 and P7 of the acceptance suite are M4-shaped. A release path that
promotes artifacts without them is trusting evidence that no enforced control
produced.

This is an ordering claim, not an exploit claim — no attempt was made to find a
live bypass in the shipped promotion path, which is why the definition of done
below starts with an audit rather than a fix.

## TO-BE

Either the shipped M7/M8 surface is shown to satisfy the M4 controls it depends on,
or the specific gaps are named and gated. Invariants that must not change:
`FACTORY_AUTOMERGE` stays `0`; the roadmap's critical path stays as written; no
autonomy graduation cites M7 as complete while this is open.

**Scope note.** The roadmap's §5 "Durable closure gate" has three conditions:
(1) M4 controls enforced, (2) an M5 disposition for M7's/M8's dependency on it,
(3) an M6 disposition for M8's dependency on it. This proposal produces evidence
for condition 1 only. Closing this proposal's definition of done below does
**not** satisfy conditions 2 or 3 and does **not**, by itself, lift the roadmap's
autonomy-graduation block — those need their own explicit, human-signed
dispositions, which are out of scope here (see below) and stay open regardless
of this proposal's status.

## DELTA

1. Audit the merged M7 promotion path against the M4-shaped predicates P5 (PR
   identity mismatch blocks readiness), P6 (check `{name, appId}` mismatch blocks
   merge) and P7 (final-diff risk additions force reclassification). Record, per
   predicate, whether the shipped path enforces it, relies on an unenforced
   assumption, or does not address it.
2. For each unenforced case, either land the M4 control that covers it or add an
   explicit fail-closed gate in the promotion path.
3. Re-pass the roadmap's §5 with the audit result — either closing the deviation
   or narrowing it to the specific gaps that remain.

**Out of scope:** enabling `FACTORY_CONTAINMENT_V2`; implementing M5; giving M6 a
disposition; rewriting the roadmap's ordering to match what happened, which would
erase the finding rather than resolve it; the un-homed program detail, which is
[`2026-08-29-roadmap-unhomed-program-detail`](2026-08-29-roadmap-unhomed-program-detail.md).
Because M5 and M6 dispositions are out of scope here, closing this proposal
cannot close the roadmap's §5 durable closure gate on its own — conditions 2 and
3 of that gate need a separate proposal (or an explicit human-signed waiver) and
stay open when this one closes.

## Definition of done

- A committed audit maps P5, P6 and P7 to the shipped promotion path, one verdict
  each, with a code anchor per verdict.
- Every "not enforced" verdict has either a merged control or a named fail-closed
  gate in the promotion path.
- The roadmap's §5 deviation paragraph is re-passed to match the audit, and that
  re-pass states explicitly that this closure satisfies only condition 1 of the
  durable closure gate — conditions 2 (M5) and 3 (M6) are recorded as still open,
  tracked by a follow-on proposal, not silently implied as resolved.
- `FACTORY_AUTOMERGE` is still `0` when this closes.
