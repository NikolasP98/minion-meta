# Gateway C SDD revision 1

Frozen 2026-10-23T05:17:58+00:00. Author: Astra Factory/Gateway. **Ready for independent re-review; not self-approved.** Scope remains A11–A16/A20gateway/A30gateway in one Gateway PR. No runtime source, indices, other group specifications, parent contract, branch or commit was changed. No runtime test, provider call, live census, merge or deployment was performed.

Read both independent reports, applicable Gateway instructions and each cited real caller. Gateway source remains `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`; meta current HEAD `935eb8e4f9846e1aa4cb114fb71476a331d18b08`. Registered source/lock/installed SDK pins from the original author report remain the basis; parent fetched rankings-only meta origin/dev without integrating during this revision.

## Findings resolved in the specification

| Finding | Bounded correction and executable proof |
|---|---|
| C1-01 | Raw supplied agent/session presence checked before lossy normalization; omission/update-null/valid aliases retained. Candidate copy validates before replacing in-memory job or writing disk. Existing scope persists through create/update/reload. Actual RPC/service/normalizer tests in T023–T025. |
| C1-02 | Exact optional strict complaintExperiment object with mode off/census/shadow; manifest, ResolvedConfig and resolveConfig named. Actual loader validation→registration tests reject malformed/extra/active values; config alone never grants live approval. T026–T028. |
| C2-01 | Narrow watcher authority adapter returns scoped/local_unscoped/unavailable with source evidence. DB mirror miss/stale/malformed/null ownership cannot fall through to stale JSON; JSON local authority requires a configured exact account and explicit empty ownership array. Test admission and received settlement, preserving terminal accounting. T004–T006/T011. |
| C1-03 + C2-02 | Durable opt-in callerRetention guard parsed/persisted by the queue and checked under entry lease by generic recovery and actual provider/chunk dispatch. Tombstone precedes redaction; expired data cannot be reused with watcher absent/disabled. Includes before-startup, backoff/boundary, failure and unrelated-caller filesystem tests. T013–T015/T019. |
| C2-03 | Add nullable unique receipt binding to existing pending_replies; first confirmed sent receipt/cooldown/pending reply settle in one SQLite transaction before queue acknowledgement. Original acceptedAt-based window, frozen suggestions and claim/forward state survive two-recipient recovery; no third work table or forwarding redesign. T007–T009/T016–T019. |
| Precision notes | All task runtime paths are Gateway-relative. SDK attempt IDs name admitted invocations, not hidden fallback network requests; caps/coverage remain honest. Durable receipt export is authoritative while analytics is best effort; receipt-commit→emission crash test preserves bill without analytics/inference replay. T021/T022/T028. |

## Provider checkpoint audit

The current queue already addresses provider acceptance followed by crash before terminal checkpoint. deliver.ts:1095 checkpoints pending→in-flight before dispatch; delivery-queue-store.ts:129–191 fences generation and writes; delivery-queue-files.ts:327–370 fsyncs/renames. Recovery store:219–239 converts in-flight to uncertain and recovery:144–153 withholds it. Accepted checkpoint at deliver.ts:1139–1159 allows local SQLite recovery without resend. Revision requires real subprocess kill barriers across these boundaries and preserves the existing mechanism. It adds no provider-attempt service, queue engine or exactly-once remote guarantee.

## Cross-group compatibility

C/D fields and isolation contract are unchanged: explicit agentId/canonical origin session, isolated same-agent execution, scope session, delivery none and exact deployed Gateway qualification. Raw validation and persisted scope make that existing handoff executable.

C/F ComplaintEvaluationRecordV1 fields/enums/receiptRevision remain unchanged. The attemptId comment now correctly identifies admitted SDK invocations and explains hidden fallback coverage. Schema implementation/export remains C-owned and F imports pinned C schema/fixtures. No active mode or paid holdout is introduced. Updated hashes below replace the original C author manifest.

## Author checks and remaining gates

Local links across all ten owned files resolve; no unresolved template/clarification markers; T001–T030 are unique and sequential; all eight acceptance rows remain; board frontmatter/headings are valid. Spec Kit check-prerequisites.sh --json --require-tasks --include-tasks returned exit 0 with absolute SPECIFY_FEATURE_DIRECTORY and SPECIFY_FEATURE_NO_PERSIST=1. No feature-state/index mutation. These are documentation checks, not runtime acceptance or independent approval. Both independent exact-hash re-reviews must approve before Sol code work.

DB authority uses the existing bounded five-minute mirror observation, not instantaneous remote revocation. Physical raw-byte deletion during process downtime cannot be promised; queue deadline checks prevent expired reuse on restart. Legacy reply forwarding semantics are preserved and are not newly certified as exactly once. These limits are explicit in contracts and do not waive required runtime tests.

## Frozen artifact SHA-256 manifest

Paths are relative to the meta clone.

| File | SHA-256 |
|---|---|
| `specs/107-harness-gateway/checklists/requirements.md` | `b70f3d744bc5925c46943bfffa812f33d9366bac47b1bb88ba511bfd46f421e6` |
| `specs/107-harness-gateway/contracts/cron-binding.md` | `6531d7db715239235d63b45026dea434d6e6eb8ea71c8925d684766f471ac7b4` |
| `specs/107-harness-gateway/contracts/receipts.md` | `6df70534be754cf48ddc1a5717a2a4eec9478e7ff02e301e0469bc7355dd5a13` |
| `specs/107-harness-gateway/contracts/usage-shadow.md` | `de18af030d6795059d6995d95d842de960e05340298bf7cb530ad64f521c4a63` |
| `specs/107-harness-gateway/contracts/validation.md` | `ff52f30811f618ccad956014b89ffc27ee09aa55d90af092c8aa71acf75bb891` |
| `specs/107-harness-gateway/plan.md` | `68832c7547296e257885e57b2383b7a0d1071e651374af671377750f68afcf65` |
| `specs/107-harness-gateway/research.md` | `887ab0906488d6736aa108c76da3e3b12546cbcf23f0b461b89bf1c76cbc76ac` |
| `specs/107-harness-gateway/spec.md` | `de5d9b505abbf5ed6dff20aefee6f387fa734779dd96364b1018dde8be2a4ddf` |
| `specs/107-harness-gateway/tasks.md` | `a4b20d81320005e01fd00dcce07fd5e18a3554410a416085ff51416e5c3a8153` |
| `specs/2026-10-23-harness-gateway-spec.md` | `07cbfad7f104e8dfb44bfab6b198c4fd0a060752124b2c23c70d4371269b0ab2` |

## Rechecked source SHA-256 anchors

Paths are relative to the Gateway clone at `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`.

| Source | SHA-256 |
|---|---|
| `src/platform/cron/normalize.ts` | `c7473a98680bcfc521cb96a9973512c19e387dc5ab7753281bd27f18e0b6859f` |
| `src/platform/cron/service/ops.ts` | `9e3f6018e6fd984bdb0276a5899608f84736c28e0fedadd3c622f1284db27973` |
| `src/platform/cron/service/jobs.ts` | `3c5aba55934134fbe717c5b654d8bef272ed90fc464506eb128f536c4d684291` |
| `src/plugins/org-enforcement.ts` | `e360ec61bd2e3f6b83cec5206b9fe5644ed5e24320d94e52b0f94f8b4d024cf0` |
| `src/gateway/channel-mirror.ts` | `3bbc838abf86f4932a4c1e3859fe58c165f3b897fd65a333242d770e7fc3bf2c` |
| `extensions/alert-watcher/minion.plugin.json` | `fbe5df7f20b43bc9926e10b24dc0e985c16d0659ace8313f6f8bb2e201198971` |
| `src/plugins/loader.ts` | `32a6e71feb9c2c1927ef53c666529912b7ba2d294362d45bffbc920f8ba36653` |
| `src/infra/outbound/deliver.ts` | `545942afcdb2187b7ea1b92fb1d0edcc1ba655d25e0dcf77a4d236d438b8d960` |
| `src/infra/outbound/delivery-queue-store.ts` | `653c72cc2fdc45193a9d3bfb9089e9ee0cc29caabc85771fedd6baf654376eef` |
| `src/infra/outbound/delivery-queue-recovery.ts` | `cf2edf920f15510bc19f2c0829df5512c51be8df48fc318d43d263d4a2e19a7c` |
| `extensions/alert-watcher/src/reply-flow/store.ts` | `38e0e56344a652475247134a6b2620cbbaaee9dc3bf4d3534e98ce4efedcadbe` |
