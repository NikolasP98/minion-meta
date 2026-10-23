# Implementation Plan: Reproducible agent evaluation and gated inference

**Branch**: `feature/agent-harness-f-evals` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: parent A26–A31, with A30 runtime in C and required Hub adapter in A.

## Summary

Build one offline-first Node evaluation toolset with strict manifests/corpus/receipts, reproducible economics/screening, an offline C complaint importer and the actual bounded live provider adapter. All paid behavior is explicit and separately approved; normal tests deny network. Deliver these and all six batch SDD records in one meta F PR.

## Technical Context

**Language/Version**: Node ≥22 ESM `.mjs`; installed Node 22.23.3, pnpm 10.15.0. No new application runtime.

**Primary Dependencies**: built-in fs/crypto/child_process/test; existing repository schema tooling if required, existing Hub adapter uses Hub's frozen Bun dependencies.

**Storage**: private append-only JSONL run artifacts plus operator-configured canonical single-writer registry/scope journal and retained replay tombstones, bound by signed manifest/approval; no caller-selected alternative ledger. No production DB.

**Testing**: `node --test` CLI/subprocess integration and independent synthetic statistics; valid live path with stub transport; real A adapter integration recorded separately.

**Target Platform**: local/operator CLI and CI with no model credentials; no production service.

**Project Type**: evaluation CLI, corpus validator, deterministic reports and explicit inference transport.

**Performance Goals**: bounded manifest effort/request/time budgets; exactly 10,000 seeded bootstrap draws for qualified router reports; one outstanding paid attempt per canonical registry.

**Constraints**: fixture default, denied external network, fixture-only tools in all modes; actual paid calls zero during implementation/CI. No synthetic readiness/promotion claim.

**Scale/Scope**: software for parent 26–29/31 plus 30 report; small labeled examples. A separate operation freezes/adjudicates ≥60 development/≥240 holdout episodes with required strata.

## Constitution Check

| Principle | Pre-design / post-design result |
|---|---|
| I | Approved parent + this spec/plan/tasks precede implementation; two independent review passes required. |
| II | Missing modules verified at pinned meta source; actual Hub fixture source inspected; all acceptance mapped to executable seams. |
| III | Explicit owner one-PR-per-group override; one meta PR owns software + SDD registration; no seventh fixture/SDD PR. |
| IV | No user UI/API surface in F. A owns UI/RBAC/i18n/design requirements. Nested Node tests explicitly enter root CI. |
| V | Parent approval authorizes code; detached approval parser does not authorize its own paid execution. Human merge/paid/deploy gates remain. |

Data model and validation guide live under owned `contracts/`. No template requirement is omitted. Corpus labeling and later paid operations are governed work, not an undocumented software TODO.

## Project Structure

### Documentation

`specs/110-harness-evals/{spec.md,plan.md,tasks.md,research.md,checklists/requirements.md,contracts/evaluation.md,contracts/quickstart.md}` and top-level board stub. Existing historical audit artifacts are preserved; new synthetic fixtures may be added under the parent-designated `audits/2026-10-22-agent-use-transcripts/spec/fixtures/` because that exact path is the approved smoke entrypoint, with explicit synthetic provenance.

### Source Code

- Entrypoints: `scripts/agent-evals/{run,corpus,report,screen,complaint}.mjs` and corresponding `.test.mjs`.
- Narrow libraries: `lib/{manifest,approval,hub-adapter,receipts,budget,live-provider,statistics}.mjs` and focused boundary tests.
- Fixtures: smoke manifest, bilingual corpus, split/label revisions, joined synthetic outcomes/screen faults/C complaint records and test-only approval keys under `scripts/agent-evals/fixtures/` or parent audit fixture path, clearly labeled.
- CI: `package.json` script, `.github/workflows/ci.yml` executed lane and any required scoped changeset decision. Do not count unexecuted nested tests as CI coverage.

## Phase 0 - Research and interface freeze

Use [research](research.md). Freeze A adapter protocol, source/lock/manifest handshake and exact event/receipt fields. Consume C's exact `ComplaintEvaluationRecordV1` schema/export contract, pinned Gateway commit and schema SHA-256; F owns no cloned schema or eligibility algorithm. Reconcile monotonic `receiptRevision` and separate actual shadow costs from counterfactual estimates. Inspect existing provider/accounting patterns, preserve explicit requested/resolved/cost-unknown semantics. No online/paid probes are needed to write or test software.

## Phase 1 - Implementation order

1. A26: strict manifest/parser/private run root and append-only receipts; actual A adapter subprocess protocol. Implement fixture inference responses through injected transport and execute all three real-context arms. A basic runner does not depend on Factory/Pulse.
2. A27: corpus/split/label schemas and import/readiness; prevent holdout body access in development mode before loading it. Add small bilingual/compaction examples and governed full-corpus protocol.
3. A28: task receipt scoring, exact joins/dedup/quarantine, cohorts, all-cost numerator and seeded paired cluster statistics. Use independently calculated counterexamples including a cheaper but less-successful arm, zero-success draws and bounded/unbounded exposure.
4. A29: deterministic screen faults, semantic abstain and independent labels; budget-fixed random/control design with explicit weighting and uncertainty. Optional E feedback stays file-based/versioned/off by default.
5. A30-F: complaint importer/report with C compatibility fixtures; runtime gate/census still owned and verified in C.
6. A31: detached approval binding trusted operator config hash and canonical registry/scope. Add an offline exclusive initializer returning an identity report only; live reopen never creates ledger/trust. Validate path/genesis/opened filesystem identities and fixed registry lock before durable shared-budget reservations, real live transport selection/provider adapters, request/result bounds and crash/cancel recovery. Test actual CLI valid admission with injected stub, malformed/expired/self-approval rejection, wrong endpoint/model/fixture, unknown/exhausted budget, alternate path/symlink/copied registry/namespace alias, missing/replaced expected state, scope retirement, partial body and persisted-response recovery. Verify the valid canonical path still dispatches; alternate paths never create another allowance. Disable all automatic retries/fallback.
7. CI/documentation: execute nested tests, real A integration, update scoped indices once orchestrator owns all new stubs; publish only draft PR evidence, no merge/live operation.

Libraries are internal to these entrypoints. Do not introduce a generic workflow/runtime or a second Hub tool engine.

## Cross-batch dependencies and delivery

A owns Hub sources and adapter; F can implement validators/calculation and stub protocol tests while A develops. F cannot claim integration until exact A source/lock/adapter hashes complete the real subprocess smoke. C implements A10–A16 + runtime A30, exporting census/shadow receipts; F's A30 report is tested against a frozen C fixture. B/D/E are not basic fixture prerequisites. E feedback import is optional and activated only by an explicit compatible file. Gateway cron A20 and unrelated engine proposals do not enter F.

Root package/workflow/index changes serialize through the F developer/orchestrator because all specs land in this same PR. SDD authors never overwrite each other's artifacts. Preserve parent and existing reviewed wave1 evidence; no source duplication or patch-only deliverables.

## Verification and release evidence

[Quickstart](contracts/quickstart.md) lists exact planned commands. Run CLI/subprocess behavior tests, real A fixture adapter, rejection and crash-recovery tests with zero network, and all root declared checks. Capture lock/source/dependency identities, deterministic artifact hashes, adversarial red/green cases and independent Standards/Spec review. A valid test-only live attestation must reach real live-provider code with a stub; a separate fake acceptance path is insufficient.

Keep statuses separate: software fixture passed; real A adapter integrated; corpus ready/not ready; actual paid provider smoke not executed; held-out inference not executed; promotion not authorized; merge/deploy not performed. If a required software seam remains unimplemented, add TODO(handoff) at its exact code site plus the matching proposal ledger before stopping; do not relabel it a governed corpus operation.

## Complexity Tracking

| Explicit choice/deviation | Reason | Boundary |
|---|---|---|
| One PR across six planned evaluation slices | Owner one-PR-per-group instruction | One meta F PR, with runtime seams in A/C PRs. |
| Local detached approval, operator-configured registry and one fixed lock | Manifest cannot authorize itself; run/day caps and unknown/retirement state survive new IDs, paths and aliases | Offline initializer creates identity/state only; no approval service, key discovery, signing command or multi-host scheduler. |
| Contracts contain data model/quickstart | Delegated file ownership | Full content retained under owned paths. |
