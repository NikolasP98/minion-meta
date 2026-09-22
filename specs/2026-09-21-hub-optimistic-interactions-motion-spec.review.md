---
spec: 2026-09-21-hub-optimistic-interactions-motion-spec
pass: 2
verdict: pending
reviewer: codex-independent-spec-review
created: 2026-09-21
---

# Independent specification review

This is a review of the specification, not implementation qualification or human approval. The machine gate remains pending because the draft includes data/security work requiring human approval. No review score or release evidence is asserted.

## Pass 1

Two independent audit agents reviewed the draft after source reconnaissance:

- Mutation/protocol review (`freshness_audit`) requested exact-operation reconciliation for ordinary optimistic PATCHes; current entity version alone cannot establish whether a lost response's operation committed after intervening writes. Required dependent-write pause and reload-recoverable operation identities.
- UX/standards review (`component_audit`) requested normative keyboard/touch movement, removal/rollback focus rules, a notification-rule catalogue entry, and one coalesced accessible status owner.

## Revision

Spec §§3.2–3.3 now require atomic receipts or tested equivalent exact-operation proof, block optimistic activation without it, pause dependent writes and recover outstanding identity across reload. §§3.5 and 5.2 define status/focus ownership and accessible movement. A43 adds notification-rule D/C policy. §8 includes observable acceptance cases. The spec pass increased to 2.

## Pass 2

- Protocol reviewer: PASS for the previously blocking gap; no remaining blocker in the resolution-only review.
- UX/standards reviewer: PASS; all four requested gaps resolved.

These are bounded independent reviews of the written contracts. They do not prove backend idempotency, scheduling capacity safety, accessibility in the real app, or performance. All remain implementation acceptance gates.
