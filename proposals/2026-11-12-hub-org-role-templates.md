---
id: 2026-11-12-hub-org-role-templates
title: New organizations start with Administrator and build roles from templates
status: done
created: 2026-11-12
updated: 2026-11-13
repos: [minion_hub]
spawned_spec: 2026-11-12-hub-org-role-templates-spec
tags: [security, data, auth]
effort: L
---

# New organizations start with Administrator and build roles from templates

## Request and decision

The owner requests a permissive starting point for new organizations: everyone
accesses everything, and the existing seeded roles become templates for creating
organization-specific roles. The owner explicitly permits either no roles or a
single seeded Administrator role, whichever fits best.

Choose one organization-specific Administrator role. Assign it to the creator
and to each newly admitted member unless an administrator explicitly chooses a
different organization role. Existing members keep their assignments when a new
role is created. Role names and permissions belong to the organization.

## AS-IS

Hub commit `523ca2e934e93d0fc0d6f7d052c94694b86553b6` exposes the global
owner/admin/manager/staff/viewer catalog to every organization. Custom roles sit
beside that catalog. Invite approval defaults to Staff, and invite validation
only accepts built-in role keys. Permission checks combine module actions,
per-page rules, record/field restrictions, and some role-name-specific checks.

Evidence and exact source anchors are in the linked spec. The preceding FACES
configuration demonstrates the need: Staff-Sales and Staff-Marketing are custom
organization roles, while the global Staff entry remains in its catalog.

## TO-BE

New organizations show one Administrator role and an optional role-template
gallery. Manager, Staff and Viewer do not become active roles until the user
creates an organization role from a template. The ownership relationship remains
separate from ordinary permissions. Existing organizations retain their current
catalogs, assignments and active business/page grants, including FACES. Future
grants obey the approved complete ceiling, and role CRUD uses explicit permissions
separate from Team administration.

"Everything" means all available features and data in the member's organization,
including organization administration. Authentication, membership admission,
tenant isolation, platform-operator-only functions, billing entitlements and
external provider consent remain enforced. Existing private-object semantics
must match those of today's organization administrator.

## DELTA and definition of done

1. Add an explicit new-organization role model and atomic Administrator bootstrap.
2. Split template discovery/instantiation from active organization-role discovery.
3. Admit members using the organization's current default or an explicitly chosen
   local role; validate again when an invite is consumed.
4. Adapt authorization, simulation, ownership protection and audit consumers.
5. Update Roles and Team UI and local QA fixtures.
6. Prove legacy preservation, full initial access, custom role restriction,
   invitation behavior, last-administrator protection and cross-tenant denial.

See [the implementation spec](../specs/2026-11-12-hub-org-role-templates-spec.md)
for slices and acceptance evidence. Hub PR 656 is released at `960f352f`; all eighteen checks passed on the identical qualified tree. Owner-approved production migrations, deployment, bounded runtime checks and new-org activation are complete.

## Out of scope

No automatic migration or permission expansion for existing organizations. No
conversion of FACES roles, Catalog/POS permission split, tenant-isolation bypass,
or platform-superuser assignment. No production migration before qualification
and the separate human merge/release decision.

## Delivered

[Hub PR 656](https://github.com/NikolasP98/minion_hub/pull/656) is merged, deployed and enabled for new organizations. Existing organizations retain their catalogs and assignments. The [release ledger](../audits/2026-11-12-org-role-templates/release.md) records qualification and runtime boundaries.
