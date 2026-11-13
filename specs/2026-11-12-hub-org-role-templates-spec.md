---
id: 2026-11-12-hub-org-role-templates-spec
title: Organization-owned roles with an unrestricted Administrator starting point
stage: done
status: shipped
pass: 2
created: 2026-11-12
updated: 2026-11-13
repos: [minion_hub]
proposal: 2026-11-12-hub-org-role-templates
verdict: approved
type: feature
tags: [security, data, auth]
---

# Organization-owned roles and reusable templates

## 0. Product

New organizations start with one local Administrator role assigned to everyone
admitted by default. Users create their own roles from optional templates.
Existing organizations retain their current access.

The canonical [Spec Kit specification](113-org-role-templates/spec.md) contains
the AS-IS evidence, TO-BE invariants, DELTA, slices and acceptance scenarios.

## Plan and verification

- [Implementation plan](113-org-role-templates/plan.md)
- [Tasks and approval boundary](113-org-role-templates/tasks.md)
- [Source and creation-path inventory](113-org-role-templates/research.md)

The owner approved implementation and the separate administrator merge/release. Source and integration Standards/Spec reviews pass at `da51646c`, and the deployed commit `960f352f` has the identical qualified tree. All eighteen PR checks pass. The [qualification receipt](../audits/2026-11-12-org-role-templates/qualification.md) and [release ledger](../audits/2026-11-12-org-role-templates/release.md) record source, schema, browser, native bootstrap/legacy checks and production activation.

## Out of scope

Existing-org migration, FACES permission changes, Catalog/POS splitting,
platform-superuser access and a new personal-organization signup flow.

## Release

Hub PR 656 merged at `960f352f` and is live with provisioning enabled. Both migrations, native bootstrap rollback, legacy parity and live deployment/flag readbacks pass. All eighteen current-candidate PR checks pass. See the [release ledger](../audits/2026-11-12-org-role-templates/release.md) for exact identities and proof limits.
