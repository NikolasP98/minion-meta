# Gateway independent implementation rereview, revision 1

**Changes requested.** The original three findings are corrected and independently green. Remaining full-scope review found three C defects and one C/F semantic integration defect. Full main tests/build and final cross-repository qualification remain pending. This report is neither implementation completion nor release approval.

## Candidate and evidence identity

C clone `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/c-gateway`; branch `feature/agent-harness-c-gateway`; HEAD/base `cc150b56b2b0d4396d44b9ef6f14b5d772c52db8`. Revision-1 source-manifest SHA256 `06eb968c11873d48218cf619b90e8b479d145500788d220947a4626adee1493d`; tracked patch `c204df732fabce898237b711c95a3ac387a88ca309783e5434cfbddcf4bd47aa`; mandatory untracked archive `ebe16c737b9ca58d45a2554e49a285228248d06b26d41054143aa225fc77fe57`. The unchanged tracked patch does not identify the corrections.

Independent post-check comparison found zero hash/mode mismatches across 61 owned files, 20 preserved installation-noise files and recorded SDK/lock pins. `evidence.json` pins the scripts and outputs. No product source, spec, task ledger, index, Git staging, branch, dependency or lock was changed. All probes used disposable state and local stubs; no external provider calls occurred. No jobs remain owned by this reviewer.

## Standards review

The inspected implementation uses the existing queue, SQLite, plugin lifecycle, strict TypeScript and approved dependency versions. No new style/dependency/scope violation was found. The final revision-1 `pnpm check` completed exit 0 in the parent's durable process (`development/c-gateway/revision1/commands.jsonl`, 60.51 seconds). This includes formatter, tsgo, main lint and generated plugin/capability checks. Main lint reports **57 warnings, 0 errors over 4664 files**, not zero warnings. Independent provenance checked every warning: 57 sites in 46 files, all outside the 61 candidate files and byte-identical to HEAD. See `warning-provenance.json`. Explicit candidate lint covers all 56 TypeScript files, including extensions with the configured ignore removed, and its developer receipt reports 0 warnings/errors.

Full `pnpm test` and `pnpm build` are not yet passing evidence for this candidate. Previous interrupted/failed commands are not passes. Once code changes again, affected checks and full required gates must be rerun on the new freeze. No browser qualification is required by this backend-only scope.

## Original finding disposition

| Finding | Independent result | Boundary inspected |
|---|---|---|
| C-IR-01 revoked owner reply | Closed for the original defect; unchanged original probe exit 0 | `authorizedReplyRecipients` filters original destinations by current configuration and frozen account authority after send awaits; settlement accepts only that subset and closes an empty grant; known sent evidence remains. |
| C-IR-02 no-key unknown bill | Closed; unchanged original probe exit 0 | Private preparing/may-have-submitted/not-submitted state, synchronous durable owner/generation/attempt fence at actual SDK host preparation before provider work; NO_API_KEY before that fence alone qualifies as definitely unsubmitted. Public export excludes private no-dispatch invocations, while elapsed history stays. |
| C-IR-03 retry export conflict | Closed; unchanged original probe exit 0 | Retryable computation has null resultId/unknown baseline; terminal result becomes stable. Per-attempt facts persist, private no-key invocations do not become paid attempts. Actual C→F schema-valid reconciliation succeeds. |

The three scripts are byte-identical to the original failing review scripts; their SHA256s and new outputs are in `evidence.json` and `commands.jsonl`. Correction tests additionally cover failing dispatch-marker persistence, lost lease, suggestion no-key, conservative legacy records and the native marker kill barrier. Installed Drone 0.6.0 resolves credentials before `host.resolveSkillsPrompt`; the wrapped synchronous marker must return before its provider call. Unobserved ordinary callers still call the SDK directly; result-mode host credential/lifecycle behavior remains opt-in. Hidden fallback bills and post-provider schema errors remain incomplete/unknown rather than free.

## New findings

### C-IR-04 — P1 / partial: terminal queue copies escape live retention

- Source: `extensions/alert-watcher/src/classification-work.ts:799–801`, `src/certified-runtime.ts:380–402`, `src/delivery-bridge.ts:230–234`.
- Trigger: a real queue payload reaches in-flight; recovery marks it uncertain and the watcher settles the recipient indeterminate. Keep the process running beyond the frozen seven-day retention deadline.
- Actual outcome: the actual `createCertifiedWatcher.tick()` redacts SQLite, but the receipt query excludes indeterminate/failed/canceled outcomes and never runs queue retention for them. Queue raw body remains, with no tombstone. Generic queue cleanup is registered as Gateway startup recovery (`src/gateway/server.impl.ts:1429–1453`), not periodic watcher housekeeping.
- Independent proof: `terminal-retention-probe.mts` creates real queue evidence, uses actual bridge reconciliation, then advances time eight days and invokes actual watcher tick. Output: SQLite redacted=true; receipt indeterminate; raw queue exists and contains private alert; tombstone=null. Exit 1 at intended assertion.
- Requirement: FR-C05/FR-C09, US2/AC5, parent A15, T019; bounded housekeeping must cover queue copies while the watcher runs. The explicit allowance for physical deletion during downtime does not cover this running process.
- Correction: bounded cleanup through the existing watcher lifecycle for every expired receipt outcome, under the original queue lease and exact receipt binding. Include terminal indeterminate/failed/canceled rows, failed-directory entries, and cleanup-retry state independently of send eligibility. Persist tombstone before removing raw copies; do not resend, recreate payloads, reopen replies or label uncertain delivery sent. A per-tick bounded candidate query is sufficient; do not add a general service.
- Acceptance: actual watcher tick beyond deadline removes raw copies for these outcomes without restart; uncertain tombstones remain uncertain, accepted tombstones retain known acceptance; retryable cleanup failure is retried without delivery. Plugin-disabled startup generic recovery remains expiry-safe; no timely physical-deletion claim while all responsible processes are stopped.

### C-IR-05 — P1 / partial: retained queue backups survive tombstone cleanup

- Source: `src/infra/outbound/delivery-queue-files.ts:341–343,501–521,541–577`.
- Trigger: a checkpoint crash leaves the existing real-format `${id}.json.bak-${pid}-${uuid}` artifact. Entry expires and a tombstone is successfully committed.
- Actual outcome: `retainDeliveryTombstone` removes only root/failed `.json`, and `cleanupRetainedQueueFiles` ignores files not ending `.json`. Backup still contains original body/recipient data. A `.tmp-*` raw checkpoint artifact has the same uncovered lifecycle. Generic load fails closed on unresolved artifacts; failing closed does not erase private copies.
- Independent proof: `backup-retention-probe.mts` preserves an exact-format backup, runs actual retention under the entry lease, then actual cleanup. Main entry gone, tombstone reason expired, backup still has private body. Exit 1.
- Requirement: FR-C05/T019 and retention contract require erasing all receipt-bound queue/mirror/error copies with tombstones retained.
- Correction: cleanup exact entry-owned transient/backup artifacts under that entry lease after a verified matching tombstone. Do not wildcard unrelated entries or treat an orphan backup as fresh executable work. Account for a crashed writer and partial cleanup/fsync failure; no send is authorized by cleanup.
- Acceptance: exact-format old/new backup/temp artifacts and failed-directory copies no longer retain private payloads after expiry/settlement cleanup; unrelated files survive; no provider call; replay stays fenced if any unlink fails. Keep the original probe unchanged.

### C-IR-06 — P2 / contradicts: a known suppressed payload stays admitted forever

- Source: `extensions/alert-watcher/src/delivery-bridge.ts:402–450`.
- Trigger: an existing queue payload has terminal `suppressed` evidence, as written when message_sending cancels a payload.
- Actual outcome: it is neither all accepted nor uncertain/expired/unauthorized, so the bridge releases the receipt lease and schedules another check five seconds later. There is no pending payload to execute or new evidence to acquire. This repeats until retention expiry instead of settling a known non-send outcome.
- Independent proof: `suppressed-delivery-probe.mts` checkpoints a real queue payload suppressed and invokes the actual bridge. Output: zero provider calls, queue suppressed, SQLite admitted with next_attempt_at+5s and no reason. Exit 1.
- Requirement: FR-C04/FR-C05, US2 recovery inspection, receipts delivery step 3 says settle sent/failed/indeterminate from typed outcome and suppression alone is not delivery; T014/T016.
- Correction: settle a known suppressed terminal outcome as failed or canceled with a safe reason; settle SQLite before queue acknowledgement/retention cleanup. Never stamp first-sent cooldown, open owner reply, or mark sent for suppressed-only output. Preserve mixed accepted/uncertain truth and existing caller completion rules.
- Acceptance: actual canceled message_sending path and recovered suppressed evidence finish as non-sent without recurring dispatch, a pending reply or cooldown; queue cleanup follows local settlement and replay remains fenced.

### CF-IR-07 — P2 / contradicts: current authority updates conflict with F immutability

- C source: `extensions/alert-watcher/src/classification-work.ts:observeWorkAuthority`, `src/complaint-evaluation.ts:135–144`.
- F source: `scripts/agent-evals/complaint.mjs` immutable field list and `extendsRecord`.
- Actual outcome: C produces two valid higher-revision records for the same computation; a source-qualified observation changes enabled true→false, with unchanged source/policy/model/result/paid attempt facts. F quarantines the legitimate history as `immutable complaint enabled`, producing no accepted record.
- Independent proof: `authority-export-probe.mts` invokes real C SQLite observation/export, validates both with C's schema, and invokes actual F reconciliation. Exit 1. No schema or probe was edited. The probe constructs revisions in memory; output records the two revisions and unchanged bill.
- Normative semantics: `107/contracts/usage-shadow.md` explicitly defines eligibility using **current enablement/authority**, and receipts requires new current authority observations before dispatch/settlement while preserving terminal accounting. These are current observations, not immutable admission facts. Frozen admission source/policy/input/model identity remains separate.
- Required bounded resolution: F may accept higher-revision current enabled/matched/derived eligibility evolution without relaxing source/policy/model/attempt/known-bill immutability. It must preserve historical paid cohort membership: revocation must not silently remove an originally eligible paid logical source from the exposure numerator or logical-source denominator. Preserve current eligibility separately from historical cohort eligibility. The existing probe covers false quarantine only; add a source-qualified initially eligible→revoked history assertion for the denominator and paid-cost facts. This point was sent to parent and active F developer for coordinated correction.

## Acceptance and convergence assessment

Convergence skill read: sibling `.claude/skills/speckit-converge/SKILL.md`. `.specify/extensions.yml` absent, so no convergence hooks. With `SPECIFY_FEATURE_DIRECTORY` explicitly pointing to sibling `specs/107-harness-gateway` and `SPECIFY_FEATURE_NO_PERSIST=1`, `check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` exited 0 and resolved that exact feature. Spec/plan/tasks/contracts/research/checklist and all five filled constitution principles were read. Parent owns task appends; this reviewer wrote no spec/task/index files.

Inventory: 9 FRs, 6 SCs, 18 user-story acceptance scenarios, eight parent acceptance rows, all 30 existing tasks regardless checkbox state, eight plan decision groups and five constitution principles. Scope is the approved C source and D/F contract consumers. No new workflow engine, public wire, SDK release, active experiment or live approval was inferred.

| Acceptance | Current implementation/evidence | Status |
|---|---|---|
| A11 / FR-C01 / US1 AC1–4 / SC-C01 | Exact original units, source/account/chat/revision identity, stable policy admission excluding mutable hashes, pinned input/policy, conflict on byte mutation; actual dual hooks/batches/current authority/manual forged-origin fixtures | Source/focused evidence satisfied; final gate still required |
| A12 / FR-C02 | Actual SQLite uniqueness/generation/due/capped attempt history, durable negative/error/unknown/paid facts and replay identity; native contention/kill markers; additive schema | Source/focused evidence satisfied subject to retention defects affecting raw copies |
| A13 / FR-C03 | Poll5s/lease30s/renew10s/max10, one local classifier, due/state repeat at claim, only proven unsubmitted retries5s/30s cap3, receipt-before-local validation, received recovery, current authority | Source/focused evidence satisfied; specified suggestion crash qualification remains incomplete as noted below |
| A14 / FR-C04 | SQLite admission→original required caller-managed queue→evidence settlement→ack; real lease/generation and cross-store child kills; missing/mismatched queue never reenqueues | Partial: C-IR-06 suppressed terminal outcome |
| A15 / FR-C05 / US2 AC1–5 / SC-C02 | Independent recipient receipts, frozen suggestions, corrected current reply grants, acceptedAt window, first-sent/cooldown, legacy cutover, receipt redaction | Partial: C-IR-04/05/06 and suggestion child-kill qualification |
| A16 / FR-C06 / US3 AC1–3 / SC-C03 | Actual SDK success/failure/fallback/overlap; result-mode exact credentials, durable terminal before best-effort analytics, conservative hidden exposure; corrected proven-no-key accounting | Source/focused evidence satisfied; no durable/exactly-once analytics claim |
| A20gateway / FR-C07 / US4 AC1–3 / SC-C04 | Raw blank validation before unwrap normalization; explicit agent/session admission and execution fail closed, cloned update rollback, scope persistence, default omission/null/aliases, same-owner isolated session; actual D two-profile wire→C handler/store/execution five tests | Gateway source/focused evidence satisfied; exact final build/commit and D qualification handoff pending, deployed qualification separately gated |
| A30gateway / FR-C08 / US5 AC1–3 / SC-C05 | Strict actual loader configuration off/census/shadow, default off, no config-to-paid grant, baseline preserved, trusted adapter only, frozen schema/export and corrected retry golden | Partial: CF-IR-07 current-authority/historical-cohort integration; full F review and final pin pending |
| FR-C09 shared authority/retention | Exact source-qualified JSON/mirror checks; DB miss/stale ownership fail closed, local-unscoped explicit proof, repeated dispatch/settlement checks | Corrected owner-reply scope; retention gaps remain |
| SC-C06 | Source/install/process/queue evidence bounded; changed-file lint and full check available | Incomplete until all findings, required proof/gates and D/F joint acceptance close |

The checked-and-cleared generic-recovery authority question remains unchanged: parent §6.2 explicitly linearizes authorization at recipient queue admission and documents later generic recovery as best-effort revocation. Expiry remains enforceable regardless of watcher startup. Do not turn this approved limit into a new authorization framework.

## Task-by-task convergence trace

| Tasks | Verified current realization | Remaining work |
|---|---|---|
| T001 | Exact base/Node/pnpm/Drone/lock pins, two pre-code SDD approvals in parent record, isolated clone | Final source/build pin after corrections |
| T002 | Existing canonical producer tests and actual hook/manual/member compatibility boundaries | Final suite receipt |
| T003 | Actual installed SDK stub schema/fallback/concurrency tests and host tests | None beyond final gates |
| T004 | Provenance/hash/dual-hook/cross-chat/batch/current DB/JSON authority, edit/conflict, fresh uncertified RPC tests | Explicit reevaluation is a private helper; no public retry grant is added |
| T005 | authority.ts/provenance.ts follow strict source modes and immutable admission | No new defect found |
| T006 | Actual inbound/received adapters route exact originals; uncertified legacy baseline fresh | No new defect found |
| T007 | Two-table SQLite constraints, real concurrency and reply binding | Independent pre-change upgrade-twice probe now passes; original named test started at already-upgraded testDb |
| T008 | Additive tables/checks/indexes and nullable existing reply columns | No new defect found |
| T009 | Owner/generation predicates, durable usage/negative/error, suggestion/recipient materialization | Terminal suppression handling in C-IR-06 |
| T010 | Classifier child contention and admitted/provider-marker/response/received kill boundaries, no recall | Complete requested substep crash evidence with T016 |
| T011 | Actual plugin lifecycle dispatcher/stop and repeat authority checks | Live terminal queue cleanup C-IR-04 |
| T012 | Actual classifier observer persists terminal SDK result before local coercion | No new defect found |
| T013 | Real delivery subprocess barriers sqlite-admitted/enqueued/provider-accepted/queue-accepted/settled | Add suppressed outcome discrimination, retain all existing native barriers |
| T014 | Actual queue bridge, exact callerRetention and evidence binding, settle-before-ack | C-IR-06 |
| T015 | Strict guard, persisted per-provider/chunk expiry, fsync and tombstone ordering | C-IR-05 all raw artifact copies |
| T016 | Two recipients, stable keyed reply/claim/window, actual owner selection, revoked/missing/reassigned destinations | C-IR-06; requested native suggestion kill barriers not found |
| T017 | Final suggestions/payloads frozen, first-sent transaction and corrected current reply subset | No remaining original C-IR-01 defect |
| T018 | Old boot fanout removed; legacy rows visible and retry-excluded; durable count/cooldown | Independent seeded old schema probe passes |
| T019 | DB redaction, expiry guard, namespace retirement tombstones | C-IR-04/05: live terminal/failed/canceled/cleanup retry plus backup/temp copies |
| T020 | Host result mode and synchronous dispatch fence, actual SDK ordering | No ordinary caller regression found |
| T021 | Actual hook/flow classifier/suggestion observers, receipt before best-effort analytics | No new defect found; analytics remains nondurable by contract |
| T022 | Concurrent A/B, fallback B resolved, missing bills, cache tokens, failed receipt/marker, unopted tests | Full final suite; do not overstate synthetic barriers as actual live analytics delivery |
| T023 | Real RPC/service/update rollback/scope reload/deletion/isolated origin cases | Final full suite |
| T024 | Presence validation, candidate clone, execution validation before effects/universal routing | No new defect found |
| T025 | Expanded cron22 plus pinned actual D two-profile wire5 | Exact final build/commit `cron-binding-v1` handoff and D joint acceptance |
| T026 | Actual strict loader/config and certified/default/custom/manual/model-drift/shadow fixtures | No new defect found |
| T027 | Manifest/resolved config default off; no ordinary live adapter bootstrap | No new defect found |
| T028 | Exact C-owned schema/export/initial fixture; real 18-revision retry golden actual F report | CF-IR-07 including historical eligible denominator |
| T029 | Explicit56TS lint and parent full check green | Correct findings, then final affected/runtime/full pnpm test/build gates |
| T030 | Independent Standards/Spec review with current source and executable probes | Changes requested; final D/F source pins/joint evidence and final approval pending |

Evidence limitation, not an invented runtime failure: current classifier process tests cover admitted, provider-marker, response, received. Delivery processes cover five listed cross-store barriers. `authority.test.ts` proves expired admitted suggestion recovery through actual watcher tick using persisted state, but there is no child kill test at suggestion admission, suggestion result, and recipient materialization as explicitly required by receipts/validation and T016. Those native boundaries must be supplied or identified before SC-C02 can be complete. The intended task completion requirement is stricter than helper-state coverage.

Plan decisions checked: existing source carrier; two narrow SQLite tables; bounded existing lifecycle; existing caller-managed queue; keyed existing reply table; result-mode SDK adapter; current-config explicit cron binding; default-disabled export/shadow with D/F seam. Source implements these architecture choices without adding a general framework. The lifecycle/all-copy-retention and current-revision consumer details remain partial above. Constitution I/II/III/V are supported by approved artifacts, evidence, isolated branch/one-group owner exception and preserved human gates. Constitution IV applicable backend checks remain pending only where recorded; Hub/site UI-specific rules do not apply.

## Native review commands and results

All runtime probe commands run from the C clone with `node --import tsx <absolute probe.mts> <C clone>`, adding `<F clone>` for retry-export and authority-export. Original scripts stay one directory above this report; new scripts/logs are in this directory.

| Probe | Result |
|---|---|
| Original revoked-reply | 0, original defect corrected |
| Original no-api-key | 0, original defect corrected |
| Original retry-export | 0, actual F accepts legal retry |
| terminal-retention | 1, intended raw-copy assertion |
| backup-retention | 1, intended raw-copy assertion |
| suppressed-delivery | 1, intended terminal-state assertion |
| authority-export | 1, intended no-quarantine assertion |
| legacy-migration | 0, real pre-change schema/rows upgraded twice, preserved IDs/history/unbound legacy reply, zero auto-fanout/invented receipts |

Suggested parent-owned convergence additions: bounded live cleanup for every terminal queue outcome; safe all-copy tombstone cleanup; terminal suppression settlement; narrow current-authority C/F revision plus historical paid-cohort preservation; missing specified suggestion native-kill proofs. Existing T029/T030 remain pending required gates/handoff. Do not append duplicate gate tasks merely because they have not run yet. No tasks were appended by this read-only reviewer.
