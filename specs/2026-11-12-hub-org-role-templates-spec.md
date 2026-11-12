---
id: 2026-11-12-hub-org-role-templates-spec
title: Organization-owned roles with an unrestricted Administrator starting point
stage: dev
status: implementing
pass: 2
created: 2026-11-12
updated: 2026-11-12
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

The owner approved implementation after two technical review passes. Implementation
is in an isolated Hub feature checkout. The later role CRUD and grant-ceiling
requirements are recorded in the canonical specification. Full candidate qualification
is in progress; merge and release remain separate owner decisions.

## Out of scope

Existing-org migration, FACES permission changes, Catalog/POS splitting,
platform-superuser access and a new personal-organization signup flow.
