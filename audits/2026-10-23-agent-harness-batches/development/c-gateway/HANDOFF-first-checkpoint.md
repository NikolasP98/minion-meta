# C Gateway recovery checkpoint

This is a handoff during qualification, not a completed or independently approved candidate. No commit, staging, push, PR, paid call, production write, merge, activation or deployment occurred in this recovery turn.

Workspace: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway`, branch `feature/agent-harness-c-gateway`, HEAD/base `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`. Parent owns all commit/PR actions. Preserve the 20 original tracked extension UI node_modules bin changes; they are excluded from candidate source proof. No dependency/lock changes were made.

Approved authority is sibling `f-evals/specs/107-harness-gateway/**` and parent `specs/2026-10-22-agent-harness-reliability-and-proactivity-spec.md`. Parent reports two approved independent SDD passes and meta commit `d2e20c17`. Read actual Gateway AGENTS and MINION engineering skill, which were followed. No child agents were spawned.

## Recovered and corrected

Preserved the existing complete runtime candidate. Recovery added bounded persisted authority observations (status/source/reason/time) on the existing classification row, generation-fenced with a monotonic export revision. Revoked/reassigned/disabled received work retains its terminal bill, exports bypass/disabled and cannot publish or admit a new shadow gate. Actual hook tests prove this. Trusted injected shadow tests prove baseline still runs and a gate-negative decision does not suppress complaint materialization.

Queue retained tombstones now hash provider message identifiers; seven-day SQLite receipt cleanup retains a digest of original provider receipt evidence rather than raw identifiers. Added an actual asynchronous message_sending-hook expiry test proving zero provider calls after preparation crosses the deadline.

Native delivery child tests originally failed before barriers with `CHAT_CHANNEL_ORDER` TDZ. A complete unchanged-base source archive reproduces direct deliver-module import failure. Initializing the real plugin registry before outbound runtime matches Gateway startup and fixes the child bootstrap without logging/runtime refactoring. The five actual subprocess kill cases then pass; no provider-checkpoint mocking was added. Base diagnostic is `native-esm-base-diagnostic.log`.

The standard lint config excludes extensions. An initial `--no-ignore` run still honored its config ignorePatterns and inspected only core files; that result is not watcher proof. `oxlint-scoped-config.json` copies all existing rules and removes only the extensions ignore for verification. An actual 52-file type-aware run with max-warnings=0 passes (`lint-scoped-final2.log`). Mechanical braces, unused imports and a typed legacy watcher test fixture were corrected. The fixture's subsequent nullable-hook and nullable-ledger TypeScript corrections were checked by a passing full pnpm check. Two later cron e2e fixture files are new to scope and still require inclusion in final explicit scoped lint/check.

## Executed evidence

Exact commands, UTC times, exits and log names are in `commands.jsonl` for commands run through `run-gate.py`.

| Evidence | Outcome |
|---|---|
| Initial watcher folder | 25 files / 187 tests pass, five delivery-child bootstrap failures; preserved in watcher-focused.log |
| Native delivery subprocess recheck | 5/5 pass, delivery-native-recheck.log |
| Core focused source/provenance/retention/host/cron/loader | 8 files / 107 tests pass, core-focused.log |
| Authority/store/bridge/export recheck | 4 files / 19 tests pass, watcher-authority-recheck.log |
| Async expiry + actual hook/trusted shadow | 2 files / 17 tests pass, retention-shadow-recheck.log |
| Explicit watcher/core type-aware lint | 52 files, zero warnings/errors, lint-scoped-final2.log |
| Full pnpm check | exit0, check-final2.log; formatting 5999 files, tsgo, core lint, manifests and capabilities |
| Full check warnings | 57 warnings, zero errors; each warning file byte-identical to HEAD, lint-warning-baseline.json |
| Native queue/SQLite/owner-reply/retention smoke | exit0, native-retention-proof.log and reproducible native-retention-proof.mts |
| Corrected expanded cron e2e | 18/20 pass, cron-e2e-final.log; all original assertions retained |
| Full pnpm test | RUNNING, unified exec session 46134; test-full.log |
| Full build | NOT YET RUN |
| Independent Astra code verification | PENDING parent coordination |

Native smoke uses Node22.23.3, real queue files/leases and file-backed SQLite: two provider confirmations, one keyed pending row, original one-hour owner window, actual preset2-to-beta forward once, two retained hashed queue tombstones, private copies erased across all four tables and queue, duplicate admission remains existing and provider calls remain two. This is local stub runtime evidence, not deployed/live qualification.

## Two expanded e2e failures for parent/Astra disposition

The initially unchanged e2e fixtures fail 18/20 before meaningful assertions: model-catalog mock targets providers/model-catalog while the fixture and actual runner import agents/models/model-catalog; webhook fixture reads OPENCLAW_CONFIG_PATH while test helper sets disposable MINION_CONFIG_PATH and the actual resolver prioritizes it. Narrow fixture repairs change those two references only. No host config is used. The e2e config forces vmForks, so actual isolation was explicitly selected with `--pool=forks --maxWorkers=1`.

All original 20 cases/assertions are preserved. Added actual WebSocket invalid add and update bindings inside the existing CRUD case: blank/whitespace agent/session, missing agent, global/cross-agent session. That case passes. The existing actual isolated agent workspace/session/store-path case also passes.

Residual failures:

1. `src/gateway/server.cron.e2e.test.ts`, webhook case, waitForCondition on first fetch call (current approximately line552): timeout after5s. Only timeout and reproduction are established; root cause is not proven.
2. `src/platform/cron/isolated-agent.uses-last-non-empty-agent-text-as.e2e.test.ts:491`, fresh-per-run assertion: the same sessionId is reused. Existing session.ts25–50 intentionally reuses sessions under reset freshness; run.ts resolveCronSession call omits forceNew. Whether runtime or the old fixture expectation is wrong is an unresolved policy choice; no legacy session semantics were changed.

Both reproduce on base `cc150b56` production source with only those same two fixture-reference repairs applied in `/tmp/c-base-cron-e2e-vl5lby6z`. `cron-e2e-base.log` records the original20-case18-setup-failure base probe. `cron-e2e-base-corrected-fixtures.log` records the two isolated residual failures on corrected fixtures and unchanged base runtime. Name filtering excluded unrelated cases only in this diagnostic base probe; no candidate test is skipped or weakened. `cron-base-probe.json` records exact setup and command. Its dependency link and unchanged generated BAML copy are controlled baseline-diagnostic support, not installed-SDK qualification.

These *.e2e.test.ts files are excluded by the ordinary pnpm test unit/gateway configurations. They are additional spec-listed qualification evidence. Parent requested bounded Astra review and owns the matching meta proposal. Before task completion, if retained unresolved, add exact-site TODO(handoff) comments at failing test sites plus that parent-owned proposal. Do not silently label the timeout a runtime bug or change session semantics just to make assertions green.

## Next actions

1. Parent confirmed its own completion-aware watcher before this agent returns: root unified exec session49682 runs supervisor/watch-c-test.py, monitors coordinator2100739 startticks4501941 and wrapper2100614, and checks the exact test-full.log/cwd completion receipt. Output is supervisor/c-test-full-completion.json. A missing process without receipt is incomplete, never exit0. Child unified session46134 is agent-scoped and cannot be polled directly by root. Do not terminate test children or user processes. C owns the exclusive heavy-job slot until test/build completion or explicit parent reassignment. Parent explicitly authorized this checkpoint handoff to free the slot for bounded Astra escalation.
2. Collect full pnpm test exit and every failure. Discriminate changed behavior from baseline without broad unrelated cleanup. Plain forks/profile serial/workers1 still runs unit, unit-forks and extensions groups together, then gateway serial.
3. Apply parent/Astra disposition on the two expanded e2e failures. Preserve all20 assertions and no change in unrelated session/reset/webhook behavior without scope authorization. Record any unresolved accepted gate twice through exact-site TODO and parent meta proposal.
4. Run the required full pnpm build, explicit final scoped type-aware lint including the two new e2e fixture paths, and final pnpm check after any source/test edits. The full test run must be tied to its final source identity; rerun affected/full checks when later changes warrant it.
5. Rerun freeze-candidate.py after final state/build. It writes exact source hashes/modes, binary patch, untracked archive, excluded install-noise hashes, SDK/lock pins and built dist manifest. Current source-manifest.json is a checkpoint, not a claimed completed final build.
6. Complete a source/test acceptance trace for A11–A16/A20gateway/A30gateway and tasksT001–T030; T030 independent Standards/Spec code review and joint D/F evidence remain parent work. Send frozen schema/fixture/commit identity to F and cron-binding-v1 local qualification to D. No deployed gateway qualification is claimed.

Stable pins: Node22.23.3, pnpm10.29.3, installed Drone0.6.0. Lock SHA256 `2fbb2f37e8c7c0cc8c0297eb9e800ff35c39606b9fffaf8c439e6aeb9d968649`; SDK dist/types.d.ts `79ea1737f1b5f02251bc4244a34fb8332e5041f547f7d8760cd50e1e0efd97b9`; SDK dist/run.js `8616e0559081a095a05bdc28e562e25413ebc9f7792e82421b6f64f45f68e79a`.

F interface hashes unchanged: complaint-evaluation.schema.json `08897441bc823a5c6cb265065ba6a3cfb102b7fb7751a4e2f6aaf283f041c6ff`; fixtures/complaint-evaluation-v1.json `90e2509a53ad5bc8ee9bb79d1b641cd8382a3e46b013e84b009fb3aef52ea565`. F agent received current paths/hashes and knows final commit is pending. Available prior /tmp C logs and fixture emitter were copied into prior-tmp/.
