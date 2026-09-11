# Vector worker claim ownership decision

Status: proposed, source-only preparation for root review on 2026-09-09. No source, SQL, test, dependency, provider, database or runtime action was performed. This packet does not authorize deployment or close DATA-02/JOB-02.

## Selected boundary

Canonical owner is `minion/services/brain-vector`, current branch `fix/ci-cost-remaining-gaps`. No service-local AGENTS.md/CLAUDE.md was found under services; gateway AGENTS and .dmux-hooks instructions apply. Existing findings from 10-10-API-SCHEMA-DECISION and 10-REMAINING-HANDLER-DECISION are retained. This is the narrower execution design, not a second platform audit.

Recommend 15-05 as an eight-file claim-fencing candidate: explicit claim identity, database-guarded ACK/retry/dead-letter/heartbeat, process-signal admission guards and a compatible opt-in forward-migration runner. Separate transport cancellation, durable paid-response retention, reconcile ownership and Qdrant publication remain required children. Candidate completion cannot authorize production activation while those gates are open.

## Evidence that constrains the design

| Actual seam | Finding and consequence |
|---|---|
| `worker.ts:148–163` | Missing vectors are embedded in batches and stored only in copied in-memory jobs. Context prefix plus two newlines plus complete chunk text is the actual normalization; it is not the Hub8000-character policy. Both outbox processing and reconcile call this helper. |
| `worker.ts:166–264` | Claims are grouped by organization, then materialized, Qdrant-written and individually ACKed. A thrown ACK can enter a retry loop over already ACKed and remaining jobs; a retry exception can reach the outer upsert catch. Database transition outcomes must be handled once per unsettled claim. Failure after a paid response can cause another paid call on replay. |
| `outbox.ts:184–238`, `types.ts:78–98` | Desired revision and collection generation are passed to ACK/retry/dead-letter; returned jobs carry no changing claim-owner generation. Worker label exists only as a claim input. `ReconcileChunk` is derived with Omit, so adding claim fields must explicitly exclude them from reconcile rows. |
| `sql/001_brain_vector.sql:364–432` | Expired running rows can be reclaimed without changing desired revision. ACK checks revision/status, not current lease/claim owner. A stale claimant can therefore ACK a newer claim of the same source revision. Source updates increment revision and clear leases; this is a distinct fence. |
| Hub `20260723010000_brain_vector_outbox.sql:277–329` | Legacy retry/dead-letter have the same ownership gap. Retry also has a SQL attempt ceiling of8, alongside configurable worker maxAttempts. Preserve that existing effective policy in this child; do not silently unify/change retry budgets. |
| `worker.ts:466–493`, `cli.ts:205–220` | CLI supplies SIGINT/SIGTERM AbortSignal to run, but run calls processBatch/reconcileOnce without it. Only loop sleeps are abortable. Already-started batches continue. |
| `embedding-client.ts:44–61`, `qdrant.ts:97–112,312–330,534–537` | Clients use their own timeout signals, no caller signal. Qdrant `wait=true` reports a completed request but supplies no shared PostgreSQL claim CAS. Stopping local dispatch or denying ACK does not retract a sent request or fence stale remote writes. |
| `database-migration.ts:4–39` | Runner executes arbitrary supplied SQL before checking one fixed legacy role/RPC allowlist. There is no version/hash ledger. Updating that allowlist alone would let mutation precede incompatibility discovery. |
| `cli.ts:40–49`, README:19,106–112 | Deployed migrate command hardcodes001 and docs describe legacy RPCs. Those callers need a separate explicit adoption child; this plan cannot claim the existing CLI deploys002. |
| `test/migration.postgres.test.ts:21–66`, `vitest.config.ts` | Existing migration fixture unconditionally starts Docker with host networking and belongs to the default test glob. Do not execute it as a harmless unit suite. Its synthetic baseHubContract is not evidence of actual Hub migration compatibility. |

## Proposed ownership contract

Keep collection `generation`, desired `revision` and claim identity separate. Add a nonnegative bigint claim-generation column default0 for existing rows, backed by one noncycling PostgreSQL sequence for every new claim. A new claim uses nextval, including reclaim and reinsert-after-ACK; a per-row resettable counter would allow ABA after row deletion/recreation. Gaps are normal, exhaustion refuses admission. Preserve desired revision, operation, tenant and existing source-update behavior.

Return required `claimGeneration: bigint`, exact validated `leaseOwner: string`, and database lease expiry with each claimed job. Worker ID must be nonempty and at most200 characters; reject overlength instead of silently truncating identity. The checked tuple is organization ID, chunk ID, collection generation, desired revision, lease owner and claim generation. It is a database ownership descriptor, not a bearer security capability or substitute for the restricted worker role.

Use distinct v2 routines rather than overloading a legacy unsafe signature: `claim_brain_vector_jobs_v2`, `ack_brain_vector_job_v2`, `retry_brain_vector_job_v2`, `dead_letter_brain_vector_job_v2`, and a bounded batch `heartbeat_brain_vector_jobs_v2`. ACK/retry/dead-letter/heartbeat require the complete tuple, running status and an unexpired lease using database wall-clock time after row-lock acquisition. Heartbeat cannot resurrect an expired claim. Claim returns committed identities; parsers reject missing, negative, malformed or precision-losing fields. No legacy fallback or optional claim token.

Heartbeat input is at most500 exact descriptors, rejects duplicates/malformed input and returns renewal outcome per tuple. Lock in a deterministic chunk/generation order. Maintain one observed renewal operation at a time, covering every unsettled row in a claimed batch, including later organizations waiting behind a slow earlier group. Default interval is derived from the existing lease duration (at most one third); do not add a new scheduling service or dependency. A false renewal or exception revokes local permission for the affected work; exceptions conservatively stop further external dispatch for the batch. SQL guards remain decisive if the process misses a timer.

Recheck/renew before each new external materialization batch, provisioning/write/delete boundary and before moving to later groups. SQL ownership is not a fence around the remote call: ownership can change immediately afterward. ACK false means no ownership/transition, not proof of successful indexing or remote cancellation. Remove successfully finalized claims from renewal/retry work. An ACK failure must not retry already-finalized peers. Avoid nested catches performing duplicate retry transitions.

Process signal reaches `processBatch(signal?)` and the scheduling decisions inside run. On abort, admit no new claim, embedding batch, Qdrant operation, retry/dead-letter or reconcile page. Observe an existing in-flight call, keep bounded existing renewal while it settles, then release local timers/listeners and let nonfinalized claims expire. Do not promise prompt shutdown of a transport that ignores caller cancellation; native transport signal propagation belongs to the next child. A signal arriving during claim must still retain/clean up returned ownership without beginning remote work. Reconcile already running remains outside this claim contract; run must not start a new reconcile after abort. Preserve explicit `reconcile-once` behavior, with a handoff for its missing ownership.

## Migration and rollout recommendation

New authored file reservation: `minion/services/brain-vector/sql/002_brain_vector_claim_fencing.sql` (not created). Recheck filename and all relevant hashes before admission. Never modify or automatically replay applied001. Existing Hub July migrations and worker001 are prerequisites; their actual deployment is unverified.

Extend the existing runner API with an explicit selected contract version. Keep a legacy path for unmigrated disposable catalogs, but preflight it and refuse legacy001 execution before mutation if v2 catalog/ledger evidence exists. The v2 path accepts only the reviewed002 artifact/hash, validates actual prerequisite catalog, acquires a serialized migration lock on its dedicated connection, and runs its explicit transaction. Store an additive002 version/hash receipt in that same transaction. A receipt for002 must not pretend to prove a historical applied001 hash. A supported implementation can pass the artifact hash through a dedicated session setting consumed by002; it must not regex-strip SQL transaction boundaries or execute the migration in an accidental nested transaction.

Exact repeat with matching ledger hash and complete v2 catalog is a read-only no-op. Missing/partial/incompatible catalog, conflicting hash or unsupported version fails before destructive work; no IF NOT EXISTS-only compatibility claim. Existing001 transaction framing remains unchanged. Preflight/final verification use version-specific exact RPC ACL/signature sets; preserve NOINHERIT and no direct table privileges or PUBLIC execution. New ledger/sequence have no direct worker grants. Revoke legacy claim/ACK/retry/dead-letter execution from the restricted worker and any prior exposed application roles as reviewed; never leave the old mutators as a bypass. Keep other current reconcile/backfill/status RPCs and role topology unchanged.

Compatibility matrix: old worker+v1 DB remains legacy/unfenced; new worker+v1 DB refuses missing v2 RPC before remote effects; old worker+v2 DB refuses legacy calls; new worker+v2 DB is the candidate to qualify. No rolling mixed-worker compatibility is promised. Root must separately admit quiesce/drain, migration invocation, exact emitted artifact and restart order. In-flight old remote requests can survive DB migration; Qdrant safety remains a release blocker. No automatic downgrade or applied-history rewrite.

The unchanged CLI still points to001: a distinct adoption child should own `src/cli.ts`, `README.md` and its new focused migration-command fixture, plus replacement of the old host-network migration fixture only after exact runtime policy admission. Docker already copies the entire sql directory; inspect emitted/package artifact inclusion rather than changing Docker without evidence. This candidate's direct opt-in runner fixture does not qualify CLI or container delivery.

## Separate required children

1. **Transport stop propagation:** existing `worker.ts`, `embedding-client.ts`, `qdrant.ts` and their three focused tests (six files). Thread caller signals through all actual request/provisioning paths using existing AbortSignal facilities, retaining own timeout. Prove no further dispatch and observed rejection without claiming remote rollback. Freeze exact signatures before this child; no helper scheduler/library required.
2. **Paid-effect receipt design, then implementation:** root must select actual worker persistence authority and cross-mode identity before SQL. Reuse current PostgreSQL outbox and the established admission/immutable-result pattern from10-10; do not import Hub server services into this standalone package or create a second vector cache. Pin full normalized text/policy/source identity and ordered batch membership, forbid automatic retransmission of admitted uncertain effects, retain complete valid results durably for Qdrant/ACK recovery. Reconcile and outbox must share this authority or remain explicitly ineligible for the guarantee. More than eight files means separate storage/API and worker-adoption children.
3. **Qdrant publication/reconcile ownership:** decide a supported remote ordering/idempotency strategy for stale upserts/deletes, generation/source supersession and per-org collection creation. Deterministic point IDs and fingerprints alone do not enforce order. Test delayed old writes after newer writes and write-success/ACK-failure recovery using an independently admitted isolated Qdrant fixture. No provider or Qdrant call is authorized by this packet.
4. **Migration/CLI/artifact adoption:** resolve the hardcoded001 caller, actual baseline catalog chain and restricted credentials before activation. Keep actual native PostgreSQL gate, legacy default-test Docker quarantine and container/package inclusion explicit.

## Exact handoff preparation

15-05 Task1 must add comments only before behavioral work: worker materialization at148/157 (paid results in memory); retry/apply at236/246 (uncertain remote outcome and replay); reconcile materialization/write at342/349 (unclaimed writer); run at466 (signal scope); outbox claim/ACK at184/202 (desired revision is not ownership); runner at32 before SQL execution (version/ledger prerequisite). Each uses `TODO(handoff)` and points to `proposals/2026-09-08-platform-qc-remediation.md`. Root owns the paired proposal. Do not put comments into immutable001; put migration ownership explanation in the runner and new002 header. Comments must be narrowed after each implemented guarantee and preserve all unresolved remote-effect gaps.

## Frozen evidence identities

| File | SHA-256 |
|---|---|
| worker.ts | a7f668a8a2415046e794fd6f4021ddfa0dd014b9f6b80b576b87abeb4de8eb25 |
| outbox.ts | 00454cdc054f4f539c26b5f357859b1d00a2a2c3ea498e7faae56d1c1ba85d1d |
| types.ts | 7f2c19a323d63710dcf948a85130dde65f64de935a944308a7fed34ee6415df0 |
| database-migration.ts | 2cef11ac154357cf2555e2be512fb2bd4383aa9d8ed57b713517a56dd35a8a1f |
| embedding-client.ts | dc68ad643771621571701501f35530ca5f6905e3109fd4cbd625f4a9b07953dc |
| qdrant.ts | 06dffefc5f9bc9a5e5c022b58480d65245bb20808e4fd59f8598195ceb9f5546 |
| cli.ts | 421542e797b07f6079bdc35419a4260e08945527a62dcb460441fafefc94aa3e |
| sql/001_brain_vector.sql | 45a4e1143843d3685b8cfa8f6e73b653b0e9a98d1f0d470c429aecca629aefc6 |
| 10-10-API-SCHEMA-DECISION.md | 3f0c59fbf015d69ee139c13ce2feea4fb0fa3eff9b27031068b6c664eba9355a |
| 10-REMAINING-HANDLER-DECISION.md | ed9681cc1931091e6217c50c7b212fd53b081150621f6de775641f1fc4903856 |

All identities are source evidence, not installed or deployed receipt. No runtime compatibility claim follows from this review.
