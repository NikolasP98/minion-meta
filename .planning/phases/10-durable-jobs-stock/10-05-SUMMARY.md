---
phase: 10-durable-jobs-stock
plan: "05"
status: independently_verified_scoped
plan_sha256: 71e5a46c94caaffc3a0fd8f3c9151f3551140211f0fac127da1ffa8857c51c1d
requirements_completed: []
source_files_frozen: true
---

# Brain ingestion adoption

Brain add/reingest now create a shared request revision, mutate the document and enqueue atomically. Removal revokes the request with deletion. Unversioned jobs are rejected before loading or provider activity; the existing authorized explicit reingest API supplies recovery. Source identity, current ownership and RLS fence every job mutation.

URL loading composes cancellation with its existing timeout and preserves manual redirect/SSRF checks. Chunking and 64-input embedding batches remain. Received batches survive an ordinary publication rollback and are reused without another provider call. Indeterminate admitted requests cannot automatically replay. Complete chunks, ready state, receipts and progress publish atomically; stale work cannot resurrect a deleted or superseded document.

Initial adoption tests exposed a remaining whole-document duplicate race. Independently admitted10-09 repaired it with shared full-manifest binding, actual-provider validation, atomic readiness admission and canonical duplicate completion. See10-09-SUMMARY.md for exact final source hashes and architecture. Job cursor is never the authority for conflicting loaded snapshots.

Independent review reran30 native PostgreSQL/pgvector tests and43 unit/embedding tests, inspected preserved behavior and verified both review corrections. See10-05-VERIFICATION.md for exact commands, hashes and test boundaries. Root's earlier two failed native probes are retained at `/tmp/minion-360-10-05/shared-manifest-reachable-red.log`; final root native log is `/tmp/minion-360-10-05/shared-manifest-final.log`.

The module fixture runs the real module renderer with synthetic product-list responses. Its large mutable source scenario is reachable: the product name schema is text and the renderer/list service has no URL-style100,000-character cap. URL cases retain the actual URL cap and do not manufacture an impossible long-URL scenario.

Full Hub check is pending. Native Qdrant generation/outbox integration, driver recovery, operator indeterminate recovery, receipt retention, deployment migrations/drain and packaging remain open. Source/fixture TODOs and the QC proposal document them. No source success is a release certificate; no production change or real provider request occurred.

## Root aggregate acceptance

The fresh current-source Hub type check passed0 errors/0 warnings. See10-09-VERIFICATION.md for exact snapshot/environment and comment-only differences. This supersedes the pending typecheck statements above; packaging, integration, operational and deployment gates remain open.
