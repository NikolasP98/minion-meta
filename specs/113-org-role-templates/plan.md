# Implementation plan: organization-owned roles

**Date:** 2026-11-12. **Specification:** [spec.md](spec.md).
**State:** Planned; implementation blocked on owner security-spec approval.
**Target:** Hub feature branches against `master`; meta artifacts against `dev`.

## Summary and technical context

Use an explicit organization role model. Preserve existing organizations as
legacy. Bootstrap a new organization with one local Administrator role and an
explicit default role. Treat the old hierarchy as versioned templates for creating
local roles. Replace name-dependent administration checks with distinct
capabilities/ownership checks, without broadening platform privileges.

Hub uses TypeScript, Bun, SvelteKit 2/Svelte 5, Supabase Auth, PostgreSQL,
Drizzle/postgres and Vitest. Qualification uses native PostgreSQL plus the guarded
loopback QA stack and browser-harness. No new service or gateway wire protocol is
required. Gateway consumers must receive the existing capability/principal contract
from the updated Hub resolver. Preserve serialized role keys and legacy claims.

## Constitution check

- Spec, plan, tasks and evidence inventory exist before code.
- Security/data approval is pending; product implementation cannot begin yet.
- Six slices map to the specification DELTA and each has an observable DoD.
- UI changes require semantic tokens, Svelte 5, Paraglide compilation and both
  design/token gates. New API/page surfaces require central RBAC and route-manifest
  wiring. No standalone design system is introduced.
- Existing checkout WIP is preserved. Feature work uses an isolated checkout and
  scoped commits. No production write is part of this planning task.

## Data model and API contracts

Additive organization fields are `role_model` (`legacy` or `organization`) and a
nullable organization-local `default_role_key`. Migration sets existing rows to
legacy and leaves that as the compatibility default. A new-model organization
must have a valid local default and explicit member assignments. Unknown model,
foreign role, failed metadata read or missing new-model assignment denies.

Keep local keys stable in `org_roles`. Add explicit versioned template provenance
without changing the existing interpretation of `source_role_key`. Template
definitions are read-only code artifacts; instantiated matrices are independent
`permission_rules` rows. Administrator rank 80, Manager 60, Staff 40, Viewer 10;
blank rank 10; duplicate preserves rank. Every grant observes the real actor's
capability and rank ceiling.

The role-creation API accepts strict discriminated template/duplicate/blank
inputs. Maintain the existing legacy duplication body as a compatibility adapter.
Role rename updates display name only. Default selection and all policy writes
use fresh authority, org advisory lock, revision checks, audit and invalidation.
Invite creation freezes an explicit target role key/revision and grantor identity;
redemption revalidates them, atomically admitting the member and consuming a use.
Existing-member redemption is a no-op. Never default unknown role keys to admin.

## Slice sequence and dependencies

| Slice | Implementation ownership | Evidence before promotion |
|---|---|---|
| 1 | New migration; organization/schema types; `rbac.service.ts`; shared authority consumers; `scripts/qa/seed/` | Legacy parity, missing/foreign-role denial, template discovery with zero grants |
| 2 | `organization-provision.service.ts`; provision endpoint; transactional bootstrap service | Failure injection, concurrent retry, single Administrator and exact membership |
| 3 | `rbac.service.ts`; `section-access.service.ts`; roles endpoints; simulation; brain administration | Versioned copy/duplicate/rename, last-admin/page checks, private-brain negative tests |
| 4 | `join/membership.ts`, `join/links.service.ts`, `join/requests.service.ts`, join endpoints | Explicit/default/custom/legacy admission; fixed invite role; max-use concurrency; replay no promotion |
| 5 | `RbacRolesSection.svelte`, Team/invite controls, canonical loaders, Paraglide messages | Roles/templates UI, keyboard use, permission/revision/save failures, design/token gates |
| 6 | Native integration suites, browser QA, release runbook/evidence | Exact candidate gates, independent reviews, qualified schema and source manifest |

Slice 1 may merge only with all new-model writers disabled. Slice 2's writer
remains unavailable until dependent slices 3–6 are qualified. Use one explicit
server rollout flag to prevent any unfinished organization-model path from being
selected. Default off; it affects new-org creation only. The legacy reader remains
available throughout. A flag is not a substitute for implementation completeness.

## Authority consumers and compatibility

The [inventory](research.md) is the starting boundary. In particular adapt
`resolveMemberRoleKeys` callers in normal/fresh resolution, section access,
simulation, assistant principals and notification audience/projection SQL.
Distinguish `users:manage` from `brains:manage`; include page access in the
new-model post-change recoverable-administrator predicate; preserve legacy edit outcomes. Keep ownership in the membership
relationship. Test normal, simulated, notification and delegated paths against the
same fixtures, including a user who manages Team but cannot access Brains.

No changes to shared authentication packages or Site are planned: Hub uses
Supabase GoTrue, while Site uses its own Better Auth session. Inspect actual shared
schema/type consumers before migration; if they consume the changed organization
shape, add their compatibility checks to the candidate rather than assuming the
architecture diagram proves isolation.

## Delivery, rollback and review

Qualify migrations with the committed QA baseline and seed pairing. Run focused
native tests first, then `bun run check`, `bun run test`, `bun run build`, design
and token gates. Use `bun run qa:status` before starting a guarded local stack;
do not reset another checkout's stack. Browser proof covers new default-member
access, template creation, role replacement and legacy regression behavior.

Record exact source tree, migration list, QA fixture identity, commands, exit
statuses, screenshots and limitations. A green build is not runtime evidence.
Review Standards and Spec separately. Owner approval of the concrete merge/release
candidate is required. After v2 organizations exist, rollback may disable new-model
creation but must retain compatible readers and assignments.
