# GW-018 nightly child-outcome independent review v2

- Contract: `spec-gw018-nightly-child-outcome.md`
- Reviewed SHA-256: `3b28cbc32c5ab0fff1eb727fe52361cc9ce908b461121c77232dfdc808fe2ce6`
- Gateway source baseline: `0cdd31d4cc3102a1ec3c24eedb1630e75d0663a0`
- Prior immutable review: `gw018-nightly-child-outcome-independent-review.md` (`BLOCK` at SHA-256 `05ba9039aca970195fd28929722464c7d0d6608d686e76501abdf3ceb045a7ea`)
- Verdict: **PASS**

The revised contract closes both prior blockers without weakening the exact-child or no-replay rules.

1. AS-IS now states that several child jobs have no configured limit. The product contract explicitly classifies the 110-minute `observation_deadline` as a wrapper failure, preserves the last nonterminal child state and link, and does not cancel, relabel or claim a terminal child conclusion. The 120-minute parent budget leaves time to publish that bounded failure. Verification includes the still-`in_progress` case and forbids fabricating a terminal result.
2. The helper command is now required in the actual workflow-only `ci-contract` lane, the ordinary `check` lane and the nightly pre-dispatch path. The existing parsed nightly assertion must be strengthened rather than retained as a parallel dispatch-only authority. Verification removes each integration element and requires the actual workflow-only command to fail.

The exact positive run ID, trusted-origin link construction, workflow/repository/event/branch/SHA/attempt fences, one POST, clipped per-request deadline, finite GET retry policy, monotonic observation budget and fail-closed conclusion matrix remain intact. No implementation or hosted dispatch is part of this verdict.
