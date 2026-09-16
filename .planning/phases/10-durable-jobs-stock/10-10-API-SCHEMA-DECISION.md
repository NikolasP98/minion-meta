# Corpus page effects: proposed API and schema contract

Status: amended draft for independent admission under D360-13. Root selected the numerical engineering limits and unsent recovery policy recorded below after the 54-scenario synthetic capacity experiment. This packet accompanies `10-10-PLAN.md`; both still require independent review and exact source admission. No source implementation, migration application, provider call, native lock-performance qualification or production memory ceiling is claimed. Root also selects the 16 MiB projected-result bound after the independent review below.

## Source basis and selected boundary

The preserved preflight is `10-REMAINING-HANDLER-DECISION.md`, appendix beginning at line78, SHA256 `ed9681cc1931091e6217c50c7b212fd53b081150621f6de775641f1fc4903856`. Its earlier unresolved response-retention choice is settled below; its worker/deployment qualifications remain.

| Current source | Relevant behavior and consequence |
|---|---|
| `minion_hub/src/server/services/brain-corpus.service.ts:1256` | Flattens changed chunks across prepared documents into64-input requests, normally four concurrent calls. A reconcile page selects25 conversation keys but can expand into multiple monthly documents;25 keys is not a25-document bound. |
| `minion_hub/src/server/services/brain-corpus.service.ts:1285` | Persists prepared documents/chunks and health within a page transaction. Source discovery, loading, terminal tombstones and some health updates occur in separate transactions; the existing whole pipeline is not one atomic transaction. |
| `minion_hub/src/server/services/brain-business-corpus.service.ts:1940` | Flattens a50-row source page into64-input requests, normally four concurrent calls. Chunk count per record is variable. |
| `minion_hub/src/server/services/brain-business-corpus.service.ts:1979` | Persists a page transaction with100-document,8-chunk and500-key SQL grouping. Exported non-job persistence remains a supported separate entry point. |
| `minion_hub/src/server/services/job-effects.service.ts` | Existing single-head cursor binding and whole-batch committed state cannot express one transport response consumed by differently overlapping pages. Keep these APIs unchanged. Reuse their owned job/RLS seam and the existing head identity. |
| `minion_hub/src/server/services/embeddings.ts:62` | Private preparation pins resolved endpoint/model/normalization/dimensions and actual payload; execution uses that same registered object. Hub normalization truncates each input at8000 characters. New code must reuse preparation/execution without exposing caller-forged prepared requests. |

For changed chunk counts `c_i`, current fresh-page calls are `ceil(sum(c_i)/64)`. Per-document calls would be `sum(ceil(c_i/64))`:25 one-chunk documents become1→25;50 become1→50;25 documents with65 chunks become26→50;25 conversations expanding to12 one-chunk months become5→300. These are synthetic arithmetic examples, not measured production distributions. Root rejected that multiplication as the default design.

The new foundation preserves 64-input cross-document packing for missing semantic units and page publication atomicity, with an explicit maximum of four active calls in this new API. Existing corpus configuration can allow up to eight and remains unchanged until separately admitted 10-06 adoption. Received overlap may reduce the number of missing inputs. Concurrent pages can fragment packing; no globally optimal packing or exactly-once remote execution claim is made.

## Identity and authority

1. A head remains the existing tenant/family/entity identity. A semantic unit is tenant + head identity + captured revision + full source manifest + stable chunk key + normalized input hash + provider/pipeline policy. It contains no job ID, page boundary, lease generation or transport position. Identical text in different entities or tenants does not deduplicate automatically.
2. A source manifest commits the entire ordered canonical chunk set, including unchanged or non-embedded chunks, sourceHash, chunking/pipeline version, mode, actual expected provider and applicable serving generation. Raw source bytes and canonical chunks remain distinct. Hashing only the changed subset is insufficient. A page descriptor additionally commits selected sources, original required units, their order and page key.
3. Semantic unit identity controls reuse; a transport receipt controls evidence that one exact ordered provider request returned; a page controls atomic domain publication and progress. None substitutes for the others.
4. Only the current dispatch job/lease generation may retain a returned transport response. Under root's chosen policy it may retain the **complete immutable response** even if one member head advanced. That response is historical evidence. Publication still requires every consuming page member's current head/revision/source/manifest and the current job owner. A stale dispatch owner cannot persist even a valid response. A superseded member cannot publish or be automatically retransmitted.
5. A reserved batch has durable membership but no permission to call the provider. It becomes remotely admitted in a committed owned transaction immediately before the single outbound attempt. An admitted request without a durable response is indeterminate. Never infer that the provider did not run. No timer, retry count, ready flag or newer page may turn admitted work back into missing work. Reserved recovery is a separate contract below; explicit recovery policy for indeterminate remote effects remains outside this child.

## Proposed constrained relations

All three relations belong to the shared job-effect foundation, use tenant FORCE RLS and retain history. They do not create another scheduler, provider client or vector-serving backend.

| Relation | Minimum fields and constraints |
|---|---|
| `job_effect_pages` | tenant/id; jobId; bounded pageKey; immutable descriptor/hash containing ordered source request references and required unit identities; mode/provider/generation; state bound or published; canonical completion cursor/progress on publication; timestamps. Unique `(tenant_id, job_id, page_key)`. Bind all descriptors before admission; page replay verifies immutable identity. No source text, credentials or vectors. |
| `job_effect_batches` | tenant/id; reservation owner job/generation; immutable dispatch job/generation once admitted; immutable exact provider descriptor and full ordered unit-ID membership snapshot/hash/count; state reserved, admitted, received or abandoned_unsent; nullable complete result; timestamps and bounded abandonment reason. Count 1..64 and 1,536-dimensional finite results using the existing result validator/storage-size contract. Transitions are reserved→admitted→received or reserved→abandoned_unsent. Reservation ownership may transfer only while reserved after proved prior-owner invalidation. Abandoned rows retain immutable original descriptors and membership snapshots forever in this child, have no dispatch identity/result and cannot become active again. Admitted/received identity, membership and received result are immutable. No global consumed state substitutes for individual page publication. |
| `job_effect_units` | tenant/id; existing headId plus head-kind discriminator; captured revision/sourceHash/manifestHash; stable chunk key; normalized payload and policy hashes; nullable paired batchId/vectorIndex; optional one-way first-publication marker. Immutable unique canonical semantic identity; unique non-null `(tenant_id, batch_id, vector_index)`; tenant-preserving foreign keys to head and current batch placement. Placement may be released only from a batch atomically tombstoned abandoned_unsent, then assigned to a fresh reserved batch under the recovery contract. Admitted/received placements never move. Historical revision is data, not a foreign key to the mutable current revision. |

Add a composite unique reference key `(tenant_id, id, kind)` on existing `job_effects`; unit headKind is constrained to `head`. Do not change any existing row kind, receipt state, single-head identity algorithm or API behavior. A page may bind required unit IDs before those units have transport mappings, so its immutable descriptor cannot require those mappings already exist.

Use authored SQL checks/transition guards and deferred membership validation to reject descriptor/count disagreement, missing or duplicate active indices, tenant mismatches, invalid vectors, result rewriting and unauthorized placement changes. Reserved/admitted/received batches must have exact dense current placements matching their immutable ordered snapshot at commit. An abandoned_unsent batch must have zero current placements, but retains its complete historical snapshot. Tombstoning and clearing every old placement occur atomically; only current units required by the new page are repacked, while other released units remain unplaced historical identities. Never omit companion units from the closure to make recovery fit a limit. A missing placement is not evidence that an admitted effect vanished: admitted/received placement mutation is forbidden.

Both-null or both-non-null batch/index fields are enforced. A prior non-null placement can be cleared/replaced only after the old parent is abandoned_unsent in this transaction; the new parent must be reserved with matching immutable semantic identity/index. Protect transitions from direct SQL as well as TypeScript; no DELETE permission, mutable tombstone or admitted→reserved reset is permitted. Reserved/abandoned rows have no dispatch identity/result; admitted/received rows require an immutable dispatch identity. Define guards with explicit search paths and review any elevated function privileges. Do not rely on `IF NOT EXISTS` as schema compatibility evidence.

Grant only the necessary SELECT/INSERT/UPDATE to the existing scoped application role. Do not grant broad `bg_jobs` access, DELETE privileges or cascading deletion of receipts. Direct SQL access within the trusted application process is not a plugin capability sandbox. Payload hashes reduce stored content but do not prove privacy against guessing; no privacy certificate is implied.

Candidate migration reserved by this packet only: `minion_hub/supabase/migrations/20260909090500_job_effect_page_batches.sql`. A read-only filename search on 2026-09-09 found 903/904 and no 905 or job_effect_page migration in the owning Hub migration tree. No SQL file was created. Recheck immediately before independently admitted creation. It is additive after 903/904, authored and unreleased only; existing applied files are not rewritten. An incompatible partial catalog must fail explicitly. Migration and typed schema must agree on names, keys, checks, grants and transitions.

## Proposed API contract

Names below are the admission proposal. Type aliases use existing `JobExecution`, `OrgScope`, `CoreTx`, `BgJob`, `JobEntity`, `ExpectedEmbeddingProvider` and `AdvanceResult`. Public inputs are runtime-validated and snapshotted; handles are identifiers that must be checked against the database, not claimed unforgeable capabilities.

Add to `job-effects.service.ts` only:

```ts
withOwnedJobScope<T>(
  execution: JobExecution,
  scope: OrgScope,
  operation: (tx: CoreTx, current: BgJob) => Promise<{
    value: T;
    nextProgress?: Record<string, unknown>;
  }>,
  options?: Readonly<{
    foreignReservationOwners: readonly Readonly<{
      jobId: string;
      reservationGeneration: number;
    }>[];
  }>,
): Promise<T>;

jobEffectHeadId(tenantId: string, identity: JobEntity): string;
```

The scope helper reuses current fenced execution ownership. Before switching role or taking any semantic/domain lock, its optional bounded owner references cause tenant-filtered foreign job rows to be prelocked nonblockingly under the original bookkeeping role. Sort and deduplicate actual job IDs; validate every referenced reservation generation. The own job is already locked and is never acquired twice. Use FOR UPDATE NOWAIT so a locked row is distinguishable from a missing row. Locked or still-valid reservation owners produce an internal typed busy error and roll back the outer transaction before the scoped operation. A missing tenant-scoped owner row produces a distinct owner_missing/recovery_required conflict, not an endlessly retryable busy result and not evidence authorizing reclaim. Preserve reserved state and require separately selected recovery; do not recreate an owner row. A generation mismatch, non-running status or absent/expired lease under the existing ownership clock proves that referenced reservation owner invalid while the row remains locked. Do not grant app_ledger access to bg_jobs or expose an arbitrary bookkeeping-role callback.

Then apply the existing scoped role/GUC transaction and save returned progress only after restoration in the same outer owned transaction. SQL failures preserve the original error and abort. The helper neither requires nor fabricates a single `__jobRequest`. Callers merge canonical cursor fields. Existing `withJobRequest`, `runJobEmbedding`, `commitJobEffects` and callers remain unchanged; this adds an opt-in helper, not a changed single-head cursor/locking contract. All new helper/error declarations remain in the listed job-effects.service.ts file; no runtime or RLS-helper edit is needed.

New `job-effect-pages.service.ts` exports:

```ts
type PageDomainGuard = (tx: CoreTx, current: BgJob) => Promise<void>;
type PageHandle = Readonly<{ id: string; manifestHash: string }>;
type PageUnitValue = Readonly<{
  sourceKey: string;
  chunkKey: string;
  unitId: string;
  vector: readonly number[];
}>;

loadJobEffectPage(execution, scope, pageKey: string): Promise<
  | null
  | { page: PageHandle; state: 'bound' | 'published'; descriptor: PageDescriptor }
>;
bindJobEffectPage(execution, scope, input: PageInput,
  validateDomain: PageDomainGuard): Promise<PageHandle>;
runJobPageEmbeddings(execution, scope, page: PageHandle,
  sources: readonly LoadedPageSource[], validateDomain: PageDomainGuard
): Promise<
  | { state: 'ready' }
  | { state: 'busy'; reason: 'owner_busy' | 'frontier_changed'; advance: AdvanceResult }
>;
commitJobEffectPage<T>(execution, scope, page: PageHandle,
  validateDomain: PageDomainGuard,
  publish: (tx: CoreTx, current: BgJob, values: readonly PageUnitValue[]) => Promise<T>,
  nextProgress: Record<string, unknown>
): Promise<{ replayed: false; value: T } | { replayed: true }>;
withJobEffectPage<T>(execution, scope, page: PageHandle,
  validateDomain: PageDomainGuard,
  operation: (tx: CoreTx, current: BgJob) => Promise<T>
): Promise<T>;
jobEffectPageAdvanceResult(execution, scope, page: PageHandle): Promise<AdvanceResult>;
```

`PageInput` contains pageKey, pipelineVersion, explicit embedded/disabled/qdrant mode, expectedProvider or null, servingGeneration or null, and ordered sources. Each source supplies family/entityId/sourceHash, complete ordered canonical chunks with stable keys/text, and the original required changed-unit keys. `LoadedPageSource` supplies that complete source again for payload verification; it cannot redefine persisted required units from a later cache comparison. `PageDescriptor` stores only bounded canonical descriptors/hashes/counts/request references and original selected unit IDs. Empty pages and sources are valid explicit cases, with zero transport receipts. Mode/provider/generation combinations must be validated, not silently normalized.

Typed capacity, conflict/supersession, ownership-loss and indeterminate errors remain distinct from retryable busy. A busy return includes a canonical incomplete AdvanceResult obtained after the failed attempt has fully rolled back; it preserves the persisted cursor, introduces no estimated progress and is returned by the later consumer to yield. Never throw ordinary contention through bg-runtime's generic failure path. A capacity violation is stable rejection, not a busy retry loop. Existing admission without a receipt is indeterminate even for the same owner. No internal unbounded rediscovery loop is added; a frontier change yields for a later caller attempt.

Binding a new page locks heads in sorted canonical ID order, validates actual current source rows through the database-only guard, then creates/reuses source-bound revisions and binds full manifests. Existing page binding verifies its captured references; it cannot advance heads from a stale prepared snapshot. Reusing a head with a conflicting full manifest fails; null plus historical single-head receipts is not evidence of a full manifest and fails conservatively. Newly discovered source changes may advance heads only after the current-source guard succeeds. Source identity and policy must be coherent across legacy/current job aliases. Root's later10-06 adoption decides the exact family/entity/policy mapping.

The host is responsible for proving current domain identity under locks, including watermarks/source rows used to prepare chunks, permissions, and any old vectors omitted from required work. A `ready` status alone does not prove current source content. The helper cannot discover corpus table policy from arbitrary hashes. All head locking precedes domain-row locking; callbacks must honor this order and perform no network work.

### Admission, response and publication order

1. Load an existing page first. A published page restores its recorded canonical completion through `jobEffectPageAdvanceResult`; it neither reloads dynamic source nor reruns domain publication. A bound page rehydrates exact source content and validates its complete manifests. Content unavailable or changed is a typed conflict/supersession, not a fresh automatic dispatch.
2. Perform bounded tenant-scoped discovery of **all** requested units and the complete companion/owner closure of any reserved batch requiring recovery. Received batches need selected-unit/descriptor evidence, not foreign-owner invalidation or current companion-head authority; admitted ambiguity stops the attempt. This is an optimistic snapshot, not invalidation proof. A capacity violation rejects the full attempt. Enter owned current job → nonblocking sorted foreign reservation-owner prelocks under bookkeeping role → scoped role → all current-page and unsent-recovery closure heads in sorted ID order → domain guard → page → sorted relevant batches → sorted relevant units. Re-read the exact frontier and all reservation-owner generation references. Any additional recovery owner/head/batch/member or changed placement/state causes rollback and a typed frontier_changed yield, never a late foreign lock. Existing received mappings are reusable. Valid foreign reservations produce busy before any missing reservation. Opposing reclaimers cannot wait on each other's job locks: an unavailable foreign row aborts the attempt nonblockingly.
3. In the same reservation transaction, safely resume exact reserved batches or abandon/repack them under the recovery rules below. Pack all currently missing/released required units across documents in canonical page order into 64-input requests, reserving **all** new batches/mappings atomically. No one-unit-per-reclaim dispatch. Prepare actual requests, synchronously compare expected provider and payload descriptors, and retain those private prepared objects unchanged. Bound the complete prepared page and revalidate all captured source manifests. Commit reservations before remote admission; no SQL locks cross a network call.
4. Immediately before each outbound attempt, use an owned transaction to recheck member/source authority and compare-and-set the batch from reserved, exact reservation owner/generation and descriptor to admitted with dispatch identity. Exactly one returned row **and successful outer commit** produce a private one-use dispatch permit. Zero rows, a replayed admitted row, a commit error or a stale/cancelled owner produce no permit. Recheck the caller signal immediately before using the same private prepared request; use single-attempt behavior and at most four active calls. A superseded member prevents admission. Cancellation before admission leaves an unsent reservation; after admission it can leave an indeterminate outcome even if no call followed. Observe already-running promises, stop later admissions and never reconstruct permission from durable admitted state. The commit-to-call ambiguity window remains explicit.
5. Persist a complete valid returned response using current dispatch job ID/generation and immutable admitted descriptor/membership. **Do not require current semantic member revisions at this response-retention step:** root explicitly permits historical complete retention after partial supersession. Do not permit a different job or reclaimed generation to complete old admission. Already received bytes are immutable. A persistence failure after provider success leaves indeterminate admission.
6. Publication locks current heads and rechecks every page source/manifest, domain guard, required mapping and received evidence. Project only selected vector indices, enforcing the cumulative SQL and application byte limits below before further copies. Then domain writes, applicable deletions, member consumption markers, page published state and canonical job progress commit atomically. If any source is superseded or a projection exceeds capacity, publish nothing; received evidence survives. Another page's consumed unit does not skip this page's callback. Only this same page's published state permits callback replay suppression. Superseded historical mappings confer no current authority.

`withJobEffectPage` is the DB-only guarded seam for page-scoped setup, failure/health and deletion actions; it cannot be used for unbound source discovery or to assert provider absence. Those adoption boundaries remain10-06 responsibilities. This child proves the foundation with synthetic domain tables; it does not claim corpus routing, legacy recovery or Qdrant publication has been adopted.

### Selected reservation recovery and conditional proof

Same-job takeover uses its already-locked current job row. A reservation already owned by this exact current job/generation may continue after exact descriptor revalidation without claiming that its own live owner is invalid; concurrent continuations still compete for the single admission CAS. Cross-job recovery uses the bounded foreign-owner prelocks above. For a reservation belonging to a previous owner, keep the old job row locked while establishing invalidation: the stored reservation generation differs, or that job is no longer running, or its lease is absent/expired under the existing ownership-clock semantics. A missing row or skipped lock is not invalidation evidence. A valid foreign owner is busy. Never change the foreign job's status/generation simply to reclaim one batch.

When all original members are current and their exact payloads are available, transfer a still-reserved batch with a conditional update matching old owner/generation, descriptor and state. Reprepare and validate the **complete** immutable ordered request before later admission. If a companion is superseded/unavailable or the new page needs a different subset, conditionally change only a still-reserved batch to abandoned_unsent, preserving its original snapshot. Clear **all** old placements in the same transaction, under the full bounded closure locks; repack only current required units into fresh batches. Do not require unavailable companion text to tombstone unsent work, but never admit that old descriptor without its complete payload.

The conditional state/owner match is mandatory on every transfer/abandonment. A concurrent old dispatcher that already committed admission makes recovery fail as indeterminate; one holding the foreign job lock makes the prelock return busy. If recovery wins first, the old reservation owner or old batch state no longer matches, so its admission CAS returns no permit. If the old dispatcher committed admission and paused before the network call, recovery cannot reclaim it even after lease expiry. This proves exclusion of new permission, not termination of an already permitted remote attempt.

Abandoned snapshots and admitted/received receipts are never rewritten. Semantic units preserve their IDs across repacking; immutable page descriptors refer to those IDs, not mutable unsent placements. Transaction rollback restores every old placement and reservation, so a partial abandon/repack cannot leak. The three-table design requires no fourth history table: original membership is the immutable batch snapshot, current placement lives on the unit, and each page's descriptor/published state records its consumption. These claims require direct SQL and multi-connection tests, not only service mocks.

## Selected capacity and projected-result contract

| Quantity at1536 dimensions | Exact arithmetic |
|---|---|
| One float32 vector |1536×4 =6144 bytes =6 KiB |
|64-vector transport response |64×6144 =393216 bytes =384 KiB |
|256 vectors |256×6144 =1572864 bytes =1.5 MiB |
|256 vectors in8-byte numeric slots |256×1536×8 =3145728 bytes =3 MiB before arrays/JSON/copies |
|256 requested units fetched as256 full64-vector batches |16384×1536×4 =100663296 bytes =96 MiB float32; reject this retrieval shape |

Root selected the following limits in D360-13 after reviewing `10-10-CAPACITY-RECEIPT.md` (SHA-256 `8f66f323fcbe0f027c4f08d69704fbf3cfc973bacafb83ad38bd16ae4db67a9f`). The two sequential probes completed 54 synthetic scenarios; the smaller-closure run peaked at 33.57 MiB additional heap and 53.03 MiB additional heap plus live buffers. The observations exclude actual provider parsing, SQL encoding, database contention and application concurrency. They are not production memory ceilings.

| Limit | Exact ceiling |
| --- | ---: |
| Current-page heads |64 |
| Complete canonical units, including unchanged/disabled |256 |
| Required units |256 |
| Full source UTF-16 code units, before normalization |2,097,152 |
| Full source UTF-8 bytes |6,291,456 (6 MiB) |
| Serialized canonical descriptor UTF-8 bytes |262,144 (256 KiB) |
| Prepared JSON per batch / per page |3,145,728 /12,582,912 bytes (3/12 MiB) |
| Inputs per new request / active calls |64 /4 |
| Foreign closure units / distinct foreign heads |1,024 /1,024 |
| Foreign batches / distinct owner rows |256 /256 |
| Serialized foreign metadata |1,048,576 bytes (1 MiB) |
| Historical selected vectors / dimensions |256 /1,536 finite numbers |
| Selected cumulative vector+metadata serialization |16,777,216 bytes (16 MiB), including array framing |

Count the full loaded source and canonical arrays before hashing/serializing additional copies; check lengths incrementally, with early return once a cap is exceeded. Count UTF-8 bytes without building a joined copy, and count actual escaped JSON request bytes, including model/metadata framing. Bound descriptor field strings before serializing the descriptor. Disabled/empty-required paths cannot bypass canonical/source limits. Fetch foreign closure with bounded fields and limit+1, and reject the entire oversize closure; no truncation or partial reservation.

The selected 16 MiB cumulative **selected** result limit covers vector values and publication source/chunk/unit metadata, not entire historical batches. Under current owned page/head/batch locks, first execute a SQL scalar-size pass over at most 256 exact vector-index projections: sum `octet_length(projected_object::text)` plus array separators/brackets. If count, shape or total exceeds the limit, return only scalar rejection evidence; no selected vector payload reaches the application. Only after that size pass succeeds may the query return those same selected objects, preferably serialized text so the application can validate bytes before parsing. The immutable received rows and same-transaction locks keep both passes consistent. The return query must itself be conditioned on the bounded total, or equivalently reuse a materialized bounded selection with an explicit size predicate; it must never return the full result column for client-side slicing. Native tests inspect actual query results to prove that oversized selected payloads do not cross this boundary.

Accumulate actual UTF-8 bytes again at the application boundary before parsing or allocating publication copies. Validate at most 256 vectors, exact dimensions and finite converted numbers. If canonical application serialization expands relative to PostgreSQL text, enforce the same 16 MiB cap incrementally before another aggregate/publication copy or callback. Reuse validated values/strings instead of building duplicate vector graphs. The scalar SQL pass can still cause PostgreSQL to inspect stored JSONB internally; this is a result-return bound, not a database working-memory guarantee. Direct response retention still keeps the original complete admitted batch (at most64 vectors), independently of whether a later page projection is rejected.

Existing 4,000,000-byte `pg_column_size` validation is a JSONB storage guard, not this UTF-8 wire bound, and neither bounds the existing provider `res.json()` allocation. Before-provider-response-read limits and source-query/pre-materialization limits remain phase15. This child rejects oversized already-loaded input before new copies/admission, and oversized projected results before application return/copies. It does not silently split pages, truncate sources, change pagination or multiply requests per document. Expanded 25/50-source corpus pages can exceed the limits; later10-06 must return an explicit capacity outcome until its recovery policy is selected.

## Required native and outbound-attempt matrix

All new native cases belong to the single listed `job-effect-pages.sql.integration.test.ts` and actual authored903/904/905 schema. Prove distinct live `pg_backend_pid` values, explicit disposable marker and separate connections. These are future acceptance cases; none ran while amending this packet.

| Review concern / case | Required observation |
| --- | --- |
| R1 reciprocal current/foreign job ownership | Nonblocking prelocks yield without persistent reciprocal wait; missing/locked/live owners are not treated as dead. No cursor/reservation mutation survives busy. Heartbeat, generation and finish races produce one valid owner result. |
| R1 frontier grows or placement changes | Entire attempt rolls back; no foreign job lock is acquired after semantic heads. A later invocation rediscovers the complete bounded frontier. |
| R2 unsent[A,B], unavailable/supersededB, new[A,C] | Conditional abandonment preserves[A,B] snapshot, removes all its active placements and packs current[A,C] together. No paidB attempt; direct SQL cannot reactivate tombstone or move admitted/received placements. Injected transaction failure restores every old placement. |
| R2 same-job/current-owner continuation and takeover | Exact current reservation can continue; new lease generation can reclaim unsent work; old generation's CAS cannot dispatch. Foreign active owner stays busy. |
| R3 batching/concurrency |1,64,65,256 missing units produce1,1,2,4 requests across document boundaries; at most4 active. Reuse may reduce calls. Existing legacy configuration remains untouched. |
| R4 canonical input and modes | Exact and limit+1 current heads, full canonical counts, unchanged/disabled text, UTF-16, UTF-8, surrogate boundaries, escaped body bytes and canonical descriptor sizes. Zero-required paths still reject oversize input before new serialization/admission. |
| R4 complete foreign closure | Count all companion units, distinct heads, batches, owners and metadata bytes. Test1,024/1,025 units and heads,256/257 batches/owners,1 MiB boundary. Oversize rejection returns no partial reservation or truncated closure. Shapes impossible under another earlier cap are rejected at that earlier cap; direct validator/SQL cases still cover each independent bound. |
| R4 projected results | At most256 exact indices; no whole historical result returned. SQL scalar pass rejects >16 MiB selected vector/metadata text before payload return; exact-boundary cases fit. Use high-precision finite PostgreSQL numeric representations where needed to exercise this gate separately from JS number formatting. Application UTF-8/finite/count checks run before parse/copy/publication; received history remains on rejection. |
| R5 busy versus indeterminate | Mixed received/reserved/busy overlap yields canonical incomplete progress without terminal failure. AdmittedB plus missingC makes no new reservation/call; same-owner admitted replay is still indeterminate. |
| Dispatch permit replay | Paused before CAS versus after admission commit; zero-row update; transaction rollback/commit failure; repeated API call and stale owner. Only one successful transition/commit can issue one synthetic outbound attempt. No commit-to-call automatic recovery. |
| Response versus publication | Current dispatch owner retains complete[A,B] response afterB advances; stale lease cannot retain it. CurrentA-only page can consumeA; staleB page cannot publish. Distinct consuming pages each publish atomically; same published page alone skips its callback. |
| Tenant and compatibility | Cross-org head/batch/unit links denied, no broad bg_jobs grant, exact role/GUC restoration before canonical progress, original SQL errors retained. Existing single-head903/904 rows and caller behavior stay unchanged. |

Source allowance remains exactly seven files: the existing job-effects schema reference key and additive service helpers; new page schema/service/unit test/native test; and new905 migration. No worker, embeddings, bg-runtime, existing fixture, package, lock or configuration edits belong to this child. Root admits the disposable test lane separately after fixture review.

## Worker remains a separate governance child

Canonical worker ownership is `minion/services/brain-vector/`, as specified by `specs/2026-07-22-self-hosted-qdrant-brains-architecture.md:132`. Hub-only native DDL is incomplete for the qdrant mode: the worker's `sql/001_brain_vector.sql:241` replaces the trigger and enables null-vector UPSERTs, after Hub's July23/25 outbox/generation migrations. This proves an authored owner chain, not which migrations or flags production applied.

Worker `src/worker.ts:147–215` keeps newly embedded vectors in memory, then writes Qdrant and acknowledges; failures can requeue and pay again. `src/worker.ts:236` retries up to configured attempts. `sql/001_brain_vector.sql:364–432` reclaims expired running work and ACKs by desired revision/state without a changing claim generation; desired revision is source version, not claim ownership. No durable provider-response receipt or heartbeat across a long materialization batch is established. The existing worker can consume stored PostgreSQL vectors; `embedMissing` is a separate configured mode and is not equivalent to Hub's8000-character normalization. No deployed mode is inferred.

A future worker child should first inspect `src/worker.ts`, `src/embedding-client.ts`, `src/outbox.ts`, `src/types.ts`, their owning tests, `src/database-migration.ts`, and `sql/001_brain_vector.sql`. Its bounded objective would be claim-owner/generation fencing, lease maintenance, provider admission/result retention, exact normalization/mode compatibility, and Qdrant-write/ACK recovery. It needs a reviewed forward migration and migration-runner/RPC compatibility contract; do not rewrite an already applied001 or assume the current migration runner supplies a version ledger. Qdrant remains an external effect requiring its own stale-write qualification. No worker source, role change, mode cutover or deployment is authorized by10-10.

## Admission questions and limits

Root has selected input/closure constants and cross-job unsent recovery, and this packet records the candidate905 reservation. Independent review must still admit the seven-file helper/schema contract, proposed16 MiB result ceiling, SQL transition enforcement and exact API. No additional runtime ownership is proposed: foreign prelocking is an option on the new helper inside the already listed job-effects.service.ts. If implementation cannot satisfy these invariants in that scope, stop at the exact seam and request a reviewed amendment rather than adding a store or weakening authority. Native tests must establish the concurrency claims.

Provider outcomes without receipts, historical retention growth/GC, before-load/provider-read bounds, corpus-specific legacy recovery, production migration compatibility, driver fault qualification, and Qdrant worker governance remain open. Cross-job recovery is specified here but remains unimplemented/unqualified. Implementation must add exact-site `TODO(handoff)` comments and send proposal text to root's ledger for every remaining gap. This packet itself does not close JOB-01/JOB-02 or phase10.


## Root independent review and source selection

Root reviewed the amended packet, seven-file PLAN and probe source independently of their author. Select the16 MiB cumulative projected-object bound with SQL scalar-size gating before return and incremental application byte validation. Select NOWAIT owner locks to distinguish contention from a missing row. Missing owner is a structural recovery-required conflict; it does not authorize reclaim or silently retry forever. This narrows automatic unsent recovery to reservations whose previous owner can be proved invalid under the selected lock protocol. No historical owner reconstruction is invented.

Native tests must distinguish locked/live/missing/foreign rows and preserve the entire page on every rejection. Existing rollback tests use ordinary SQL/deferred-constraint errors; no driver replacement, backend termination or previously rejected fault injection is admitted. Exact source implementation is admitted by the matching root PLAN gate. Native execution still requires review of the authored fixture and disposable-lane command/config. No production or corpus/worker adoption follows.


### Page completion is not job completion

Root selects jobEffectPageAdvanceResult as always done:false, carrying the persisted completion cursor for a published page or canonical current cursor otherwise. A busy result is also done:false. Page publication suppresses only that page's repeated domain callback; later10-06 controls whether the full corpus job has reached its end. Do not fabricate completion percentages or discard unrelated canonical progress fields.


## Root actor-context amendment

The existing server-side SQL boundary is trusted: organization GUC plus SET LOCAL ROLE prevents accidental unscoped access, not arbitrary malicious SQL from the privileged login. The new actor GUCs are likewise writable labels, never authentication credentials. Within that boundary, admit transaction-local app.job_effect_job_id, app.job_effect_lease_generation and a bounded app.job_effect_prelocked_owners manifest around the domain callback in withOwnedJobScope. Preserve/restore previous values, including nested calls; original SQL errors remain primary and the outer transaction must roll back. No new bg_jobs grants to app_ledger.

The manifest contains only exact validated owner refs actually locked by the helper, at most256 input refs, deterministically ordered, and at most128KiB serialized UTF-8. Reject capacity before installing context or writing domain state; build bounded known-data records and account escaped JSON bytes before aggregate construction. This is an additional defensive context limit, not a production throughput target. Current actor is already locked separately.

The905 actor guard is immediate, not deferred: deferred triggers cannot depend on restored actor GUCs. It validates exact tenant/live actor job/generation and appropriate OLD/NEW ownership, then requires every foreign owner being rechecked to be in the declared prelocked manifest before any foreign-row lock. Use bounded parsing, fixed search_path and fully qualified references, no PUBLIC direct execution authority, and NOWAIT owner rechecks. The real helper's lock order remains current job, bounded foreign jobs, then heads/domain. An arbitrary SQL caller can forge GUC/manifest values; strict proof of preheld row locks and actor authentication against such a caller is explicitly outside this trusted-service contract. Do not claim those properties from a copied job/generation. Native direct-SQL tests still must prove stale/foreign/absent-context denial, immutable transitions and exact tenant isolation under the defined role boundary.

Independent review is recorded in10-10-ACTOR-REVIEW.md. This amendment remains within the owned helper/new905 migration and related owned fixtures; it introduces no general security-definer API, broad grants or extra file authority. Native execution remains separately gated.


Root descriptor representation clarification: the256KiB persisted descriptor limit uses actual PostgreSQL jsonb::text bytes, including its structural spaces. Keep the compact-JS preflight for early allocation rejection, then obtain scalar octet_length of the bounded descriptor cast tojsonb before page INSERT and emit typed capacity on excess. If current descriptor construction requires head/binding writes inside the still-owned transaction, rejection must roll back all of them; claim zero committed effects, not zero attempted SQL statements. Exact262144/262145-byte native fixtures must show priorheads, page andcursor unchanged on rejection. Reuse database serialization; no hand-written equivalent serializer, raised constraint or partially committed repair.
