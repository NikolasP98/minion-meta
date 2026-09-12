---
id: 2026-09-12-360-continuation-review-followups
title: Follow-ups from independent review of Claude continuation
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
