# Security and stock gap closure, then SDK/transport

Status: executing. User explicitly ordered closure of remaining gaps in the two categories reported as100% of original tasks, followed by SDK/transport. The historical193/229 metric is frozen for comparison; this operation records actual gap acceptance separately. No phase is closed merely because its old SUMMARY files exist.

## Execution boundaries

1. Security: attachment linked-record/module/owner authority on every read/download/link/unlink; deletion/link/sweeper interleavings and booking-delete reference cleanup. Preserve private object storage, deny unauthorized resource disclosure, and keep sweeper scheduling disabled until its release gate is met.
2. Jobs/stock: atomic booking mutation + durable stock intent/job admission, every producer, fenced existing worker execution, one active booking issue, operator status/retry and actual PostgreSQL restart/concurrency/RLS evidence. Reuse existing job infrastructure and stock ledger. Prospective only; no history replay or posted-ledger rewriting.
3. Independent closure: reconcile each original09/10 requirement with exact deployed source, migration/worker adoption and supported native acceptance. Identify external/credential gates without inventing success. Previously rejected PostgreSQL backend fault injection remains excluded; evaluate permitted alternatives and label their limits.
4. SDK/transport follows accepted security/stock closure or a precisely recorded external blocker, with independent work prepared in parallel. No automatic implementation of every old phase14 plan: select remaining partial tasks and current installed consumer boundaries first.

## Ownership and sequence

- review_hub_takeover owns attachment service/routes/tests and proposes the narrow booking-delete helper. It does not edit the stock owner's shared booking source or migration.
- review_gateway_takeover owns stock helpers, booking producers, durable admission/handler/status and their tests; it serializes any shared booking-delete hook and migration integration.
- recount_takeover independently inventories acceptance gaps, then verifies admitted repairs and prepares the SDK sequence.
- Root owns GSD gap plans/allowlist, policy admission, cross-project review, progress, migration/release disposition and final delivery records.

Actual Hub master77445c01ec38657c767d6f011e77148be3cc4ccf is unchanged. No remote dev branch exists, so isolated Hub work starts from actual master on feature branches. Gateway main7a1501e969014ec2fcfb69021bda843d0f90d23b remains verified. Meta dev has advanced beyond the prior docs merge; integration must preserve current upstream changes.

## Inventory compatibility admission

Existing source establishes draft/posted preservation and explicit business retry. Root admitted those existing contracts, plus operation-time capture preserving current creation and completion UOM resolution, after source review. No reply or approval was inferred from silence. Exact boundaries are recorded in the stock design; the optional policy question remains available for user steering. Producer discovery also added the assistant booking-completion route.

The prior stock design is at ../../phases/10-durable-jobs-stock/10-BOOKING-STOCK-RECOVERY-DESIGN.md. Typed analytics, hostile-filesystem-writer isolation, provider sessions and real authenticated UI gates must be assigned to their actual requirements rather than silently folded into a broad security score.

## Verification and delivery

Each packet needs actual failing/passing boundary evidence, focused existing regressions, types and required repository gates. Native tests use disposable isolated data; customer accounts, buckets, configuration and production records are not test fixtures. UI additions require design governance and existing RBAC/i18n integration. Production migrations require a concrete reviewed migration/preflight/rollback or roll-forward plan before application. Preserve active dirty checkouts and other agents' work. Source-only, merged, installed and deployed states remain distinct.

Paired source TODO and proposal entries remain mandatory for material open ends. New gap plans are admitted by exact path in a separate gap allowlist; the original229-task comparison denominator is not rewritten. Updated actual category closure is reported independently of that historical percentage.

## Verified worker adoption gap

Read-only Netcup inspection found minion-hub-cron.service serving127.0.0.1:3210 from an August10 build. Its exact imported bg-runtime lacks lease-generation/heartbeat/current-ownership checks and calls handler.advance(job) without the execution scope. The jobs wrapper runs at minutes5,15,25,35,45,55, sharing a global lock with other cron work. Recent scheduled invocations are recorded, but their redirected output does not prove HTTP success. Configured Hub aggregate state shows seven running jobs with expired leases and one queued job; no active lease does not prove no remote work remains in flight.

This source/runtime mismatch must be repaired independently from Vercel delivery. The reviewed jobs-only pause was applied at2026-09-12T22:58:48Z. Exact crontab SHA10fca2345398a3285ca6cfa1c5dccd9fc517f402e6399f4b390435d371cec98a matches the approved proposal, with every other entry unchanged. The old shared service remains running; no drain is claimed. A replacement Node artifact from77445c01 is being qualified under10-15. Do not stop the shared service, cancel customer jobs, replay indeterminate provider work or suppress other cron entries as an implicit workaround. The cron pause is the only production mutation performed so far; restore it only after reviewed safe worker adoption. Receipt: gap-closure/evidence/jobs-cron-pause.json.
