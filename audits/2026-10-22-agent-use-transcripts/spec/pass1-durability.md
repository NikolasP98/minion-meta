# Pass 1 independent design review: durability and proactive work

Verdict: **changes_requested**. Reviewed spec SHA-256: `941c42fd4006a1021e0a63d131d66d1611e47c25d1e2d9f3a745684d9171c621`.

Scope: complete specification, with detailed validation of §§7–8, migration, worker isolation, ownership, publication and recovery. Compared to Hub `b677a5d91a2b653211a1655465b2b5fd398efc2a` and Gateway `6d1cd8836ff7b82d21668c50cc20b9b6d1e79c18`. No implementation edits or tests executed in this design review.

The design correctly reuses `bg-runtime` and Pulse, refuses to abuse embedding-only receipt rows, separates scheduling from completion, and fences unknown external outcomes. Its remaining defects are gaps between those guarantees and the concrete data/API contracts below. These are fixable within the stated product scope; none requires a generic framework.

## Blocking findings

### DR-01 — Strict gateway credentials do not establish the execution principal

**High. Spec lines 203–217; Slice 15.** Dispatch freezes actor and gateway but omits an explicit agent/session/channel-account/recipient contract. The existing Pulse RPC payload contains no `agentId` or `sessionKey` and announces to WhatsApp without an explicit `to`. Gateway `src/platform/cron/service/jobs.ts:347-348` preserves optional undefined agent/session; `src/gateway/server-core/server-cron.ts:80-101` substitutes the default agent/main session, and even an unknown supplied agent falls back to default. A correct org gateway can host multiple agents. Selecting its credential therefore does not prove a user's intended execution or delivery target.

**Smallest fix:** include resolved personal-agent ID and canonical target session in the immutable dispatch binding; define the user-authorized channel/account/recipient or disable automatic announcement and rely on in-app scheduling status. Fail closed when that binding cannot be proved. Add an explicit no-default-agent contract for this dispatch path, or keep executable approval unavailable on a gateway that cannot enforce it. Validate the real typed `create_event` and `reminder` argument mappings; spell out the server-generated command construction and schema revision. Do not claim a typed argument object makes arbitrary natural-language instructions trustworthy.

**Tests:** two users/agents on one gateway; absent/deleted/unrecognized agent; valid org but wrong session; gateway reassignment between approval and admission; missing recipient; quoted instruction-like event title; ambient credentials present. Assert exact outgoing job fields and zero fallback execution, not only credential-helper selection.

### DR-02 — Owner concurrency and daily spend limits have no shared persisted admission authority

**High. Spec lines 223, 233–239, 247; Slices 17–18.** Per-job ownership protects one row. Two distinct digest snapshots can create different jobs, each claim successfully, and each admit inference. The schema has no shared owner/policy lock or budget record implementing “one concurrent job per owner/policy,” five daily calls, pre-call spend reservation, or the cross-run unknown-cost fence. A process-local counter would reset on crash and races across workers; unique snapshot identity does not solve different snapshots.

**Smallest fix:** add one domain admission-state row per configured owner/policy or approved-budget namespace, with an atomic row lock governing active-run identity, counted attempts, reserved/settled exposure and unresolved-cost fence. Define the UTC/day accounting boundary and which state survives rollover/policy revision changes. Reserve slot and exposure in the same transaction as `reasoning_admitted`. Release only using matching receipt/run/generation; a stale worker cannot release a successor's reservation. Retain the fence across day rollover until explicitly reconciled. Specify that provider SDK automatic retries/fallbacks are disabled for the one-attempt pilot or individually counted and reserved; a single SDK invocation is not necessarily one billable request.

**Tests:** two worker processes with different snapshot hashes compete for final day allowance; crash after reservation; stale settlement; midnight/policy revision bypass; malformed output with known bill; unknown bill blocks another snapshot. Check actual SQL row/constraint behavior.

### DR-03 — Existing Pulse read path hides the approved dispatch and excludes business orgs

**High product-completion gap. Spec lines 221, 245–251; Slices 14–19.** `src/server/services/pulse.service.ts:43-49` lists pending only. `(app)/pulse/+page.server.ts:17-20` rejects business orgs and loads only that list. Marking a proposal approved atomically removes it from the existing feed after refresh, so simply adding badges to current cards cannot deliver durable queued/scheduled/indeterminate status on reconnect. Pilot configuration currently accepts an unspecified org kind; configuring a business org yields cards the intended UI cannot show. Existing card schema is org-scoped rather than owner-scoped.

**Smallest fix:** constrain the pilot to a validated personal org and explicitly define owner visibility; no expansion to business orgs is needed. Add an owner-scoped authoritative receipt/detail read and a bounded “recent decisions with dispatch status” query within the existing Pulse page, retaining its pending count semantics. Define which IDs current clients reload after a committed approval and how reconnect obtains terminal/unknown status. Include exact endpoint/read-service and response variants in the spec. Restrict feedback and receipt reads to the bound owner/current allowed authority, including malicious same-org ID substitution.

**Tests:** approve then refresh/reconnect; unknown RPC outcome then reconnect; access from different org and another profile in same org; personal versus business activation; legacy informational cards remain visible/decidable under the preserved contract.

### DR-04 — Retry, terminal failure and indeterminate reconciliation need executable transitions

**High. Spec lines 211–215, 239–247; Slices 15/17/18.** Safe retry/backoff is required but no persistent `attempts/next_attempt_at` contract or handler return behavior is specified. Current `bg-runtime.ts` marks arbitrary handler exceptions failed; its retry exception is intentionally only for `booking_stock`. Candidate filtering by type/org alone cannot make retries due or prevent repeated hot polling. Digest schema says generic `phase`, while the prose additionally uses deterministic no-change, invalid result, superseded, indeterminate and cancellation without a complete state table. On Pulse, “reconcile/cancel before creating a new logical request” could wrongly treat cancellation as proof an unknown earlier action did not happen. `deleteAfterRun` can also erase a successful job, so missing `cron.list` is not no-effect evidence.

**Smallest fix:** give both domain handlers complete states and allowed transitions, persisted next-attempt time/count and a typed postpone/terminal result integrated narrowly with the runtime; specify candidate due checks and lease release. Choose one consistent retry definition: only failures proven before remote dispatch, maximum three attempts, exact bounded delays. Post-admission generic transport errors remain indeterminate. For initial scope, indeterminate can be terminal/manual-review-only with no retry API. If reconciliation is included, specify its inputs, authority, accepted positive evidence, immutable decision audit and resulting state. Cancellation or absent remote job alone must never reset an admitted receipt or make a repeat safe.

**Tests:** before-send failure retries at due time; no hot loop; at-cap terminal state; malformed provider result persists a known bill but no card; lease-loss recovery; cancel after unknown response does not unlock replay; remote job deleted after completion is not classified as not executed.

### DR-05 — Publication conflict semantics do not yet prove exactly one correct card

**High correctness gap. Spec lines 233–243; Slice 19.** Current `upsertProposals` uses `(org,dedupKey) ON CONFLICT DO NOTHING` and returns counts (`pulse.service.ts:20-39`). A transaction-taking version of that helper alone cannot prove the existing row belongs to the same run/owner/result, nor produce its validated `published_card_id`. Generic gateway ingestion can submit caller-supplied dedup keys. An upsert that overwrites an existing decided card would also change the content to which approval/feedback referred.

**Smallest fix:** specify a reserved internal digest namespace, immutable run-to-card binding and the exact conflict rule. Existing matching run+owner+content hash is idempotent replay; any mismatch is conflict with no source cursor advance. Read back and validate the actual card ID in the same transaction. Gateway/public ingestion must reject the reserved internal key/binding. Do not overwrite decided cards on replay. Define source-CAS failure as terminal `superseded` and spell out how subsequent triggers treat that existing unique run: return its disposition, never loop/rebill the same input. A later new policy/source snapshot is distinct only when its declared identity genuinely changes.

**Tests:** matching replay, forged/preexisting dedup-key collision, existing card changed/decided, partial source-CAS conflict, callback crash before/after COMMIT. Assert card ID/hash/owner, every source cursor and terminal bg progress in the same database transaction.

### DR-06 — Selected worker prerequisite and combined slices are not ready for independent implementation

**Medium planning blocker. Spec lines 347, 355–371, 393.** Fixing duplicate executable approval currently depends on digest-source work through Slice 17; “or extract helper” defers a dependency decision to the implementer. Slice 17 combines source/run schema, enqueue transactions, runtime SQL selection, worker registration and retry changes. Slice 19 combines atomic multi-record publication with a new feedback table/API, revision history, UI and mounted accessibility tests. Both exceed a credible single 4–8-hour junior slice in the present contract. “Split if it exceeds 8h” does not make the current plan executable.

**Smallest fix:** split now: selected-runtime admission/typed defer helper as an independent prerequisite for Pulse dispatch; digest run/source schema and admission separately; digest inference receipt/budget separately if needed; atomic publication separately from feedback schema/API and UI/export. Renumber DELTA/acceptance/dependencies consistently. Pulse correctness repair must not wait for the optional digest product. Assign each slice exact changed modules and a concrete test command, including explicit native-PG lane markers/fixtures for transactional guarantees.

## Nonblocking precision improvements

- **DR-N1 retention:** define FK/deletion behavior so owner/profile deletion cannot cascade away admission tombstones before namespace retirement. Redaction must retain enough binding to reject replay; raw evidence/comments are independently deletable. Test delete-owner plus stale trigger and request-body redaction.
- **DR-N2 source-state authority:** policy revocation is a repository-config event, membership revocation is an identity event; identify which trusted handler records each domain cancellation and increments job generation. At minimum the worker must fail closed on absent/current policy or membership even if asynchronous cleanup has not run. Do not hold a DB transaction across an external identity lookup.
- **DR-N3 invalid claims:** structural source-ID validation cannot prove prose is supported. Keep a deterministic ID/anchor validator plus an explicit human/sample evaluation protocol for claim support; never describe schema validation as factual validation.
- **DR-N4 schema constraints:** enumerate nullable/state-dependent fields in concrete table contracts, especially scheduled→remote_job_id, indeterminate→admitted timestamp, published→card ID, and feedback supersession links. “Checks enforce state-dependent fields” alone is not a complete migration specification.

## Accepted design choices

- Unknown external outcomes are fenced rather than retried; scheduling is never labeled execution.
- Default `/api/jobs/tick` behavior remains unchanged and SQL type/org selection precedes LIMIT.
- Domain-specific receipts reuse job ownership rather than generalizing the embedding effect schema.
- Digest sources/model calls are bounded, tool-free and disabled without scoped budget approval.
- Reasoned feedback does not automatically rewrite weights, factual evidence or capabilities.
- Rollback preserves admission evidence and avoids resuming legacy retry paths.

## G2 scores

| Axis | Score / 10 | Reason |
|---|---:|---|
| slice_size | 4 | Combined 17/19 and optional prerequisite extraction defer planning decisions |
| dod_verifiability | 7 | Strong crash/SQL/browser criteria, but missing authoritative receipt read and budget contract |
| scope_containment | 7 | Narrow reuse is sound; new framework is correctly excluded |
| impact_zones | 5 | Agent/session delivery identity, personal-org visibility and current pending-only feed missing |
| collisions | 7 | Existing artifact ownership explicit; worker dependency needs separation |
| testability | 7 | Good fault families; missing cross-run budget, replay collision and reconnect status cases |

The blocking verdict overrides aggregate scoring. Re-review the revised complete artifact; technical acceptance still does not authorize implementation, deployment or security/data approval.
