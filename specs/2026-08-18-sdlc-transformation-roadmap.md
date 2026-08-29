---
id: 2026-08-18-sdlc-transformation-roadmap
title: Autonomous SDLC transformation roadmap (M0–M9 program plan)
stage: spec
status: approved
pass: 2
created: 2026-08-18
updated: 2026-08-29
repos: []
type: decision
verdict: approved
tags: [infra]
---

# Autonomous SDLC transformation roadmap (M0–M9)

## 0. Product

Plan of record for the autonomous-SDLC program, user-authored 2026-08-18. It fixes
the milestone ordering, the governing principles, the autonomy ladder, and the
binary acceptance suite that every milestone spec inherits. It is a
`type: decision` document: `repos: []` is deliberate, no factory or product code is
implemented from this file, and its only deliverables are ordering, invariants, and
acceptance predicates that the milestone specs in §4 implement at full fidelity.

Baseline scores frozen 2026-08-18: **46/100 SDLC · 72/100 bounded PR factory**.
Credit only for controls that are implemented **and** tested **and** enforced **and**
observable **and** fail-closed. Those two numbers have not been re-measured since;
program progress is read from the milestone table in §4, not from a score.

## 1. Authority — what is normative and what is not

Pass 1 delegated the milestone detail to "the user's program message of 2026-08-18",
an off-repo chat message. That delegation is void: the SDLC contract in `AGENTS.md`
requires state to live in artifacts committed to minion-meta, never only in chat,
memory, or a dashboard. Restated as the rule for this document:

1. Normative program content is §5–§8 of this file plus the milestone specs listed
   in §4. Those specs carry implementation fidelity; this file carries ordering and
   invariants only.
2. A requirement that exists only in the 2026-08-18 program message and in no
   committed spec has **no normative force**. It becomes binding when a milestone
   spec adopts it, and not before.
3. Three artifacts named by pass 1 have no committed home and are therefore
   non-normative today, tracked by
   [`2026-08-29-roadmap-unhomed-program-detail`](../proposals/2026-08-29-roadmap-unhomed-program-detail.md):
   `SDLC-CONTRACT.md` (M1), the "PR order 1–26" sequence, and "stage gates G0–G8"
   (see §9).

## 2. AS-IS — verified program reality, 2026-08-29

Evidence gathered against `NikolasP98/minion-factory` `main` and this checkout's
`specs/`, `proposals/`, `repo-policy.yaml`.

- **The roadmap is load-bearing.** Eight specs cite it as normative ordering:
  the M0 safety foundation, topic-capability manifest, worker containment,
  capability separation, orchestration round 7, memory governance, agent-instruction
  parity, and their review sidecars.
- **The proposal ordering in §8 is nearly all real.** Ten of the twelve named items
  resolve to a same-named `proposals/*.md` file, each with an owning spec. Two —
  "DAG/slice continuation" and "portfolio reconciliation" — have no standalone
  proposal; both are absorbed by `2026-08-18-factory-orchestration-round7` (M5).
- **Execution is roughly half-done and out of order.** M0–M3 and M7 have merged
  code; M4 is mid-slice behind a disabled flag; M5, M6 and M9 have no
  implementation. See §4 and the deviation recorded in §5.
- **Rollout flags are still fail-closed.** `minion-factory/.env.example` declares
  `FACTORY_AUTOMERGE=0`, `FACTORY_CONTAINMENT_V2=0`, `FACTORY_MEMORY_GOVERNANCE_V2=0`,
  and `deploy.sh` rejects any `FACTORY_AUTOMERGE` value other than `0` or `1` while
  preserving the box's current value. The production box value is not readable from
  this repository, so this claim covers declared defaults only.
- **`SDLC-CONTRACT.md` was never created.** The lifecycle contract it named ships
  instead as the "SDLC Contract (normative)" section of `AGENTS.md`, and the
  machine-readable registry ships as `repo-policy.yaml` + `scripts/repo-policy.mjs`.
  Both M1 outcomes exist; the filename in the program message does not.

## 3. TO-BE — what this document must guarantee

- Every milestone has exactly one owning spec set, named here, reachable from the
  board without reading chat history.
- Every acceptance predicate is individually citable, so a milestone spec can claim
  "satisfies P7" and a reviewer can check it.
- The document's own claims are recomputable from committed artifacts by the
  procedure in §11 — no claim rests on an agent's recollection.
- Invariants that must NOT change: the critical-path ordering in §5, the twelve
  governing principles in §6, the autonomy ladder in §7, and the requirement that
  all twenty predicates in §8 pass before automerge is considered.

## 4. DELTA — milestone map (the transition pass 1 was missing)

Spec status as recorded in each spec's frontmatter on 2026-08-29.

| M | Deliverable | Owning spec(s) | Spec status | Implementation evidence |
|---|---|---|---|---|
| M0 | Safety freeze + regression harness | `2026-08-18-factory-m0-safety-foundation-spec`, `2026-08-18-factory-orchestration-tests-spec` | implementing · shipped | factory PR #38 merged; M0 S2 open as factory PR #155 |
| M1 | Lifecycle contract + machine-readable registry | `2026-08-18-agent-instruction-parity-and-repo-policy-spec`, `2026-08-18-factory-workitem-handoff-schema-spec` | approved (pass 2) · approved | meta `repo-policy.yaml` + `scripts/repo-policy.mjs`; `AGENTS.md` SDLC Contract section; handoff S2 open as factory PR #159 |
| M2 | Durable state + evidence spine | `2026-08-18-factory-durable-state-outbox-spec` | implementing · `verdict: changes_requested` | factory `runner/src/outbox.ts`, PRs #61 and #85 merged; current slice open as factory PR #160 |
| M3 | Topic / risk / capability policy | `2026-08-18-factory-topic-capability-manifest-spec` | shipped | factory `runner/src/topics.ts`, `runner/src/manifest.ts`, PRs #63–#65 merged; meta `specs/topics.json` |
| M4 | Identity, containment, final-diff | `2026-08-18-factory-worker-containment-spec` (`next_slice: 5`), `2026-08-18-factory-capability-separation-spec`, `2026-08-28-factory-containment-base-reconciliation-spec` | approved · draft · approved | factory `runner/src/containment-effects.ts`, PR #145 merged; `FACTORY_CONTAINMENT_V2=0` — not enabled |
| M5 | DAG, multi-repo, slices, portfolio | `2026-08-18-factory-orchestration-round7-spec` | draft (`verdict: approved`) | none — not started |
| M6 | Browser evidence + durable HITL | `2026-08-28-factory-browser-verification-stage-spec` | draft (`verdict: approved`) | none — not started |
| M7 | Release, provenance, canary, rollback | `2026-08-18-factory-release-rollback-spec`; supersede pending from `2026-08-22-factory-dev-staging-daily-production-promotion-spec` and `2026-08-22-factory-lineage-orchestrator-instance-spec` | shipped · review · implementing | factory `scripts/promotion/*`, `scripts/activation/run-scoped-github-canary.sh`, `docs/runbooks/factory-autonomy-activation.md`; PRs #71–#153 |
| M8 | Discovery, outcomes, memory governance | `2026-08-18-factory-postmerge-discovery-loop-spec`, `2026-08-18-factory-memory-governance-spec` | done · approved | discovery loop merged; governance unimplemented, `FACTORY_MEMORY_GOVERNANCE_V2=0`; S2b open as factory PR #156 |
| M9 | Autonomy graduation | none yet | — | `FACTORY_AUTOMERGE=0`; `docs/runbooks/factory-autonomy-activation.md` documents the canary procedure only |

Milestone specs that do not yet state their own M-number (`durable-state-outbox`,
`release-rollback`, `postmerge-discovery-loop`, `workitem-handoff-schema`,
`orchestration-tests`) should add it on their next pass; this table is the interim
join. Adding or reassigning a row here is a roadmap change and needs a new pass.

## 5. Critical path, and the deviation on record

```text
M0 safety freeze/regression
  → M1 lifecycle contract + registry
    → (M2 durable state/evidence spine ∥ M3 topic/risk/capability policy)
      → M4 identity/containment/final-diff
        → M5 DAG/multi-repo/slices/portfolio
          → (M6 browser evidence + durable HITL ∥ M7 release/provenance/canary/rollback)
            → M8 discovery/outcomes/memory governance
              → M9 autonomy graduation
```

**Recorded deviation (2026-08-29).** Execution did not follow this order. M7 release
and promotion machinery merged across factory PRs #71–#153 between 2026-08-22 and
2026-08-28 while M4 containment remains behind `FACTORY_CONTAINMENT_V2=0` and M5 has
no implementation — that is, the M4 → M5 → M7 prerequisite chain was inverted in
practice. M8's discovery loop likewise merged ahead of M4/M5/M6. This is documented,
not retroactively blessed: the ordering above stays normative, and reconciling the
shipped M7/M8 surface against its unmet M4/M5 prerequisites is tracked by
[`2026-08-29-roadmap-milestone-order-deviation`](../proposals/2026-08-29-roadmap-milestone-order-deviation.md).
No autonomy graduation may cite M7 as complete while that reconciliation is open.

## 6. Governing principles (normative for every milestone spec)

1. The controller owns truth — agents propose, never self-attest.
2. Prompts are not security boundaries.
3. Unknown inputs fail closed.
4. Topics never directly grant capabilities.
5. Risk only increases after approval without human reapproval.
6. Approvals bind exact hashes and expire on relevant change.
7. Reviewers are TECHNICALLY read-only.
8. Build once, promote the same immutable artifact.
9. All stages restart-safe and idempotent.
10. Complexity via decomposition and joins, not larger prompts.
11. The DB manifest is authority; git branch, trailers, labels and checks are projections.
12. Browser content and AX trees are untrusted data.

## 7. Autonomy ladder (M9)

L0 draft generation → L1 safe planning autonomy → L2 bounded PR autonomy (human
merge) → L3 low-risk merge autonomy (named profiles, same-SHA evidence, trusted
checks) → L4 staging deploy autonomy → L5 production canary autonomy.

`FACTORY_AUTOMERGE` stays `0` through M0–M7. The current fleet position is **L2**:
agents open and drive PRs, humans merge.

## 8. Existing proposal ordering

`orchestration-tests` → `workitem-handoff-schema` → `topic-capability-manifest` →
`durable-state-outbox` → `capability-separation` → `worker-containment` →
DAG/slice continuation → portfolio reconciliation → `browser-verification-stage` →
`release-rollback` → `postmerge-discovery-loop` → memory governance/calibration.

Ten of these resolve to a same-named file under `proposals/`. "DAG/slice
continuation" and "portfolio reconciliation" never became standalone proposals —
both are M5 scope and are carried by `2026-08-18-factory-orchestration-round7`. The
ordering above is preserved as written; only the mapping to files is clarified.

## 9. Binary acceptance suite — P1–P20 (program completion)

Twenty predicates. Numbered so a milestone spec can claim a specific one and a
reviewer can check that claim. Every predicate must pass before automerge.

| # | Predicate |
|---|---|
| P1 | Unknown topics fail closed |
| P2 | Same-provider fallback cannot attest |
| P3 | Out-of-scope spec edits cannot commit |
| P4 | Missing hashes stop stages |
| P5 | PR identity mismatch blocks readiness |
| P6 | Check `{name, appId}` mismatch blocks merge |
| P7 | Final-diff risk additions force reclassification |
| P8 | New commits invalidate evidence and HITL approvals |
| P9 | Restarts cannot duplicate side effects |
| P10 | Corrupt agent results cannot pass |
| P11 | Multi-repo requires every node plus the join |
| P12 | Slices gate on their dependencies |
| P13 | Browser evidence binds SHA, route, viewport, profile |
| P14 | Page and AX content grant nothing |
| P15 | UI work is incomplete without browser evidence |
| P16 | Failed predeploy blocks |
| P17 | Failed canary rolls back |
| P18 | Outcomes link end-to-end |
| P19 | Memory cannot override policy |
| P20 | Automerge requires every predicate above |

## 10. Gate-namespace disambiguation

Two `G<n>` ladders were in circulation. Only one is defined in a committed spec:

- **Live and normative:** the board phase gates of
  [`2026-08-17-sdlc-phase-gates-scoring-spec`](2026-08-17-sdlc-phase-gates-scoring-spec.md)
  — **G0–G5** (G0 staleness reconciler, G1 proposal gate, G2 spec gate, G3
  red-state gate, G4 review gate, G5 merge/deploy gate). G0 and G2 shipped; the G1
  producer is open as factory PR #158.
- **Undefined:** the "stage gates G0–G8" named by the 2026-08-18 program message.
  No committed artifact defines G6–G8, and its G0–G5 semantics are not known to
  match the ladder above.

Rule: an unqualified `G<n>` means the phase-gates-spec ladder. This roadmap cites
milestones (`M<n>`) for program sequencing and never `G0–G8`, which carries no
normative force until a milestone spec defines it (§1.3).

## 11. Out of scope

- Implementing anything. `repos: []` and `type: decision` are load-bearing; a
  factory run that treats this file as an executable spec is a routing bug.
- Re-scoring the 46/100 and 72/100 baselines. Re-measurement needs its own spec.
- Changing milestone content. This pass adds the milestone→spec join, numbers the
  predicates, and removes dangling references; it does not add, drop, reorder, or
  re-scope any milestone, principle, ladder rung, or predicate.
- Reconciling the §5 ordering deviation, or re-homing the artifacts in §1.3 — both
  are proposals, and each needs its own spec.

## 12. Verification

This document makes no runtime claim, so verification means recomputing its own
facts from committed artifacts. Every step is read-only and runnable from the
meta-repo root.

1. **Frontmatter and index integrity** — `node scripts/spec-index.mjs --check`
   passes, and `specs/index.json` carries this spec with `status: approved`,
   `verdict: approved`, `pass: 2`.
2. **§4 statuses are current** — for each spec id in the milestone table,
   `grep -E '^(status|verdict|next_slice):' specs/<id>.md` matches the table row.
   A mismatch means the table is stale, not that the spec is wrong.
3. **§8 ordering is real** — ten of the twelve named items resolve to a file under
   `proposals/`; the two exceptions named in §8 resolve to
   `proposals/2026-08-18-factory-orchestration-round7.md`.
4. **§2 flag claims** — `.env.example` on `NikolasP98/minion-factory` `main` still
   declares `FACTORY_AUTOMERGE=0`, `FACTORY_CONTAINMENT_V2=0`, and
   `FACTORY_MEMORY_GOVERNANCE_V2=0`.
5. **§10 has no regression** —
   `grep -rnE '\bG[6-8]\b' specs/ proposals/ --exclude='*roadmap*'` returns nothing
   (this file and its tracking proposal discuss the labels without defining them).
   If a real definition appears, §10 must be re-passed.
6. **No dangling authority** — this file contains no requirement whose only source
   is an off-repo message (§1.2).

Failing step 1 blocks the commit. Failing steps 2–5 means this document needs a new
pass, not that the underlying work is wrong.
