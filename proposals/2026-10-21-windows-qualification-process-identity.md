---
id: 2026-10-21-windows-qualification-process-identity
title: Track Windows qualification process ownership by birth identity
status: review
created: 2026-10-21
updated: 2026-10-21
repos: [minion]
tags: [test, infra]
source: assistant-capability-production-adoption-2026-10-21
---

# Track Windows qualification process ownership by birth identity

## AS-IS

Gateway PR #343 is merged at `85272bfb2dbd60092170bcd098dd9f056d436fd2`. PR #342 incorporates it in `f08e8f0470097cdad1b460ef8fb17a7cf307d006`. CI `39553801479`, attempt 2, failed its focused qualification at ordinal 2 despite two reports with 74 passed tests, exit 0 and no timeout. The helper's `accumulateOwnedProcesses()` tracks numeric PIDs and expands descendants whenever their recorded parent PID is in that set. The final unresolved-process check also uses only numeric PID.

The false ownership is consistent with a test-tree process reusing historical parent PID 5224; the old manifest does not retain the root PID or ownership set, so the exact reused process is inferred rather than directly recorded. Four rows (`csrss.exe` 5528, `winlogon.exe` 6108, `fontdrvhost.exe` 3640, `dwm.exe` 1276) are identical in its before/after snapshots, including their creation times. They nevertheless become transitively owned and reject the run. Artifact `12325646970`, SHA-256 `4279151d3c2a5ff95536149f55538beb1e213e790e4e88e6c945150eea1ff2e4`, preserves the reproduction. See `audits/2026-10-18-assistant-capability-repair/windows-f08e8f-qualification-attempt2.json`.

Attempt 1 separately rejected new unknown Windows service processes at ordinal 9. That fail-closed behavior remains required. One independently justified fresh attempt exposed this different PID reuse bug; no further unchanged-source retries are authorized as a substitute for a repair.

## TO-BE

Bind ownership to observed process birth identity and parent lifetime. Never adopt a stable pre-existing baseline process into a new test tree because its numeric parent PID was reused. Retain proven descendants after their observed parent exits. A reused PID must neither inherit old ownership nor conceal a new unknown survivor. Before timeout tree termination, require a parseable exact root birth and prove every row in the current numeric descendant closure belongs to the recorded birth identities. If any reachable row is pre-existing, reused or unknown, refuse tree termination. A process snapshot followed by taskkill is not atomic; this does not claim to eliminate that remaining race. Keep unknown ancestry fail-closed. Retain all ten invocations, exactly 74 passed assertions each, existing deadlines, exact source binding and full-shard gates.

## DELTA

1. Reproduce the actual native false ownership with a regression that fails before the change.
2. Correct ownership accumulation and survivor classification using birth evidence and baseline identity. Do not exempt process names or broadly exclude OS service descendants.
3. Add adversarial checks for baseline adoption, reused root and descendant PIDs, parent exit, malformed root birth, missing ancestry, real owned/unowned survivors and timeout refusal for a stale baseline descendant link.
4. Run focused helper tests, actual artifact replay, repository checks and independent standards/spec review. Prepare a separate reviewed PR; obtain human merge approval for its qualification implementation change.
5. Refresh #342 only after the helper correction is merged. Require a complete new native qualification and both full shards, then final merged DEV qualification before production promotion #339.

## Lifecycle exception and completion

This bounded monitor hotfix bypasses a new standalone spec because native evidence and a direct regression establish the defect. It changes no product runtime, test inventory, deadline, workflow admission or production configuration. Local replay cannot close native acceptance. Keep #342 and #339 held until the required source-bound Windows evidence passes. No merging of evidence across failed attempts and no retry-to-green loop.

## Prepared correction

Gateway [PR #344](https://github.com/NikolasP98/minion-ai/pull/344), exact head `e706031737d73e0366a78997d6a229d302022171`, changes only the qualification helper and its tests. The before regression fails with owned-process rejection; all 40 helper tests pass after. Full `pnpm check` passes with 0 errors and 57 existing warnings. Independent standards/spec review passes.

The tracker excludes baseline birth identities, requires an exact currently observed owned parent and chronological birth evidence for adoption, retains proven descendants and refuses ownership transfer across PID reuse. Timeout termination requires parseable root birth and a wholly proven current numeric descendant closure. Additive root/ownership evidence makes later diagnosis auditable. Replay of the actual 142-row baseline and 141-row after snapshot reproduces four false-owned rows with the old tracker and none with the correction; all six unknown survivors from attempt 1 remain rejected. The modeled root collision is labeled an inference. Native ten-run/full-shard acceptance remains pending after separate human-reviewed merge; no gate is waived.

CI `39556348676` passed on exact head `e706031737d73e0366a78997d6a229d302022171`: 60 workflow, 26 diagnostics and 40 Node helper tests passed. All non-skipped checks passed. Protected-infrastructure admission correctly skipped native focused/full Windows; native acceptance remains pending after the separate helper merge. PR #344 is ready for human review.
