---
id: 2026-11-01-hub-module-sdk-install-packages-spec
title: Hub official module SDK and install packages at org provisioning
stage: dev
status: implementing
pass: 1
created: 2026-11-01
updated: 2026-11-01
repos: [minion_hub, minion-meta]
tags: [data, ui]
---

## 0. Product

Spec Kit feature: [`specs/047-hub-module-sdk-install-packages/`](047-hub-module-sdk-install-packages/spec.md). Source proposal: `proposals/2026-10-28-hub-org-module-packages-tenancy-nav-home.md` (T3, T3b).

A new organisation comes up with the base modules (crm, scheduling, pos, stock, finances on; support, sales, ads off) as explicit rows, and its landing page set; provisioning is idempotent. Settings → Modules lists every toggle. Official modules are declared once with `defineModule()`; the existing registries are derived from it, `stock` first, with a database test that every declared cross-module link is a real foreign key.

Two hub slices: S6 (SDK) then S4 (installer + provisioning step + settings list). No DDL, no backfill (absent row still means enabled). Owner approved 2026-11-01; owner merges.
