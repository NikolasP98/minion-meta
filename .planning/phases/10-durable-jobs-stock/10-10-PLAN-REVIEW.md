---
phase: 10-durable-jobs-stock
plan: "10"
reviewed: 2026-09-09
status: amendments_required
execution_ready: false
review_independence: false
plan_sha256: 7c75f1fe3cee4a40a30989605dd49ca433138ce5d2242819f5dda8c5df3f90ce
packet_sha256: bdde1b2b94a8d7cceb2f6739a402ed0fd9d9d50a37a174c45c8d0efcc280e482
scope: read-only reclamation and capacity review
---

# 10-10 reservation recovery review

The design can preserve cross-document batching without changing `bg-runtime.ts`, but the current packet does not yet define a complete safe recovery path. Select a nonblocking foreign-owner prelock contract, settle unreproducible/superseded unsent batch handling, and qualify the full memory/lock frontier before implementation.

**Review provenance:** this reviewer authored the earlier draft now inspected. This is a follow-up adversarial source review, not independent admission of that design. Root or another reviewer must admit the amended contract independently. No source, DDL, database, provider, Qdrant, build or test execution occurred.

## Blockers and minimum amendments

| ID | Concrete gap | Required bounded amendment |
| --- | --- | --- |
| R1 | `withOwnership` locks the current job first. Blocking on another job later can deadlock reciprocal reclaimers or an old dispatcher waiting for a head already held by the reclaimer. The proposed scoped callback also runs as `app_ledger`, which must not gain broad `bg_jobs` authority. | Before acquiring any head/domain/page/batch/unit lock, obtain every discovered foreign owner row through nonblocking locks under the original bookkeeping role. Abort the complete attempt on a locked/missing/changed frontier. Amend the new `withOwnedJobScope` contract to support this bounded pre-scope step; preserve existing runtime and single-head APIs. |
| R2 | Owner transfer does not solve every UNSENT orphan. Reserved `[A,B]` cannot be dispatched by page `[A,C]` if B's payload is unavailable; it cannot be dispatched at all if B was superseded. Immutable unit placement then strands valid A despite no provider admission. | Explicitly choose either limited complete-batch recovery with a typed unrecoverable-reservation outcome, or an additive `abandoned_unsent` transition plus conditional release/repacking of never-admitted unit placements. Recommend the latter if automatic unsent recovery is required. Keep admitted/received membership/results immutable. |
| R3 | The source defaults to concurrency4 but clamps configuration up to8. The packet's64/128/256-vector experiment cannot exercise eight full concurrent64-input calls. “Preserve existing maximum” and an implicit hard maximum4 are different policies. | Select explicit validated integer concurrency. Either qualify the existing upper bound8 with at least512 vectors, or explicitly admit a cap4 compatibility change. Do not infer the configured production value. |
| R4 | Required-unit/head limits alone do not bound complete manifests, foreign batch lock closure or historical result reads. A page with zero changed units can still contain many unchanged chunks. Reading one required vector from each of many64-vector receipts can inflate materialization64-fold. | Add separate canonical-unit/whole-source byte limits, recovery frontier limits and cumulative returned-vector/result-byte limits. Project only the required vector indices from already-received batches or explicitly budget full received batches. Check limits before descriptor/prepared-body copies and again before any reservation/admission. |
| R5 | A typed reservation-busy error thrown through the current runtime marks the job failed. Conversely, replaying an already-admitted batch must not return a fresh permission to dispatch. | Define retryable busy/frontier-change outcomes separately from remote indeterminate. Later10-06 must yield with the canonical cursor on busy. Only the successful reserved→admitted transaction may produce one private dispatch decision; an existing admitted row never authorizes another call, even for the same owner. |

## Actual ownership seams

`minion_hub/src/server/services/bg-runtime.ts:227–250` obtains the current `bg_jobs` row with `FOR UPDATE`, checks tenant/job/generation/running/lease and checks time/abort again after the callback. `claim()` at99–125 changes generation on each queued or expired claim. `ownsLease()` at128–136 prevents ordinary expired renewal; heartbeat/progress/finish use that predicate. `cancelJobsByRef()` increments generation. These are the existing owner checks to retain.

`job-effects.service.ts:218–240` wraps that execution callback and checks its identity. `withJobRequest()` at263 then enters `withOrgCoreTransaction`, locks the head and performs scoped domain work. `with-org-core.ts:19–58` changes to `app_ledger` and restores the captured role/GUCs. Therefore an arbitrary foreign-job query inside the proposed domain callback is the wrong seam. No new `bg_jobs` grants are justified.

`createJobRequest()` at355 explicitly uses head→domain→new-job insertion and says never to acquire an old running job after the head. A new reclaimer must not reverse that rule. Response retention can use own job→batch without heads because it does not assert publication authority; it must not later acquire a head from that path.

## Minimal nonblocking reclaim algorithm

This is a proposed algorithm for the native tests to establish, not an executed proof. It preserves `withOwnership` and requires only the planned new helper/service/DDL boundaries unless root chooses a different API.

1. **Discover a bounded candidate frontier without mutation.** Under scoped reads, inspect every requested unit and each referenced batch. Classify received, admitted, reserved and missing. An admitted ambiguous unit ends the attempt before missing reservations or provider calls. Record reservation-owner tuples and all batch member/head identities needed by the selected reclaim policy. Do not fetch arbitrary full result bodies merely to classify state. Bound this read frontier; a paginated/partial owner list cannot authorize the operation.
2. **Enter current execution ownership.** Existing `execution.withOwnership` locks/validates the current job. Before any head/domain/page/batch/unit lock, obtain all distinct foreign owner job rows, tenant-filtered and sorted by ID, using `FOR UPDATE NOWAIT` or `FOR UPDATE SKIP LOCKED`. Exclude the already-held current job. If any expected row cannot be obtained, roll back/yield the entire attempt. `SKIP LOCKED` returning no row is not evidence that an owner died. With NOWAIT, catch lock-not-available outside the aborted transaction; do not continue issuing SQL inside it.
3. **Classify the recorded reservation generation under those locks.** It is invalid if the owner job's generation differs, its status is no longer running, or its lease is expired/absent. A valid matching owner is busy and cannot be displaced. Same-job takeover compares the recorded reservation generation with the already-locked current generation. Do not reset a job or increment its generation merely to steal one unsent batch. Use the runtime's explicit lease-time convention; do not silently mix database time and application time into a stronger clock guarantee. The conditional batch transition below is the final dispatch fence.
4. **Acquire the full resource order and revalidate.** Enter the tenant/profile scope, then lock all relevant heads in sorted canonical order, perform the DB-only domain guard, and lock page/batches/units in one specified order. Prefer page→sorted batches→sorted units after heads. Re-read the entire requested set, reservation owner tuples, immutable descriptors and membership. If discovery missed a new owner/head/batch, abort and rediscover outside this transaction. Never expand the foreign-job lock frontier after acquiring heads. DDL triggers/deferred checks and FK-induced locks must be included in the native lock-order review.
5. **Reclaim only still-reserved work.** For whole-batch transfer, require complete reproducible payloads and current authority for every member, then compare-and-set the exact previous owner/generation and descriptor. Reprepare through the existing private request API and compare the actual normalized payload/provider hash. Any row count mismatch aborts the entire reservation transaction. If a member changed or cannot be loaded, use R2's selected typed limitation or separately specified abandonment path; never send a partial body under the old descriptor.
6. **Reserve remaining missing work atomically.** After all requested units passed the same locked preflight, pack missing units across documents in page order,64 per request. Commit all reservations without outbound permission. Restore role/GUCs before saving canonical job progress. No SQL lock spans fetch.

The helper API needs a bounded, tenant-derived foreign-owner candidate list or an equivalent narrow pre-scope hook. It must not expose a general privileged SQL callback to domain code. A practical amendment is an optional reservation-owner prelock argument on the new, not-yet-implemented `withOwnedJobScope`; the helper performs the exact `bg_jobs` lookup under the bookkeeping role and supplies a minimal locked-state snapshot to the scoped operation. The service still revalidates that every snapshot corresponds to current persisted batch ownership. No `bg-runtime.ts` change is required for this approach.

### Conditional SQL contract

Illustrative column names below must be reconciled with the authored905 schema. Every predicate is part of the contract; a successful zero-row update must not be treated as ownership.

```sql
-- Only after current-job ownership and nonblocking foreign-owner prelocks,
-- followed by scoped head/domain/batch/member validation.
UPDATE job_effect_batches
SET reservation_job_id = :current_job,
    reservation_generation = :current_generation
WHERE tenant_id = :tenant
  AND id = :batch
  AND state = 'reserved'
  AND reservation_job_id = :observed_old_job
  AND reservation_generation = :observed_old_generation
  AND descriptor_hash = :expected_descriptor
RETURNING id;

-- A separate, freshly owned transaction immediately before dispatch.
UPDATE job_effect_batches
SET state = 'admitted',
    dispatch_job_id = :current_job,
    dispatch_generation = :current_generation
WHERE tenant_id = :tenant
  AND id = :batch
  AND state = 'reserved'
  AND reservation_job_id = :current_job
  AND reservation_generation = :current_generation
  AND descriptor_hash = :actual_prepared_descriptor
RETURNING id;
```

Both updates require exactly one returned row. The outer ownership callback must finish and COMMIT successfully before its caller acts on the result. Admission additionally validates every captured member/head/full manifest and the exact privately prepared body. Already-admitted/received state returns no dispatch decision; it is not an idempotent permission token. Keep that decision inside `runJobPageEmbeddings`, with `attemptPolicy:'single'`, a signal check and bounded active calls.

Why the old dispatcher cannot gain a **new permission after reclaim**:

- If it already committed admission, the row is admitted; reserved-only reclaim fails and the new page reports indeterminate, not unsent.
- If it owns its job transaction while trying to admit, the reclaimer's nonblocking foreign-job lock fails. There is no own-job-A→own-job-B blocking cycle.
- If reclaim commits first, the old reservation-owner tuple no longer matches. A stale prepared request in memory cannot make its admission CAS succeed. Existing current-job generation checks independently reject stale execution.
- A process paused **after** a successful admission commit may still have permission for that one admitted request. There is no generic guarantee that local cancellation or lease expiry stops a remote effect. Preserve the commit-to-call ambiguity and never reclassify that row as reserved.

Nonblocking foreign locks prevent this added job-lock cycle; they do not prove starvation freedom. Reciprocal reclaimers may both yield. Bound retries with jitter/yield in the later consumer, preserving its cursor. Do not let a tight loop monopolize the existing25-second advance budget or turn ordinary contention into a terminal failure.

## Unsent membership recovery choice

Concrete counterexample: old page reserves transport `[A,B]`; no remote admission occurs. B is superseded. New page needs the still-current semantic unit A and C. The old transport cannot be admitted because B is stale. The current packet forbids changing membership and unit placement, so A remains attached to an unusable reservation indefinitely. Another counterexample has B still current but unavailable to the new page's loader; stored hashes cannot reconstruct B's text.

Two bounded choices are honest:

| Choice | Guarantee and limitation |
| --- | --- |
| Whole-batch transfer only | Smallest implementation. Reclaims only a complete reproducible reserved batch whose full member set is still current. Explicitly reports unavailable/superseded companion reservations without falsely claiming automatic unsent recovery. Needs a later recovery contract for those cases. |
| Abandon and repack never-admitted work | Recommended if this child must recover arbitrary orphaned UNSENT overlap. Atomically tombstone the old reserved batch and release its unit placements, then repack the current page's missing semantic units. Preserve immutable old descriptors for audit and immutable semantic unit identity. Superseded members are not re-admitted. No change to admitted/received batches. |

The second choice requires a real packet/DDL amendment: add terminal `abandoned_unsent`; permit transport-placement mutation only after the old batch was atomically made unable to admit; preserve its immutable ordered membership descriptor even after placements move; adjust deferred dense-membership validation to active reserved/admitted/received batches; and retain uniqueness of each semantic unit's current placement. No deletion of provider evidence is involved, because the abandoned state can be reached only from reserved. Page descriptors already identify semantic units independently of placement, so page identity need not change.

Revoke **the entire old batch's admission permission** before moving any member. Holding only the overlapping unit is insufficient. Use the prelocked old owner, all relevant batch/member/head locks, a reserved-only CAS, and one transaction for tombstone/release/repack. Old dispatch then finds abandoned state and receives no permission. Received response retention remains restricted to its actual admitted dispatch owner/generation, and partial semantic supersession still does not prevent retaining the complete response. Publication independently rechecks all consuming heads and full manifests.

If root selects this extension, the seven-file scope can still contain its tables/service/migration, but all state/constraint/API descriptions and tests must be amended before admission. Do not introduce it silently during execution.

## Capacity and packing corrections

Actual source has64-input batches and default concurrency4 with an environment clamp up to8 in both corpus services. Job wrappers pass25 conversation keys and50 business rows. Direct service defaults are50/100 and callers can select up to500. Conversation keys expand into monthly documents; none of these values bounds the number of heads or complete canonical chunks.

Define distinct limits for:

- Selected source heads and **all canonical units**, including unchanged, disabled and Qdrant units.
- Required paid units and actual normalized prepared-request bytes, separately from original full-source text bytes and canonical descriptor bytes.
- Foreign reservation batches, all companion units and head-lock closure. With R overlaps in R different64-unit batches, the closure can reach64R units. A256-unit page can therefore expose16384 companion units even though only256 are required.
- Cumulative returned vector/result bytes and distinct historical batches inspected. Project `result[vectorIndex]` from already-received batches rather than materializing the full64-vector result for every required unit. Fetching full batches requires an explicit larger budget and de-duplication by batch ID.
- Active provider calls C and retained whole-page outputs/prepared bodies. C limits active calls, not all results already accumulated for atomic page publication.

Exact arithmetic at1536 dimensions:

| Shape | Float32 payload floor |8-byte numeric-slot arithmetic, before JS/JSON overhead |
| --- | --- | --- |
|64 vectors |393216 bytes (384 KiB) |786432 bytes (768 KiB) |
|4 full concurrent batches /256 vectors |1572864 bytes (1.5 MiB) |3145728 bytes (3 MiB) |
|8 full concurrent batches /512 vectors |3145728 bytes (3 MiB) |6291456 bytes (6 MiB) |
|256 required units fetched as256 full64-vector historical batches |100663296 bytes (96 MiB) |201326592 bytes (192 MiB) |

`embeddings.ts:62–87` slices each input to8000 UTF-16 code units, then JSON-stringifies it. That is not an8000-byte input bound. An input consisting of8000 escaped control characters can occupy48000 JSON bytes;64 such inputs contribute3072000 bytes before model/brackets/separators. Four prepared bodies can exceed12MB despite a much smaller numeric-vector payload. Measure the serialized request body and whole prepared page, not only raw text length. Avoid materializing an arbitrarily large string merely to discover it violates a limit.

The existing4,000,000-byte receipt guard is the database function's `pg_column_size(value)` check on JSONB in migration903:10, not a JavaScript or serialized-response byte limit. It runs during persistence after the embedding response has already been parsed. It is neither a cumulative page-memory bound nor an upstream response-reading bound. Phase15 before-load/read limits remain open, but this foundation must at least reject oversized already-prepared inputs before allocating additional full manifest/body copies or admitting provider work.

For M currently missing semantic units after received reuse and permitted unsent recovery, fresh page calls remain `ceil(M/64)` and active calls at most `min(C, ceil(M/64))`. Do not reset packing at a document boundary or dispatch one request per reclaimed unit. Different concurrent pages can fragment batches; no globally optimal packing claim is justified. A whole page exceeding the selected limits must reject explicitly without silently changing pagination, splitting publication or truncating data.

Capacity qualification must include one-head/many-chunk, many-head/few-chunk, all-unchanged/no-paid-work, multi-month conversation expansion, foreign batch closure, historical result projection, and max-escaped JSON inputs. If preserving C=8, add a512-vector point; if selecting C=4, record the deliberate compatibility change. No numerical production ceilings or memory measurements were chosen/executed in this review.

## Required focused proof before acceptance

1. Two independent connections with reciprocal reservation owners: nonblocking foreign locks yield without a persistent deadlock; no reservation/admission/cursor changes leak from the aborted attempt. Distinguish absent, locked and valid owner rows.
2. Claim/heartbeat/finish races against reclaim; generation change and earlier owner expiry; old dispatcher paused before CAS versus after committed admission. Assert actual synthetic outbound counts, including zero calls by a failed or replayed CAS.
3. Discovery frontier changes between passes: no late foreign-job lock acquisition, typed rediscovery, unchanged page and no new paid work.
4. Whole-batch unavailable/stale companion cases; if abandonment selected, prove old batch permanently cannot admit, current units repack across documents and superseded units never dispatch. Opposing reclaimers cannot place one semantic unit twice.
5. Ambiguous admitted B plus missing C causes zero new reservations/calls; mixed busy/received/reserved states do not weaken this whole-page rule. Same-owner already-admitted replay is still indeterminate.
6. Current dispatch owner retains complete `[A,B]` response after B advances; lost generation cannot retain it. An A-only current page consumes A; stale B publication fails. Independent page consumption and page/domain/cursor atomicity remain intact.
7. Boundary capacity checks include complete canonical counts, empty paid subset, request serialization bytes, foreign closure and projected historical results. Synthetic page tests establish64-input packing and selected concurrency without provider calls.

## Scope and evidence

Read both draft documents, Hub instructions, actual `bg-runtime.ts`, `job-effects.service.ts`, `embeddings.ts`, `with-org-core.ts`, job schema and corpus/job-wrapper batching seams. No tests or capacity experiment ran. Initial searches named nonexistent `bg-jobs.service.ts` and `pg-schema/jobs.ts`; corrected to `bg-runtime.ts` and `pg-schema/bg-jobs.ts`. Only this review file is authored.

Source identities: `bg-runtime.ts` SHA-256 `29eeb1cabdde2bc56bf2dc86284a01712812e3d47295b5d2f417e3290469e87f`; `job-effects.service.ts` `39b2776f77cc2befa57ededf45c26945038c00a7ee421196dfac713181db0190`. PLAN/packet hashes are in frontmatter. Existing single-head APIs, corpus/worker behavior and all seven proposed source files remain unchanged.

**Standards:** read-only boundaries and shared WIP preserved; review independence caveat stated. **Spec:** implementation remains gated on the concrete choices above. No new user permission requirement, generic orchestration store, worker migration or deployed-state assumption is introduced.
