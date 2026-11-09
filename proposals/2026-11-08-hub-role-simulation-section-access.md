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

Actual active-organization owners/admins select one organization role from a single-screen tray opened by one avatar item. Real changes follow the selected role and actual authority ceiling. Identity, membership, preferences and record ownership remain the actual person's. A subtle pulsing frame surrounds all four viewport edges without shifting layouts, and an active-only circular key badge marks the avatar. The avatar menu groups the current-role selector and a separate amber **Finish simulation** row between dividers. Finish remains the only exit, including when no pages are permitted. The picker has one Apply action and the short footer warning **Actions affect real data.**

Authorized users edit shared section/page access directly from main headers and sidebar/card menus through one reviewed editor. Effective `users:manage` is sufficient independently of `settings:manage`; personal layout preferences remain separate. The [current UI V6](../specs/112-role-simulation-sections/ui-revision-6-viewport-footer.md) supersedes the intermediate ring and split-button iterations. The [owner-approved FigCraft revision 4](../specs/112-role-simulation-sections/role-simulation-sections-v4.figcraft) and earlier editable designs remain preserved as history.

## DELTA and definition of done

The owner explicitly authorized implementation on 2026-11-08 with EGM and SpecKit. Feature and technical review converged before code. The [plan](../specs/112-role-simulation-sections/plan.md), [tasks](../specs/112-role-simulation-sections/tasks.md) and [EGM admission](../specs/112-role-simulation-sections/egm/implementation-admission.json) record that sequence.

Production code is implemented in isolated Hub branch `feat/112-role-simulation-section-access`, based on `master` `5f647e7c`. It includes durable verified-session state, fresh request authority, bounded navigation fallback, generation and cached-content retirement, actual-actor audit attribution, single-screen role UI and contextual revision-checked access writes. Independent source reviews and loopback PostgreSQL/GoTrue tests passed. Authenticated browser acceptance now covers the agreed role/frame/avatar and contextual editor flows, including two-tab transitions. Final visual review caught an assistant overlap over the new dialog actions; the scoped repair passed focused and real hit-test/Escape/draft-restoration checks. Historical whole checks for tree `08ef834a` and exact CI on signed source `91baf240` passed. Latest source 71d3743d has the separately recorded local V6 checks; current-head CI remains pending. The [post-code review ledger](../specs/112-role-simulation-sections/egm/post-code-review.json) records defects and repairs. No merge or production deployment has occurred. Security/data work retains the human merge gate.

## Open-items ledger

The original deferred navigation Access comments are replaced by validated backend/UI entry points, including personal, collapsed and mobile navigation. No source defect is accepted as an unfinished follow-up. Implementation delivery has no accepted open source or qualification defects. The owner subsequently approved the latest UI and requested push plus production verification on 2026-11-09. Exact-source CI, authorized merge, deployment and authenticated runtime verification remain pending at the latest checkpoint. See the [qualification receipt](../specs/112-role-simulation-sections/evidence/implementation/qualification.json). Any later accepted unresolved code defect must carry an exact-site `TODO(handoff)` and matching proposal.

## Out of scope

Other-user identity impersonation, membership edits, cross-organization simulation, blanket context-menu redesign and the separately deferred Settings workshop.

## Latest approved UI and release scope

[UI V6](../specs/112-role-simulation-sections/ui-revision-6-viewport-footer.md) supersedes the intermediate avatar ring and split Finish/pencil experiment. It uses a quiet pulsing viewport perimeter and matching circular key badge, role-first selector with separate Finish between dividers, a two-row footer and shared compact search/POS control alignment. Active-role replacement retains the actual actor, original return target and lifetime under the existing session lock and generation check.

Latest source 71d3743d is signed and pushed in Hub PR 646. [Current evidence](../specs/112-role-simulation-sections/evidence/implementation/ui-v6/README.md) separates scoped local checks from pending exact-source CI and production proof. The explicit production request is authorization, not evidence that deployment occurred. No unresolved code defect is accepted by this checkpoint.
