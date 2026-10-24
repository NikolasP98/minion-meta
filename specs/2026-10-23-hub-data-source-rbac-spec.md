---
id: 2026-10-23-hub-data-source-rbac-spec
title: Hub data-source permissions — roles grant view/add/edit/remove per dataset, enforced on reads
stage: spec
status: review
pass: 1
created: 2026-10-23
updated: 2026-10-23
repos: [minion_hub, minion-meta]
type: feature
verdict: pending
tags: [security, data, permissions]
---

## 0. Product

Spec Kit feature: [`specs/039-data-source-rbac/`](039-data-source-rbac/spec.md), with `plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/` and `quickstart.md` alongside. Companion of spec 037 (`2026-10-23-hub-custom-nav-sections-spec`, Amendment B), which owns *page* roles.

Owner's words (2026-10-23): "roles for database actions (can this role view/add/edit/remove items in this dataset?) and roles for pages. Page roles give you access to navigate into the link. If a user lacks the data role to VIEW the database table(s), then any visual that uses that data-source will appear "broken" or disabled."

A dataset is one of today's 24 modules; the four verbs are today's view/create/edit/delete (labels only; export/manage stay under "Advanced"). **The gap:** 62 of the 73 `(app)` page/layout server loads that read tenant data have no capability check — the route policy is the only gate, and 94 of 99 tenant-scoped services trust their caller. **The fix:** one enforcement point — loads obtain their tenant handle through `datasetCtx(locals, module)` which returns a typed `DatasetDenied` value when the member lacks View, so the page still renders and each data-bound visual shows "Your role can't view <dataset>" through one `DataSource` component (over the existing `AsyncBoundary forbidden` / `CollectionState denied`). A vitest ratchet with a decrease-only baseline forbids new bare reads and requires zero for modules in `DATASET_ENFORCED`, which grows one module per slice (POS first) and flips spec 037's transition floor. Writes and API GETs keep their current gates. Settings → Roles becomes the data-roles editor (`users:manage`).

**Out of scope:** table/column-level datasets; changing `permission_rules`/`defaultCaps`; self-guarding services; enforcing reads in gateway/background jobs; a denied marker from API GETs (403 stays).

**Verification:** DELTA D1–D8 each with its proving test; ratchet red/green proof; per-module persona matrix (J5) on the QA stack; US1 with the 037 seeded link; evidence under `specs/039-data-source-rbac/evidence/`.
