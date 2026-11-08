---
id: 2026-11-08-hub-role-simulation-section-access
title: Live organization role simulation and section access from main pages
status: in-spec
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub]
tags: [security, auth, ui]
spawned_spec: 2026-11-08-hub-role-simulation-section-access-spec
---

# Live organization role simulation and section access

## AS-IS

The verified Hub `master` baseline `5f647e7c` has no role simulation in ProfileMenu. Navigation context menus defer section/page Access; personal navigation lacks equivalent menu hosts. `users:manage` and `settings:manage` are separate controls, while existing override APIs accept only canonical modules/subresources. Source anchors and UX audits are retained in the [SpecKit specification](../specs/112-role-simulation-sections/spec.md).

## TO-BE

Actual active-organization owners/admins select one organization role from a single-screen tray opened by one avatar item. Real changes follow the selected role and actual authority ceiling. Identity, membership, preferences and record ownership remain the actual person's. A thin frame surrounds all four viewport edges without shifting layouts. The same avatar item becomes highlighted **Finish simulation**, the only exit, including when no pages are permitted. The picker has one Apply action and the short footer warning **Actions affect real data.**

Authorized users edit shared section/page access directly from main headers and sidebar/card menus through one reviewed editor. Effective `users:manage` is sufficient independently of `settings:manage`; personal layout preferences remain separate. The [owner-approved FigCraft revision 4](../specs/112-role-simulation-sections/role-simulation-sections-v4.figcraft) supersedes earlier multi-step picker and floating-exit designs. Earlier editable revisions are preserved as history.

## DELTA and definition of done

The owner explicitly authorized implementation on 2026-11-08 with EGM and SpecKit. Feature and technical review converged before code. The [plan](../specs/112-role-simulation-sections/plan.md), [tasks](../specs/112-role-simulation-sections/tasks.md) and [EGM admission](../specs/112-role-simulation-sections/egm/implementation-admission.json) record that sequence.

Production code is implemented in isolated Hub branch `feat/112-role-simulation-section-access`, based on `master` `5f647e7c`. It includes durable verified-session state, fresh request authority, bounded navigation fallback, generation and cached-content retirement, actual-actor audit attribution, single-screen role UI and contextual revision-checked access writes. Focused source reviews and loopback PostgreSQL/GoTrue tests have passed; final full checks, browser acceptance and delivery remain pending. The [post-code review ledger](../specs/112-role-simulation-sections/egm/post-code-review.json) records defects and repairs. No merge or deployment has occurred. Security/data work retains the human merge gate.

## Open-items ledger

The original deferred navigation Access comments are being replaced by validated backend/UI entry points, including personal, collapsed and mobile navigation. Implementation and qualification tasks remain open until their evidence is recorded; a green focused suite is not a release claim. Any accepted unresolved defect must have an exact-site `TODO(handoff)` and a matching proposal before delivery.

## Out of scope

Other-user identity impersonation, membership edits, cross-organization simulation, blanket context-menu redesign and the separately deferred Settings workshop.
