# Assistant capability production adoption

Owner approved the conditional production release and exact FACES correction, then confirmed all three repair PRs merged. This is an in-progress execution record, not a full-live claim.

## Source and Hub

- Gateway PR #338 merged DEV `3db71f43e221c7621187571aca579b3d7ba85ea4`.
- Hub PR #574 merged `2dff855dbf9bb6217a2193ad84bea70fcf619cb6`.
- Meta PR #847 merged `1e69de76e92fae1dc18db5b1c6bd3ce68cfc46b9`.
- Hub Vercel deployment `dpl_V2SWNfkYzRjNqNqfMiY5wmHjrFKQ` is production READY and independently resolves from `hub.minion-ai.org`; metadata matches the exact Hub merge SHA. Merged CI 39543822305 check/build passed with 0 errors / 0 warnings; 896 test files passed / 5 skipped, 7,843 tests passed / 263 skipped, architecture 3/3. QA-stack also passed; overall merge CI succeeded with 9 passed jobs and 1 skipped migration-pairing job.

## Gateway release history

Main `12e03f7` and repair parent DEV `5096950` have identical complete trees, despite squash-divergent ancestry. Production promotion PR #339 is DEV to main, as enforced by CI. The actual source delta is exactly 31 approved repair files.

Normal-merge rehearsal found 11 squash-history conflicts. Reconciliation PR #340 merges main ancestry into DEV, retaining the exact DEV file contents. Commit `61f03fe` has both pinned parents and unchanged tree `6db45431112ffd120ff4653a4fd5eecd632e9d2a`. Independent standards/scope review approved it. It must integrate with a true merge commit; squash/rebase discards the needed ancestry. The isolated direct merge commit is a documented exception to the file-scoped committer, because no file diff exists.

Full merged-commit qualification, source promotion, deployed digest and runtime acceptance remain pending. No production Gateway write has been performed.

## FACES preflight and acceptance

Read-only preflight at 04:26 UTC verified owner membership, expected persisted runtime identity, active NULL assignment, canonical FACES gateway and current production lease. Container 98139d0bb172 retains the expected old callback hint, enabled Hub URL and existing personal agent. A live read-only WebSocket handshake using existing runtime credentials and operator.read returned exactly one matching agents.list entry on both container loopback and the canonical TLS endpoint. Requests made with the actual callback credentials and configured hint returned 403 ASSISTANT_GATEWAY_ASSIGNMENT_REQUIRED for both catalog and permissions. No credentials were printed.

The approved single-field callback patch was tested on local fixtures for dry-run, private backup, ownership, idempotency and unexpected-old-value refusal. It has not run against production.

Browser Use refused an isolated session with 402 Payment Required. The owner chose to perform the final authenticated check in Hub when notified. After source/config verification, refresh FACES and ask the original question; verify the hosted binding afterward. Never create a fabricated user session or bypass the hosted verifier.

GitHub branch-protection API is unavailable for this private repository plan (403). Auto-merge is not used as a substitute for manually checking the required workflows. PR #340 runs ordinary code checks despite zero final source difference; those must finish before its merge.

## Separate maintenance finding

DEV deployment succeeded, but its Compose rollback alias was rejected because the repository owner retained uppercase characters. Draft Gateway PR #341 adds exact-site handoff comments only; `proposals/2026-10-21-dev-compose-rollback-alias.md` records the separate repair. The approved production candidate is unchanged. This evidence does not establish an impact on the separate production Swarm controller.

## Operations review

Independent read-only review of the prepared callback helper found no blocking deviation from the release procedure. The original-byte check and atomic rename are optimistic concurrency protection, not an interprocess lock; execution must avoid overlapping configuration writers. Any error after rename is an unknown commit outcome: reread current configuration before retrying or restoring. Container identity, lease, runtime roster and credentials remain external preconditions.

Original merged DEV CI `39543796036` completed both full Linux shards with 13,414 passing tests and 17 skips, and its macOS TypeScript suite passed. Native Swift build succeeded, but the existing step named Swift test only printed `--show-codecov-path`; this record does not count it as executed Swift tests. Full Windows qualification remains pending.

## Final release candidate

PR #340 passed all applicable checks and merged with a true merge commit at `8dcbf5ce10fbbbae534de411627ff85f9e955200`. Root fetched both branches and verified main `12e03f7` is now an ancestor of DEV, the final tree remains `6db45431112ffd120ff4653a4fd5eecd632e9d2a`, and the production delta remains the 31 approved files. Final DEV CI is [39546077771](https://github.com/NikolasP98/minion-ai/actions/runs/39546077771); qualification is pending. No workflow was manually cancelled.

Final DEV full Linux qualification passed all eight JSON reports across both shards: 13,414 tests passed, 17 skipped, 0 failed, covering all four configurations and 1,393 unique files. The immutable artifact checksums and per-configuration totals are recorded in `gateway-final8dcbf5ce-qualification.json`. Windows prerequisites and macOS remain active; full Windows and production adoption remain pending. The superseded original DEV run was cancelled automatically by workflow concurrency, with no manual cancellation.

Independent standards/spec review of this adoption record at `9630490` passed with no material findings. Both indexes and whitespace checks passed; the Hub receipt matched the independently verified production receipt.

## Production hold: full Windows failure

Full Windows shard 2 of final DEV CI failed four tests in the unchanged Teams TTL, CI admission and outbound recovery test files. An unhandled lease cleanup error also occurred, and the shard did not execute its gateway configuration. Production promotion PR #339 remains draft; no production Gateway or FACES configuration write has occurred. A separate test-only hotfix is being prepared under `proposals/2026-10-21-windows-release-qualification-timing.md`. Earlier Linux/macOS/smoke successes do not satisfy the failed full Windows gate.

The final CI completed with full Windows shard 1 successful, shard 2 failed, and Windows full required failed. The held production promotion is not merge-ready. Test-only hotfix [Gateway PR #342](https://github.com/NikolasP98/minion-ai/pull/342), commit `cb754efea597038accc719d9b6ed6b7e672ef1a1`, preserves all assertions and runtime behavior. Focused tests passed: CI workflow 29, outbound 74, Teams 1; an injected 1.2-second file-read delay failed the original Teams test and passed the corrected version. Independent standards/spec reviews passed. After a clean frozen-lockfile workspace install and BAML generation, full `pnpm check` passed with 0 errors and 57 existing warnings. The first local check lacked extension workspace dependencies; that environment failure was repaired, not suppressed. PR checks and a new human merge are pending; final merged full Windows remains mandatory.

## Qualification monitor blocker

PR #342's first focused Windows invocation passed all 74 outbound tests, but the monitor rejected its own PowerShell collector as a new unowned process. It also has an independently identified 88-versus-74 expected-count mismatch dating to helper introduction. The ten-invocation sequence stopped after the first invocation; this is not a successful qualification. A separate observer fix is being prepared under `proposals/2026-10-21-windows-qualification-observer.md`, requiring human merge review before PR #342 is requalified against the corrected base. No blind retry, gate waiver, source promotion or FACES write occurred.

Observer hotfix [Gateway PR #343](https://github.com/NikolasP98/minion-ai/pull/343), commit `4afe610ffbdae4a125ef772005f9957a51df4479`, changes only the qualification helper and its tests. Observer tests 21/21 and full-shard validator tests 12/12 pass. Full `pnpm check` passes with 0 errors and 57 existing warnings. Independent design and implementation reviews pass. Replaying the original native snapshot arrays removes only collector 6148 from 148 before rows and collector 2952 from 144 after rows; all other row metadata validates, system PID 0 is retained, and no remaining new survivor is found. This is artifact replay, not ten successful native invocations. PR CI and human merge remain pending.

Release order: qualify and approve #343, merge it into DEV, update #342 from that DEV while preserving its three test changes, require its real focused Windows qualification and full shards, then obtain/execute its approved merge. Require full qualification of the final integrated DEV SHA before promoting #339. Only after immutable production image verification may the previously approved FACES callback correction run. Ask the owner to refresh FACES and run the original question only when those prerequisites are complete. No production mutation has occurred.

## Current approval boundary

Observer PR #343 is ready for review after CI `39551465500` succeeded on exact head `4afe610ffbdae4a125ef772005f9957a51df4479`; all non-skipped checks passed, including 60 workflow, 26 diagnostics and 33 Node helper tests. Protected-infrastructure admission correctly skipped native Windows qualification on that PR, so it does not self-qualify Windows. Evidence PR #852 also passed its checks and is ready for review. PR #342 remains draft/held on the old observer. No production Gateway image or FACES configuration has changed. The newly discovered CI fixes need human approval beyond the earlier assistant-release approval; after approval, merge #343 first and qualify #342 against corrected DEV before its merge and the final release gate.

## Owner-approved CI repair continuation

The owner merged #343 at `85272bfb2dbd60092170bcd098dd9f056d436fd2` and authorized final checks followed by #342. The #342 branch incorporates that DEV via merge commit `f08e8f0470097cdad1b460ef8fb17a7cf307d006`, preserving its three-test-file delta. Integrated local verification passed: 33 qualification-helper tests, 29 workflow tests, 74 outbound tests and one Teams TTL test. Full `pnpm check` passed with 0 errors and 57 existing warnings. The branch was pushed for fresh native Windows qualification; prior failed evidence is not reused as success. The conditional production release authorization remains in force, with final merged DEV qualification and immutable-image verification still required before the targeted FACES operation.

The first integrated PR qualification (`39553801479`, attempt 1) stopped at ordinal 9. All nine exact-file reports proved 74 passed assertions, exit 0 and no timeout; the first eight passed the monitor. Ordinal 9 was rejected for six new unowned Windows processes whose ancestry leads to stable, pre-existing service parents. Independent artifact review found this consistent with background OS activity, without proving executable provenance or causality. The strict guard correctly failed closed. Its 96.625-second ninth invocation also left only 31.140 seconds of helper budget, so the missing tenth cannot be salvaged. A single fresh full same-source rerun was initiated with unchanged source and gates; it must independently complete all ten ordinals and both full shards. No cross-attempt stitching or repeated retry-to-green is permitted. Receipt: `windows-f08e8f-qualification-attempt1.json`.

The single fresh rerun (attempt 2) failed at ordinal 2 with a distinct monitor defect: four stable pre-existing system process rows were falsely adopted into the test's owned tree. Their historical parent PID 5224 is absent before and after; numeric PID reuse in the observed test tree is the code-supported explanation, although the old manifest does not retain its root PID or ownership set. Both reports again passed all 74 assertions; no full shards were admitted. No third unchanged-source rerun is being made. A separate birth-identity ownership correction is being prepared under `proposals/2026-10-21-windows-qualification-process-identity.md`. #342 remains draft and production #339 remains held; no production Gateway/FACES mutation occurred.

PID birth correction [Gateway PR #344](https://github.com/NikolasP98/minion-ai/pull/344) is prepared at `e706031737d73e0366a78997d6a229d302022171`, based on DEV `85272bfb`. It changes only two helper files. Before regression fails; 40/40 helper tests and full repository check pass (0 errors, 57 existing warnings). Independent standards/spec review passed. Replay receipt `windows-pid-identity-artifact-replay-20261021.json` retains the distinction between observed baseline misattribution and modeled PID-collision causality, and preserves rejection of all six unknown survivors. CI `39556348676` is pending. A separate human merge is required for this additional qualification implementation change; #342 merge authorization remains conditional and need not be requested again. No Gateway/FACES production mutation occurred.
