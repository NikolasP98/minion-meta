---
spec: 2026-11-10-agent-chat-contracts-followups-spec
pass: 2
verdict: approved
reviewer: independent-stock-and-reschedule-reviewers
created: 2026-11-10
---

# Two-pass technical review

Owner authorized the recon fixes and intended live delivery in the current conversation. Technical review does not assert implementation, CI, deployment or a completed runtime/security-data merge gate.

Pass 1: Standards passed. Spec correction required nonnegative finite rates to preserve valid zero-cost entries. Clarified input versus valuation currency/rate basis, required preview version field, monotonic assistant reschedule versions and whitelisted/masked projections. Gateway review required deterministic user-quote evidence rather than an unsupported semantic-truth guarantee.

Pass 2: Independent reschedule reviewer read the revised full contract. Standards PASS; Spec PASS; no remaining blockers. Gateway reviewer confirmed exact quote/index validation is feasible while preserving explicit memories and threshold/window semantics. Stock reviewer confirmed native conversion/mounted adapter seams and97passing unchanged baseline cases.

Acceptance remains exact implementation, behavioral tests, native authority/SQL, independent code review, actual CI, applicable human gates, deployed identity and safe runtime verification. No model interpretation quality is inferred from emitted prompt text or quoted evidence validation.

Implementation review clarifications: low-field-level finance series must mask opCost; blank codes cannot form a synthetic product identity and exclusions are disclosed; release content admission is bounded and reports dropped fields; native manual UI submission is unchanged. Automatic KG admission also excludes assistant-only context. These close the same authorization/provenance/amount invariants rather than expanding product scope. Their executable regressions and final independent code review remain required.

Production-policy clarification reviewed: the owner's retained one-time exception now names the current exact hotfix branch and the existing pinned main base, with a valid spec pointer. The exception runs complete Node shards because main has no corresponding DEV push. The CI implementation and separate independent review pass both Standards and Spec axes; 84 executable workflow-consumer cases pass, preserving ordinary PR smoke selection, DEV push full shards and protocol validation. This is local policy qualification, not actual GitHub CI or merge approval evidence.

Memory tenant-identity clarification reviewed: the new receipt contract must use the configured authenticated server identity, including shared-token topology. Independent review reproduced the missing transport header and closed the three-file client correction after 32 focused tests and five actual Gateway-request/Hub-auth/ingest-interface cases passed. The Hub storage/entitlement/embedding boundaries in that bridge fixture are stubbed; no new Hub authorization policy, database change or model call is claimed. Both live configurations already supply their server IDs. The pre-correction full-shard receipts are retained as historical qualification; exact final shards are rerun.
