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

Two technical review passes precede owner security-spec approval. Product code
and production configuration have not been changed. Verification requires legacy
permission parity, native PostgreSQL failure/concurrency scenarios, browser QA,
and Hub check/test/build plus design/token gates on the eventual candidate.

## Out of scope

Existing-org migration, FACES permission changes, Catalog/POS splitting,
platform-superuser access and a new personal-organization signup flow.
