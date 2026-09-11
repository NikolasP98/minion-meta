---
phase: 10-durable-jobs-stock
plan: "05"
related_plan: "10-09 Task 3"
verified: 2026-09-09T18:49:50Z
status: gaps_found
slice_status: passed
score: 7/7 scoped behavioral truths verified
requirements_completed: []
re_verification:
  previous_status: gaps_found
  gaps_closed:
    - "Removed the extra native-fixture argument without expanding the production API."
    - "Late ordinary loading failure after publication now completes from canonical state."
  regressions: []
gaps:
  - truth: "The complete phase has qualified interrupted-job recovery and release behavior."
    status: partial
    reason: "This review qualifies brain source behavior, not driver fault settlement, deployment, corpus/stock adoption or aggregate packaging."
    artifacts:
      - path: "minion_hub/src/server/services/brains.service.ts"
        issue: "The registration handoff retains driver recovery, deployment/drain and indeterminate-request policy gates."
    missing:
      - "Complete the separately admitted remaining handler, driver, migration/drain and release gates."
      - "Record the root-coordinated current-source aggregate check and packaging disposition."
---

# Brain ingestion adoption verification

This independent review covers the three brain files in 10-05 and 10-09 Task 3. It does not independently certify the shared foundation: this reviewer implemented 10-07 and 10-09 Tasks 1–2, which root reviews separately. No product source was edited during this review.

The phase goal is: “Retried, concurrent and interrupted jobs preserve one authorized business effect and recover without reposting stock history.” This report establishes only brain adoption evidence. JOB-01/JOB-02 remain open across the phase; STK-01/STK-02 and other handler adoption are outside this review. No deployment, driver-failure recovery, full migration catalog, paid provider or user-interface acceptance is inferred.

## Goal-backward results

| Observable truth | Result | Actual evidence |
|---|---|---|
| Explicit document creation, reset and removal control one request revision. | Verified | `brains.service.ts:350`, `:417`, `:463` use create/revoke helpers with domain mutation and enqueue under the same transaction. Native creation rollback, reingest during fetch/embedding, deletion, uppercase UUID and wrong-brain cases pass. |
| Duplicate jobs share one complete canonical chunk/pipeline/provider-mode manifest. | Verified | `:924–950` derives ordered complete pieces, pipeline, embedded/disabled/empty mode and resolved provider identity, then binds the shared head before any batch. Native common-prefix divergence and both zero-batch modes reject incompatible intent before another paid admission. The cursor is progress, not manifest authority. |
| Actual dispatched batches stay pinned to the admitted provider and complete publication set. | Verified at the brain integration boundary | `:960–978` supplies each actual batch plus expected manifest/provider to the foundation. `:984–988` checks complete vector/batch counts. Native provider change between batches stops before the second outbound request. Private preparation and its schema/API internals are independently reviewed by root. |
| Received batches resume; ambiguous remote outcomes do not automatically replay. | Verified | Native response-loss, concurrent admission, takeover, ignored-abort cancellation and final-publication rollback cases inspect actual calls and receipt rows. The multi-batch rollback test preserves old chunks, retains received vectors and later publishes without further provider requests. |
| Ready-state admission and duplicate completion preserve canonical publication. | Verified | `:887–913` locks and validates the current document, handles ready state and derives completion from the stored job cursor. `:971` supplies the same domain guard to missing admission; `:979` rechecks between batches. Native delayed module completion, concurrent same-manifest retries and delayed URL failure after publication preserve chunks, avoid new paid calls and complete from stored state. |
| Embedded, disabled and empty publication use the same owned atomic boundary. | Verified | `:991–1020` replaces chunks, updates ready status, commits receipts and progress under manifest-asserting helpers. Zero-batch publication also requires the bound manifest. Native real-vector dimensions, rollback, source mismatch, null-manifest history and tenant isolation pass. |
| Access, source loading, chunking and search compatibility remain intact. | Verified within focused coverage | Existing fail-closed access/search, upload, module permissions and 3000/300 chunking assertions remain in the unit file. URL tests exercise manual redirect rejection, cancellation, stalled response body and timeout. The native fixture invokes the actual handler/runtime and actual PostgreSQL RLS/vector storage. |

The four roadmap criteria remain visible: current lease ownership and canonical retry behavior are partially qualified through this handler; invoice issue uniqueness and stock recovery are not evaluated here. This scoped plan cannot reduce those phase obligations.

## Artifacts and wiring

| Artifact / link | Result |
|---|---|
| `brains.service.ts` → `job-effects.service.ts` | Wired through actual document lifecycle, bind-once manifest, admission, receipt persistence, publication and canonical progress calls. Imported helpers are used in production handler paths. |
| Brain → embeddings transport | Wired through `runJobEmbedding`; actual outbound fetch bodies/counts are inspected with a synthetic response boundary. Search remains on its existing separate embedding path. |
| Handler registration → runtime → domain tables | `registerJobHandler({ type: 'brain_ingest', advance: advanceBrainIngest })` is exercised through actual `advanceJob` in the native fixture. Assertions read actual jobs, heads, receipts, documents and pgvector chunks after each race. |
| Native fixture → authored DDL | Applies lease, receipt, manifest and original brain migrations in an owned random schema. Explicit vector namespace/type/operator substitution supports the actual extension without replacing vector storage. Later brain columns needed by `loadBrain` are added explicitly. |
| Unit tests | Substantive access, search, loader, chunking and module-permission regressions; not treated as receipt/concurrency evidence. |

Data-flow evidence comes from native rows and actual synthetic request bodies, not rendered UI. No UI artifact is part of this slice. Empty search/chunk/module outputs in the service are guarded behavior, not placeholders.

## Independently executed checks

From `minion_hub`:

```sh
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL=postgres://minion_qc@127.0.0.1:55440/minion_qc_vectors node node_modules/vitest/vitest.mjs run --config /tmp/minion-360-10-05/vitest.config.ts
node node_modules/vitest/vitest.mjs run src/server/services/brains.service.test.ts src/server/services/embeddings.test.ts --maxWorkers=1
```

- Final native candidate: **30/30 passed**, one file, exit 0, 9.78 seconds. Earlier independent review ran 29/29 in 6.17 seconds; the additional case covers the identified late loading failure.
- Unit: **43/43 passed**, two files, exit 0, 1.77 seconds.
- No unhandled errors were reported. These durations identify the run, not a performance claim.
- The temporary exact-file config inherits the disposable URL/opt-in validator. The fixture requires the actual marker, database `minion_qc_vectors`, pgvector `0.8.6` in `extensions`, and two distinct live backend PIDs. It uses random owned schemas and cleans them afterward. No application environment loader, provider credentials, external paid requests or backend termination were used.
- These are candidate tests through an authorized temporary configuration. They do not add the file to the canonical release allowlist. Root coordinates full current-source static checking and the separately blocked packaging gate.

The review inspected named assertions rather than relying on the total count: the original access/search/chunk/upload/module assertions remain, and the native receipt, cancellation, reset, rollback and RLS cases remain alongside the full-manifest regressions. Provider success is synthetic; upstream availability and provider billing behavior are not tested.

## Findings and limits

1. **Fixture TypeScript mismatch resolved:** root removed the extra actor argument; native fixture line 684 now matches the four-argument production declaration. This reviewer inspected the correction and reran the native file. The root-coordinated aggregate static check is reported separately; runtime tests alone do not establish it.
2. **Late loading failure after publication resolved:** the catch branch at `brains.service.ts:1041–1052` now reads the current document under ownership/source locks and calls `finishPublished` when it is already ready. Otherwise it preserves failed semantics. Cancellation, revision loss and embedding-stage indeterminate errors retain their earlier handling. The added actual-engine delayed URL rejection case proves done status, null error, complete cursor, unchanged published chunks and exactly one embedding POST.
3. **Qdrant evidence boundary:** the native fixture installs the original brain tables/RLS and necessary later columns, not the later Qdrant generation/outbox triggers. It proves PostgreSQL chunk/vector atomicity. The production publication remains transactional and no Qdrant API was changed; actual downstream generation/outbox synchronization remains unverified here. The fixture's exact TODO at line 123 and the root proposal retain this gate under 10-06/Phase 15; 10-06 explicitly requires the actual generation function and outbox trigger rather than an always-true stub.
4. **Compatibility:** unversioned jobs reject before loading; an authorized explicit reingest creates fresh intent. Null manifest plus existing receipts is ambiguous and rejects without erasing historical receipts. Already-ready data can complete without inventing historical manifest identity. A bound disabled/empty plan remains authoritative until explicit reingest.
5. **Existing open gates:** driver fault settlement, rollout/catalog/old-worker drain, receipt retention and operator recovery remain open. The existing handoffs at service lines 1032 and 1055 point to `proposals/2026-09-08-platform-qc-remediation.md`. Cancellation bounds caller waiting and fences subsequent effects; it cannot undo an already dispatched remote operation. The loader retains its documented DNS connection-time TOCTOU and post-read HTML cap; this adoption does not certify a new parser or SSRF transport.

No human UI verification is requested for this server-only slice. Both concrete review findings are resolved in the independently rerun candidate. Full platform UX, real external services, deployment and Qdrant integration require their separately scoped evidence. The scoped behavioral review passes; the global status remains `gaps_found` because the full phase and release gates remain open.

## Observed source identity

| File under `minion_hub/src/server/services/` | SHA-256 |
|---|---|
| `brains.service.ts` | `25540ef49705b0a9d52d8b4dd1ae9d15ae255345f624a006f052fe0414de37a5` |
| `brains.service.test.ts` | `74c5690b9c80fc16dfaa075e531e8a2baa3513b77d00b5e02947b874a8aafdce` |
| `brains.effect-ownership.sql.integration.test.ts` | `7f3413c3fe8d0dd96cc298027aa14135f0a4ee5a7351cca2d1c6ca32c39297a9` |

These hashes identify the final independently tested candidate. The initial service/native hashes were `a4b19ed69f82a4259bd8e643df1ba6039f35677fc9d891abdb3c3b11ac3f3509` / `7a758c61c92aa847707bfc56b105c216910e64d883f052c52f4eb79ea245e3a4`; unit source was unchanged. This verifier made no source, foundation, global planning or production changes.
