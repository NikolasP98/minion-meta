---
id: 2026-10-21-windows-qualification-observer
title: Correct Windows qualification observer identity and reviewed test count
status: review
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [test, infra]
source: assistant-capability-production-adoption-2026-10-21
---

# Correct Windows qualification observer identity and reviewed test count

## AS-IS

Gateway PR #342 at `cb754efea597038accc719d9b6ed6b7e672ef1a1` passed all 74 outbound tests during its first focused Windows invocation, with exit code 0 and no timeout. CI run `39550398574`, job `119058332604`, then failed its process monitor: PowerShell collector PID 2952, parent 1644 (the qualification coordinator), was counted as a new process with unproven ownership. `snapshotWindowsProcesses()` starts `pwsh` to enumerate processes and includes that collector in its own snapshot. A later snapshot uses a new collector, so the new-process guard rejects a successful test invocation. Artifact `12323606453` has SHA-256 `5f25c4747ce5138778874a91e4e5840306e589e987add4756fee54a49d25d044`.

The real before-snapshot also contains Windows System Idle Process PID 0, which the current manifest validator rejects because it requires every process ID to be positive. Preserve this legitimate row and accept nonnegative snapshot IDs; collector and termination targets remain strictly positive.

The helper also pins `EXPECTED_TESTS = 88`, while the actual outbound suite contains 74 tests. The test blob `ba0ff1a` at helper introduction `79f9ee22` is identical to final DEV `8dcbf5ce`; the current test repair only changes timing/readiness and removes no tests. The higher expectation was not caused by the current repair. Do not obtain a passing gate by accepting arbitrary observed report counts.

## TO-BE

Exclude only the exact process performing the snapshot, identified by its own PowerShell PID in the returned envelope. Retain other PowerShell processes, descendants and unrelated processes for normal ownership/leak checks. Reject malformed envelopes and invalid observer identity. Keep a fixed, independently reviewed expected test count matching the unchanged source suite. Keep ten successful invocations, exact source/checkout binding, absolute deadlines, no skipped/failed tests, and owned/unowned process rejection.

## DELTA

1. Have the collector return its own PID with the process rows. Validate that envelope before excluding that PID; never filter by process name or broad parentage.
2. Accept legitimate PID 0 in snapshot/manifest rows without changing collector or termination eligibility. Add regression tests based on the observed collector/parent shape, including other PowerShell processes and descendants that must remain visible, malformed identity, and unresolved survivor rejection.
3. Correct the fixed expected count to the independently verified 74-test source baseline. Record that provenance in the helper; reject other counts and skips.
4. Run helper tests, repository checks and independent standards/spec review. Obtain human merge approval for this separate observer repair. Then refresh PR #342 against the corrected DEV base and require real Windows focused qualification before its merge. The final integrated DEV commit must still pass full Windows before production promotion.

## Lifecycle exception and boundary

This bounded qualification-helper hotfix bypasses a new standalone spec because the Windows artifact reproduces the observer self-inclusion and the unchanged source proves the count mismatch. It does change qualification implementation and therefore requires separate human merge review. It changes no product runtime, test inventory, workflow admission, deadline or production configuration. PR #342 remains held until qualification succeeds; neither this proposal nor a local helper test authorizes a gate waiver.

## Completion

Local fixture tests prove filtering and validation semantics, not native Windows acceptance. Close only after actual Windows qualification produces all ten successful invocation reports without hiding real surviving processes, followed by complete full Windows qualification on the final integrated source.

## Prepared correction

Gateway PR #343 at `4afe610ffbdae4a125ef772005f9957a51df4479` changes only the helper and its test file. All 21 observer tests and 12 full-shard tests pass, including strict foreign-survivor and invalid-count cases; full repository checks pass with 0 errors and 57 existing warnings. Independent design/implementation review passed. Both actual Windows artifact arrays validate after omitting exactly their collectors, with PID 0 preserved. Actual native ten-run qualification remains pending after this separate human-reviewed merge.

CI `39551465500` passed at `4afe610ffbdae4a125ef772005f9957a51df4479`: 60 workflow tests, 26 diagnostics tests, and 33 Node helper tests passed. All non-skipped PR checks succeeded. Native focused and full Windows were correctly not admitted for this protected-infrastructure change; they remain mandatory after the separate observer merge. PR #343 is ready for human review.
