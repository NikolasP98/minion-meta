---
id: 2026-11-12-legacy-org-role-conversion
title: Convert existing organizations to the local-role model, with an Administrator role and no empty roles
status: draft
created: 2026-11-12
updated: 2026-11-12
repos: [minion_hub]
effort: M
source: owner request 2026-11-12 (FACES role cleanup); follows spec 113
---

# Convert existing organizations to the local-role model

## Request

The owner asked for every organization to:

- drop every role that has no users assigned,
- have the new local Administrator role (spec 113 / hub PR 656), with `nikolas.pinon98` assigned
  to it, and keep his ownership (decided 2026-11-12: "Keep Owner, add Admin").

FACES additionally moves `nikolas.pinon98` to Administrator. The other FACES change, moving
`aleeperedo` from Staff-Sales to Staff-Marketing, was applied on 2026-11-12 under the legacy
model and needs nothing here.

## AS-IS

- Spec 113 §6 puts "Automatic migration of existing orgs" and "FACES role changes" out of
  scope. Hub PR 656 marks every existing organization `role_model='legacy'`, and
  `ORG_ROLE_TEMPLATES_ENABLED` affects only new organizations. No path converts a legacy
  organization.
- Legacy organizations share the global system catalog `permission_roles`
  (owner 100, admin 80, manager 60, staff 40, viewer 20). FACES also has `org_roles` rows
  `custom-staff-sales` and `custom-staff-marketing` (source role `staff`). Grants are
  `permission_rules` rows keyed by `(org_id, role_key)`. FACES has rules for admin, staff, viewer
  and both custom roles.
- Assignments in production on 2026-11-12 (`member_roles`):

  | Org | Role → users |
  |---|---|
  | bernibites | owner 1 |
  | faces-sculptors | owner 1, manager 5, custom-staff-sales 6, custom-staff-marketing 1, viewer 1 |
  | minion | owner 1, manager 2 (one is `nikolas.devtest`) |
  | pinonite | owner 1 |

  `nikolas.pinon98` holds `owner` in all four. Global system roles cannot be deleted for
  one organization: deleting a `permission_roles` row affects every organization.

## TO-BE

Each existing organization is on `role_model='organization'`:

- It has a local Administrator role (spec 113 template) assigned to `nikolas.pinon98`.
  Ownership is retained as the organization-ownership attribute.
- Every other role a member holds becomes a local role, with the same module/page grants,
  record scope and field levels as before. Examples are FACES Manager, Staff-Sales,
  Staff-Marketing and Viewer, and minion Manager.
- A role with no members is not created. The org's `permission_rules` rows for those roles
  are removed.
- No member gains or loses effective access, except `nikolas.pinon98` gaining Administrator.

## DELTA

- A conversion command, admin-only and per org, with dry-run by default. The dry run prints the
  before/after per-member capability matrix. Apply runs in one transaction under the
  organization policy lock and refuses if any member's effective access would change beyond
  the Administrator grant.
- Rollback: spec 113 §5 requires an explicitly reviewed, grant-preserving reverse conversion.
  Assignments are never deleted as a rollback.
- Tests: per-member capability equality before/after for FACES and minion fixtures. Empty
  roles are not carried over. The last-owner and access-administrator guards hold. A re-run is
  a no-op.

## Order

1. Hub PR 656 rollout, per `docs/organization-role-templates.md` §Rollout order: maintenance
   window, both migrations, compatible worker, flag stays off.
2. Spec for this conversion (two review passes, human security approval: RBAC data).
3. Dry-run against the QA stack, then each production org, with the owner's approval per org.

## Open questions

- `nikolas.devtest` holds `manager` in faces-sculptors and minion, and minion has a second
  manager. The request says "nikolas.pinon98 as the sole user in all orgs". Confirm whether these
  other members keep their roles or are removed.
