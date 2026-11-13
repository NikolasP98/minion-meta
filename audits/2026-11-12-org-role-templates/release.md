# Approved role-template release

The owner replied “approved” to the concrete merge and rollout request on 2026-11-12. This authorizes Hub PR 656 and companion spec PR 1003, ordered migrations and activation after runtime checks. It does not authorize first notification worker activation.

Source head: `99341e7074541360eadcf2dcd32e67494f3c65ad`. All 18 PR checks pass.

Production preflight at 23:34 UTC: both feature migrations are pending; provisioning and worker gates are unset (disabled). The singleton generation is zero, with no owner, start, heartbeat or admission attempt. No app_notification_worker database sessions or outbox records exist. Four existing organizations remain present. Only read-only queries were performed. Permission-rule, membership, assignment and role-catalog hashes were captured for post-release comparison.

The target advanced during preflight from `bb3b78f8` to `000c4b80` (PR 652: native chat input sizing and FAQ accordion behavior). Updated PR merge `4e7b9359ff4b2b6a28d59cc39d2a1c6f5d7ad840`, tree `47957a027bfa046d3636311633747c7308ff730f`, differs only in seven unrelated UI/story/field-sizing files. All server, migration, role route and role UI source stays identical. Updated integration qualification is in progress. No release mutation has occurred.

## GitHub merge gate

The pinned normal squash merge was rejected: “the base branch policy prohibits the merge”. GitHub reports `REVIEW_REQUIRED`, zero submitted reviews, and master protection requires one approving review. Administrator enforcement is disabled, so an explicit `--admin` merge could bypass the rule. No bypass has been attempted. The owner was asked specifically whether to authorize that bypass; the reply is pending. The normal release approval remains valid.

No merge, production migration, worker activation or provisioning flag change has occurred.

## Production build contract

The unrelated PR 652 production deployment `dpl_HLWXLiqT7JPZRR1S3BmoTXBq7aoe` reached READY. Its actual build log runs `bun run vercel-build`, invokes the Hub migration runner (zero pending migrations for that source), then runs the complete package build. This confirms that a production merge of PR 656 will apply the two pending feature migrations through the reviewed runner. Project framework defaults alone were not used as proof.

## Administrator merge authorized and target reconciled

On 2026-11-13 the owner answered the explicit administrator-bypass question with “I authorize the merge”. This authorizes the review-rule bypass for Hub PR 656.

Before the merge, master had advanced to `6a390a3c7978b1008feec7cebdabf88f66404128`, including native overlay/CRM UI and Doors-form changes. The only conflicts were the English and Spanish message catalogs. A key-by-key three-way comparison found zero conflicting semantic edits; both sets of changes and all 28 feature message changes per language were preserved. The feature branch now includes master at `da51646cbe5bc4d03b52feec566a8be4a332217f`, tree `6abb578eae04c69e9a220b97ab37bf02715de6b1`. Fresh exact-head CI run 43483986196 is in progress; no earlier green result is claimed for this tree.

The earlier supplemental local check/build against the prior target were interrupted before completion and are not passing evidence. Current-tree type-check and CI build are running instead.

Production read-only preflight repeated at 2026-11-13 18:34 UTC: both feature migrations remain pending, singleton generation remains zero with no owner/heartbeat, outbox and worker sessions are empty. All five baseline catalog/rule/assignment/membership hashes are identical to the prior-day snapshot.

## Integration diagnostics

Independent Standards and Spec integration review passes for `da51646c`; receipt `review-integration-da516.md` verifies all 111 feature source files and the exact semantic catalog merge. The first local type-check after merging master failed because the checkout still had the earlier dependency install and generated translations: Storybook modules and incoming Door messages were missing locally. The exact-head CI independently passed its fresh-install Svelte/typecheck step. The local frozen-lockfile install and translation regeneration are being refreshed before repeating that check.

Local qualification after the frozen dependency install and translation regeneration passes with zero errors and zero warnings (`tests/da516-check.txt`). Current-head CI's full check/build lane passes. Independent Standards and Spec review of the bounded native postflight plan also passes, with the exact helper and source/compiled/target defaults pinned. The planned check exercises canonical bootstrap in a transaction that always rolls back; it does not qualify HTTP/external provisioning or the activation flag. No production SQL writes have yet been executed.

## Qualified merge

All eighteen current-head PR checks passed. CI run 43483986196 completed successfully. Its merge checkout `e7b44d9e06f76e8ffbfa55d74c1139f8c93cfe74` has tree `6abb578eae04c69e9a220b97ab37bf02715de6b1`.

The administrator squash merge completed at 2026-11-13 19:06:32 UTC, commit `960f352f7bcf6db4f2a244cc2929017979722f87`. Its tree is exactly the qualified tree above. Production deployment is pending; provisioning remains disabled. Immediate premerge read-only verification at 19:06 UTC reconfirmed all four legacy organizations, unchanged five RBAC-data hashes, no outbox records and a never-started worker singleton.

## Ordered migrations and source fence

Production applied migration `20261112010000` at 19:06:41.043 UTC, followed by `20261112020000` at 19:06:41.237 UTC. Read-only postflight passes: no broad worker catalog SELECT; only org_id/key and organizations.role_model are granted, with name/rank still denied. The restrictive SELECT-only worker policy retains the live source fence, forced RLS and reviewed owner. All four existing organizations remain legacy. Initial production build `dpl_JAU8SKCgv1Zs92HFPEp5heMtjCBs` is building exact merge commit `960f352f`; provisioning is disabled.

Final current-head CI passed 9,589 unit tests (307 expected non-lane skips), all 327 native QA tests without skips, the seed contract's 275 tests, all 245 critical browser journeys, the page conformance sweep, complete build and all four installers.

## Compatible runtime and bounded production verification

The initial deployment reached READY and `hub.minion-ai.org` resolved to that exact deployment/merge source. An anonymous `GET /api/me` returned the expected 401.

The reviewed native postflight passed against the Vercel-bound production database: canonical bootstrap created exactly one local Administrator, one owner membership/role assignment and 24 explicit canonical module rules. Overview stays view-only as defined by the Administrator template. Retrying preserved the complete organization/role/rule/assignment/membership/audit snapshot. The entire transaction rolled back and absence was verified; no synthetic organization or external workstation remains. This is native bootstrap evidence. Full HTTP provisioning and Workforce/gateway/workstation integration were not exercised.

Read-only parity after rollback passed: all four organizations remain legacy; both local roles, 80 permission rows, 19 assignments, five system roles and 20 memberships have their exact original hashes. Worker singleton/queue state is unchanged, generation zero.

After those checks, `ORG_ROLE_TEMPLATES_ENABLED=true` was configured for production only. The exact compatible deployment was redeployed to apply it. Activation deployment `dpl_CwemnoXcW8gTrM5MBMKnJNQMSPoS` is processing. The worker gate remains disabled; no first activation has occurred.

## Live activation and final state

Activation deployment `dpl_CwemnoXcW8gTrM5MBMKnJNQMSPoS` reached READY and the live domain resolves to it. Its source is `960f352f7bcf6db4f2a244cc2929017979722f87`, the exact qualified tree. Production configuration readback has `ORG_ROLE_TEMPLATES_ENABLED=true` and the worker gate unset/disabled. Anonymous `/api/me` again returned 401 on this deployment.

Final readback at 2026-11-13T19:16:23.646Z has no pending migrations, no worker connections, owner or heartbeat, unchanged generation zero, and an empty outbox. All five RBAC table hashes still match the immediate premerge snapshot; all four existing organizations remain legacy. The new-model synthetic organization was fully rolled back. No persistent worker or external workstation was created.

Implementation, approved merge, ordered migrations, compatible deployment, bounded native/legacy checks and provisioning activation are complete. Full HTTP organization provisioning and external Workforce/gateway/workstation integration remain outside this runtime proof. The unchanged feature UI was qualified through local GoTrue acceptance and the passing current-head CI browser suites. Post-merge CI is a separate automatically triggered run; the qualified PR merge and deployed commit share the same exact tree.
