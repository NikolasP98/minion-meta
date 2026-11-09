# Pulse data model and migration contract

D owns additive migration `supabase/migrations/20261023010000_pulse_dispatch_receipts.sql`, paired `scripts/qa/seed/pulse.ts`, `seed/index.ts`, `seed/matrix.ts`, `seed/ids.ts`. Verify the timestamp is unused before coding; coordinate a new unique timestamp if the target moved. Do not modify historical migrations. E owns the subsequent digest migration and imports these definitions after D's commit.

## Proposal revision

Extend `src/server/db/pg-schema/pulse.ts` / `pulse_proposals` with `revision integer not null default 1 CHECK revision >= 1`, `decided_at timestamptz`, nullable `owner_profile_id text`, nullable internal binding fields `internal_run_id uuid`, `internal_policy_revision text`, `internal_input_hash text`, `internal_result_hash text`.

Legacy rows get revision 1, no invented owner, no inferred decision time or receipt. A proposal's pending edit requires exact expected revision and increments it atomically. Deciding does not increment content revision; it freezes that version and sets decision timestamp. Internal digest cards have all internal binding fields and owner present or all internal fields absent; the reserved dedup prefix is required for internal binding. New executable approval binds `owner_profile_id` to the approving profile. Existing informational rows without owner keep org-scoped behavior. All list/count/detail helpers apply `(owner_profile_id IS NULL OR owner_profile_id = current profile)` so new digest/dispatch cards cannot leak through the ordinary feed or count.

After decision, payload/revision/owner/internal binding are immutable. Enforce by guarded service writes plus a database constraint trigger covering direct SQL, not UI disabling alone. For internal digest cards, content is immutable from insertion; pending approve/dismiss changes decision metadata only. Hash canonical JSON with the existing `canonicalJson` convention; never compare hash alone without verifying the immutable identifiers/binding.

## Dispatch

New `src/server/db/pg-schema/pulse-dispatches.ts` / `pulse_dispatches`:

- UUID primary key; `org_id text`, `proposal_id uuid`, `proposal_revision integer >= 1`, `actor_profile_id text`, `gateway_id uuid`, explicit `channel`, `agent_id text`, `origin_session_key text`; all required.
- Required typed `action_kind`, bounded immutable serialized payload (existing Pulse payload ceiling 16 KiB), `payload_hash`, `tool_schema_revision`, `authority_snapshot_hash`, `gateway_qualification_revision`.
- `state` enum/check `queued|admitted|scheduled|indeterminate|rejected|canceled`; `bg_job_id text`, `attempt_count integer default 0 CHECK 0 <= attempt_count AND attempt_count <= 3`, nullable `next_attempt_at bigint`, nullable admitted timestamp/generation, nullable `remote_job_id`, safe reason, creation/update timestamps.
- Unique `(org_id, proposal_id, proposal_revision)`; unique `(org_id, id)`; composite FK `(org_id,proposal_id)` references a matching unique proposal key, `ON DELETE RESTRICT`. Link `bg_job_id` to its job with restricted deletion and validate `bg_jobs.tenant_id/ref_id/user_id/type` binding in insertion transaction; do not rely on ID alone.
- `scheduled` requires nonempty remote job ID plus admission time/generation. `admitted` and `indeterminate` require admission time/generation; indeterminate requires safe reason. `queued` cannot have remote receipt. Remote scheduling never sets proposal `executed_at`.
- Actor/org identifiers on retained tombstones are historical identifiers, not cascading FKs to deletable account rows. Current live membership/ownership is checked at write/admission. Proposal/job relationships restrict deletion; user deletion must cancel/fence before identity deletion and retain minimal history. This avoids blocking legitimate account deletion or erasing uncertain admission.

Enable RLS with org AND actor checks for `app_ledger`, using the real `app.current_org_id` and `app.current_profile_id` GUCs. New restricted tables use FORCE RLS where compatible with existing trusted worker setup; tests must assert the effective runtime role and policies. Do not claim FORCE on pre-existing Pulse tables unless migration actually enables it. Deny ordinary deletion of admitted tombstones. Use scoped service grants, not broad public grants.

## Background due time and transaction seams

Extend `src/server/db/pg-schema/bg-jobs.ts` with nullable `next_attempt_at bigint`, default NULL; index selected `(tenant_id,type,user_id,next_attempt_at,updated_at)` according to EXPLAIN on fixture queue. NULL preserves current eligibility. Due time is part of both candidate and atomic-claim predicates; include candidate/current generation in claim so stale observations do not bypass another worker's transition.

D implements `enqueueJobInTransaction(tx,input)` as the only new small primitive; normal `enqueueJob` delegates. Enqueue inside an ownership or approval transaction after domain deduplication. Do not broaden `app_ledger` permission to global `bg_jobs`: domain writes run inside `withOrgCoreTransaction`, then restore bookkeeping role for job insert/update in the same transaction, following existing job-effects patterns.

Decision receipt is a projection, not a new table: proposal ID/revision/decision/time plus dispatch receipt ID/state/reason/remote ID. Historical `executed_at` alone projects `legacy_unverified`.

## State and retention

`queued → admitted → scheduled|indeterminate`; queued proven pre-dispatch failure increments attempt count and postpones 5s then 30s; third failure rejects. Once admission is committed, no automatically retryable transition exists, including a crash before the socket send. Known deterministic authorization/schema rejection cancels/rejects without a remote request. Reclaimed admitted work becomes indeterminate. Positive audited evidence may attach a known receipt; no missing-remote/list result unlocks replay.

Scoped cancellation transaction marks queued work canceled and bumps job generation together; already admitted work remains as admitted/indeterminate evidence and is never reset. Late callbacks cannot settle without current ownership. After 30 days, a privileged retention transaction may irreversibly clear only the dispatch raw action snapshot and set `payload_redacted_at`; preserve its immutable hash, identifiers, admission state and receipt. The database trigger permits only this one-way redaction, never replacement or restoration. Keep the proposal content revision immutable; the dispatch reader returns `payload_unavailable` after redaction. Cancel queued work before removing required payload, and never replay an admitted row whose payload was redacted. Tombstone deletion requires prior retirement of the replay namespace. Use the existing user deletion/membership-update callers to invoke cancellation; worker checks remain authoritative even if cleanup is delayed.
