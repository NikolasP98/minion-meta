# Booking stock recovery: bounded implementation proposal

Status: root-reviewed design; source-backed compatibility policy admitted2026-09-12 as recorded below. This additional gap is outside the original229-task completion denominator. No customer database, provider, browser, migration or network mutation was used.

## Verified baseline

Reviewed Hub `/home/nikolas/.cache/minion-qc/ui-next-jgR8fM/hub` HEAD `32f7b2293700f803fd66307bf94960fac4874443`; its tree is `a7434373eb515107876767035f3446d9c9af1298` and reviewed service files have no working-tree diff. The retained release receipt `hub-release-20260912/ui-release-receipt.json` records this exact tree matching deployed `77445c01ec38657c767d6f011e77148be3cc4ccf`. Deployment equivalence is receipt-derived; this task did not fetch production source or recheck Vercel. Hub instructions were read; their legacy SQLite/auth overview does not describe these current PostgreSQL services.

Source findings:
- `scheduling-bookings.service.ts:431–446,492–506,815–862,884–954`: creation, status changes, combined PATCH and deletion commit before accrual/release. Create UID retry explicitly does not re-accrue.
- PATCH route `[id]/+server.ts:76–102` and **also** `[id]/complete/+server.ts:43–64` realize after status commit. `[id]/accrual/+server.ts:25` independently edits expected consumption. All three routes must join the scope.
- `stock-accruals.service.ts:89–105,341–452`: settled accruals never resurrect; realization resumes an existing draft unchanged. If both open accruals and explicit lines are absent, it returns success/no work at365; the productId fallback does not reconstruct missing consumption. A delayed creation intent must not be lost when completion supersedes it.
- `stock.service.ts:1588–1603` checks duplicate source with SELECT then INSERT; the declared/migrated unique issue identity is currently invoice-specific (`pg-schema/stock.ts:129`). Booking source uniqueness is not established by that check under concurrency.
- `bg-runtime.ts:59` enqueue opens its own DB operation: calling it after commit does not solve atomic admission. `job-effects.service.ts:505–552` already atomically commits a domain mutation, revision head and queued job; `withJobRequest:408` checks lease/revision and performs domain SQL in the same transaction. Its effect-result rows are embedding-specific: do not put stock receipts into vector descriptor/result fields.
- Public stock functions open separate `withOrgCore` transactions. A lease check followed by calling them outside the ownership transaction still permits stale effects. Existing bookkeeping-role restoration must be retained.

## Original policy questions (resolved by source-backed compatibility below)

These are real business decisions, not reasons to defer fixture construction:
1. **Edit/cancel after stock work has started:** preserve the existing draft as-is and require explicit Stock adjustment, or permit superseding/replacing an unsubmitted draft. Submitted ledger must remain append-only; cancellation must not silently reverse posted inventory. Reopening a cancelled/released booking currently does not resurrect accruals. Do not choose a new reopen policy implicitly.
2. **Delayed consumption basis:** snapshot resolved consumption/UOM/warehouse at admission, or resolve current catalog defaults at execution. Explicit completion/accrual lines must survive unchanged either way. Snapshotting defaults requires transaction-safe extraction of existing resolution logic; execution-time defaults can change consumption after a catalog edit.
3. **Blocked stock work:** retain current operator retry for negative stock/invalid product/warehouse, or authorize automatic later posting when conditions improve. Recommended boundary for admission: only interrupted/transient infrastructure work resumes automatically; business warnings remain visible until an authorized retry. This is a recommendation, not selected policy.

No history repair/backfill is required for prospective durability. Any replay of old completed bookings is a separate owner decision and reconciliation task.

## Execution slices and exclusive ownership

### A. Atomic intent and current revision

Own new `src/server/db/pg-schema/booking-stock-intents.ts`, proposed migration `supabase/migrations/20260913010000_booking_stock_intents.sql` (reserve/recheck filename before execution), new `src/server/services/booking-stock-intents.service.ts`, and narrowly required `job-effects.service.ts` admission helper/tests.

Reuse the existing `booking_stock` job-effect **head** keyed by tenant + booking ID and its UUID revision. Add one domain intent table for immutable versioned stock payload, payload hash, job ID, disposition and entry reference; unique tenant/booking/revision and job identity. No second queue/lease implementation, no embedding receipt schema expansion. Retain release/delete intent after booking deletion: no cascading FK that deletes recovery evidence.

Extend/reuse the existing admission implementation so it locks the effect head, applies/locks the booking mutation, derives the canonical stock snapshot/hash **inside that same transaction**, then stores intent/head/bg_job together. Current createJobRequest takes a precomputed sourceHash and always creates a new revision; add a narrow shared admission seam rather than reading booking state outside the transaction or copying another queue implementation. Preserve role restoration before inserting bg_jobs. Duplicate same-request/hash returns the existing intent/job under the head lock; changed stock-relevant state creates a new revision under the admitted policy. Do not use updatedAt as a uniqueness/revision token.

Stock-relevant projection: operation/target disposition, booking product/event-type effect, chosen warehouse, explicit/default consumption basis, source='booking', canonical booking ID, actor ID and resolver-version marker. Exclude unrelated appointment text/timing from stock revision unless it changes the chosen stock semantics. Store only data needed for execution/audit, not copied attendee PII. Bound payload/line counts using the existing route/domain limits or explicitly admit new limits.

### B. Every producer and fenced SQL execution

Own `scheduling-bookings.service.ts`, new `scheduling-booking-stock-jobs.service.ts`, `stock-accruals.service.ts`, only necessary private transaction extraction in `stock.service.ts`, the three `[id]` API routes above, and handler import in `src/routes/api/jobs/tick/+server.ts`. Preserve public stock wrappers and existing invoice/POS behavior.

Move create/set-status/PATCH/delete and explicit complete/accrual producers onto the common admission boundary. Generate booking identity before atomic creation if necessary; preserve UID retry behavior without orphan/new duplicate intents. Deletion commits a retained release intent with a tombstone snapshot. For completion arriving before accrual executes, carry the needed accrual inputs into the current desired-state intent or explicitly chain that predecessor; never supersede it then treat empty accruals as success.

Worker uses registerJobHandler + withJobRequest/withOwnedJobScope. Use one consistent lock order: job ownership → effect head → booking/intent → stock entry → bins. Extract existing DB-only accrue/release/create/submit/stamp operations into transaction-taking helpers; do not open nested withOrgCore transactions and do not write a parallel stock ledger. Each bounded stage commits its stock change and intent checkpoint together. Recheck current revision, tenant, desired status, entry payload and cancellation at every stage. Preserve the draft after a domain submit warning by ending the draft stage first; a failed submit stage must roll back and record its blocked disposition in a subsequent freshly fenced transaction, never continue SQL in an aborted transaction.

### C. Booking issue idempotency and operator status

Own the booking-specific index addition in `pg-schema/stock.ts` and the same migration, focused stock service tests, a bounded scheduling status/retry endpoint, `BookingsView.svelte` and its tests; locale files/design governance are serialized with root.

Preserve ledger identity `(orgId, source='booking', sourceId=bookingId)` across job attempts/revisions. Add a database-enforced unique **active booking issue** constraint, consistent with existing draft/submitted versus cancelled behavior; preflight existing duplicates and refuse migration without an owner disposition, never delete/merge history automatically. A revision is not a new stock source ID. Reconcile an existing draft/submitted entry and verify its identity/payload before checkpointing; an already submitted entry must not be submitted again or rewritten.

Expose persisted pending/running/blocked/settled/superseded disposition and existing draft entry reference. Never mark a booking stock-successful from queued admission alone. Keep booking completion independent of stock availability; failure to persist the intent itself rolls back the booking transaction because otherwise durability is impossible. Map safe error codes to copy, not raw SQL/provider exceptions. Read/retry requires existing scheduling module/capability and record authority; retry addresses the current intent and retains its stock identity. Do not use cancelJobsByRef globally: it lacks tenant/type scope. No direct browser call to cron.

## Native acceptance gate

New `scheduling-booking-stock.sql.integration.test.ts` uses actual disposable PostgreSQL migrations/RLS and real booking/worker/stock services, with deterministic local barriers. Add it explicitly to `scripts/qc/jobs-postgres-contract.ts` and `vitest.jobs-postgres.config.ts` with expected file/count/no-skip guarding. Keep backend-kill admission separate.

Required cases: booking+intent+job atomic rollback on invalid combined PATCH/audit/intent insert; idempotent UID/HTTP retry; committed intent reopened by a fresh process before first dispatch; two claimants/expired owner; duplicate completion and stock draft race produce one active issue and one ledger effect; restart after draft, after submission and before accrual stamping; completion-before-accrual; cancel/edit/delete before dispatch and between stages under the selected revision policy; blocked negative stock retains draft and requires selected retry authority; stale worker cannot publish after supersession; mismatched existing draft is not silently rewritten; tenant/RLS/owner/retry denial; no resurrection of settled accruals; malformed/oversized payload refusal. Observe committed DB state, not only mocked call counts. Actual child restart is fixture-only, not a claim of power-loss durability.

Run existing booking atomic/update/accrual suites, stock/stock-accrual suites, jobs ownership suites, new native lane, typecheck, design/token checks and a credential-free UI fixture. Actual authenticated operator flow, migration preflight/application and production cron/handler adoption are separate release gates. No retrospective stock backfill, provider calls, new scheduler/library or broad stock rewrite belongs to this slice.

## Admitted compatibility policy,2026-09-12

This admission derives from actual source behavior at Hub77445c01 and the user's instruction to implement gap closure, not elapsed silence on the optional question. Preserve existing non-cancelled drafts and posted entries; never silently rewrite or reverse them, and do not resurrect released/realized accruals. Business-stock failures remain visible and require authorized explicit retry; interrupted infrastructure work may resume automatically.

Creation captures its resolved accrual basis at creation admission. Existing completion re-resolves UOM from qtyConsumption: therefore an explicit completion request resolves issue lines with the then-current UOM exactly once and stores that execution snapshot when no draft/submitted entry already exists. Existing entries are reused unchanged. Submission valuation continues to use current bin moving-average rates. Ordinary product/event-type edits do not automatically re-accrue; explicit accrual adjustment owns that change. Timing/text-only edits do not mint a stock revision.

Atomic intent SQL failure rolls back the booking mutation as the intended durability correction. Domain stock warnings do not prevent booking completion: record safe blocked state without continuing an aborted SQL transaction. A completion-before-accrual intent must carry the prior captured accrual basis; no lost predecessor or false no-op.

Additional producer discovered: src/routes/api/gateway/actions/booking-complete/+server.ts. Preserve confirm:false preview, assistant scheduling edit capability and actor identity; confirm:true joins the same atomic admission and explicit retry contract. All producer claims include this route.
