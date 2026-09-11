# 10-10 actor-context review

Status: **conditional design acceptance; actor implementation and native qualification remain open**. This is a read-only source/design review, not a migration or database security certificate. Reviewed Hub branch: `feat/level-2026-07-30`. Only this report was written; no source, plan, database, runner, package or deployment action was performed. The MINION engineering review discipline separates standards from the selected contract below.

## Evidence boundary

The inspected905 migration contains tables and a descriptor validator, but no actor trigger, final privilege/RLS statements or COMMIT. Its line72 explicitly leaves those for this review. The additive helper likewise has no actor GUC setup yet. Findings concerning those additions are implementation gates, not claims about completed or deployed code. The author independently confirmed the intended two labels and immediate trigger design; no actor implementation was supplied for verification.

| Inspected input | SHA-256 |
|---|---|
| `10-10-PLAN.md` | `4e3ca50000d83d99c403507fa0c01cf963444da75da3ab8c6ba8e4d4898c1281` |
| `10-10-API-SCHEMA-DECISION.md` | `ab02dd3c1974e847e2b4a549984e8a6aea3a2792f568c731a6aa216fdcabe30e` |
| `minion_hub/src/server/services/job-effects.service.ts` | `b9e4c3a305e4b2fba6ad433f4ed6e871b9808d1e055581b6280faf7e1bc25df1` |
| `minion_hub/src/server/db/with-org-core.ts` | `37078f8de40257ac468ad5739cc030e3d1e21aa90601ffc0bbe544bd4e5ec9f9` |
| `minion_hub/src/server/services/bg-runtime.ts` | `29eeb1cabdde2bc56bf2dc86284a01712812e3d47295b5d2f417e3290469e87f` |
| `minion_hub/supabase/migrations/20260909090500_job_effect_page_batches.sql` | `a69a4c5c6947d4da3ff96ce7d5500513a39bbf6f9cfa8b0ea164704409e0dcf0` |

The existing903 precedent is `minion_hub/supabase/migrations/20260909090300_job_effect_receipts.sql:70–88`: FORCE RLS, tenant GUC policy, SELECT/INSERT/UPDATE for app_ledger, PUBLIC/browser-role revocation and no DELETE. It does not establish the future905 grants or actual applied catalog.

## Selected recommendation for root review

Use `app.job_effect_job_id` and `app.job_effect_lease_generation` as **trusted server execution labels**, installed by the actual owned-scope helper after its job prelocks, restored before bookkeeping, and checked by immediate narrow trigger code. Keep the authoritative job row locked and independently match its tenant, ID, generation, running state and live lease. Do not call these labels a token, authenticated identity, capability, or protection against malicious SQL possessing the application's database connection.

This is the smallest seam consistent with the packet's explicit trusted-process boundary at line46. Keep implementation within the already admitted helper,905 and its existing focused fixtures. A new identity service, secrets table or role architecture is not justified by this stale-worker task. If the requirement changes to hostile plugin SQL or compromised database credentials, stop treating these labels as authority and design a separate restricted connection/function boundary; another custom GUC cannot solve that requirement.

Root must explicitly settle the lock-order qualification in R2 before actor source is accepted. Everything else below is an implementation/verification condition, not permission to widen source ownership.

## Findings and required boundaries

### R1 — Writable labels do not authenticate a caller

**Evidence:** `with-org-core.ts:35–55` itself sets custom context and role with `set_config`; its documented connection model at67–74 starts as postgres with RLS bypass and switches to app_ledger. The API packet at46 already excludes a plugin capability sandbox. `job-effects.service.ts:223–233` trusts the supplied execution object's `withOwnership`; the actual producer is `bg-runtime.ts:227–250`.

A caller with arbitrary SQL can set the job/generation labels. Same-tenant reservation/dispatch IDs and generations are stored in readable batch rows (`905:43–45`), so they cannot serve as secrets. A caller controlling the privileged session can also change org context/role. FORCE RLS protects forgotten filters under the selected role; it does not independently authenticate the organization string supplied by that process.

**Impact:** checking a live job row prevents a stale *honest* label from authorizing work, but does not distinguish two callers that present the same current label. The actual runtime's locked lease check and trusted execution construction remain required. A fabricated `JobExecution` is not a valid production authority source merely because its TypeScript shape matches.

**Minimum correction:** document that boundary and test stale/missing/malformed contexts as fencing cases. Do not label an intentionally forged current marker's acceptance as an authentication test pass. Do not add direct bg_jobs grants to make the scoped callback's checks work.

### R2 — NOWAIT after head locks is safe re-locking only when the owner was prelocked

**Evidence:** the selected order is explicit in PLAN93 and API75,126,136: current job, sorted foreign jobs, scoped role, sorted heads, domain/page/batch/unit locks. `job-effects.service.ts:294–314` currently implements foreign tenant-filtered NOWAIT prelocks before entering the scoped callback; an absent row produces owner_missing, and locked/live owners produce owner_busy. API126 requires rollback on an expanded frontier, never late foreign acquisition.

An immediate trigger issuing `SELECT ... FOR UPDATE NOWAIT` for an old owner after a batch mutation will re-lock an already held row on the correct helper path. An arbitrary direct SQL update can instead acquire that row for the first time after taking batch/head locks. NOWAIT prevents waiting for that job row; it does not prove the prelock history or enforce the stated complete order. Dropping the row lock from the trigger would weaken the invalidation check's concurrency guarantee for direct writes.

**Recommended root selection:** retain NOWAIT rechecks and keep the strict order guarantee attached to the real helper/service protocol. Direct SQL constraints must still reject invalid transitions, cross-tenant links, live foreign-owner recovery, stale generations and immutable-field changes; do not claim every arbitrary SQL transaction obeys the service's head/job order. Prove the real helper's frontier rollback with independent connections.

**Optional stricter structural guard, only if selected:** the helper can publish a bounded list of successfully prelocked owner ID/generation references alongside its labels. The trigger must reject an undeclared old owner before attempting its row check. Include the already locked current job explicitly and publish only after all locks succeed. This stays within the existing helper/905 files and catches accidental closure omissions. It remains forgeable trusted context and cannot prove prelocking against hostile SQL; do not add it under an authentication claim. Do not invent an unbounded owner list or claim to infer tuple locks from a generic transaction lock inventory.

### R3 — The definer must explicitly enforce tenant and operation identity

**Evidence:** proposed checks run with elevated function rights while the selected tables use org-GUC RLS. `905:32–70` establishes composite tenant keys but no actor transition logic yet. `job-effect-pages.service.ts:460–507` separates admission ownership from historical response ownership.

The definer must not assume its own effective role is app_ledger: SECURITY DEFINER changes the effective user inside the function. Likewise, a check of session identity or the role setting alone does not identify a job execution. Require nonempty valid org/job/generation context and explicit equality to the affected OLD/NEW tenant; query the fully qualified job table with both tenant and job ID. Validate the generation before conversion and reject missing, malformed, negative or out-of-range values without treating them as legacy authority. Match the stored generation, running status and lease condition.

The current actor tuple is necessary but not sufficient for every transition:

| Mutation | Additional relationship required |
|---|---|
| New reservation | NEW reservation owner/generation is the current actor; immutable descriptor and full member snapshot are valid. |
| Reserved admission | OLD reservation owner/generation is the actor; NEW dispatch identity equals that actor; exact reserved-state CAS and unchanged descriptor/membership. |
| Reserved transfer | NEW reservation actor matches; OLD owner is the same current execution or is proved invalid under the selected prelocks; same-job older generation is distinct from same-job current generation. |
| Unsent abandonment | Current actor is known separately from the retained original owner. Same current owner may abandon; foreign live owner may not. Preserve immutable original membership and release all placements atomically. |
| Complete response retention | Actor equals immutable original dispatch job/generation and still owns its live job. Semantic head supersession must not reject historical evidence. |
| Page publication / unit changes | Page job association, immutable unit identity, legal placement and complete current semantic/domain authority still apply. A live job label alone does not authorize arbitrary page publication. |

Never move or reclaim admitted/received batches, invent a missing owner row, or infer invalidation from a skipped row. A received result remains immutable. The service's current historical-retention check at497–505 is a useful positive case: enforce ownership without introducing fresh-head requirements there.

### R4 — Actor checks must run before label restoration; nesting is a separate issue

**Evidence:** `with-org-core.ts:45–60` restores role/org/profile/timeout in finally, preserving an original SQL error when the transaction is aborted. `job-effects.service.ts:314–320` saves progress after scoped restoration. The ownership producer opens a fresh transaction and locks its current job (`bg-runtime.ts:227–233`).

Make actor checks immediate. A deferred trigger that reads these ephemeral labels at outer COMMIT would run after they have been restored and could deny valid work or read unrelated previous context. Deferred structural completeness checks may be appropriate, but must not depend on a live actor label surviving the callback.

Capture previous actor settings, set transaction-local values, and restore exact previous values before progress bookkeeping. Treat absent/empty context as no actor. Preserve the original error if SQL abort prevents cleanup, ensure outer rollback, and never save progress after an otherwise successful callback whose cleanup failed. Restoring role/org/profile while leaving actor labels behind is incomplete.

Nested `withOrgCoreTransaction` scopes should restore the previous actor context correctly if supported by the surrounding helper. However, recursively invoking `withOwnedJobScope` invokes `withOwnership` again and opens another transaction; it is not safe nesting merely because GUC restoration is stack-shaped. Same-job recursion can wait on its own outer transaction. Keep nested owned scopes unsupported in this child and do not introduce them in callbacks; supporting them requires an explicit separate transaction-ownership design.

### R5 — Privilege, name-resolution and lease-time details require actual-engine evidence

Use fully qualified relations/functions, a fixed trusted search path with explicit temporary-schema handling, no dynamic caller SQL, and narrowly scoped function privileges. A fixed `pg_catalog,public` declaration alone is not proof that every referenced object is safe from shadowing or that public schema creation is prohibited. Verify function owner, actual schema CREATE permissions, app_ledger attributes/membership, PUBLIC/browser EXECUTE revocations and the absence of new bg_jobs grants in the qualified catalog. Do not assume FORCE RLS constrains a bypass-capable definer.

The existing runtime checks application `Date.now()` before and after the callback; foreign-owner prelocking does the same (`job-effects.service.ts:310`). A SQL liveness predicate must use an explicitly selected current-time comparison, not accidentally retain transaction-start time as a continuing lease. Preserve the existing runtime's final ownership check. Adding a database-clock check may conservatively refuse work when clocks differ; it is not permission to change the project's clock policy or to claim the two clocks are identical. Qualify the selected expiry boundary, including an expired same-generation actor and a foreign owner whose lease expires during contention.

## Required focused evidence before acceptance

No tests were run in this review. The following belong in the already admitted fixtures, after root approves their private native lane:

1. Real `withOwnedJobScope` success and rollback prove role/org/profile/actor restoration before progress; missing, malformed, wrong-tenant, stale-generation and expired-actor writes are denied. Preserve the original SQL failure, not a cleanup exception.
2. Same live owner abandonment succeeds; a live foreign owner cannot transfer or abandon; invalid foreign generation/status/lease succeeds only under the selected protocol; absent owner remains recovery-required. Admitted/received ownership never becomes reclaimable.
3. Two real independent connections prove reciprocal prelock contention yields promptly, frontier expansion rolls back before mutations, and the helper never discovers/acquires a new owner after heads. Test any selected declared-owner marker independently from the live-row predicate.
4. Direct restricted-role SQL proves immutable descriptors/results/tombstones, complete companion release, cross-org keys, exact dispatch identity and no bg_jobs read/write grant. Separate structural enforcement from unsupported hostile-credential authentication claims.
5. Immediate actor checks work while labels are present; any deferred completeness trigger succeeds after labels have been restored. A later transaction cannot inherit usable actor context. Verify the actual function owner/search path/grants and a deliberately shadowing temporary relation in the disposable engine if applicable.
6. Historical complete response retention survives semantic supersession for the current dispatch owner, but fails for an expired/replaced execution. Page publication still needs current domain/head authority.

## Review disposition and handoff

**Standards:** the proposed bounded helper/trigger approach fits the trusted server architecture and avoids broad job-table grants. No source or database change was made by this reviewer. Native privilege, lifecycle and concurrency proof remains unperformed.

**Spec:** conditional. Current/foreign locking and post-scope progress are present in the helper. The absent905 actor/transition/RLS completion cannot yet meet the direct-SQL acceptance criteria. R2 requires root's explicit scope interpretation or a bounded additional context guard; no blanket arbitrary-SQL lock-order guarantee should be recorded.

Root owns the proposal/global decisions and executor admission. Before source freezes, the executor must place relevant `TODO(handoff)` comments at the affected source sites for any deliberately deferred guarantee, and root must mirror them in `proposals/2026-09-08-platform-qc-remediation.md` under JOB-02. This report does not substitute for that ledger and does not authorize this read-only reviewer to edit those files.

## Root selection following review

Root selects the trusted-service boundary and the bounded prelocked-owner manifest described in R2. This supersedes the optional disposition above: the manifest is required in the next actor amendment, while the strict no-new-job-lock-after-heads guarantee remains limited to the real helper. Writable labels and a writable manifest do not authenticate hostile SQL.

Implement immediate actor checks only. After validating and successfully prelocking the complete owner set, the helper publishes the deterministically ordered owner ID/generation references in transaction-local context alongside current job/generation. Limit input to256 validated owner references and the exact serialized manifest to131,072 UTF-8 bytes (128 KiB). A trigger must reject an undeclared foreign owner before attempting its NOWAIT query, then recheck tenant/live current generation and the applicable OLD/NEW owner relationships. The current job is already locked by the runtime and identified by its actor labels; handle it separately so256 foreign references do not accidentally become a257-entry rejection. If the selected representation includes the actor, its extra framing must be counted explicitly without silently reducing the admitted foreign count.

A declared foreign row may be re-locked with NOWAIT; missing/live owners still deny recovery. The manifest is not sufficient invalidation evidence and must never suppress that row check. Keep exact row tenant predicates, fully qualified references, fixed trusted search path, narrow function ACLs and no bg_jobs grants to app_ledger. Capture and restore the manifest plus actor settings on both success and failure, before cursor bookkeeping, while preserving original SQL errors and rollback behavior.

### Manifest capacity compatibility

The128 KiB cap is an **additional capacity gate**, not a mathematical consequence of the existing256-reference cap. `job-effects.service.ts:47–53,283–289` accepts job IDs up to256 JavaScript code units and forbids NUL but does not restrict IDs to ASCII or UUIDs. For example,256 distinct IDs dominated by255 three-byte Unicode characters produce well over128 KiB even before all JSON framing; accepted non-NUL controls may expand further under JSON escaping. No data-dependent truncation or partial owner locking is acceptable.

The actual enqueue producer uses `crypto.randomUUID()` (`bg-runtime.ts:67`), so normally generated IDs have ample room. That source observation is not authority to reject or rewrite every historical non-UUID ID. Keep the selected128 KiB cap, validate/count the exact escaped serialization before acquiring foreign/head locks, and reject the entire oversize attempt as a stable capacity error. Do not turn it into owner_busy, frontier_changed or an automatic retry loop. The existing page discovery's1 MiB metadata ceiling does not imply this smaller manifest ceiling.

Native/validator coverage must independently include256/257 references,128 KiB/limit+1 serialization including Unicode and escaping, duplicates/deterministic ordering, multiple generations for one owner, declared but absent/live owner rejection, undeclared foreign owner rejection before lock attempt, and same-job current/older-generation cases. Count exact references consistently before and after deduplication; do not silently admit more than256 input references merely because they deduplicate. Test transaction rollback with no partial reservation and prove marker restoration. These are requirements for the executor; this reviewer ran no tests or database commands.

Final scoped verdict: **root's actor design accepted with the selected manifest/capacity/lifecycle conditions; implementation and native verification remain open**. Root owns the corresponding PLAN/API and proposal amendment. Ready for the separately admitted14-14 task after delivery of this report.
