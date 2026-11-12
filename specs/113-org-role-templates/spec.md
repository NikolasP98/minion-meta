# Feature specification: organization-owned roles

**Feature branch:** `113-org-role-templates` (implementation branches are slice-scoped)
**Created:** 2026-11-12
**Status:** Approved by owner on 2026-11-12; implementation starting.
**Input:** New organizations begin unrestricted; old seeded roles become templates.

## User scenarios and acceptance

### US1 — Start an organization with full access (P1)

Given a newly provisioned organization, when its creator or an admitted default
member opens enabled business/configuration features, they receive organization
Administrator access. There is one active role, Administrator. Ownership-only
and platform-only operations retain their separate guards.

### US2 — Define roles for the actual business (P1)

Given an organization administrator, when they instantiate a versioned template,
name it and assign it instead of Administrator, only the explicitly selected
members are restricted. Template discovery/creation changes no other member.

### US3 — Preserve existing organizations (P1)

Given FACES or any legacy organization, when this feature is deployed, its roles,
assignments and data/page permissions remain the same. Templates are optional.

### US4 — Admit members with the intended permissions (P2)

Given an invite minted with a selected/default local role, when redeemed, it
assigns the stored role after revision/grantor revalidation. A later default-role
change cannot elevate the outstanding invite. Replay by an existing member does
not alter their role or consume another use.

## Requirements and success criteria

- FR-001: New-model organizations have exactly one Administrator at bootstrap;
  admitted default members get that explicit local role. No implicit role fallback.
- FR-002: Versioned templates, active local roles and ownership are separate concepts.
- FR-003: Existing organizations retain their effective matrices and invite behavior.
- FR-004: Page visibility cannot grant access to an underlying dataset or action.
- FR-005: Role creation/rename/default changes and assignment are transactional,
  org-scoped, audited and subject to fresh delegation limits.
- FR-006: At least one owner and one recoverable access administrator survive edits.
- FR-007: Organization-admin access never becomes platform-superuser access.
- FR-008: Role CRUD uses explicit `roles` capabilities independently of Team administration;
  every grant remains within the actor's fresh actual and effective authority.
- FR-009: Brain ACL and visibility grants revalidate module and per-object authority
  in the same transaction as the write and audit.
- SC-001: QA before/after comparison finds zero changes to legacy grants/scopes.
- SC-002: New-org creator/default member exercise all enabled org modules in QA.
- SC-003: Restricted-member UI, API, simulation and agent decisions agree.
- SC-004: Native PostgreSQL concurrency/injected-failure tests prove admission,
  bootstrap and last-administrator invariants; source hashes identify the candidate.

## 0. Product

New organizations should fit their users' work instead of imposing a staff
hierarchy. The user requests an unrestricted starting point and reusable role
templates. They accept either no roles or one seeded Administrator role.

Use one organization-specific Administrator role. All admitted members initially
receive it. An administrator can create named local roles from templates or an
empty permission set and assign those roles when restrictions become useful.
Creating a role does not change anybody's permissions. Replacing a member's
Administrator assignment with a narrower role takes effect across pages, APIs
and delegated agent actions. Adding a narrower role alongside Administrator
retains Administrator access; the UI must explain this existing union behavior.

Approval status: the owner approved this reviewed specification on 2026-11-12
with “approved. Proceed.” and “go on”. Implementation is authorized; merge and
production release remain separate human decisions.

The owner amended this approved scope during implementation: all access grants
are limited by the actor's own permissions, and role CRUD is separate from Team
administration. They explicitly approved Manager-template role read/create/edit/delete
within that ceiling; Staff and Viewer templates have no role CRUD. This amendment
is authorized for implementation without another specification approval. It does
not authorize merge or release.

## 1. AS-IS and source evidence

Baseline Hub commit: `523ca2e934e93d0fc0d6f7d052c94694b86553b6`.
Source links below pin that commit; implementation must check for intervening
changes instead of applying this plan blindly to a newer branch.

| Behavior | Verified source |
|---|---|
| Global owner/admin/manager/staff/viewer defaults; OR across assigned roles; custom roles alongside system catalog | [rbac.service.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/rbac.service.ts) (`defaultCaps`, `buildCapabilities`, `listRoleCatalog`, `createCustomRole`) |
| Custom role rows are organization-scoped; historical global-role foreign keys were removed | [org_roles migration](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/supabase/migrations/20260702140000_org_roles.sql) |
| Business provisioning assigns creator `owner` and verifies that exact role | [organization-provision.service.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/organization-provision.service.ts) (`provisionOrganization`, `verifyOrganization`) |
| Invite validation accepts built-in roles only; approval defaults to Staff | [join-links endpoint](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/routes/api/join-links/%2Bserver.ts), [approval endpoint](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/routes/api/join-requests/%5Bid%5D/approve/%2Bserver.ts) |
| Membership admission separately writes membership and role using trusted/system grant | [join/membership.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/join/membership.ts) (`createMembership`) |
| Role manager and contextual page editor share revisions, permission rules and an org advisory lock | [section-access.service.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/section-access.service.ts), [nav-policy-lock.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/nav-policy-lock.ts) |
| Simulation assumes five catalog roles and recognizes owner/admin names | [role-simulation.service.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/role-simulation.service.ts) (`snapshot`) |
| Private brains recognize creator, owner/admin names or object access grants | [brains.service.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/brains.service.ts) (`canAccessBrain`) |
| Page access and dataset visibility are separate decisions | [permissions.service.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/services/permissions.service.ts), [dataset-ctx.ts](https://github.com/NikolasP98/minion_hub/blob/523ca2e934e93d0fc0d6f7d052c94694b86553b6/src/server/auth/dataset-ctx.ts) |

The completed [creation-path and consumer inventory](research.md) identifies
one production Hub organization writer: the provision endpoint and provisioning
service. The tracked auth trigger creates profiles only. A point-in-time read-only
catalog check found no organization-creation function or additional org/member-role
triggers. No automatic personal-org creation flow exists in the inspected Hub.
Recheck the inventory against the implementation commit and deployment target;
future personal-org creation must use shared bootstrap, and imported personal
organizations remain legacy. This feature adds no personal-org signup flow.

## 2. TO-BE and invariants

### 2.1 Two explicit organization models

Add `organizations.role_model` with supported values `legacy` and `organization`.
Migration must mark every existing organization `legacy`. Keep the database
column default `legacy` during the compatibility deployment; only the qualified
new-org bootstrap writes `organization` explicitly. Unknown values and read
errors deny permission resolution; they never imply unrestricted access.

`legacy` organizations retain their global catalog, custom roles, invite behavior,
rules, rank rules and role fallback. Existing data/page grants, assignments,
catalogs and invitation semantics remain unchanged. Role CRUD authorization is
intentionally separated from Team rights: `users:manage` no longer implies any
`roles` capability. Legacy global Manager retains no default `roles` capabilities;
the optional Manager template explicitly grants role CRUD. No existing permission
row is rewritten. One narrowly scoped security correction also applies
to role creation/duplication through the extended endpoint: it checks the real and
simulated actor's complete capability, field, ownership and page ceiling. The
historical ability to duplicate a lower-rank role with broader permissions than
the actor is intentionally rejected. Valid legacy duplicate bodies remain
compatible. This correction rewrites no existing permissions and must have
positive/negative legacy regressions in the implementation candidate.

`organization` organizations list and accept only their `org_roles` rows.
Global built-in keys remain usable as legacy roles and as template source IDs,
but cannot be assigned directly in the new model.

### 2.2 Single Administrator bootstrap

Create one local role with stable key `custom-administrator`, editable display
name `Administrator`, rank 80 and provenance `source_role_key=admin`. Store its
complete current module/action matrix with unrestricted record and field levels.
Persist `organizations.default_role_key=custom-administrator` for future joins.
Rank controls delegation ceilings; it must not grant permissions by itself.

The creator receives this role. Do not seed Manager, Staff, Viewer, or Owner as
ordinary local roles. Preserve the creator's `organization_members.role=owner`
as a separate ownership relationship used for transfer/deletion and protection
of the last owner. A new-model owner does not require a `member_roles.owner` row.

Creating the organization, ownership, local Administrator role, its matrix and
creator assignment must commit atomically. External Workforce/gateway/workstation
provisioning remains a retryable phase after that transaction. Failure cannot
leave an active organization with an incomplete permission bootstrap. Repeated
provisioning verifies the existing model and never upgrades a legacy organization
or resets customized roles. Retry does not re-add Administrator after an explicit
member-role change. A missing assignment in a new-model organization denies
access pending repair; it must not fall back to legacy manager defaults.

### 2.3 Templates and organization-owned roles

Expose versioned built-in templates: Administrator, Manager, Staff and Viewer.
Ownership is not a template and cannot be granted by copying permissions.
Template matrices come from the built-in definitions, independently of an
organization's current overrides. A separate `duplicate` operation copies an
existing local role's effective matrix, including page/section overrides and
record/field restrictions. A blank role starts with every capability disabled and rank 10. Template ranks
are Administrator 80, Manager 60, Staff 40 and Viewer 10; duplicate preserves the
source rank. Administrator grants all `roles` actions. Manager grants `roles:view`,
`roles:create`, `roles:edit` and `roles:delete`, with `roles:manage` disabled. Staff
and Viewer grant no `roles` actions. Legacy global Manager defaults remain
unchanged with no `roles` actions; template creation is an explicit choice.
All paths enforce both the real and effective grantor's complete capability, rank,
record/ownership, field and page ceilings. A simulation cannot provide a missing
actual permission or make an over-ceiling grant valid.

Instantiation copies a selected template version into an independent local role;
later template edits must not mutate existing copies. Persist template ID/version
as provenance. Keys are stable, names are editable, and name changes must not
break assignments, object access grants, invites, notifications or simulations.
Newly created roles start with no members. Creation is atomic and uses the same
organization policy lock/revision discipline as the two permission editors.

The existing `POST /api/roles` duplicate contract remains accepted for legacy
callers. Add a strict discriminated creation contract for template, duplicate
and blank sources. Template identifiers are not accepted as assignable role keys.
Require live membership, an active organization, the operation-specific `roles`
action, fresh complete grant/rank checks and source/target organization matching
at every role mutation boundary. Creation requires `roles:create`; rename and
permission edits require `roles:edit`; deletion requires `roles:delete`. Loading
the role editor requires `roles:view`. None of these role operations additionally
requires `users:manage`, except changing the admission default as specified below.

### 2.4 Admission and default roles

For new-model organizations, an omitted role means the current configured default
role at the approval/mint transaction; initially this is Administrator. Display that consequence before approving
a join or generating a default-role invite. Explicit roles must belong to the
target organization and be within the grantor's authority. Changing the default
affects future admissions only and must be an explicit audited administrator
action requiring both `users:manage` and `roles:edit`, fresh authority and revision
checks. It does not change current member assignments. Assigning or removing a
member's role and approving or minting an admission require `users:manage` and the
complete fresh delegation ceiling; role CRUD alone cannot administer Team.

Resolve the selected default to an explicit local role key when an invite is
created or a pending request is approved. Persist the selected role and grantor
identity. Changing the default affects only newly created invites and subsequent
approvals; outstanding links never adopt a more privileged future default.
At redemption revalidate the stored target organization, role existence, current
role revision and the original grantor's current ability to grant that role,
alongside invite usability. A role changed since minting requires an administrator
to reissue/reconfirm the invite; it cannot silently widen the promised grants.
Do not validate against the redeeming user's prior privileges.
No revoked, exhausted, foreign-role or deleted-role invite can create membership.
Idempotent redemption by an existing member must not add Administrator, reset an
owner membership, replace their roles or consume a use again. Admission and invite
use/request resolution must commit together. Pending requests grant no access.
Legacy invite records retain their original semantics.

### 2.5 Administration, ownership and complete authorization

All organization features available to today's organization admin must work for
the seeded local Administrator. Use separate predicates, with legacy role-name
semantics retained only for legacy organizations:

- Role catalog/editor read: `roles:view`; role creation: `roles:create`; role or
  permission editing: `roles:edit`; role deletion: `roles:delete`. Preserve the
  separate `roles:manage` action without inferring CRUD from Team rights. Apply
  fresh actual/effective complete delegation ceilings and relevant page access.
- Team membership/assignment: `users:manage`, fresh complete grant/rank ceiling
  and relevant page access. Default-role changes also require `roles:edit`.
- Simulation eligibility: real `users:manage` plus the real grant/rank ceiling;
  candidate/effective authority is always intersected with the actual actor.
- Brain-wide object administration: `brains:view` AND `brains:manage`; this never
  follows from `users:manage`. Mutation still requires its coarse module action.
- Ownership operations: the actual `organization_members.role=owner` relationship,
  plus existing operation-specific guards. Neither role name nor rank grants ownership.
- Platform operations: existing platform identity checks; local Administrator
  cannot set `profiles.role=admin` or cross an organization boundary.

For organization-model organizations only, at least one active, non-simulated
real member must be a recoverable access
administrator: effective `users:manage`, `roles:view` and `roles:edit`, rank at
least the highest current local
role rank, and allowed access through the actual role-editing AND member-assignment
page/redirect chains. Use the shared route/page policy evaluator to include explicit
native/custom page and section denials; do not test only the capability bit.
Protect that predicate under assignment replacement/removal, permission and page
edits, role deletion, membership removal and concurrent edits. Serialize under the
org policy lock and reject a mutation that leaves no such member. Evaluate the
post-change matrix and actual page paths before committing.
The default role cannot be deleted until the default is changed. Role deletion
also rejects live references in memberships, explicit invites and per-object
access grants. For the new model, keep last-owner protection based on actual ownership.
Legacy organizations retain their existing last-owner protection and policy-edit
outcomes when the actor passes the operation-specific role capability check;
the new recoverable-administrator rejection rules do not apply to them.

Shared authority resolution must return the same answer for normal cached loads,
fresh write transactions, simulation, notification audiences, assistant principals
and delegated jobs. Include the role model/default/catalog changes in simulation
revisions and cache invalidation. A simulation cannot widen the real actor's access.
Multi-role grants continue to combine by OR.

Brain ACL replacement and visibility widening are access grants. Serialize them
under the organization policy lock and the target Brain row lock. In the same
transaction, require an active, non-pending-deletion actor and fresh real AND
effective `brains:view`/`brains:edit`, respect owner-scoped module restrictions,
and require current per-object write authority in both identities. Being able to
manage Team or edit a role does not establish object write authority. Validate
recipient role/user/agent references against the exact target organization before
replacing ACL rows. Commit the grant and audit together. Concurrent role or ACL
revocation must win against a waiting stale share or visibility write, including
a simulation whose real actor has lost access.

### 2.6 Data and page layers

Retain distinct page-instance/native-page rules and module/dataset/action rules.
Opening a custom page does not grant its underlying datasets or writes. Every
widget obtains its dataset through the current server-side boundary; denied data
uses the existing marker behavior. Template-instantiated grants apply to both
native and custom navigation using their registered permission keys. Do not add
unregistered dynamic-pattern page keys: current native-page overrides support
static registered screens only. This feature must not silently claim arbitrary
dynamic-route policies are supported.

"All access" is organization-scoped and limited to enabled/entitled features;
platform superuser privileges, external OAuth authorization and organization
ownership are separate. Existing administrator private-object behavior remains
available to local administrators; narrower roles retain object-specific checks.

## 3. DELTA and implementation slices

### Slice 1 — Models, templates and authority contract

**Topics:** `security`, `data`, `auth`

Commit the creation-path/consumer inventory with exact source anchors. Add the
additive schema, role-model-aware catalog and validated versioned template
definitions. Implement a single pure role-selection contract shared by cached
and fresh authority paths. Preserve legacy resolution byte-for-byte where
possible. Update schema types and QA seed matrix with one legacy fixture and one
new-model fixture. No production path creates the new model yet.

DoD: migration on a pre-change QA database preserves every old role/member/rule
row and effective matrix; new-model missing assignments deny; foreign role keys
deny; template discovery grants no privileges; all authority consumers in the
inventory have a tested adapter or remain gated from the new model.

### Slice 2 — Atomic organization bootstrap

**Topics:** `security`, `data`, `auth`

Implement one transactional bootstrap called by all inventoried organization
creation paths, covering currently supported organization provisioning. Preserve explicit
ownership; install Administrator and the default. Move external provisioning
after durable bootstrap and update readiness checks.

DoD: a new fixture has exactly one active local role and a creator who can read
and write available organization modules. Inject failure at each DB boundary:
the transaction leaves no partially active organization. Concurrent/replayed
creation yields one role; retries never promote an existing member or legacy org.

### Slice 3 — Template creation and permission administration

**Topics:** `security`, `data`, `auth`

Implement template/blank/duplicate creation, local-role rename, default selection,
assignment and reference-safe deletion. Cover shared policy editor, fresh grants,
last administrator/owner checks, brain administration, simulation and audit.

DoD: rename preserves stable-key references; template copies stay unchanged after
template revision; duplicate preserves explicit page denials; concurrent removal
or downgrade of new-model last administrators cannot lock the org out. A legacy
permission-edit regression with an authorized actor must retain the pre-change
result. Restricted role
cannot grant a higher rank or capability. Both page/data editors show the same
matrix and revisions. Role CRUD and Team permissions authorize independent
operations; Manager-template CRUD is allowed within the ceiling, while Staff,
Viewer and Team-only actors cannot change role permissions. Default changes
require both capabilities. Verify normal, simulated and delegated authority parity.
Brain grants must reject foreign recipients and stale object/module permissions
without ACL, visibility or audit side effects.

### Slice 4 — Admission through local roles

**Topics:** `security`, `data`, `auth`

Replace new-model built-in enums and hardcoded Staff defaults in link generation,
redemption, join approval and membership writers with target-org role validation.
Make membership/role assignment/use counting/request resolution transactional.

DoD: default admission grants Administrator initially, custom-role admission
restricts immediately, existing members cannot be promoted by link replay,
cross-org/deleted-role/expired/revoked/exhausted invites fail without side effects.
Concurrency cannot exceed max uses. Legacy invitations remain compatible.

### Slice 5 — Roles, templates and Team interface

**Topics:** `security`, `auth`, `ui`

Read `.claude/skills/ui-design-governance/SKILL.md` before UI edits. Use shared
semantic tokens and Svelte 5 components. New organizations show Roles and
Templates as separate concepts, one Administrator initially, a Create role flow
with template/duplicate/blank sources, local role naming, and a clearly labeled
default for new members. Team selects active local roles only. Existing
organizations retain their legacy catalog controls, subject to the explicit role
CRUD capabilities, and gain template creation.

DoD: keyboard-accessible creation and assignment; name conflicts and failed saves
retain input; default-role admission consequence and fixed invite role are visible; no template in an
assignment selector; zero-member role creation changes no existing grants.
Show each role action only for its specific capability. Manager-template users
can discover and use Roles without Team management; Team-only users cannot open
the role editor or edit permissions. Org-scoped Settings links use route
capabilities rather than platform-admin identity. Run `bun run lint:design` and
`bun run lint:tokens` with no increased design debt.

### Slice 6 — Qualification and release evidence

**Topics:** `security`, `data`, `auth`, `test`

Exercise browser UI against loopback QA, plus native PostgreSQL migration,
provisioning, invitation, simulation, page/data and agent authorization scenarios.
Run the exact candidate's check, test and build gates and independent Standards
and Spec review. Document migration ordering, readiness, rollback and runtime
verification. Do not qualify feature/database writes against production.

DoD: a committed evidence manifest ties the source tree, QA schema and test/browser
results together. All slices are complete before the feature becomes available
to new organizations. Human approval of the concrete merge/release candidate is
required; this spec does not authorize production deployment.

## 4. Verification matrix

| Scenario | Required observable result |
|---|---|
| Existing FACES and other legacy org fixtures before/after migration | Same catalog, membership, existing module/page grants, record scope and field levels; role CRUD separation and stricter duplication follow §2.1 |
| New organization through supported provisioning | One Administrator role; creator has available org features; no platform elevation |
| New default member | Explicit Administrator assignment, same organization access as creator except ownership actions |
| Narrow role created | No changes to current members; template itself grants nobody access |
| Administrator replaced with Staff-Marketing-like role | Both pages and backend data/actions restrict; no hidden retained Administrator grant |
| Narrow role added alongside Administrator | Access remains the union; UI explains the retained Administrator grant |
| Custom page containing mixed datasets | Each dataset independently allowed/denied; page visibility cannot authorize writes |
| Template vs duplicate | Template uses versioned product defaults; duplicate preserves effective local overrides |
| New-model missing/foreign role | No legacy manager fallback and no default implicit full-access repair |
| Last access admin or owner concurrently removed/downgraded | One conflicting mutation fails; a valid recovery/admin and owner remain |
| Invite replay/changed default/explicit role | No existing-member promotion; stored role/revision for every outstanding invite; changed default affects new invites only |
| Simulation, notifications and delegated agent | Same fresh tenant/membership/role grants; no platform or cross-tenant widening |
| Role CRUD versus Team authority | Explicit per-action role capabilities; Team-only emits no role CRUD; Manager template has CRUD within ceiling, legacy global Manager defaults to none |
| Default-role mutation | Both `users:manage` and `roles:edit` required; either alone denies |
| Brain ACL or visibility grant after revocation | Fresh real/effective module and object rights checked under shared locks; stale share/visibility denies with no grant or audit side effects |

## 5. Rollout, rollback and compatibility

Deploy additive schema and legacy-compatible readers before enabling any new-model
writers. All application instances that might handle a new-model organization
must understand its model. Keep new-model creation disabled until all six slices
and migration/QA evidence pass. Do not use timestamps or organization names to
infer migration eligibility. Historical role rows are never dropped.

After new-model organizations exist, rollback must retain compatible authorization
readers and their data; disabling new-model creation is safe, deploying an old
reader is not. Any conversion back to legacy requires an explicit, separately
reviewed grant-preserving conversion. Never roll back by deleting assignments or
loosening missing-role fallback. Cache/model revision invalidation is mandatory.

## 6. Out of scope

Automatic migration of existing orgs, FACES role changes, Catalog/POS data-scope
separation, arbitrary table-level ACL design, general dynamic-route page-policy
support, cross-product authentication changes, tenant isolation bypass, ownership
transfer redesign and platform-operator role changes.

## 7. Review and implementation handoff

Two spec review passes must inspect both Standards and Spec axes. Record their
findings in the review sidecar and revise this artifact before requesting the
human security approval. Both review passes and owner implementation approval
were recorded on 2026-11-12. The later role-CRUD/grant-ceiling amendment above is
also owner-approved. Implementation is in progress; exact-candidate independent
review and the human merge/release decision remain required.

Do not leave partially wired bootstrap, invite, simulation or agent consumers
enabled. Any implementation handoff gap requires the in-code TODO(handoff) and
proposal ledger required by AGENTS.md. The inventory and qualification criteria
above are planned work, not claims that the behavior is already implemented.

## Implementation review refinements (2026-11-12)

Independent code review identified a cross-boundary account-deletion race.
Implementation adds a durable `profiles.deletion_pending` admission fence and
ordered profile lifecycle locks before organization-policy locks. Bootstrap,
invitation redemption, request approval and privileged membership additions check
that fence; global GoTrue deletion cannot race a new sole-administrator grant.
Deletion failure retains the fence for an explicit retry. Existing ordinary
profiles default false. The implementation candidate must qualify these locks
against actual native transactions and the external auth boundary.

The new local-role projection inputs also require minimal notification-worker
column privileges and live-source-fenced RLS. A follow-on migration and the
hardened notification protocol's native catalog/ACL tests must qualify that
extension; schema or unit tests alone do not prove it safe. The rollout flag
remains disabled until all readers and all these checks are qualified.
