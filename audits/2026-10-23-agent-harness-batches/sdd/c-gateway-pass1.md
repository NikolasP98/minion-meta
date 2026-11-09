# Gateway SDD independent technical pass 1

Date: 2026-10-23. Reviewer: Astra chat/evals author, independently reviewing C. Verdict: **changes_requested**. No C specifications, runtime source, index, branch or commit was changed. No provider call or runtime qualification was performed. Findings below come from the frozen artifacts and actual isolated source, not the other reviewer's conclusions.

## Reviewed identity

Gateway `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`, branch `feature/agent-harness-c-gateway`, PR base `DEV`. Reviewed parent §§6/7.1/8–12 and A11–A16/A20gateway/A30gateway, Gateway AGENTS, all C artifacts including research/checklist/stub, actual hooks/flow RPCs, store/reply-store, classifier/suggestions, installed Drone result/fallback implementation, host consumers, queue/recovery and cron normalization/service/runner paths.

All ten C artifact hashes match the frozen `factory-gateway-report.md` manifest. Core values:

| Artifact | SHA-256 |
|---|---|
| spec | `72e8a4c9f8be077a2614dd0dedf7dd055fc907310859af9c23414eb6a9fe47f6` |
| plan | `25a74716a16091753d81fe026baab9e78f15876dd8b0d9802a9a22701bd74223` |
| tasks | `752bac4f7e531c8ff020c4def179dcfe3eec3ed5e4a82929e109025566cff509` |
| receipts contract | `031b74bda355d2ce93ca962136685560ea91bf4281eafc7e0f5de1b1d88f27a2` |
| cron binding contract | `b453ab412003b5ed1c9b9e8007182d35f68f2783fa8144b54dfb30c6a1b08fb8` |
| usage/shadow contract | `21cd4843a4d72327edd1a1bb7c7d4e9a3278cd20fb5dabbbf3e3ffdb1329bee2` |

## Standards

**Changes requested.** The design uses the approved two-table/one-dispatcher structure, installed SDK seam and existing caller-managed queue; no unnecessary new framework is proposed. Original bounded slices remain separately testable within the explicitly authorized one-group PR. File-backed SQLite, process kill barriers, real queue files, actual SDK stubs and add/store/execute cron proof are correctly required. Public metadata remains correlation rather than authority, and the C/D/C/F repository boundaries are explicit.

The remaining issue is executable completeness at three existing outer boundaries: raw cron normalization, plugin configuration validation, and generic queue recovery before watcher cleanup. Naming only the inner validator/eligibility/housekeeping helper leaves a developer able to satisfy helper tests while bypassing the real requirement. Add the exact outer files and tests described below; no new service or expanded product requirement is needed.

## Spec findings

### C1-01 — MEDIUM: explicit blank cron binding is erased before the planned validator

**SDD:** `contracts/cron-binding.md:11–13`; tasks T023/T024 (`tasks.md:49–50`). **Source:** `src/gateway/server-methods/cron.ts:72–74,91–96`; `src/platform/cron/normalize.ts:311–338`; `src/platform/cron/service/normalize.ts:31–47`.

The contract explicitly requires supplied empty IDs to reject, preserving omission as a different case. Actual RPC handlers call `normalizeCronJobCreate`/`normalizeCronJobPatch` before schema validation. Those normalizers delete whitespace-only `agentId` and `sessionKey`. A validator that sees only the normalized/effective job cannot detect the explicit invalid binding and can select the default owner. T023 omits this case and T024 does not name the normalization boundary.

**Smallest correction:** require raw supplied-field validation before lossy normalization, or preserve an invalid supplied value through normalization so the existing schema rejects it. Name `src/platform/cron/normalize.ts` or the equivalent pre-normalization handler seam. Test actual add/update RPC with `agentId:''`, whitespace-only values and blank explicit session, alongside omission and intentional update-null compatibility; assert no store mutation/provider/tool call. Keep valid legacy aliases explicitly supported.

In the same real add/update proof, assert rejected effective patches leave both the live in-memory job and disk unchanged: current `service/ops.ts:141–147` calls mutating `applyJobPatch` on the stored object, so validation must use a candidate copy before replacement. Also assert the explicit `scope:'session'` handoff survives stored-record construction; current `service/jobs.ts:345–365,370–441` omits scope on create/patch despite the public schema/type accepting it. These are concrete acceptance checks at the already-owned cron seam, not a new cron architecture.

### C1-02 — HIGH: A30 configuration does not reach the real plugin loader

**SDD:** `contracts/usage-shadow.md:21`; tasks T026/T027 (`tasks.md:57–58`); plan source ownership. **Source:** `extensions/alert-watcher/minion.plugin.json:5–8,57–84`; `src/plugins/loader.ts:373–375` and the later `validatePluginConfig` call; watcher `index.ts:40–63,113–156`.

The new `off|census|shadow` configuration has no exact persisted field/schema contract or task owning the plugin manifest. The actual manifest has `additionalProperties:false`, including nested classifier settings. The loader validates against that manifest before it supplies `api.pluginConfig`; a new experiment property is rejected or stripped before `resolveConfig`, while a directly invoked eligibility helper can still pass all listed tests. The configured census/shadow software path is therefore not fully planned.

**Smallest correction:** name the exact additive experiment field and its supported fields/defaults in the contract, explicitly own `extensions/alert-watcher/minion.plugin.json` and `index.ts`'s resolved-config parsing, and preserve existing config compatibility. Add real manifest/config-validation → plugin registration/resolveConfig tests: omitted config means off with zero extra calls; valid census/shadow fixture values reach the adapter; unknown/active mode or malformed config rejects. Keep live shadow separately approved and network denied during these tests.

### C1-03 — HIGH: watcher housekeeping does not fence generic recovery of expired queued payloads

**SDD:** `contracts/receipts.md:51,57–59`; tasks T015/T019 (`tasks.md:31,35`). **Source:** `src/infra/outbound/delivery-queue-types.ts:67–109`; `delivery-queue-recovery.ts:116–192`; gateway recovery lifecycle at `src/gateway/server.impl.ts:1435–1441`.

T019 asks for cleanup-before-dispatch on restart, but the concrete contract only schedules bounded watcher redaction and says pending safe queue entries continue through existing generic recovery. That recovery independently sends `pending` caller-managed entries; the current persisted queue type has neither a retention deadline nor a watcher namespace eligibility marker. After an offline interval beyond seven days, generic recovery can send the old payload before watcher housekeeping runs, or while the watcher is disabled/not started. A test that redacts first and then runs recovery does not exercise this failure.

**Smallest correction:** carry a narrow durable caller-owned retention deadline/binding with the queue entry and enforce it under the existing queue lease before any generic recovery send, or an equivalently explicit fail-closed persisted handoff. Name the queue type/parser/dispatch/recovery changes and preserve unrelated callers' behavior. Expired work must redact/terminalize with minimal tombstone, not enqueue again. Add real filesystem tests that run generic recovery on an unredacted expired watcher entry before starting the plugin, with the plugin disabled, and at the expiry/dispatch boundary; provider call count must remain zero. Also test an unexpired watcher entry and unrelated legacy caller entry to prove compatibility.

## Coverage and nonblocking review results

- **A11:** canonical source tuple, stable policy identity independent of mutable policy hash, pinned input, provider-edit versus conflict and fresh uncertified manual/flow behavior are specified. Raw and received source carrier paths are current; WhatsApp is correctly not certified by Telegram evidence.
- **A12/A13:** real SQLite uniqueness/generation predicates, due-time/cap persistence, received local-only replay, invalid SDK usage preservation and bounded lifecycle are specified. Current `resolveAccountOrgIds` intentionally conflates absent mapping with an unscoped empty array and `isPluginEnabledForAnyOrg([])` returns true; implementation must honor the contract's stricter positive local-authority distinction rather than use this result alone. Existing source/ownership negative tests must include missing mapping/mirror fallback and changed ownership.
- **A14/A15:** SQLite-before-queue and settlement-before-ack ordering, uncertain missing evidence, one sent recipient, one suggestion admission, cooldown/window markers and legacy-unreconciled cutover are sound. C1-03 concerns the separate generic recovery entrypoint, not those transaction rules. Retention tests should inventory existing `complaints.content` and `pending_replies` destination/suggestion copies when the new path preserves them; they are actual DB copies, not only new receipt columns.
- **A16:** inspected installed Drone0.6.0 success/failure/fallback code confirms the chosen result seam. Failure has no resolved model; final successful model does not expose all earlier usage. Opt-in fresh hosts, exact candidate credential resolution, terminal observer before local coercion and ordinary callers' compatibility are correctly specified. The export's `attemptId` comment says external-request attempt, while this SDK seam identifies an invocation that may have hidden fallback requests; use invocation terminology or explicit incomplete coverage, never claim a fabricated per-provider receipt.
- **A20:** same-agent isolated execution is correctly distinct from origin session. Explicit unknown/deleted/wrong/global IDs fail at execution and exact deployed-gateway qualification remains D's activation gate. C1-01 adds raw input and actual record-mutation proof.
- **A30:** C owns the exact schema/export and F imports it by pinned commit/schema hash. Required monotonic receiptRevision, immutable binding, same-revision conflict quarantine and actual-versus-counterfactual cost separation agree with F's frozen contract. Default disabled, no active mode, baseline always runs and no paid operation is authorized. C1-02 closes configuration ingestion.

## Next action

Parent should combine both independent review reports, request one author revision for confirmed findings, and send new hashes for a bounded recheck. No unresolved product decision needs a user question. Final approval and the six canonical G2 readiness scores are deferred until these integration gaps are corrected; no approval is implied by the otherwise covered acceptance matrix.

## Revision 1 bounded rereview — 2026-10-23

Disposition: **all substantive pass1 findings resolved; approve subject only to the exact source-truth correction C1-R01 below and a bounded hash confirmation afterward**. This supersedes the initial blocking disposition for C1-01/C1-02/C1-03. Parent explicitly confirmed that add-null omission compatibility should remain. No new product decision, schema rejection or runtime change is requested by this review.

Verified all ten SDD hashes and all eleven rechecked source hashes against `c-gateway-revision1.md`: 21 matches, zero mismatches. Gateway HEAD remains `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`. Reviewed revision-1 core hashes:

| Artifact | SHA-256 |
|---|---|
| spec | `de5d9b505abbf5ed6dff20aefee6f387fa734779dd96364b1018dde8be2a4ddf` |
| plan | `68832c7547296e257885e57b2383b7a0d1071e651374af671377750f68afcf65` |
| tasks | `a4b20d81320005e01fd00dcce07fd5e18a3554410a416085ff51416e5c3a8153` |
| receipts | `6df70534be754cf48ddc1a5717a2a4eec9478e7ff02e301e0469bc7355dd5a13` |
| cron binding | `6531d7db715239235d63b45026dea434d6e6eb8ea71c8925d684766f471ac7b4` |
| usage/shadow | `de18af030d6795059d6995d95d842de960e05340298bf7cb530ad64f521c4a63` |
| validation | `ff52f30811f618ccad956014b89ffc27ee09aa55d90af092c8aa71acf75bb891` |

**Standards: pass after the limited correction.** The revised tasks name the actual raw RPC/normalizer/service seams, strict plugin manifest/loader, and generic queue parse/recovery/provider paths. Existing facilities remain the mechanism: no new queue, approval service, SDK version or workflow framework. Source-qualified authority and keyed pending replies are narrow additions needed to make the approved ownership/recovery contract work through existing callers. Required integration tests are executable against real installed/storage/process boundaries.

**Spec: pass after the limited correction.** C1-01 now preserves raw supplied-field distinctions, validates a deep candidate before replacement, persists scope, and includes actual RPC/service tests. C1-02 defines exact `complaintExperiment:{mode?:off|census|shadow}`, loader validation and registration/config tests, with configuration expressly unable to grant paid authority. C1-03 now carries strict persisted `callerRetention` through queue type/parser/admission, checks it under the lease before recovery and actual provider/chunk calls, writes the tombstone before cleanup and tests recovery before plugin startup/while disabled. Actual queue source has the named parse/store/in-flight/accepted checkpoints needed for this design; the test matrix covers their crash gaps.

The shared pass2 additions are viable against inspected source: `mirrorMeta().lastHydratedAt` plus exact `getMirrorEntry` can distinguish stale/missing DB authority without general fallback changes; installed account adapters expose resolve/enabled/configured checks for explicit JSON local authority. The existing pending_replies table can take the nullable keyed binding and partial unique index, with first-sent/expiry materialization in the same short SQLite transaction. Received usage remains durable when publication is fenced. The analytics crash gap is correctly stated as best effort, and SDK invocation IDs no longer assert hidden fallback request identities. C/F schema field spelling and receiptRevision remain unchanged.

### C1-R01 — LOW, exact source-truth correction before final hash confirmation

The revised cron contract's validation paragraph says **“add-null remains schema-invalid”**. Current `src/gateway/protocol/schema/cron.ts:24–26` allows null for agentId/sessionKey in the common fields used by add; `src/platform/cron/normalize.ts:311–338` preserves null, and service optional normalizers turn it into omission. Existing `normalize.test.ts:51–80` explicitly demonstrates add-null preservation. The parent approved requirement concerns explicit nonempty IDs and does not request removing null compatibility.

Replace that sentence fragment with:

> On add, explicit null for agentId/sessionKey retains existing omission/default semantics; on update, explicit null clears the optional field. Blank or whitespace-only strings remain invalid supplied bindings. Pulse D sends neither null nor blanks.

In T023 and the validation guide's A20 actual-RPC cases, explicitly include add-null compatibility separately from update-null clearing, with the same default behavior as omitted input and no new rejection. No other substantive contract change is required. Parent or author should apply this correction, then provide the changed hashes for a read-only confirmation; the revision-1 hashes above are not represented as hashes of that future corrected text.

### Canonical G2 scores

These are my independent 0–10 design-readiness scores over the original bounded A11–A16/A20gateway/A30gateway slices, packaged in one group PR by explicit owner instruction. They are not runtime test results and remain applicable if the only subsequent change is C1-R01.

| Axis | Score | Rationale |
|---|---:|---|
| `slice_size` | 7 | Receipt/queue integration is substantial, but existing durable queue primitives and separately testable admission/store/dispatch/delivery increments keep the original slices bounded. |
| `dod_verifiability` | 9 | Exact crash, stale authority, retention, real loader and cron mutation cases now connect the approved acceptance to observable outcomes. |
| `scope_containment` | 8 | Narrow caller-retention and reply binding are necessary; shared queue/cron changes require care, with unrelated callers explicitly preserved. |
| `impact_zones` | 9 | Raw/received/manual hooks, loader, installed SDK, SQLite, generic recovery, reply flow and cron raw/store/execute paths are covered. |
| `collisions` | 9 | Shared files serialize in C; D/F consume pinned contracts and joint evidence, with no duplicated source ownership. |
| `testability` | 9 | Real subprocess SQLite/queue tests, installed SDK stubs, loader registration and actual cron RPC/service tests can prove the specified behavior without paid inference. |

No additional substantive blocker was found in this bounded review. Required runtime tests, independent implementation review, human merge, deployed Gateway qualification and actual paid-operation gates remain outstanding development/release work. This reviewer edited only this report.

## Final exact-hash disposition — 2026-10-23

Verdict: **APPROVED** for SDD development handoff. Standards: **pass**. Spec: **pass**. C1-R01 is resolved: cron contract lines 11/13/21 and T023 explicitly preserve add-null omission/default semantics and update-null clearing while rejecting supplied blank strings. I reread the corrected text and verified all ten artifacts: only the two intended files differ from revision 1; eight are unchanged, with zero hash mismatches.

Final changed hashes:

- `contracts/cron-binding.md`: `44048d6dc157657b110ad29c6ec3d7d01ea0086c32a30473b76f2f60f2339ca7`
- `tasks.md`: `5cebf1747a4d2d8a82f1e1e71c2ea75af7cc24576f8d7548881564aa9a4a39be`

The other eight hashes remain exactly those in `c-gateway-revision1.md`. The parent's `c-gateway-null-compatibility.json` records this final two-file change. Final independent G2 scores remain **slice_size 7, dod_verifiability 9, scope_containment 8, impact_zones 9, collisions 9, testability 9**, with the original-bounded-slice rationale above. No review condition remains. Development tests, independent code review and release gates are still required and are not claimed completed by this SDD approval.

Final freeze acknowledgement: the parent also made the requested explicit null-compatibility wording in `contracts/validation.md:35`. I reread it and verified SHA-256 `fcfc8fe1058c12a0a7213f7f97bb111008ffb6b0b22319ef28cb92e2ea249f11`; the final cron/tasks hashes above still match. Thus the final manifest contains **three** changed files from revision 1 and seven unchanged files, superseding the preceding two-file count. **APPROVED remains unconditional**, with Standards/Spec pass and the same six G2 scores. No normative edit remains pending.
