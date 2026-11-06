# Digest domain model

E owns `supabase/migrations/20261023020000_pulse_digest.sql` after D's `20261023010000_pulse_dispatch_receipts.sql`. Add `src/server/db/pg-schema/pulse-digest.ts` and `pulse-feedback.ts`; extend the paired D `scripts/qa/seed/pulse.ts`, index/IDs/matrix sequentially. Verify timestamp availability. Apply through the actual migration runner only to the marked local disposable DB; repeat and assert invariants.

## Policy and identity

`DigestPolicyV1`: immutable policy revision; stable budget namespace; configured org/profile (one personal owner); enabled flag; locale `en|es`; exact allowed HTTPS origin/path/query and source IDs (1..5); package IDs and repository commit/lock hash/file anchors; input maxima 20 items/49152 bytes; one reasoning call, 30s deadline, 1024 output tokens; maximum 5 calls/day; approved per-call upper exposure and daily maximum in integer micro-USD, approval reference/expiry/model/provider/pricing revision. Defaults disabled, approved spend zero; missing/unverifiable bounded model output or cost exposure denies admission. Policy cannot silently add sources, tools or recipients.

Canonical evidence item contains source ID, normalized public URL/content/version, immutable content hash, observation time and matching dependency/file anchor. Snapshot hash is canonical ordered source/item content excluding observation/fetch timestamps and transport ETag. Freeze checkpoint `(source_id,revision)` consumed by the run. Evidence serialized UTF-8 bytes <=49152 and total items <=20; normalized oversize is rejected, never silently truncated into a different claim. Complete model request has a deterministic bound including system/schema overhead; use <=65536 UTF-8 bytes and admission rejects a larger request.

## Admission and collection

`pulse_digest_admission`: composite PK/unique `(org_id text,owner_profile_id text,budget_namespace text)`. Required enabled/current-policy revision, approval revision/expiry and limits; UTC budget day; nonnegative integer attempted calls; nonnegative `reserved_micro_usd`, `settled_micro_usd`; `unknown_exposure_fence boolean`; nullable active run/attempt UUID and admission generation; update timestamp; `retired_at` optional permanent replay namespace retirement.

Polling fields: `next_poll_at` timestamptz, collection owner UUID/generation nonnegative integer/lease expiry, last safe collection outcome and timestamp. First enabled poll due immediately. Claim only due/current/enabled/authorized row; lease 30s; success next poll now+15min, failure now+5min. Collection performs no model call and no accepted cursor write. Disable/revoke increments generation and clears collection lease in the cancellation transaction. Retired namespace never accepts old policy/input triggers.

One active reasoning attempt per namespace. Increment attempted calls and reserve approved exposure atomically with run reasoning_admitted. Count only actual admitted external attempts, not source polls, no-change or busy deferrals. Unknown exposure carries across UTC rollover/policy revisions and fences all later inputs. Rollover creates the new day's counters while preserving unresolved reserved exposure/fence; retain prior settlement audit so old attempt cannot debit the wrong day or release a successor. Never derive namespace from policy revision. Settlement matches org/owner/namespace/run/attempt/generation and admitted UTC day.

## Runs and checkpoints

`pulse_digest_runs`: UUID; org/owner/namespace/policy revision; source snapshot hash; immutable evidence/request hash and bounded stored evidence; consumed checkpoint revisions; model requested/resolved descriptor; unique job ID; state; nullable admitted timestamp/generation/attempt ID; admitted budget day; bounded raw terminal response/usage (response <=65536 UTF-8 bytes); usage status `known|unknown` with nullable cost; validated result/hash; card ID; safe reason; attempts integer 0..3 and nextAttemptAt; creation/update timestamps.

Unique `(org_id,owner_profile_id,policy_revision,source_snapshot_hash)` enforced before enqueue in same transaction. Current policy and budget namespace checked while locking admission row; duplicates return existing run/job even after terminal state. A changed policy may create a new logical run only under the stable namespace's existing spend/fence. Queue at most one active run for configured owner; a busy collection does not create unbounded queued snapshots. It records safe deferred outcome and polls later.

States: `queued|reasoning_admitted|reasoning_received|published|no_signal|superseded|failed|canceled|indeterminate`. `reasoning_received` requires persisted bounded response+usage envelope; `published` requires card ID/result hash; `indeterminate` requires admission and reason. Once admitted, no automatic transition back to queued. Known invalid schema/citations terminate failed, preserving actual bill. Unknown bill with known response still fences namespace; no new publication promotion is asserted from incomplete billing. Received valid output may publish only under explicit known-complete receipt policy described in runtime contract. No-signal deterministic unchanged input can settle without model admission.

`pulse_digest_sources`: unique `(org_id,owner_profile_id,policy_revision,source_id)`; accepted ETag/version/content hash; revision integer >=0; last committed run; timestamps. Snapshot admission records expected checkpoint revision; publication/no-signal CAS advances all checkpoints together. Fetch never advances them. Missing source checkpoint is represented by revision 0 and created transactionally; competing creation/update is a CAS conflict, not last-write-wins.

## Feedback

`pulse_feedback`: UUID; org/owner/actor; proposal ID/content revision; digest run/policy/source revision/hash; reason exact enum `useful|irrelevant|duplicate|fact_error|already_handled|too_late`; optional comment <=500 Unicode characters; client action UUID; nullable `supersedes_feedback_id`; created timestamp. Unique `(org_id,actor_profile_id,client_action_id)`; repeat same complete content returns same row, changed payload conflicts. Correction locks current feedback, appends next row and permits at most one successor per predecessor. Supersession composite FK validates same org/owner/card/content revision, forbids self-reference, and uses restricted deletion. Same actor/owner required; stale content/old predecessor returns conflict.

## RLS, constraints and retention

Every new table has org+owner RLS using app GUCs; restricted role tests prove same-org other-profile denial. Admission/history IDs do not cascade from deletable profiles. Current authority is required on writes; retained historical IDs remain after revocation. Composite scoped FKs connect run/source/card/feedback identities and jobs with restricted deletion; insertion validates job tenant/user/type/ref. Do not grant ordinary domain role global `bg_jobs` access. Use D's restore-role bookkeeping transaction seam.

Public ingestion cannot set internal owner/run/policy/input/result fields or reserved dedup keys. D's internal binding columns are immutable; published card is `kind:'digest'`, informational. Internal card payload is <=16384 bytes, title <=500 characters, summary <=4000 characters, matching existing ingest bounds.

Raw public evidence, terminal response and comments expire after 30 days by default; redact payloads but retain minimal IDs/hashes/states/admitted costs and replay tombstones. Queued work missing required retained data cancels. Runs/namespace retirement prevent source deletion/feedback deletion or raw retention from recreating paid attempts. Deleting tombstones requires namespace retirement first. No raw private payload in general analytics.
