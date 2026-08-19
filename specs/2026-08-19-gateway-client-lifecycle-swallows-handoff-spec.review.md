---
spec: 2026-08-19-gateway-client-lifecycle-swallows-handoff-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-19
---

# Pass 2 correctness and consistency review

## Changes made

- Set the spec to pass 2, `status: approved`, and `verdict: approved` because all identified issues were resolvable from checked-in evidence without a human product decision.
- Added the top-level `infra` tag and the existing adoption proposal to the owner surface so frontmatter and file ownership match Slice 2.
- Corrected the relationship to the existing consumer-adoption proposal: it must be amended for the two S2 hooks because its current DELTA and DoD cover only `onEventError`.
- Corrected the S3 remainder description so both the release note and consumer handoff, not only the changeset, describe the complete pending minor release.
- Narrowed the additive invariant to runtime source because Slice 2 intentionally also amends a changeset and proposal.
- Corrected the backoff contract from `[800, ~1360]` after a successful reconnect to `[800, 800]`, matching `sendConnect()`'s existing successful-handshake reset.
- Added a distinct close-before-hello reconnect case for `[800, ~1360]`, so consecutive-failure backoff is tested without contradicting reset-on-success behavior.
- Clarified that a constructor failure is reporting-only and does not invent another retry, preserving the spec's no-reconnect-policy-change invariant.
- Changed both new public callback declarations to `void | Promise<void>` because the same spec requires rejecting async reporters to be supported and contained.
- Required JSDoc to describe containment of throwing or rejecting reporters, avoiding the ambiguous claim that consumer hooks themselves "never throw."
- Clarified that Slice 1 is behavior-complete but cannot merge or release without Slice 2, removing the contradiction with the mandatory release-contract gate.
- Replaced global catch-count assertions with a targeted assertion for the reconnect swallow because the permitted reporter implementations can legitimately contain different numbers of `catch` blocks.
- Replaced the non-asserting timer-count print with an exact three-timer assertion, making the no-new-timer definition of done machine-checkable.
- Added the consumer-adoption proposal to Slice 2's file list, DoD, consolidated impact table, and out-of-scope boundary while keeping all consumer code out of scope.
- Strengthened proposal verification to require each new hook in multiple contract sections, so the pre-existing out-of-scope mention alone cannot satisfy the DoD.
- Corrected cross-repo impact rows to state the observable default logging each consumer receives after its future bump and tied mitigation to the amended handoff.
- Removed the redundant built-artifact script whose printed booleans did not fail the command and whose pending connect timers made it an unreliable ship gate; focused tests plus package/root gates now prove the behavior.
- Rewrote scope checks as explicit failing shell conditions and split release-note hook checks so each required hook is independently asserted.
- Added the memory-derived prohibition against substituting the full `minion/` gateway suite for these root-package gates, citing `/memory/MINION/MEMORY.md` and `/memory/MINION/gw-no-full-test-suite.md`.

## Review evidence

- `/memory/MINION/gateway-event-seq-gap-false-positive.md` reinforces stale-client fencing and focused `GatewayClient` test coverage; it introduced no additional scope.
- The read-only Claude-memory FTS query returned one WebSocket race observation about hub's module-scoped socket, but it did not alter this shared-client spec.
- No semantic memory-search tool was available in this session.
- The focused test command could not run in this checkout because `vitest` is not installed; the corrected backoff expectation is directly established by `packages/shared/src/gateway/client.ts` resetting `backoffMs` to 800 after a successful handshake.

## Human flags

None.
