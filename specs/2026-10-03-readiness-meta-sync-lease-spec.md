---
id: 2026-10-03-readiness-meta-sync-lease-spec
title: Meta sync lease ownership and effect fencing
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [data, logic, migrations, security, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Meta sync lease ownership and effect fencing

## 0. Product

HS-005 affects the Hub worker that imports Meta posts, ad insights, conversations, connection
state, promoted-post links, and mirrored thumbnails. This slice gives each claimed Meta sync a
time-bounded owner and generation, aborts provider reads when ownership is lost, and prevents an
expired, replaced, or cancelled worker from publishing domain changes or job progress.

The source baseline is Hub commit `66a89fab` plus the already-reviewed test-gate commits on
`fix/readiness-hub`. Work is limited to Meta sync execution, its schema and migration, directly
connected persistence helpers, Graph/image cancellation, and a native disposable-PostgreSQL
fixture. No live Meta request, production database, shared QA database reset, blob write, deploy,
or migration application is part of local qualification.

## AS-IS

`src/server/services/meta/meta-sync-jobs.service.ts` decides that a running job is stale from
`started_at`, then claims it with `started_at = coalesce(started_at, now())`. A reclaimed row keeps
the old timestamp and is immediately eligible for another claimant. The row has no lease owner,
generation, expiry, or heartbeat. `claimJob` returns a boolean; `runJob` then reloads a mutable job
snapshot in a second query.

`recordProgress`, `requeue`, and `finishJob` update by `(id, org_id)` alone. An earlier worker can
therefore overwrite the cursor, merge counts, requeue, or finish after a later worker has reclaimed
the same job. Connection discovery and expiry handling happen outside the dispatcher's current
`try`, so an exception there bypasses its failure path and any future heartbeat cleanup.

The job row is only part of the effect surface. A Meta slice also writes:

- `meta_post_insights`, `meta_ad_insights`, `meta_ad_posts`, promoted flags, and
  `meta_post_media` through independent `withOrgCore` transactions;
- connection status and refreshed IG credentials after provider calls;
- conversation rows through the separate messages facade, which opens another transaction against
  the same PostgreSQL database;
- a blob followed by a `files` row and `meta_post_media.file_id`. The blob write precedes database
  publication and currently uses a fresh random identity, so a lost response or replaced worker can
  create duplicate or untracked objects.

Graph reads have per-request timeouts but no caller signal. A heartbeat cannot currently stop a
long request after ownership loss. Domain helpers have no transaction-compatible ownership seam,
so checking the lease once before a provider call would still permit a late write after the call.

## TO-BE

### Lease state and claim

1. `meta_sync_jobs` stores nullable `lease_owner`, nonnegative `lease_generation`, and nullable
   `lease_expires_at`. A check constraint explicitly admits only
   `(status = 'running' and lease_owner is not null and lease_expires_at is not null)` or
   `(status <> 'running' and lease_owner is null and lease_expires_at is null)`. Both partial-null
   states are invalid for every status. A coordinated migration requeues pre-migration `running`
   rows and increments their generation. Deployment must drain old executors before applying the
   migration because an old binary cannot honor the new fence.
2. Each `runJob` invocation creates an unguessable owner id. One atomic update claims either a
   queued row or a running row whose lease is expired, sets a fresh expiry, increments the
   generation, and returns the committed full job snapshot. Concurrent claimants cannot receive the
   same generation.
3. Discovery treats a running job as due from `lease_expires_at`, never `started_at`. `started_at`
   remains the first-start audit timestamp. Requeue and every terminal transition clear owner and
   expiry; cancellation also increments the generation.
4. A 90-second lease renews every 30 seconds. Renewal succeeds only while owner, generation,
   running status, org, and unexpired lease all match. Expired ownership cannot be revived before
   or after a replacement claim. Claim, renewal, and final ownership checks use PostgreSQL
   `clock_timestamp()`, so time spent waiting for a row lock counts against the lease instead of
   using transaction-start `now()`.

### Execution and settlement

5. A Meta-only execution object owns the abort controller, heartbeat, claimed snapshot, and a
   short `withOwnership` transaction. The transaction locks the job row, rechecks owner,
   generation, status, org, and database-clock expiry, runs only database work, and rechecks expiry
   before commit. It never spans a Graph, image, storage, or other provider request.
6. The heartbeat starts immediately after claim. Connection loading, token classification,
   dispatch, settlement, and all early returns are inside one `try/finally`; cleanup stops and drains
   any in-flight renewal. The renewal SQL function sets `lock_timeout = '4s'` and
   `statement_timeout = '5s'`. A six-second client watchdog cancels the postgres-js query even while
   it is waiting in the pool queue; the existing pool `connect_timeout = 10s` plus a one-second
   scheduling margin gives cleanup an explicit eleven-second drain ceiling. Cancellation marks a
   connecting query before execution, so it cannot run later. Lease loss aborts work and is not
   rewritten as a job failure owned by the stale worker.
7. One fenced settlement merges counts and cursor and chooses queued, succeeded, or failed in the
   same transaction. A stale worker cannot make a partial `recordProgress` followed by an
   unfenced `requeue`/`finish`. The final batched insights write for a slice joins this settlement
   where practical; earlier page checkpoints remain idempotent, individually fenced commits.
8. Provider reads may be repeated after a crash because the importer is at-least-once, but every
   database publication is idempotent and lease-gated. A replaced or cancelled worker can finish a
   remote read but cannot publish its result.

### Connected effect fencing

9. Graph options accept an optional `AbortSignal`. The request combines that signal with its
   existing timeout without changing default callers. Meta passes the execution signal through
   initial reads, paging, metrics, token refresh, and the image fetcher.
10. Post/ad insight upserts, promoted flags, ad-to-post links, media bookkeeping, connection
    status, and refreshed-token storage run through transaction-compatible helpers inside
    `withOwnership`. Cache invalidation may follow a committed effect; an extra invalidation is
    harmless and carries no business state.
11. Messages expose one narrowly scoped transaction-compatible insert primitive. Meta invokes it
    with the owned core transaction, preserving the existing client-id conflict contract and
    per-row fallback. Cache invalidation and the existing durable brain-reconciliation enqueue run
    only from the accepted post-commit result. No global `CoreCtx` type or generic transaction
    behavior changes.

### Connection compare-and-swap

12. Meta job kinds do not treat their job leases as exclusive ownership of a connection. A status
    or refreshed-token update compares the connection's original `updated_at`, status, and
    credential identity and always requires `status <> 'revoked'`. A concurrent disconnect or
    newer refresh wins; the stale job cannot resurrect a revoked connection or overwrite the
    newer token. On compare-and-swap loss, the job reloads the canonical row and either uses that
    still-active credential or drops the connection from its slice.

### Blob effect ledger and recovery

13. Thumbnail mirroring stops using an unreserved random `uploadFile` call. It fetches the current
    CDN URL with the lease signal, computes the SHA-256, and then uses a short owned transaction to
    reuse a still-active unpublished effect with the same digest or create a new durable
    `meta_media_mirror_effects` generation. Historical rows are not unique solely by digest: each
    has an immutable effect id, while a partial unique constraint admits at most one active effect
    for a media row. The effect binds the source URL, digest, size, content type, file id,
    content-addressed object key, publication state, cleanup state, and retry timestamps before any
    put. The object key includes both the immutable effect id and digest so no other writer can reuse
    it for different bytes. `meta_post_media` points at the active effect, while
    superseded/abandoned effect generations remain durable instead of being overwritten or
    forgotten.
14. Fetch, `head`, and put happen outside the database transaction. `head` proves only existence,
    size, and content type; it does not prove a digest. Digest trust comes from the content-addressed
    key and the rule that the sole writer may put only bytes it just hashed to the effect's bound
    digest. The old and replacement worker therefore repeat an idempotent put of the same bytes to
    the same key. A process crash after put leaves a discoverable effect that the next owner can
    reconcile from `head` under that trusted-writer invariant.
15. A refreshed current CDN URL may be retried against an existing digest effect. If it yields the
    same digest, it reuses that effect only while the effect is still active and unpublished. Once
    an effect becomes superseded or cleanup-pending, that transition is irreversible. Bytes later
    reverting to the same digest create a distinct effect id and key. Changed bytes likewise create
    a new active effect; the older generation remains tracked with its exact key, so a late old put
    is never an untracked orphan and a late delete cannot touch a replacement key.
16. Before any outside-transaction cleanup delete, an owned transaction irreversibly marks an
    unpublished effect cleanup-pending and sets `next_cleanup_at` no earlier than its recorded
    put/retry deadline. The current S3 driver bounds each of two put attempts to 30 seconds; the
    ledger records a 65-second writer deadline. Cleanup never deletes a published effect or its
    file, which remains the existing file lifecycle's responsibility. Each mirror pass selects a
    fixed-cap batch by `(next_cleanup_at, effect_id)`, heads/deletes the exact old key outside a
    transaction, and retains the tombstone after recording `object_absent_at`. Both absence and
    failure advance `next_cleanup_at` with bounded backoff, so already-absent or failing old rows
    cannot starve newer tombstones. Repeated checks remain scheduled beyond the nominal 65-second
    writer deadline because a local abort is not proof the remote write stopped. The irreversible
    distinct-key rule makes delete versus same-digest replacement races safe.
17. Publication inserts the reserved `files` row, marks the effect published, and flips the media
    row to `mirrored` in one owned transaction only when that effect is still active. An expired
    worker cannot publish any pointer. A failed attempt records a bounded sanitized error on the
    effect under live ownership without preventing a later refreshed URL from creating/reusing the
    correct active generation.

## DELTA

### D1 — Schema and migration

- Add the three lease columns and nonnegative-generation constraint to `pg-meta-schema.ts`.
- Add `meta_media_mirror_effects` with digest identity, object/file identity, status/provenance,
  retry/error fields, cleanup state, and timestamps. Add an active-effect pointer to
  `meta_post_media`; admit `mirroring` as an internal status. Keep superseded effect tombstones
  durable even after an object is observed absent. Test the running/both-present and
  non-running/both-null lease shapes plus both rejected partial-null shapes.
- Bind `meta_post_media.active_effect_id` to the same org/platform/post through a composite foreign
  key; apply forced RLS and the org GUC policy to the effect ledger.
- Add one additive migration. It documents the drain requirement, requeues legacy running rows,
  increments their generation, and adds a due-job lease index. Schema tests assert the new fields.

### D2 — Lease repository and execution

- Replace boolean claim plus reload with atomic `claimJob(ctx, id, owner)` returning the claimed
  snapshot and generation.
- Make due discovery, renewal, cancellation, and terminal transitions use the lease fields.
- Add a Meta execution module with heartbeat, loss signal, short ownership transaction, and atomic
  settlement. Keep `mergeCounts` pure and retain the current diagnostic-array cap.
- Put the whole post-claim dispatcher inside cleanup and classify lease loss separately from a
  live-owner job failure.

### D3 — Abort propagation

- Add `signal?: AbortSignal` to `GraphOpts` and combine it with the existing timeout at the one
  `graphRequest` boundary. Preserve injected `fetchImpl` and every existing default.
- Pass the execution signal through every Meta Graph call, page continuation, IG token refresh,
  and SSRF-safe image fetch. Add timeout-only, external-abort, and already-aborted regressions.

### D4 — Database effect gates

- Add transaction variants for Meta ad-post and post-media writes; keep their existing facades for
  non-job callers and tests.
- Move local post/ad insight, promoted-state, connection-state, and credential writes into owned
  transactions. Buffer only bounded slice data; do not hold a lock during provider work.
- Make connection/token writes compare-and-swap the originally read connection version and reject
  revoked rows; reload after CAS loss rather than reusing stale credentials.
- Add the narrowly scoped owned-message insert seam after parent review. Preserve conflict
  idempotency, poison-row fallback, cache invalidation, and brain-reconciliation behavior.

### D5 — Recoverable media publication

- Add a Meta-local effect-ledger/finalization helper that writes the existing `files` table,
  `meta_media_mirror_effects`, and `meta_post_media` in owned transactions while calling the
  existing blob driver outside them.
- Bind fetched bytes to a content-digest effect before put. Reuse the effect for matching bytes;
  preserve and supersede it when refreshed bytes differ. Prove a late first owner cannot publish a
  second file record or media pointer, cannot put mismatched bytes, and always leaves a durable key
  tombstone that replacement/cleanup can reconcile.
- Reconcile a fixed-cap batch of superseded effect keys on each mirror pass. Delete only by the
  exact immutable effect key after the recorded writer deadline, record observed absence without
  deleting the row, advance the next check after both absence and failure, never reactivate that
  effect, and order retries fairly by the next-check time. Keep repeated checks after the nominal
  writer deadline. Published files remain under the existing file lifecycle.
- Do not change generic browser upload, attachment, or deletion semantics.

### D6 — Native ownership evidence

- Add `meta-sync-lease.sql.integration.test.ts` to the exact `jobs` native manifest with every
  semantic test name and an updated count ratchet. The existing jobs config/report contract then
  selects and validates it automatically.
- Use the marked disposable database only. Create one isolated schema, apply the real migration,
  and route service calls through at least two distinct physical PostgreSQL backends.
- Exercise simultaneous claim, heartbeat, forced expiry and generation steal, stale progress and
  terminal rejection, fenced domain publication, cross-org denial, cancellation, and late
  completion. No `runIf`, runtime skip, shared `54422` reset, or live credential is permitted.

## Test matrix

| Invariant                 | Red signal before change                                      | Required green proof                                                                                                                    | Mutation/canary                                                               |
| ------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Atomic claim              | A stale row remains stale and two ticks can process it        | Two connections race; exactly one owns generation N, then one owns N+1 after forced expiry                                              | Remove owner/generation predicate; both claimant assertions fail              |
| No revival                | An old worker can renew from its historical start state       | Expired generation renewal returns false before and after takeover                                                                      | Permit renewal without unexpired predicate; canary revives A                  |
| Fenced settlement         | Progress, requeue, and finish filter only id/org              | A cannot change cursor, counts, status, error, or finish time after B steals                                                            | Remove generation from one update; exact stale-update case fails              |
| Cancellation              | Terminal state has no claimant invalidation contract          | Cancellation clears lease, increments generation, aborts A, and rejects late A settlement                                               | Omit generation bump/status predicate; late completion succeeds               |
| Cross-org                 | Bypass-capable connections rely on explicit filters           | An org-B context cannot claim, renew, settle, or publish an org-A job/effect under forced RLS                                           | Drop RLS scope/org predicate; native denial fails                             |
| Heartbeat cleanup         | Exceptions before dispatch sit outside cleanup                | Connection-load failure, unknown kind, token failure, and success all stop/drain renewal                                                | Move connection load above `try`; timer/pending-renewal test remains live     |
| Lock-wait expiry          | Transaction-start time can preserve authority while blocked   | Ownership recheck after a row-lock wait uses `clock_timestamp()` and rejects the now-expired generation                                 | Replace with `now()`; blocked native case publishes late                      |
| Connection CAS            | Different job kinds or disconnect race the same connection    | Revocation/newer refresh wins; stale status/token writes return no row and never resurrect or clobber                                   | Remove original-version/revoked predicate; race test fails                    |
| Graph abort               | Timeout is the only request cancellation                      | External lease-loss signal aborts initial and paging fetches; default timeout callers still work                                        | Ignore caller signal; abort regression hangs/fails                            |
| Late domain writes        | Every Meta write uses an independent unfenced transaction     | After B steals, A cannot write insights, links, media state, connection state, token state, or messages                                 | Call one legacy facade from the slice; its stale publication test fails       |
| Atomic cursor/count state | Cursor, counts, and queue/terminal status are separate writes | One owned transaction commits the merged counts, cursor, and next status; forced rollback changes none                                  | Split the updates; rollback fixture observes partial state                    |
| Blob idempotency          | Each attempt allocates a new random blob/file identity        | A and B reuse one still-active digest effect; only matching bytes use its key and only the live owner publishes one file row/pointer    | Allocate per worker or omit digest binding; identity/content assertion fails  |
| Changed CDN bytes         | One overwritten reservation can strand or forget an old put   | New digest gets a new active effect; cleanup deletes the old exact key after its writer deadline and retains its irreversible tombstone | Overwrite/delete old effect or tombstone; changed-bytes race loses provenance |
| Reverted CDN bytes        | Digest-only uniqueness can reactivate an unsafe old key       | A later copy of the original bytes receives a distinct effect/key; an old cleanup delete cannot remove the replacement                  | Reuse superseded effect; late-delete race removes current object              |
| Cleanup fairness          | Retried oldest tombstones can starve the rest of the queue    | Fixed-cap selection orders by next-check time/id, advances failed retries, and never selects published effects                          | Order only by creation or admit published rows; fairness/safety test fails    |
| Crash recovery            | Put can succeed before random DB publication                  | Simulated loss after put leaves an effect that B reconciles without a second identity; `head` is never represented as digest proof      | Clear effect on takeover or trust unbound head; recovery test fails           |
| Manifest gate             | New native file could be omitted from CI                      | Jobs manifest names every new behavior and report validator rejects missing/renamed cases                                               | Delete one behavior name; manifest/report meta-test fails                     |

## Out of scope

- Holding a PostgreSQL transaction open across Meta, image, DNS, or object-storage I/O.
- Exactly-once provider reads; provider calls remain retryable and at-least-once after a crash.
- Live Meta token refresh, live CDN/blob qualification, production migration, deploy, restart, or
  scheduler changes.
- Resetting or repurposing the shared QA PostgreSQL service at `127.0.0.1:54422`.
- A generic job-runtime rewrite, global `CoreCtx` widening, or changes to unrelated file,
  attachment, and message callers.

## Verification

1. Prove red canaries for simultaneous claim, stale settlement, late domain publication, external
   abort, and divergent blob identity before accepting the corresponding green change.
2. Run focused unit suites for jobs, execution, dispatcher, Graph reads, media reservation,
   messages transaction compatibility, schema, and migration integrity.
3. Run the new exact native fixture on the parent-coordinated marked disposable PostgreSQL lane and
   validate the updated `jobs` JSON report through `native-postgres-report.ts`.
4. Run the existing Meta sync/provider suites and native jobs manifest/report tests to protect
   paging, tail semantics, token redaction, and every prior ownership behavior.
5. Run `bun run check` and changed-file formatting after coordinating shared-checkout resources.
6. Review the final diff for every write listed in TO-BE item 10 and verify no provider call occurs
   inside `withOwnership`.

## Review gates and residual policy

- Pass 1 must approve the lease state machine, transaction boundary, messages seam, and blob
  reservation protocol before implementation.
- Pass 2 must trace every dispatcher return and every connected write surface, then confirm the
  native fixture would fail if any owner/generation predicate is removed.
- HS-005 remains open if only job-row updates are fenced, if a late worker can publish any listed
  domain effect, or if a blob put can lose its durable reservation.
- Any accepted residual requires an exact-site `TODO(handoff)` and matching meta proposal before
  handoff; no always-green skip or test-only ownership bypass is acceptable.
