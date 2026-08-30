---
spec: 2026-08-18-hub-updateserver-tenant-scope-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness review

- Set `pass: 2`, `updated: 2026-08-18`, and `verdict: approved` to record the completed review.
- Changed `status` from `draft` to `parked` because the spec is approved but implementation remains explicitly gated on re-key evidence.
- Changed the related-artifact classification from `depends-on` to `extends` because the May migration design does not define or prove completion of this mutation's re-key prerequisite.
- Clarified that the related spec's `status: shipped` conflicts with its design/future-phase body and cannot substitute for a concrete re-key change record.
- Defined service unknown-id parity as the same return value or error type/message so the requirement is testable under either existing contract.
- Preserved a route's characterized ownership-denial contract when that route rejects before calling the service, avoiding an implicit route behavior change.
- Replaced the impossible cross-database SQL join with separate read-only Turso and Supabase reads followed by exact in-memory comparison, as required by `/memory/MINION/hub-two-database-split.md`.
- Replaced the ambiguous duplicate/ambiguous-mapping error with null and unmatched counts because multiple servers may validly share one tenant id.
- Made both non-production rehearsal and production audit results explicit merge evidence so fixture-only success cannot falsely prove live compatibility.
- Required a concrete migration, deployment, or change record for the re-key because a planning artifact's lifecycle status is not apply evidence.
- Cited `/memory/MINION/hub-org-scoping-rls.md` for the hard prerequisite: prior Turso auth-table changes cascade-deleted live `servers` rows.
- Cited `/memory/MINION/hub-deploy-workflow.md` and retained `master` as the implementation base because the old hub `dev` branch was deleted.
- Made the caller-focused test conditional on an existing route test owning the public contract, removing an otherwise unspecified new test surface.
- Replaced “byte-for-byte unchanged” with full-row deep equality because the acceptance condition is persisted value equality, not storage encoding.
- Separated route-level denial verification from direct service invocation so the existing caller guard cannot make the new SQL predicate test vacuously pass.
- Parameterized the focused test path with `SERVER_SERVICE_TEST` while retaining the expected default, making the commands executable if discovery finds the test elsewhere.
- Replaced piped migration-diff checks with an unpiped `git status` assertion that also catches untracked SQL/migration files; `/memory/MINION/MEMORY.md` marks piped gates as unsafe.
- Corrected the end-to-end setup wording so functional writes stay isolated in non-production while the production compatibility step remains read-only.
- Updated the cross-repo table to identify the installed Turso schema as verification input and to route any required schema/re-key work back to a prerequisite change artifact.

## Human flags

None. The spec remains parked until objective re-key evidence and zero-error audits exist; those are execution gates, not unresolved design choices.
