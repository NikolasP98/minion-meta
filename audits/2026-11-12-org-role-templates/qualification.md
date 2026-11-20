# Organization role templates qualification

State: released to production at Hub `960f352f7bcf6db4f2a244cc2929017979722f87`, tree `6abb578eae04c69e9a220b97ab37bf02715de6b1`, identical to qualified source `da51646cbe5bc4d03b52feec566a8be4a332217f`. All eighteen PR checks pass; independent Standards/Spec integration review passes. Both migrations are applied, new-org provisioning is enabled and the live deployment is `dpl_CwemnoXcW8gTrM5MBMKnJNQMSPoS`. Existing role data and assignments are unchanged. See [release evidence](release.md) for native bootstrap rollback, legacy parity, flag/deployment identity and the explicit HTTP/external-provisioning limits.

## Scope and authority

The owner approved one local Administrator for newly provisioned organizations, optional versioned role templates, complete grant ceilings and separate role CRUD. The Manager template has view/create/edit/delete within its current authority. Staff and Viewer have no role CRUD. Existing organizations remain legacy. The initial new-model default admits Administrator; changing it affects future admissions only. Missing explicit role assignments deny.

Ownership, Team management, role CRUD, Brain administration and platform access remain distinct. Security decisions refresh actual and simulated authority inside coordinated transactions. Admission records fix role/revision/grantor and revalidate them. Account deletion fences admission before teardown. Recovery checks retain a real owner and an actual member with working role/Team repair access.

## Database and shared consumers

The feature adds migrations `20261112010000_organization_role_templates.sql` and `20261112020000_notification_role_model_sources.sql`. Native suites run against disposable loopback PostgreSQL. They cover legacy parity, new-model roles/bootstrap/admission, failure rollback, concurrent grant/revoke and default/member races, stale invitations, profile-deletion fences, actual/effective grant ceilings, recovery page chains, Brain object/recipient grants and notification SQL/catalog fences.

The shared postgres-js/Drizzle production pool is exercised explicitly. An observed mixed-client audit serialization failure was repaired with explicit JSON text casts; timestamp expiry normalization and explicit catalog projections preserve revision semantics. The resulting shared-client native role/bootstrap/admission run passes 47 cases. Notification projection passes 27; Brain grant/agent suites pass 64. Legacy principal, Brain ingestion and Pulse fixtures preserve real writers while declaring their intentionally captured schema policy metadata.

Final recipient checks cover effective action, record-scope, view/export field tier, page and management-rank changes across complete role unions. They separately compare Brain creator, user, role and verified personal-agent effects. Private object actors use canonical pre-change caps; platform role-edit metadata cannot lend synthetic private scope. Already-held unrelated access and actual narrowing remain. Inactive admission clears stale roles and installs exactly the verified role. Platform account administration remains a separate operator boundary.

The [independent final receipt](review-final.md) records source PASS against the exact commit/tree. Historical blocked review is retained. Focused passes do not supersede full exact-head CI.

## Browser acceptance

All browser mutations targeted the guarded local QA backend and task-owned fixtures through actual GoTrue authentication. Production was not used. Browser Harness used an invisible task-owned Chromium session; it was stopped after qualification. The shared Supabase backend was not reset or stopped.

- Created a Manager-template role by entering its name and pressing Enter. No assignment was added.
- Renamed it to QA Campaigns; the key stayed unchanged. Set it as the default and restored Administrator. SQL audit/default/assignment readbacks confirmed both changes, with existing Administrator assignments intact.
- At 390 by 844 pixels, the document had no horizontal overflow. The selected-role Delete action was visible and 44 pixels high. The Administrator default could not be deleted.
- Deleted the temporary role through the real native confirmation dialog. The catalog returned to exactly one Administrator with its original default and assignments.
- A real authenticated member without a role assignment received 403 from the document, route-data request and role-create API.
- A task-owned legacy organization rendered all five built-in roles with Owner locked and no server error. Optional templates were available. The task-owned legacy organization/profile/Auth user were removed; shared personas were unchanged.

The original shared legacy QA Owner encountered an unrelated encrypted gateway-token mismatch. No shared gateway credentials or rows were changed. An owned legacy fixture with no gateway rows qualified the Roles interface instead; native pre/post-migration parity separately covers existing legacy grants.

`browser/` contains settled screenshots and machine readbacks. Earlier transient blank screenshots are excluded. `files.json` records hashes and byte sizes.

## Rollout and owner approval

Use the [Hub rollout procedure](https://github.com/NikolasP98/minion_hub/blob/feat/113-org-role-foundations/docs/organization-role-templates.md#rollout-order). A planned notification maintenance window is required: drain and stop an active old worker before the new source ACL migration, apply both migrations in order, deploy compatible readers/worker with provisioning disabled, qualify the existing worker resume, and enable new-org creation last after owner approval. A deployment does not authorize first worker activation.

Turning provisioning off does not permit removing new-model metadata or deploying incompatible readers. There is no zero-interruption claim. Owner merge/release approval was received on 2026-11-12. Production preflight and subsequent execution are recorded in [release.md](release.md); bounded post-release verification is complete.

## Historical feature-candidate gates (99341e7)

| Check | Evidence | Result |
| --- | --- | --- |
| Local `bun run check` with declared public analytics env keys | `tests/role113-complete-final-check.txt` | 0 errors, 0 warnings |
| Native manifest/report/principal and bypass inventory contracts | `tests/role113-complete-final-contracts.txt` | 32 passed across 4 files |
| Full target-data/rank and asset helpers, role assignments/API | `tests/role113-recipient-composition-final.json` | 127 passed, including 63 native role cases |
| Policy persistence and recipient effects | `tests/role113-complete-policy-final.json` | 45 passed, including 22 native policy cases |
| Admission, service/API and action feedback | `tests/role113-brain-agent-admission-green.txt` | 101 passed, including 43 native admission cases |
| Actual principal resolution and Brain access | `tests/role113-agent-principal-native.json` | 10 native passed, original cases retained |
| Earlier unchanged capability-builder suite | `tests/role113-legacy-assignment-final.txt` | 66 RBAC cases passed as part of the 110-case legacy correction run |
| Exact-head full unit/architecture | `tests/993-ci-unit-summary.txt` | 9,575 passed, 307 expected skips; architecture 3 passed |
| Exact-head full CI | [run 43193428656](https://github.com/NikolasP98/minion_hub/actions/runs/43193428656) | Success: 18 PR checks, zero failures |

Native evidence guards pin all 63 role, 43 admission, 22 policy and 10 principal behavior names, rejecting missing or skipped assertions. Other required native suites remain in their existing lanes. The complete final CI passed all interactions, including bootstrap, lifecycle, notification projection, seed idempotency/schema drift, the package build and browser sweeps.

The earlier candidate `d6102318` passed full CI (run 43183072920): 9,514 unit tests, 307 expected skips, architecture 3, full package build and all native/browser gates. That is historical evidence only. A local full-unit attempt before the cold-import fixes failed three tests across two route files because imports exceeded the 5-second behavior deadline and spilled a mock call. Their cold imports now run in bounded beforeAll hooks; all six focused behavior cases pass. No behavior assertion was removed. A local adapter build of superseded source was stopped while preparing the security correction; its Vite success is not represented as a full build. Final full-build evidence is the passing exact-head CI package build.

All nine UI/message files were identical between browser capture `d6102318` and feature candidate `99341e7`. The released integration retains all seven component blobs and every feature message value; incoming target translations are retained as the exact semantic union. See `source.json` and `integration-da516.json`. The new backend boundaries are separately exercised by the final native/API suites and full CI. No new visual behavior is inferred solely from screenshots.

No source defect is accepted as an unfinished handoff. Owner merge/release is approved; execution and bounded post-release checks are complete; see [release.md](release.md). The release requires the documented notification maintenance ordering and retains new-org creation disabled until approval. Native fixtures and preview/CI readiness do not prove production deployment or runtime activation.


## Target-branch integration

CI checked the pull-request merge `fa35baf85ca4c81dac636f73112b644f18be4f3b`,
tree `9ef3ee8c26fbc5126b494330965a60191b2a5608`, against target base
`bb3b78f8cf00d19de4887ed1da983e3aad1ff174`. The source branch retains its
original base provenance. Incoming target changes merge cleanly; every feature
product-source file is identical in that integration except the two message
catalogs, which add unrelated target strings. Every feature message value is
unchanged. Source review covers the feature code; full CI qualifies the integrated
tree. A later target change requires checking the final merge candidate again.


## Final disposition

The approved Hub release is merged, deployed and enabled. Current-head CI passed 9,589 unit tests (307 expected non-lane skips), 327 native tests with zero skips, the 275-test seed contract, 245 critical browser journeys, page conformance, complete build and all four desktop installers. The local check passed with zero errors and warnings.

Production catalog/fence, canonical bootstrap with verified rollback, legacy data parity and deployment/configuration checks pass. The exact synthetic bootstrap produced one Administrator, one assignment and 24 explicit rules and preserved them on retry. All four existing organizations remain legacy; no first worker activation occurred. Evidence is in [release.md](release.md). Full HTTP/external provisioning was not exercised in production.
