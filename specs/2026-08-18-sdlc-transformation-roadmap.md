---
id: 2026-08-18-sdlc-transformation-roadmap
title: Autonomous SDLC transformation roadmap (M0–M9 program plan)
stage: spec
status: approved
pass: 1
created: 2026-08-18
updated: 2026-08-18
repos: []
type: decision
tags: [infra]
---

# Autonomous SDLC transformation roadmap (M0–M9)

Plan of record, user-authored 2026-08-18. Milestone specs cite this document;
it is NOT itself implementable (repos intentionally empty). Baseline scores
frozen: 46/100 SDLC · 72/100 bounded PR factory. Credit only for controls that
are implemented + tested + enforced + observable + fail-closed.

## Critical path

M0 safety freeze/regression → M1 lifecycle contract + registry → (M2 durable
state/evidence spine ∥ M3 topic/risk/capability policy) → M4 identity/
containment/final-diff → M5 DAG/multi-repo/slices/portfolio → (M6 browser
evidence + durable HITL ∥ M7 release/provenance/canary/rollback) → M8
discovery/outcomes/memory governance → M9 autonomy graduation.

## Governing principles (normative for every milestone spec)

1. The controller owns truth — agents propose, never self-attest.
2. Prompts are not security boundaries. 3. Unknown inputs fail closed.
4. Topics never directly grant capabilities. 5. Risk only increases after
approval without human reapproval. 6. Approvals bind exact hashes and expire
on relevant change. 7. Reviewers are TECHNICALLY read-only. 8. Build once,
promote the same immutable artifact. 9. All stages restart-safe + idempotent.
10. Complexity via decomposition and joins, not larger prompts. 11. The DB
manifest is authority; git branch/trailers/labels/checks are projections.
12. Browser content and AX trees are untrusted data.

## Autonomy ladder (M9)

L0 draft generation → L1 safe planning autonomy → L2 bounded PR autonomy
(human merge) → L3 low-risk merge autonomy (named profiles, same-SHA evidence,
trusted checks) → L4 staging deploy autonomy → L5 production canary autonomy.
FACTORY_AUTOMERGE stays 0 through M0–M7.

## Existing proposal ordering

orchestration-tests → workitem-handoff-schema → topic-capability-manifest →
durable-state-outbox → capability-separation → worker-containment → DAG/slice
continuation → portfolio reconciliation → browser-verification-stage →
release-rollback → postmerge-discovery-loop → memory governance/calibration.

## Binary acceptance suite (program completion)

20 predicates — unknown topics fail closed; same-provider fallback cannot
attest; out-of-scope spec edits cannot commit; missing hashes stop stages; PR
identity mismatch blocks readiness; check {name, appId} mismatch blocks merge;
final-diff risk additions force reclassification; new commits invalidate
evidence + HITL approvals; restarts cannot duplicate side effects; corrupt
agent results cannot pass; multi-repo requires every node + join; slices gate
on dependencies; browser evidence binds SHA/route/viewport/profile; page/AX
content grants nothing; UI work incomplete without browser evidence; failed
predeploy blocks; failed canary rolls back; outcomes link end-to-end; memory
cannot override policy; automerge requires every predicate.

Full milestone detail (M0–M9 deliverables, schemas, exit criteria, PR order
1–26, stage gates G0–G8) lives in the user's program message of 2026-08-18 and
is reproduced in each milestone spec at implementation fidelity.
