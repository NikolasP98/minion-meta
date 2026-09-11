---
phase: 10-durable-jobs-stock
plan: "07"
status: independently_verified_scoped
plan_sha256: 71a8384d19b2869977afd57ad6d8d8d8b0715d2035c95d04b6cad0b1ff64d40d
requirements_completed: []
source_files_frozen: true
unit_tests: 24
native_tests: 14
aggregate_check: passed_current_source_snapshot
build: pending_separate_baseline_packaging_disposition
---

# 10-07 shared request revisions and embedding receipts

The nine-file foundation candidate is frozen for independent review. Its focused unit and marked native PostgreSQL cases pass. Aggregate Hub type/check and build acceptance are not claimed: root coordinates the current-source environment-free check, and the reproduced baseline packaging failure remains under separate investigation.

## Implemented boundary

- `withOrgCoreTransaction` reuses an owned transaction for tenant/profile RLS and restores prior role/GUC/timeout state before privileged job bookkeeping. It preserves the original SQL error when an aborted transaction rejects restoration. Existing `withOrgCore` keeps its one-setup-statement behavior.
- One constrained `job_effects` table contains entity heads and admitted/received/committed effect units. Request revisions are server-created, independent of job/lease/scheduling type. RLS, grants, typed descriptor checks and a finite 1..64 by1536-vector constraint are in the additive canonical migration.
- Authorized explicit requests atomically replace the head revision, mutate domain state and enqueue a bound job. Revocation changes the head with the domain mutation without reversing job/head lock order.
- Legacy adoption requires a locked domain validator and refuses an unversioned job when another request head exists. Source-unit binding requires a locked current-source validator. These callbacks are trusted server responsibilities; the foundation cannot prove an arbitrary host callback inspected its domain correctly.
- Job embedding calls pin the actual provider/model and normalized outbound body before admission. The receipt stores hashes/descriptor and bounded vectors, without API credentials or raw input text. One outbound attempt is allowed per job admission. Missing durable response remains indeterminate and cannot automatically issue another paid call.
- Received batches can be reused on restart. `commitJobEffects` publishes domain state, commits receipts and writes progress in one ownership transaction. A committed replay does not invoke the domain callback or overwrite canonical progress.
- `jobRequestAdvanceResult` returns the durable cursor after a step. This is essential because current `bg-runtime.persistProgress` clears the cursor when a continuing handler omits it. The runtime source was not changed.

Production adoption remains in10-04/05/06. No registration TODO was removed, no migration was applied to production, and JOB-01/JOB-02 are not globally closed.

## API handoff to adoption plans

| API | Use |
|---|---|
| `createJobRequest(scope, entity, sourceHash, job, mutate)` | Explicit add/retry/reingest: head/domain mutation and bound enqueue in one transaction. |
| `revokeJobRequest(scope, entity, mutate)` | Undo/remove invalidation with the domain mutation. |
| `readJobRequest(job)` | Parse the reserved durable cursor binding; malformed bindings fail closed. |
| `bindLegacyJobRequest(..., validateDomain)` | Narrow preexisting-job adoption; existing foreign/later head is rejected. |
| `bindSourceJobRequest(..., validateSource)` | Current corpus source-unit revision selection under head/domain locks. |
| `withJobRequest(..., operation, nextProgress?)` | Deterministic domain effect and optional progress under ownership/RLS; finance needs no paid receipt. |
| `runJobEmbedding(..., unit, texts, pipelineVersion)` | Pin/admit one bounded request, save received vectors or reuse an exact prior result. |
| `commitJobEffects(..., units, publish, nextProgress)` | Publish a received unit set once; return replay status with canonical cursor. |
| `jobRequestAdvanceResult(..., done?)` | Return the canonical stored cursor to the existing runtime after the atomic step. |

Corpus adopters must canonicalize family/entity/unit and batching manifests across current/legacy/dirty/reconcile schedules. The existing runtime's effectKey includes job.type and must not create separate paid identities for the same semantic unit.

## Evidence

- Red: the added embedding cases produced8expected failures (missing prepared API; ignored single-attempt/cancellation options). The new receipt input fixture initially failed to import the absent service.
- Final unit: `node node_modules/vitest/vitest.mjs run src/server/services/job-effects.service.test.ts src/server/services/embeddings.test.ts src/server/db/with-org-core.test.ts --maxWorkers=1` →24passed across3files, no failures.
- Final native:14passed, no skipped cases. Setup asserts two distinct live pg_backend_pid values and the same expected database/marker for both clients. These connections exercise duplicate admission, received-result restart, indeterminate response loss, cancelled/taken-over/reset late responses, atomic rollback/publication/progress, changed descriptors, locked legacy/source validation, revocation, RLS denial, role/profile restoration and persisted schema constraints.
- The first native run exposed fixture step-loop assumptions and the actual cursor-return requirement. Correcting the fixture to exercise one budgeted runtime step and preserve canonical cursor produced passing results. Those initial failures are not counted as acceptance.
- Scoped Prettier check: all8TypeScript files pass. Hub `git diff --check`: passes.
- Actual substrate read through `openDisposablePostgres`: PostgreSQL17.10; database minion_qc_jobs_stock; owner minion_qc; loopback127.0.0.1; marker minion-360-disposable:v1. Node22.23.2, Bun1.3.4, installed Vitest4.1.10. These fixtures use no pgvector extension, no production connection and no real provider.
- Native fixtures apply authored migration text with only mechanical public-schema substitution into their own random `qc_job_stock_<32hex>` schema. All constraints/RLS/function/grants remain present. The fixture uses startup search_path on reconnect and drops only its owned schema.
- Default test discovery now deliberately excludes SQL integration files. Its no-tests result is not a passing native test. Root authorized a temporary exact-file development lane; canonical release-lane admission remains root-owned.

Exact native development command from `minion_hub`:

```sh
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55439/minion_qc_jobs_stock node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-10-07/vitest.config.ts
```

Temporary config SHA-256: `4d2d50e078fd160e5ec16caf35fee3268032555681084507adf60f6ae4bf4719`. It imports the existing base/helper by absolute path, validates explicit disposable URL/opt-in, includes only job-effects.sql.integration.test.ts, retains configDefaults exclusions and sets one worker/passWithNoTests:false. Each test still validates the live database marker before DDL.

## Frozen source identity

Hub branch `feat/level-2026-07-30`; checkout HEAD `a25528b603dfe25f7ea9c0900d271060e5394f35`. No commit, branch/worktree operation or dependency modification was performed. These hashes identify the shared dirty candidate, not a release.

| Owned file relative to minion_hub | SHA-256 |
|---|---|
| src/server/db/with-org-core.ts | 37078f8de40257ac468ad5739cc030e3d1e21aa90601ffc0bbe544bd4e5ec9f9 |
| src/server/db/with-org-core.test.ts | 74ef1b4cd00f682737caa13f116966cda9dcad520c53b26cdb146cc0c2ee6d3d |
| src/server/db/pg-schema/job-effects.ts | a334e419d9c920fa9eb9ef7a729291a7f2502804521c9644529201aa8ac22fa2 |
| supabase/migrations/20260909090300_job_effect_receipts.sql | e548c9cc7855292dd3d5d53dd20e7538d761d48b65696538d7baf285886bd33b |
| src/server/services/job-effects.service.ts | f8343e494be3a8e82a196d2caf76cd8844eae53c3537a6914a64119f29bbfc6f |
| src/server/services/job-effects.service.test.ts | 1f14cee2c5a0e5b521a199a3d5f24f1280cf3f9af17717b6f526d93f602948eb |
| src/server/services/job-effects.sql.integration.test.ts | 4bda4aa698f8c269ba3e16b45f195f3ea0376d813648af56be6adf4350f49424 |
| src/server/services/embeddings.ts | fdaa34056701d7a5a645d3a45ebd3a2e478708e458e680cf309e7198e1dde087 |
| src/server/services/embeddings.test.ts | 26fe370074effc5e77d81f875121d4ccde332299b727738446e9001d733a1134 |

Before hashes for existing files: with-org-core.ts `91d23359f47c2b684474befb62f761b2aac048116909ebe7168f9718ab4b1f87`; its test `8cf3536269f1196d759155ce41be05633ffa0480d9d022707841f430a04e4d6f`; embeddings.ts `cbe4fe94ce21101fa731c9368e2813d90d599538740683e868e26822c9a3c014`; its test `30350a7a8db818365c02fb4fb82ae06d2ceafc62ad92ef44fd44dec2b3e8fc7e`. The other5files were new.

## Review and remaining gates

**Standards:** Exact nine source/test files plus this SUMMARY; original job runtime, adoption services, product manifests/config, gateway and active infrastructure preserved. Synthetic provider calls and marked schema mutations only. No broad bg_jobs grant; no automatic receipt delete/purge.

**Spec:** The foundation's focused behavior is evidenced. Adoption, source-specific validation and canonical batching remain child responsibilities. Current runtime caller-wait cancellation cannot undo a remote request already dispatched. No distributed exactly-once or billing-deduplication claim is made.

Pending root-coordinated independent type/check review and aggregate release checks must not be treated as passed. The12-01 clean-copy check belongs to an earlier dependency/source candidate and is not this candidate's typecheck evidence. Baseline packaging OOM remains a separately admitted investigation; no new full build was run here.

The migration must precede revision-aware handlers and old unfenced workers must drain before activation. Rollback retains receipts and cannot reactivate stale workers. Current browser-role/default-grant and deployment migration catalogs still require release qualification.

TODO(handoff) appears in the migration header and runJobEmbedding's indeterminate branch. Root received the matching proposal text: choose explicit receipt retention and indeterminate-provider recovery before any purge or retry automation; preserve admissions/received vectors meanwhile. No retention duration, destructive cleanup or automatic paid recovery was inferred.

Intentional backend termination remains gated on12-04's healthy query settlement. Brain/corpus native vector qualification remains gated on an actual pgvector substrate. Neither is replaced by these foundation tests.

## Independent root acceptance

Root independently passed 24 unit tests and 14 native PostgreSQL tests, followed by the full Hub type check with zero errors and zero warnings in the isolated current-source snapshot. See 10-07-VERIFICATION.md for commands, snapshot identity and limits. Earlier pending-check statements above describe the implementation handoff; this acceptance supersedes that pending state without closing adoption, migration or release gates.
