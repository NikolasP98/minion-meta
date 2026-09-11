---
phase: 10-durable-jobs-stock
recorded: 2026-09-09
status: selected_for_draft_planning
execution_ready: false
requirements: ["JOB-01", "JOB-02"]
root_decision: "Shared entity-head revisions for all five remaining job types; durable paid-result receipts for embedding jobs; finance retains nextChunk progress."
---

# Remaining handler ownership decision

Root selected the shared revision/receipt approach after source inspection. This note records the design boundary for four draft child plans. It does not admit their source scopes, apply a migration, close JOB-02 or establish deployment.

## Current source evidence

| Boundary | Source | Consequence |
|---|---|---|
| Owned job transaction | `bg-runtime.ts:227` | Checks job tenant, lease generation, running status and lease after locking; does not establish domain RLS role/GUC scope. |
| Domain RLS | `db/with-org-core.ts:57` | Sets app_ledger, organization and profile in a new transaction. Nesting this around an already-owned transaction would split authority and domain writes across connections. |
| Statement import | `finance-statements.service.ts:199,337,370` | Fetch occurs inside the transaction; chunk cursor CAS is not checked; undo/retry resets the same cursor without a durable request revision. |
| Brain ingest | `brains.service.ts:292,350,381,751` | Add/reset enqueue separately; removal does not invalidate old work; loading/embedding and later status/chunk writes do not use JobExecution. |
| Shared embeddings | `embeddings.ts:55` | Internal retries cover transport errors, transient HTTP and invalid responses; timeout-only signal and backoff ignore job cancellation. |
| Conversation jobs | `brain-corpus-jobs.service.ts:265,343,344` | One implementation registers current conversation and legacy WhatsApp types; failure/progress paths require revocation-aware handling. |
| Conversation effects | `brain-corpus.service.ts:1285,1434,1476,1546,1653` | Setup, embedding, publication, failure, deletion and source health require ownership propagation beyond the job wrapper. |
| Business jobs/effects | `brain-business-corpus-jobs.service.ts:99,138`; `brain-business-corpus.service.ts:1979,2092,2146` | Domain cursor/failure progression and nested setup/persistence/deletion catches must share the same ownership contract. |
| Qdrant selection | `brain-corpus.service.ts:1291` | Existing conversation path checks the active database generation and delegates embedding. Keep this check and worker ownership intact. |
| Schema authority | `db/pg-schema/brains.ts:72`; `supabase/migrations/20260721210000_unified_brain_corpus.sql` | brain_documents has no private receipt column; local schema declarations and canonical Supabase DDL/RLS/grants must agree. |

All service paths in this note are relative to `minion_hub/src/server/services/`; `db/` is relative to `minion_hub/src/server/`. Migration paths are relative to `minion_hub/`. Line numbers identify the inspected candidate and may move.

## Options and selected boundaries

| Option | What it proves | Cost or shortcoming | Disposition |
|---|---|---|---|
| bg_jobs cursor only | Same-job progress/takeover checkpoints | Does not arbitrate duplicate jobs or explicit reset/reingest; finance cursor returns to zero after undo. | Rejected as full closure. |
| Private domain-specific receipts | Domain-local effect persistence | brain_documents needs new schema anyway; duplicates lifecycle logic and requires protected metadata boundaries. | Not selected. |
| Shared table with entity heads and effect receipts | Durable request arbitration across jobs plus recorded embedding admission/result/commit | Requires an additive schema/RLS migration, migration qualification and adoption in every downstream write path. | Selected by root. |

Finance uses an entity-head revision to invalidate old jobs on undo/retry. Its existing nextChunk, counters and import/source-row uniqueness remain the deterministic effect/progress checkpoint. It does not create paid-response receipts. Root accepted this addition after the reset-to-zero ABA was identified.

Paid embedding units use admitted, received and committed states with an exact source/configuration/request descriptor. A provider outcome without a durable response receipt is indeterminate; it does not prove the provider did nothing. Such work cannot automatically repeat. Received batches can be reused without paying again, and final publication/progress/receipt completion is atomic. This is not distributed exactly-once execution or billing deduplication.

The shared receipt identity uses a canonical semantic family/entity/unit, not the job id, lease generation or raw scheduling type. In particular, existing JobExecution.effectKey includes the job type; directly using it for current versus legacy corpus types would create separate identities for the same semantic work. The shared service must canonicalize this boundary.

## Transaction and security contract

1. Running work locks its job row, then entity head, then domain/receipt rows in a stable order. Authorized user reset/removal locks head then domain and can enqueue the new job in the same transaction; it does not lock an old running job after the head.
2. A helper reuses the existing transaction while setting app_ledger and tenant/profile GUCs for domain and receipt SQL. It captures and restores prior role/GUC values before job cursor/enqueue work. Restoration on a usable transaction must run after callback failure; a SQL-aborted transaction must retain its original error.
3. Do not grant app_ledger broad bg_jobs authority. Prove restoration permits finalization and that pooled connections do not inherit another tenant, profile or role.
4. No database locks span file/provider calls. Check current ownership and revision at admission, received-result persistence and final publication. A cancelled request already sent remotely cannot be undone by this contract.
5. The receipt table has constrained row kinds, state and unique identities, explicit service grants and FORCE RLS. Public callers cannot gain authority by supplying a receipt key or revision. Retain receipt hashes and required vector results only; no API keys or raw source payloads.
6. Pin the actual resolved provider/model and transmitted normalized payload before admission. Job calls have one explicit outbound attempt; default non-job embedding behavior remains compatible and receives signal-aware waiting. Preserve usage recording and vector validation.
7. Corpus source fingerprints and canonical manifests prevent overlapping page/batch schedules from inventing different paid identities. Reject obsolete prepared work before publication. Preserve the defined observed source snapshot without promising zero lag after later source changes.

## Draft execution sequence and exact ownership

| Order | Draft | Owned source/test files | Boundary |
|---|---|---|---|
| 1 | [10-07](10-07-PLAN.md) | with-org-core.ts/test; new pg-schema/job-effects.ts; new 20260909090300_job_effect_receipts.sql; new job-effects.service.ts/test/native integration; embeddings.ts/test | Nine files: shared revision/schema/RLS/receipt and explicit outbound-attempt foundation. |
| 2, parallel | [10-04](10-04-PLAN.md) | finance-statements.service.ts/test; new finance-statements.effect-ownership.sql.integration.test.ts | Three files: deterministic import, failure, undo/retry and progress adoption. |
| 2, parallel | [10-05](10-05-PLAN.md) | brains.service.ts/test; new brains.effect-ownership.sql.integration.test.ts | Three files: document lifecycle, URL cancellation, embedding batches and atomic publication. |
| 2, parallel | [10-06](10-06-PLAN.md) | brain-corpus-jobs.service.ts/test; brain-corpus.service.ts/test; brain-corpus-empty-source.service.test.ts; brain-business-corpus-jobs.service.ts/test; brain-business-corpus.service.ts/test; new brain-corpus.effect-ownership.sql.integration.test.ts | Ten files: three registrations and all downstream setup, embedding, deletion, health, failure and progress effects. |

Exact absolute-from-meta paths are listed in each PLAN frontmatter. Each implementation also writes its own SUMMARY. Foundation ownership freezes before adoption; adoption plans consume it read-only. Numeric plan order does not override dependency order. No bg-runtime, package/lock, route, UI, source parser, gateway or Qdrant-worker file is included.

The migration name was checked against the current tree; 20260909090100 and 20260909090200 are already used. Root must reserve 20260909090300 before admission and recheck concurrent additions.

## Qualification and remaining gates

- Root independently checks/adopts exact plan hashes before implementation. No source work was performed during this drafting task.
- The marked fixture must execute real two-connection RLS/revision/race tests. Brain/corpus publication needs actual pgvector; an unavailable extension or a vector-text substitute leaves that acceptance pending.
- Qdrant-mode database qualification needs the actual generation function/trigger migrations. It does not require or authorize a live Qdrant deployment.
- Intentional backend loss must wait for 12-04's actual query-settlement repair. An expected postgres null-socket crash is not healthy runtime evidence.
- Legacy queued work needs bounded revision adoption or explicit rejection. An old job cannot silently bind to a newer reset/reingest request.
- Indeterminate remote recovery policy and receipt retention duration remain explicit follow-up decisions. Preserve evidence and stop automatic paid replay; do not invent destructive cleanup or a retry UI.
- Root owns existing registration/runtime TODOs and the matching proposal ledger. New open ends discovered during execution require exact-site TODOs and proposal text. Known blob-upload cleanup, broad semantic-search governance, worker activation and deployed schema qualification remain outside these child scopes.

## Appendix: corpus batching and worker reuse preflight, 2026-09-09

**Status: recommendation for root review; not an admitted implementation.** This appendix preserves the earlier decision record. That record describes the initial foundation proposal; 10-07 and 10-09 now supply the shared head, manifest and receipt APIs. The ten-file 10-06 adoption remains gated on the decisions below. Root rejected per-document request multiplication as the default optimization. No source, database, provider, worker mode or deployment was changed during this preflight.

### Recommendation and mode boundary

Preserve the existing Qdrant-owned conversation path and qualify its actual database trigger chain. For the existing Hub-owned embedding modes, draft a narrow extension of the shared job-effect foundation that maps canonical chunk units to immutable cross-document transport batches. Do not make the existing worker the universal embedding owner as part of 10-06: its provider outcome, cancellation and claim semantics do not yet meet JOB-01/JOB-02, and it does not persist newly generated vectors back into PostgreSQL for the pgvector mode.

| Source-supported mode | Current behavior | What is not established |
|---|---|---|
| Conversation, `BRAIN_VECTOR_STORAGE_MODE` other than exact `qdrant`, embeddings configured | Hub embeds changed chunks across the prepared page and persists pgvector; conversation service lines 1256–1395. | Actual deployed flag, provider and migration catalog were not inspected. |
| Conversation, exact `qdrant` | Hub skips embeddings, checks `brain_vector_app_generation_mode()`, writes canonical text/chunks and relies on the outbox worker. Health uses serving-generation receipts; lines 1268, 1293–1301, 1398–1425. | Worker enabled/credential/collection readiness and actual RPC installation are operational prerequisites, not consequences of the flag. |
| Conversation, pgvector path without configured embeddings | No provider request; changed chunks may remain without vectors and documents/source stay pending/queued. | Moving this mode to asynchronous worker embedding would change its behavior. |
| Business, embeddings configured | Business service always embeds changed chunks in Hub; lines 1940–1966. It has no Qdrant-mode branch. | A single embedding owner across business and conversation is not currently implemented. |
| Business, embeddings unavailable | Changed vectors remain absent and document/source pending/queued behavior is retained. | The worker cannot silently substitute for an intentionally unconfigured Hub provider. |
| Worker, `BRAIN_VECTOR_EMBED_MISSING=false` | Uses supplied canonical vectors; missing vectors are a permanent error. | This is the code default, not evidence of deployment selection. |
| Worker, `BRAIN_VECTOR_EMBED_MISSING=true` | Generates missing vectors, batches within each organization, sends points to Qdrant; ACK records serving receipt and may release PostgreSQL vectors in active Qdrant mode. | No durable paid-response receipt or universal pgvector write-back exists. |

The Hub prepares each embedding input with `text.slice(0, 8000)` and records normalization `embedding-text-v1` (`embeddings.ts:63–85`). The worker sends the complete input strings (`embedding-client.ts:40–55`). Conversation chunk text is bounded at 6000 characters, but the relationship context can add another 6000 before the account/chat header. These paths are therefore not automatically equivalent provider payloads. Provider endpoint/model and normalization must remain explicit when assessing reuse or a future cutover.

### What the worker actually guarantees

Paths in this subsection are under `minion/services/brain-vector/` unless qualified otherwise.

| Boundary | Source evidence | Consequence for reuse |
|---|---|---|
| Cross-document batching | `src/worker.ts:147–162,188–204` groups missing vectors across claimed chunks in one organization. `src/config.ts:264–276` defaults claim size to 256 and embedding batch size to 64; embedding batch size permits 1–256. | Reuses efficient grouping, but does not preserve Hub's exact 64-input ceiling without explicit configuration/contract. Materialization batches run sequentially, unlike Hub's bounded concurrent groups. |
| Durable remote result | `worker.ts:147–160` copies jobs and attaches vectors only in memory. `:204–215` catches materialization failures; `:246–259` retries Qdrant/ACK failures. | Provider success followed by another batch failure, Qdrant failure, ACK failure or process loss can cause another embedding request on a later claim. No received-vector checkpoint separates these outcomes. |
| Provider attempt | `embedding-client.ts:40–99` makes one HTTP request per call, validates result indices/dimensions, and converts network/HTTP/JSON failures into a service error. | One HTTP call inside a method is not one durable paid attempt: the worker later requeues the outbox rows. Transport loss is not classified as indeterminate. |
| Retry budget | `worker.ts:236–243` retries with jitter and dead-letters at the configured maximum; `config.ts:268` freezes that maximum at eight. | This is retry-oriented serving convergence, not the foundation's stop-on-indeterminate paid-effect policy. |
| Claim ownership | `sql/001_brain_vector.sql:364–395` claims queued/expired rows, increments attempts and records owner/expiry. ACK at `:410–432` checks chunk/generation/desired revision/running status, not claim owner or lease generation. Hub base retry/dead-letter RPCs have the same desired-revision boundary. | A stale worker can still acknowledge or retry a reclaimed row when desired content revision did not change. Desired revision and claim generation are different identities. This is a source finding, not an observed deployed incident. |
| Cancellation and long calls | `worker.ts:465–497` observes the process signal around loops and delays, but `processBatch()`/materialization receive no signal. `embedding-client.ts:54` uses only a timeout. No heartbeat method appears in the store interface. | Process cancellation does not currently fence subsequent provider work inside an active batch. Default four sequential 60-second embedding waits for a 256-chunk claim can exceed the default 120-second claim lease, before Qdrant time is included; this is an arithmetic exposure, not measured timing. |
| Serving repair | `worker.ts:310–344` compares Qdrant fingerprints during reconciliation before materializing missing/stale points. | Helps eventual index repair. It is neither a provider receipt nor a transactional guard on an already-dispatched stale Qdrant write. |

The existing worker unit tests cover desired-revision supersession, per-organization materialization and claim-attempt retry accounting. They do not supply evidence for durable provider-response recovery or same-content claim-generation fencing. No worker tests were run in this read-only preflight.

### Canonical database chain and ownership

The root architecture spec `specs/2026-07-22-self-hosted-qdrant-brains-architecture.md:132–135` identifies `minion/services/brain-vector/`. Its README describes the migration-only `migrate` command and guarded storage-mode selection. The actual upgrade is `minion/services/brain-vector/sql/001_brain_vector.sql`, SHA-256 `45a4e1143843d3685b8cfa8f6e73b653b0e9a98d1f0d470c429aecca629aefc6` at inspection.

The fixture must compose the canonical brain/unified-corpus tables with Hub `20260723010000_brain_vector_outbox.sql`, the later Hub Qdrant ownership/receipt RPC migrations (`20260725030000`, `20260725183500`, `20260725193500`, `20260725195000`), and the worker upgrade. Applying the current Hub files followed by the current worker upgrade gives the worker's final trigger/RPC definitions; verify the actual installed definitions and grants rather than inferring them from filenames. Lease/receipt/manifest migrations 901/903/904 remain separate required inputs to job-effect tests.

**Correction to the initial Hub-only finding:** Hub's base trigger at `20260723010000:120` ignores inserted null-vector chunks. Worker `001:241–329` replaces it and explicitly enqueues text-only Qdrant chunks at line 285. A Hub-only fixture is incomplete; this does not establish a broken deployed runtime. The worker upgrade also changes claim signatures and reconciliation cursor RPCs, so copying only its trigger is not qualification of the current worker contract.

Worker `001` has two explicit transactions (lines 1–220 and 222–664), security-definer search paths, and role/membership hardening (lines 8–49). Root must review fixture namespace adaptation, transaction boundaries and disposable role provisioning before executing it. Preserve FORCE RLS and least-privilege grants; do not edit real roles, enable a deployed generation, or substitute an always-true app RPC. A representative corpus fixture also needs actual messages/CRM relationship/business tables: Hub's migration runner explicitly documents that its migration tree is partial (`minion_hub/scripts/db-migrate.ts:4–11`). Schema declarations alone do not prove that baseline catalog.

### Page size, chunk distribution and arithmetic

Conversation job reconcile uses 25 conversation keys (`brain-corpus-jobs.service.ts:22,317`), not 25 monthly documents. `scanConversationKeys:887` pages channel/account/chat tuples; `normalizeConversationSegments:462` expands all loaded months. Dirty work processes one conversation, possibly multiple hinted months or its entire history. Business jobs use 50 records from one table (`brain-business-corpus-jobs.service.ts:23,106`; business `loadBusinessPage:1821`). Generic non-job helpers retain their own defaults and allow limits up to 500.

Both Hub embedding implementations concatenate changed chunks across their prepared page, form batches of 64, and process groups with default concurrency 4, clamped to 1–8. Neither normalizer caps total chunks per source document; conversation page size also does not cap monthly documents. Chunk text is bounded at 6000 characters, which does not bound total page memory, input count or provider requests.

For changed-chunk counts `c_i` of the canonical documents in one page, current requests are `R_page = ceil(sum(c_i) / 64)`. Per-document requests would be `R_doc = sum(ceil(c_i / 64))`, with zero changed chunks contributing zero. For `D` nonempty documents, `R_page <= R_doc <= R_page + D - 1`.

| Synthetic page, unchanged payloads | Current requests | Per-document requests |
|---|---:|---:|
| 25 monthly documents, one changed chunk each | 1 | 25 |
| 50 business records, one changed chunk each | 1 | 50 |
| 25 documents, 65 changed chunks each | 26 | 50 |
| 25 conversations, 12 one-chunk months each | 5 | 300 |

These are exact arithmetic examples, not production distributions or cost estimates. Root rejected this request multiplication as the default. Current foundation `withJobRequest:271` additionally requires the job cursor's one bound request to match: it cannot simply parallelize different document heads inside one job. Retaining a concurrency ceiling does not prove unchanged utilization.

### Options after rejecting per-document request multiplication

| Option | Batching and compatibility | Ownership/publication work | Disposition proposed to root |
|---|---|---|---|
| Route both corpora through the existing worker | Cross-document batching already exists. Requires business mode-aware delegation; cannot preserve current Hub pgvector persistence/completion or disabled-provider behavior automatically. | Requires worker paid-result receipts, claim fencing, cancellation/heartbeat, and possibly PostgreSQL write-back. Qdrant writes remain externally nontransactional. | Separate future convergence decision, not the smallest 10-06 repair. Preserve existing Qdrant path while documenting its remaining governance limits. |
| Per-document canonical batches | Simple semantic identity but can multiply requests and reduce parallel utilization. | Per-document commits plus durable within-page progress; changes current page visibility. | Rejected as default by root. |
| Shared semantic units mapped to transport batches | Keep page-sized grouping and batch ceiling. Overlapping pages reuse available unit results, and only missing units are packed into new requests. | Add narrowly scoped multiple-head transactions and durable membership/index mappings alongside existing shared receipts. Preserve page domain/progress transaction. | Recommended next draft, pending exact schema/API admission and failure-policy decisions. |

### Minimum shared extension contract to draft

This is a design boundary, not permission to edit the foundation or introduce a second scheduler/store. Continue using the existing PostgreSQL job-effect ownership, tenant scope, manifest policy, private request preparation and vector validator. Do not duplicate provider execution in the corpus services.

1. **Separate semantic identity from transport grouping.** A semantic unit identifies tenant, canonical family, source document/month/record revision, stable chunk key, canonical normalized payload and provider/pipeline policy. It excludes job type/id and page boundary. A transport receipt identifies the exact ordered request actually sent. Include the full per-document manifest so a different complete source policy cannot borrow a common-prefix admission. Do not use mutable randomly generated document UUIDs as the sole semantic key.
2. **Add durable membership, not another vector cache.** Keep one immutable batch result in the shared receipt mechanism. Add a constrained membership relation in the same foundation mapping each uniquely admitted semantic unit to batch receipt plus vector index. Unique semantic-unit identity prevents a second page from admitting that unit in a different transport batch. Tenant-constrained references, valid index/count relationships and FORCE RLS are required. The precise relation name/DDL and whether it is a companion table or new constrained row kind need independent admission; do not overload `legacy_job_id` or pretend the current single-entity effect schema already represents it.
3. **Use a bounded multiple-head operation.** Validate the current job/page binding, lock the required semantic heads in a deterministic order, revalidate source fingerprints/manifests and inspect memberships in one short existing-transaction RLS scope. Restore role/GUCs before job progress. Do not nest independently committing `withOrgCore` calls or weaken current single-request validation for existing callers. Setup, terminal deletions and health/failure paths also need the relevant authority; adding an embedding-only wrapper is incomplete.
4. **Admit only unresolved units with no earlier remote admission.** Existing received/committed unit mappings provide vectors by their recorded batch index. Existing admitted membership is indeterminate and must prevent automatic retransmission, even if the requesting page contains additional new units. Inspect the complete requested set before creating new admissions so a known ambiguous overlap does not trigger avoidable paid work elsewhere on the same page. Pack remaining missing units into at most 64 inputs per request, respecting the existing concurrency ceiling. Pin the actual prepared body/provider before admission and dispatch that same private request once.
5. **Preserve receipt evidence and distinguish publication consumption.** Persist a complete validated provider result under the actual admitted batch identity and current dispatch ownership. Publishing one page that consumes a subset must not mark unrelated members published or make another page skip its domain writes. Membership consumption and complete domain publication/progress must commit together. A transport response received successfully and a particular document revision published successfully are different facts.
6. **Settle partial supersession explicitly before admission of the child.** If one member's source revision changes while a shared remote batch runs, the old member cannot publish. The contract must specify whether current dispatch ownership may retain the immutable historical batch response for still-valid members, or whether the whole response rejects and leaves those units indeterminate. Do not silently relax 10-09's source/ownership checks or discard reusable results while claiming full recovery. Either choice must preserve stale-owner denial and forbid redispatch of ambiguous members. This policy remains a root decision for the bounded child.
7. **Keep page publication atomic and replayable.** Once all required vectors are available, lock and validate the page's current semantic heads and source observations, publish documents/chunks, reconcile its applicable deletions, record member consumption and save exact job progress in one transaction. A prepared page containing a changed source must stop before publication; it cannot create a newer head from an older snapshot. `ready` is insufficient by itself because a corpus document may be ready for older content. Preserve the existing explicitly observed-source-snapshot limit rather than promising instantaneous consistency with later source writes.

Proposed API responsibilities are limited to binding/validating a corpus page with multiple semantic heads, admitting/executing one shared embedding transport batch with unit mappings, and committing one corpus page with exact progress. Names/signatures are not frozen. A generic distributed orchestrator, alternative receipt store, universal content deduplication across tenants or a Qdrant mode cutover is outside this recommendation.

For a fresh disjoint page, this preserves `ceil(sum(c_i)/64)` requests. If `U` required units already have durable reusable results, requests cover only the remaining missing units; existing batch boundaries do not force their retransmission. Concurrency can fragment missing sets into different batches, so no globally optimal packing claim is made. Persistent unit uniqueness must guarantee at most one automatic remote admission for each exact unit revision/policy despite overlap, while transport outcomes can remain indeterminate.

### Publication and consumer constraints

Conversation `persistConversations:1285` publishes its prepared page in one transaction. Business `persistBusinessDocuments:1979` explicitly promises one transaction with bounded SQL batches: documents 100, chunks 8 and stale deletions 500. Neither existing pipeline includes all setup, terminal reconciliation and wrapper cursor updates in that same transaction today. The new contract must state which additional effects become atomic; it cannot claim that the old whole pipeline already was.

The existing four persistence regressions in `brain-business-persistence.service.test.ts` assert a 205-record page uses 29 SQL statements, 501 stale keys use bounded deletes, missing vectors yield pending, and unchanged/duplicate identities behave predictably. They mock `withOrgCore` and do not prove rollback atomicity. The file also contains normal-environment SQL execution and is quarantined by root pending a bounded split; do not execute it through the default lane. Wrapper tests assert 25/50 limits, exact cursor/failed-domain accounting and legacy WhatsApp drain. New actual-engine tests must prove publication rollback together with progress, rather than inferring this from those mocked expectations.

The current source selection/setup hooks remain the ten-file 10-06 responsibility. Canonical entity identity must bridge current/legacy scheduling, dirty/reconcile overlap and existing public non-job calls. Preserve non-job behavior without falsely labeling it job-fenced. An unversioned materialization job can only bind through an explicit current-source validation contract; this does not attest historical reset intent. Re-entry after an existing indeterminate unit must not treat a fresh page or cursor as permission to retry the provider.

### Evidence and follow-up ownership

This appendix used source reads only. No test module, worker migration, environment loader, provider or live service was executed. The pre-append decision document SHA-256 was `f4fef05488d4eb592646fe80f923499b440f99302c39a4a533ae338fdadf5e71`; its existing body is preserved.

Worker source hashes at inspection: `src/worker.ts` = `a7f668a8a2415046e794fd6f4021ddfa0dd014b9f6b80b576b87abeb4de8eb25`; `src/embedding-client.ts` = `dc68ad643771621571701501f35530ca5f6905e3109fd4cbd625f4a9b07953dc`. These identify local evidence, not deployed releases.

Root owns new child admission and the proposal ledger. Before finishing any implementation that leaves worker governance unchanged, preserve exact handoffs for in-memory provider results (`worker.ts:147`), retry after Qdrant/ACK failure (`:246`), process-signal propagation (`:465`) and desired-revision versus claim-owner fencing (`sql/001_brain_vector.sql:364,410`; Hub retry RPC `20260723010000:277`). This reviewer has no worker source ownership and has not inserted those comments. The findings and exact sites have been sent to root; they must not disappear behind a claim that reusing the existing worker closes JOB-02.
