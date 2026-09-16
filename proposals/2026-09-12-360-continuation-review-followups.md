---
id: 2026-09-12-360-continuation-review-followups
title: 'Follow-ups from independent review of Claude continuation'
status: draft
created: 2026-09-12
updated: 2026-09-12
repos: [minion-meta, minion, minion-hub]
---

# Follow-ups from independent review of Claude's 360 continuation

Status: resumed repairs qualified. R3/R5/R6/R8 deployed in Hub PR269; R1/R7 fixed and merged to Gateway DEV in PR292, with production PR293 tracked separately. R2/R4 remain open. See the current priority-delivery report for exact runtime status.

Evidence and exact reviewed commit/line references: [2026-09-12 review](../.planning/operations/360/REVIEW-2026-09-12.md). Preserve the distinction between reviewed remote source and the older dirty working checkouts. Existing candidate/task completion does not certify production adoption.

1. R1: Bind durable outcome shell identity to its authenticated registered shell; retain the native same-org shell-a/shell-c regression.
2. R2: Apply linked-record existence, module-view/edit and owner-scope authorization to attachment read/download/link/unlink.
3. R3: Integrate the verified15-07 parser-version binding with current jobs source; deny historical cursor continuation across parser semantics.
4. R4: Coordinate attachment link admission with sweeper deletion; cover interleavings and booking-delete reference cleanup before scheduling the cron.
5. R5: Restore generic persistence error responses in the servers API, preserving the actual credential-containment regression. Correct the separate outdated telemetry assertion.
6. R6: Validate complete booking patches before writes and transact coupled mutations/effect admission. Cover valid move/status plus invalid invoice/event-type combinations.
7. R7: Preserve/reject invocationKey on legacy wire calls rather than dropping it before the manager boundary.
8. R8: Restore the full green Hub test gate, repair the stock fixture's archived_at column, and add marked disposable PostgreSQL coverage for jobs/stock/finance concurrency.

Delivery follow-ups: publish/adopt the current sender/envelope generation after qualification; complete credentialed ACP, authenticated ERP and B2 upload acceptance. Container/app-load/real restore gates remain open. Correct stale GSD phase documents and malformed12-01 frontmatter; refresh the three drifted dependency snapshot hashes when their new candidate is admitted.

Acceptance: independently reviewed fixes at exact candidate identities, targeted regression proof, full required CI, then staged runtime acceptance. Do not interpret the existing83.0% planned-task figure as a security or production-readiness certificate. No customer data, runtime flags, migrations, bucket settings or deployments were changed by this review.


## Resumed dispositions,2026-09-12

- R3/R5/R6/R8: fixed and deployed f97efb2d43742772d5bc44b93260920bb20bb0a4; follow-on UI77445c01ec38657c767d6f011e77148be3cc4ccf preserves these repairs. Native jobs148/148, all ordinary hosted tests green. R6 is transaction rollback; the postcommit stock-effect crash window is separately recorded in2026-09-12-hub-booking-stock-postcommit-recovery.md.
- R1/R7: exact authenticated-shell identity and legacy invocation-key rejection have99 native/manager/RPC tests; PR292 mergedDEV2a2fdace858536114783d6d7dc4a3fbb76801898. Production is not inferred from DEV; consult the priority-delivery receipt.
- R2/R4: attachment record authorization, link/sweeper coordination and booking-delete references remain open. Keep sweeper cron disabled. No attachment/customer-data mutation was used for qualification.
- UI follow-ups: root-adopted13-REMAINING-CONSUMER-PLANS.md specifies exact keyboard and chart actions/negative cases. Real authentication remains a separate explicit target gate.

The original review below performed no deployments; the later authorized implementation did. Original83.0% is superseded by193/229=84.3% scoped deliverables, not production readiness.


## Additional findings from production promotion gates

R9: Gateway realpathSafe used lexical fallback whenever realpath failed. Actual Linux reproduction of macOS-style aliases found legitimate missing files denied and missing descendants beneath escaping symlinks accepted. Repair resolves the nearest existing ancestor; dangling/cyclic links and permission/I/O errors fail closed. Nineteen targeted cases include the seven observed failures before correction. Source and actual production identity remain separate in the priority-delivery receipt.

The path predicate is a normalized-path snapshot, not atomic filesystem authorization. Existing check-then-use consumers can race a symlink replacement; operation-specific descriptor/handle-bound access or equivalent filesystem isolation needs a separate bounded owner/callsite plan. Preserve fail-closed resolution and actual consumer normalization. The exact predicate TODO points here; no atomic containment claim is made by the new tests.

Gateway release also found a canvas fixture/global-name mismatch, a fixed-sleep filesystem-watch test and actual JavaScript assets served with a non-JavaScript MIME type. Scoped fixes are tested and recorded with the new release candidate, not dismissed as generic CI flakiness. The earlier independent web-fetch endless-stream timeout is retained separately; focused no-retry execution passed and one failed-job rerun was authorized.

Factory promotion stopped safely before deployment when tool-host-only test selection omitted its runner dependency. PR188 adds an explicit runner install root and meaningful revoked-principal native test. An unchanged trusted controller executed the cumulative candidate from a clean dependency state before promotion; no gate, runtime flag or main-branch protection was bypassed.


R9 caller follow-through: actual exec helper statted and returned raw working directories while the guard checked a normalized path. A disposable child demonstrated link/../target could reach the outside fixture directory. The same repair packet now normalizes before stat and returns exactly that path, retaining unavailable-cwd fallback. The25 guard/caller cases prove this static semantic agreement; check-then-use replacement races remain the explicitly separate limitation above.


R10: Actual DEV CI34716632510 full Windows shard1 failed after a flow-query test timed out and two Nitter save promises raised unhandled EPERM errors. Nitter mutations start unobserved, unordered writes; test teardown can remove their directory while mkdir is pending. This is a persistence/lifecycle defect with production relevance, not dismissed as runner contention. The admitted repair serializes saves, observes failure, drains shutdown/teardown, and verifies the latest persisted state plus failure behavior. Full Windows acceptance remains required.

The synchronous flow-query test also leaves its verification SQLite handle open. A bounded try/finally correction is admitted without changing its SELECT-only guard, timeout or skip policy. The evidence does not establish that the open handle caused the15-second timeout; record focused timing and actual Windows results before claiming that failure resolved. Production PR293 remains held at this checkpoint.

Nitter repair boundary: serialized/coalesced writes and graceful shutdown do not establish crash-safe atomic file replacement, atomic feed-delivery/state effects, or durable acknowledgment by synchronous mutation APIs. Those APIs still acknowledge in-memory state; explicit save/flush can report persistence failure. Source TODO at the actual write points here. Follow-up must select atomic replacement/recovery and delivery semantics with restart fault cases before claiming exactly-once delivery or crash durability.

R10 qualified repair: PR295 source4662dbc6b2b2aef089529023f72448fe39123f5c merged DEVb841c36750e4bf10dd3f81a4896b19c699fe3132. All93 focused cases passed without skips/retries. Actual final DEV Linux/macOS runtime each passed13,037 cases/nine existing skips; full Windows passed12,879 cases/167 platform skips, zero failures. The previously failing boundaries pass at that candidate; the original timeout cause is still not proven. PR293 normal production merge7a1501e969014ec2fcfb69021bda843d0f90d23b has exactly the validated DEV tree. Consult the final release receipt for image/live adoption. No test timeout, discovery rule, SQL guard or platform skip policy changed.


## R2/R4 closure implementation and retained storage boundary

The admitted09-07/09-08 packet adds durable attachment classification, record/module/owner authority across typed and generic file paths, stable record-before-file locking, record-delete cleanup and retryable deletion claims. Its native acceptance uses the actual configured catalog in an owned PostgreSQL fixture; real B2/provider browser acceptance remains separate.

A presigned PUT can outlive a SQL deletion claim. Expiry does not prove an upload started before expiry has finished. Preserve the25MiB path (the fallback proxy caps at4MiB): record upload capability expiry before issuing the URL, deny access/linking once deletion is claimed, and delay first physical deletion until expiry. Retain immutable deleting tombstones after removing visible file rows; bounded sweeps must also reconcile tombstones without a file row, with hourly eligibility and oldest-attempt rotation. Simulated late PUT after first deletion must be deleted on a later sweep. Do not call first successful DeleteObject a final remote outcome or reactivate the attachment.

Remaining external decision: a provider-supported write-quiescence guarantee or an explicitly accepted retention policy is required before garbage-collecting these tombstones. No maximum in-flight provider upload bound has been established. The exact lifecycle source TODO points here. Sweeper scheduling requires reviewed adoption; customer objects and bucket settings are not test fixtures.
