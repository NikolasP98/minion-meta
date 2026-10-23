# F frozen-source independent implementation review

Status: **CHANGES REQUESTED**. This is a bounded source-review checkpoint, not final F completion. Reviewer changed only review artifacts and disposable synthetic state. No runtime edits, staging, commits, pushes, PRs, merge, deployment, operational trust initialization, real credentials, real provider requests, or external network occurred.

## Source identity and review axes

Inspected clone: `/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/f-evals`, branch `feature/agent-harness-f-evals`, PR base `dev`. Metadata HEAD at snapshot: `b10969bc65a0906359c03667b3d3b486c79599cc`. All **84 owned files** matched the frozen author checkpoint byte-for-byte. Runtime tree identity supplied and retained: `8a8e37ed77e53865d35aeae78c9a12d4b08b181f96c7ebe917a262c581c42a68`. Dependency lock SHA-256: `15cbb75ffccdb3aa06ec97b776f3ed9bc0ff1ff68c10b1718741b32ea855f75a`.

`reviewed-source-identity.json` records each inspected hash. `reviewed-owned-source.tar.gz` preserves all reviewed files; archive SHA-256 `1251c5b3e78ff4260f468daa07e70dbd8ad9d3c5a0edd2cacd8eb472724d4311`. Metadata HEAD changes are not runtime changes. All source references below are relative to that clone/frozen archive.

- **Standards: CHANGES REQUESTED.** Boundary parsing/evidence trust, per-dispatch authority, private artifact isolation, and unique sampling-unit accounting fail in F-02 through F-05. Existing registry, detached-key, canonical-path, no-retry and lifecycle safeguards have meaningful source and execution evidence, but do not cancel these failures.
- **Spec: CHANGES REQUESTED.** F-01 through F-06 contradict or partially satisfy FR-001 through FR-010 as traced in `convergence-matrix.md`. Actual final A/C integration and final convergence remain pending independently of these defects.

## Findings and smallest corrections

### F-01 — HIGH — Repeated trials collapse before pairing and silently change the estimand

**Source:** `scripts/agent-evals/report.mjs:22–55,76–90`; `lib/statistics.mjs:45–66`. **Trace:** FR-004/005; SC-003; US3/AC1–2; T010–T011; parent §9.2 / line626; evaluation contract repeated-observation and preregistration rules.

`analyze` aggregates every episode/arm into one row before matching. It never checks equal repeat IDs across arms. Actual report CLI input with 60 episode clusters, baseline two repeats and candidates one repeat, identical per-trial cost/latency/success, returned `candidate_eligible_for_human_review`; cost and latency intervals were exactly 0.5 with no missing-pair reason. Missing candidate observations manufactured the apparent improvement.

Equal repeat sets alone do not repair the estimator. A second input explicitly preregistered successful repeated trials as the denominator, with 30 episodes×2 and 30×1 matched trials per arm. Independently counted baseline: 90 successes / 9,000 micro-USD = CPS100; candidate: 60 successes / 4,500 = CPS75; success difference −1/3; per-trial p95 latency100ms. Output instead reported 60/30 successes, CPS150/150, difference−0.5 and p95200ms. `all_repeats` silently implements all-repeats-must-succeed plus summed latency.

**Correction:** preserve every repeated trial's outcome, bill and latency inside its episode bootstrap cluster; match repeat identities before estimation; retain unmatched billed attempts but forbid a matched recommendation. Make supported estimand/aggregation semantics explicit and validated; reject unsupported policies rather than substituting another statistic. Keep exactly 10,000 paired cluster draws. **Evidence:** `probes/report-boundaries.mjs`, `report-boundaries-result.json`, `report-boundaries.log` (actual public CLI).

### F-02 — HIGH — Reports accept foreign receipt lineage and cached known billing over unknown receipts

**Source:** `scripts/agent-evals/report.mjs:165–252`, `lib/receipts.mjs:2–32`; related ingestion review at `screen.mjs:299–345`. **Trace:** FR-001/004/010; SC-001/003; US1/AC2, US3/AC1; T003/T005/T010/T011.

A real fixture CLI generated a successful three-arm run. Replacing every `provider_settled` receipt's root, submission, parent and cluster with foreign values left all successes and knownBillCoverage1 in the real report CLI. Only run/provenance, episode/arm and attempt ID are joined. A separate mutation made the durable bill payloads unknown/null while retaining the original cached result; the report still emitted complete successes and knownBillCoverage1, without an incomplete-bill reason. Envelope validation accepts arbitrary payloads; `row.costStatus` remains copied from `result.analysis` and the known-cost lower-bound check does not reconcile unknown statuses.

**Correction:** validate kind-specific payloads and the full run/episode/cluster/arm/root/submission/parent/attempt/request binding, deduplicate exact records and quarantine conflicting facts, and derive financial coverage/outcomes from reconciled typed receipts. Cached result fields cannot override unknown/missing/conflicting durable evidence. Apply the shared validated ingestion boundary to report and screen consumers. **Evidence:** same public CLI probe/result as F-01; separate foreign-lineage and unknown-bill cases are preserved.

### F-03 — HIGH — An expired detached approval can still admit and dispatch new requests

**Source:** `scripts/agent-evals/run.mjs:78–85,169–246`; `lib/approval.mjs:128–137`; `lib/live-provider.mjs:95–115`. **Trace:** FR-002/008/010; SC-004; US4/AC1–3; T014–T019.

Approval validity is checked once before starting the run. The actual live CLI, with a separately signed disposable approval and a deny-network fetch replacement, completed three calls; the last two dispatched after signed expiry. A second preload advanced only the test clock immediately after reservation fsync: the actual wire function still received one request after expiry. Both probes observed an existing durable reservation/dispatched journal entry before the replaced wire call; zero actual external/paid calls occurred.

**Correction:** evaluate the immutable verified approval's permitted time window before each reservation and again immediately before dispatch. If it expires between durable reservation and dispatch, prove transport was never entered and record the appropriate not-dispatched/no-bill terminal semantics, or retain a conservative fence if that proof is unavailable. Never erase the durable reservation or prior known bills. Do not refresh validity implicitly or replay uncertain work. **Evidence:** `probes/live-expiry.mjs` with default and `after-reservation-fsync`; `live-expiry-result.json`, `live-expiry-after-fsync-result.json`.

### F-04 — HIGH — Corpus episode IDs escape the private raw artifact directory

**Source:** `scripts/agent-evals/run.mjs:126–130,390`; `corpus.mjs:63–66`; episode schema unrestricted ID string. **Trace:** FR-002/003/010; US2/AC1; T003/T008/T019; evaluation contract private destination/retention and path-traversal rejection.

A schema-valid synthetic episode ID `../../../../independent-escaped-collection` completed the actual fixture CLI and wrote three collection files into the parent of `--out`, outside the run's private directory. The probe asserted that all destinations stayed inside its disposable `/tmp` fixture tree. `rawFiles` retained the traversal strings, which `redactRun` would reject. Exclusive create prevents overwriting an existing file, but does not contain raw data or fulfill redaction.

**Correction:** generate opaque/hash/UUID raw filenames independent of external identifiers and validate the normalized destination remains inside the private raw root before creation. Validate IDs where their contract permits it. Ensure the retention inventory and redaction cover every created raw payload. **Evidence:** `probes/corpus-paths.mjs`, `corpus-paths-result.json`.

### F-05 — HIGH — Duplicate trace exports inflate independent screening sample size

**Source:** `scripts/agent-evals/screen.mjs:68–112,183–259`. **Trace:** FR-006; SC-005; US3/AC4; T012–T013; fixed-budget controls and sample-supported uncertainty contract.

The actual screen CLI accepted 100 byte-identical copies of one trace and one matching independent human-label assertion. Both selection schemes reported 100 reviewed traces; the prioritized scheme contained only one unique source ID, yet its zero-miss rate upper bound was 0.029513 (<0.05) and status was `eligible_for_human_review`. Repeated exports of one observation created false confidence.

**Correction:** deduplicate identical source trace identities, quarantine conflicting identical IDs, and calculate probabilities, weighted estimates and uncertainty from unique eligible sampling units. Reject a fixed budget/control count exceeding the unique population; report effective unique denominator explicitly. Labels do not turn duplicate exports into independent observations. **Evidence:** `probes/screen-and-complaint.mjs`, `screen-and-complaint-result.json` (actual screen CLI).

### F-06 — MEDIUM — Known zero terminal cost fails to supersede an admitted unknown receipt

**Source:** `scripts/agent-evals/complaint.mjs:237–250`. **Trace:** FR-007; SC-005; US5/AC2; T020–T021; monotonic C receipt revision and actual cost reconciliation contract.

Using the unchanged C JSON schema and schema-valid synthetic revisions of its emitted record, an admitted unknown attempt followed by a terminal complete known-zero bill produced `actualShadowCosts.unknownAttempts` containing that attempt, with no quarantine. The raw billed map chooses a later known receipt only when `(prior.costUsd ?? 0) < costUsd`; known zero cannot replace unknown null. The result depends on input order even though receipt revisions should resolve it.

**Correction:** reconcile monotonic terminal state/coverage before forming actual billed evidence; zero is a valid known cost. Exact repeated exports must deduplicate, valid known-zero terminal receipts must remove resolved unknown status, while conflicting terminal/bill facts remain quarantined and visible without erasing ambiguous spend. **Evidence:** same screen/complaint probe via exported `complaintReport` public module plus actual authoritative C schema; this is a synthetic boundary probe, not final C producer integration.

### Documentation correction

`VALIDATION.md:65` calls a historical nested lane final and reports40/40, while its earlier section reports41/41. Correct the history/terminal receipt wording when the implementation is revalidated. This is not a runtime defect and is not a substitute for any of F-01–F-06.

## Checked safeguards and evidence limits

The review read every implementation module, the episode/label/split schemas and C schema/fixture, relevant tests, parent and frozen F SDDs, constitution, engineering references and CI wiring. Source checks found strict manifest field/hash/source/lock validation; held-out access checks before body reads; synthetic labels excluded from human readiness; whole-cost numerator and nonfinite bootstrap mass; typed semantic abstention and gold labels loaded after scoring; detached Ed25519/config binding; fixed canonical registry identity/inode/genesis and lock; fsynced reservation before one allowlisted no-redirect/no-fallback fetch; received-body persistence before interpretation; unknown/recovery/retirement handling; nested tests executed in root CI. These are checked safeguards, not claims that every adversarial edge passed independently.

Independent execution of the author's targeted approval/budget/live CLI tests passed **17/17**, exit0, in16.58s. Those tests exercise invalid authority, aliases/copied/replaced/missing registry state, canonical concurrent processes, unknown/lost/partial outcomes, malformed/model-drift known charges, day caps, SIGKILL/stale lock, local received settlement and retirement. See `targeted-author-boundaries-receipt.json` and log. They are explicitly author assertions executed by the reviewer; the six findings use additional independent inputs/assertions. No root build/lint/full suite/browser was rerun while D owned the heavy lane. Author root green/41 focused receipts remain a separate supplied evidence class.

The corpus's small synthetic fixtures do not constitute the human-adjudicated300 corpus. No paid smoke, holdout inference, active gate/policy promotion, merge or deployment is qualified.

## Spec Kit and remaining checkpoints

Read-only analyze/converge assessment initialized successfully with absolute `SPECIFY_FEATURE_DIRECTORY` and `SPECIFY_FEATURE_NO_PERSIST=1`; no `.specify/feature.json`, SDD, checklist or task file was mutated. There is no extensions.yml hook file. `convergence-matrix.md` inventories10 FRs,5 SCs,18 acceptance scenarios,24 tasks,7 plan decisions and5 constitution principles. The approved intent remains coherent; code gaps and integration dependencies prevent convergence. Orchestrator owns any corrective task append and the open-items ledger.

Required next checkpoint: Sol corrections for F-01–F-06 + documentation; unchanged independent probes rerun against a newly frozen source identity; strict repeat/receipt/expiry/path/unique-sample/known-zero negative and positive regressions; required affected gates; final reviewed A commit/current F real fixture smoke and valid test-only live-mode actual-A smoke; final reviewed C exporter/schema/producer pin and actual complaint CLI/report bridge; then independent final Standards, Spec and convergence. Final A/C pins, governed corpus operations and paid operations must remain separately labeled.
