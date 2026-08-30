---
spec: 2026-08-17-gw-nextcloud-talk-dm-misclassified-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-17
---

# Pass 2 review

- Updated the spec frontmatter to pass 2 with matching `status`/`verdict: approved`; all correctness issues were resolvable without a product decision.
- Clarified the production/test file boundary because S3 permits a downstream test edit despite the original “extension only” owner statement.
- Qualified S1 as production-inert so its stubbed unit behavior is not confused with a working deployed fix.
- Changed `RoomKindInput` to `unknown` and required strict numeric validation so the stated array/object/boolean fail-closed cases are type-valid and cannot coerce to a DM constant.
- Made Talk room constants `4`/`5`/`6` conditional on authoritative S0 verification instead of simultaneously calling them uncertain and requiring them to classify as DMs.
- Added the authoritative-source requirement for verified constants so the allow-list and decision table are objectively reviewable.
- Replaced “never delaying” with a bounded-delay requirement for B2 because an awaited room-info request necessarily delays mapping.
- Added an explicit lookup timeout and hung-request test so B2 cannot block inbound delivery indefinitely and single-flight state is cleared after timeout.
- Converted B3 from a shippable inert seam into a stop condition because it cannot satisfy the proposal’s required one-to-one result.
- Removed B3 TODO/proposal artifacts and tests from this spec because they described knowingly incomplete implementation as a branch of the fix.
- Made an `isGroupChat`-dependent session-key path an A2 stop condition, resolving contradictory instructions that first said stop but later allowed an undocumented continuity fork to ship.
- Distinguished fail-closed omission of an unverified optional room type from an unfinished implementation requiring the open-items ledger.
- Corrected the S3 changed-file check so it permits only the named extension, downstream tests, and handoff proposals rather than every Markdown file in the repository.
- Replaced an unsupported ripgrep negative lookahead with two compatible filters.
- Removed the live-verification instruction to add a debug log because it introduced an unscoped production change solely for verification.
- Made conversation continuity a hard ship check consistent with A2 instead of allowing either outcome.
- Removed B3 from the E2E and ship gates because B3 now correctly stops before implementation.
- Clarified how to capture red state before changing the mapper signature and removed reliance on runner-specific failure wording.

## Human flags

- None. S0 still must select B1 or B2 from target-repository evidence; B3 or an A2 continuity dependency returns the spec for a new human scope decision rather than being silently accepted.
