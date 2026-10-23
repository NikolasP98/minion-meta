# Gateway fixture correction recheck, revision 2.1

**C-IR-08a and C-IR-08b are closed at source and focused qualification.** No further correction is requested from this two-file review. Complete implementation acceptance remains pending the root-owned full check, main tests, build and final D/F handoff. This is not a release or merge approval.

## Exact candidate

C clone `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway`, branch `feature/agent-harness-c-gateway`, base/HEAD `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`.

- Source manifest SHA256: `e5b6de5ca3d91e9c8ce676cb10acae3f6a575ed7179703568d138edaecfc15dd`.
- Tracked patch SHA256: `8c781a39a4b605a7ce5ba2161330e09f6ece11554dc411a3d6addc0b722fbe89`.
- Mandatory untracked archive SHA256: `b0826a3dae776deaf8f4764463aae6ecb8483528d45d07da9709c6c241b1fcec`.
- Two-helper correction patch SHA256: `3a2b65e846738b12424466fe7f8f1cac05aac7158a0813909fb7a19d353361ec`.

Independent verification matched all 66 owned files/modes, all 20 preserved install-noise files, and installed SDK/lock pins. Exactly the two helper files changed; all other 64 files are byte/mode identical to independently reviewed revision2. All referenced developer check-log hashes match. `evidence.json` records these checks and the independent compiler receipt. No source/spec/task/staging/dependency/branch changes or external calls occurred. No reviewer jobs remain running.

## Standards

`extensions/alert-watcher/test-support/retention-process.ts` now initializes the actual `PluginRegistry.httpHandlers` field as `[]`, matching the declared `PluginHttpRegistration[]` and the canonical registry initializer. The earlier revision2 report mistakenly named this field `httpRoutes`; the original diagnostic and corrected diff concern **httpHandlers**. The old report remains preserved; this is the correction to that label. Native registry initialization still precedes the dynamic outbound-recovery import; disabled-plugin behavior is unchanged.

`extensions/alert-watcher/test-support/suggestion-process.ts` explicitly implements both `StatementSync.run` overloads and forwards to the original bound native method. The record guard excludes null, scalars and `ArrayBuffer` views, consistent with installed `SQLInputValue = null | number | bigint | string | NodeJS.ArrayBufferView`. Named values and positional values are forwarded through their corresponding narrowed overloads. No `any`, compiler/lint suppression, prototype mutation, skipped test or weakened assertion was introduced.

Independent replay of the focused installed-Node compiler command exited 0 in 1.917 seconds. Before running, the extracted observer block was compared to the current source and found identical. This proves the actual overload implementation against installed Node declarations; it is not a full-project compiler pass. Developer logs also report helper formatting and explicit type-aware lint with zero warnings/errors; hashes and exits were checked.

## Spec and process-proof preservation

The observer still executes native `run` before examining the serialized suggestion and blocking. Admission and terminal barriers are triggered from the same actual persisted values. The `COMMIT` observation for recipient materialization is unchanged. No persisted state is fabricated; no provider/send counter or acceptance expectation changed. The disabled recovery helper retains its exact no-send detection.

Developer focused runtime receipt is green: `suggestion-recovery.test.ts` (three SIGKILL boundaries) plus `live-retention.test.ts` (twelve cases), **15/15**, two files, one worker, wrapper exit 0. Those execute the same admission/terminal/materialization barriers and fresh-process retention paths reviewed in revision2. The reviewer did not duplicate this native suite while root owned the full-gate window; this distinction is explicit.

The full revision2 review, all eight unchanged independent behavioral probes, actual C→F history/cohort check, FR/SC/task inventory and production source assessment carry forward because their source/assertions are unchanged. The only new obligations were these two compiler corrections; both are implemented without changing scope or behavior. There is no additional convergence task to append. T029/T030, SC-C06 and final D/F artifact identities remain pending root gate receipts and final handoff. The earlier failed full check remains a real failure; the running attempt02 must supply its own terminal result. No main-test/build pass is inferred.
