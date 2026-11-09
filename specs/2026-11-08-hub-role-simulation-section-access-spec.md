---
id: 2026-11-08-hub-role-simulation-section-access-spec
title: Organization role simulation and contextual section access
stage: test
status: review
verdict: approved
pass: 4
created: 2026-11-08
updated: 2026-11-08
repos: [minion_hub]
tags: [security, auth, ui]
proposal: 2026-11-08-hub-role-simulation-section-access
type: feature
---

# Organization role simulation and contextual section access

## 0. Product

Owners/admins simulate one active-organization role and perform the actions that role permits within their actual authority ceiling. Actual identity, membership and assignments remain unchanged. Authorized users manage section/page access from main headers and navigation/card menus without requiring Settings access.

## AS-IS → TO-BE → DELTA

The verified Hub baseline `5f647e7c` had no role simulation and deferred contextual Access controls. The canonical [SpecKit specification](112-role-simulation-sections/spec.md) retains source anchors, requirements and proving boundaries.

The latest owner-approved [UI V6](112-role-simulation-sections/ui-revision-6-viewport-footer.md) has a role-first selector and a separate amber Finish row bounded by dividers. A single-screen picker preselects the current role; Cancel preserves mode, and Apply atomically replaces it without resetting the original return target or lifetime. Active mode has a quiet pulsing 1px viewport perimeter and a 16px circular avatar key badge with 2px padding and a rendered 10px glyph. The frame and badge share an opaque 45% warning/55% canvas base color. Reduced motion makes the frame static. There is no avatar ring.

The approved adjacent scope includes a two-row sidebar footer and shared CompactSearch in Accounts/DataTable and POS Sell. Sell keeps its 240px search on the left and Activity/filter/view controls on the right. [The POS scope note](112-role-simulation-sections/pos-sell-toolbar-adjustment.md) records the boundary: financial operations and authorization are unchanged.

Implementation uses verified-session state, fresh effective authority, generation fencing, bounded navigation fallback, actual-actor auditing and shared revision-checked section policy. [QA account switching](112-role-simulation-sections/evidence/implementation/qa-controls-followup/README.md) remains separate under DEV.

## Admission, review and qualification

The owner authorized implementation on 2026-11-08: “begin implementation with EGM like planned. SpecKit if needed”. [EGM admission](112-role-simulation-sections/egm/implementation-admission.json), [plan](112-role-simulation-sections/plan.md), [tasks](112-role-simulation-sections/tasks.md) and [post-code review](112-role-simulation-sections/egm/post-code-review.json) preserve the review sequence and repairs. The preserved [FigCraft V4](112-role-simulation-sections/role-simulation-sections-v4.figcraft) and [intermediate V5](112-role-simulation-sections/ui-revision-5-role-first.md) remain historical design evidence; V6 is current.

Historical frozen tree `08ef834a` passed whole checking, 9,273 tests plus three architecture checks, full production packaging and boundary/canary checks. Historical signed source `91baf240` passed its exact CI. These receipts are not reused as current-head release proof.

Latest signed Hub source `71d3743d020a518b95ad1a090b76ca46f16fd56f`, tree `43043adce9bce6a95cf765e2211fe7ae833c7393`, is pushed in [Hub PR 646](https://github.com/NikolasP98/minion_hub/pull/646). [Current qualification](112-role-simulation-sections/evidence/implementation/ui-v6/README.md) records 122 focused cases, two connection-status cases, eight scoped native cases, type/style checks and their execution/capture boundaries. Native replacement keeps actual actor, membership, original lifetime and return target; the unrelated shared viewer-policy mutation case is intentionally excluded locally. Final-source local Finish proof returns to a fully loaded POS Sell page with no frame/badge.

## Verification and authorized production delivery

On 2026-11-09 the owner approved the latest UI and requested push plus production verification. This direct release authorization is distinct from the earlier signing approval. [Current CI 42577143704](https://github.com/NikolasP98/minion_hub/actions/runs/42577143704) and [desktop 42577143739](https://github.com/NikolasP98/minion_hub/actions/runs/42577143739) completed successfully: all 18 check runs and Vercel preview status passed. Read-only production preflight confirms prerequisites; the migration was not yet applied at that check. Merge, production deployment and authenticated post-merge behavior remain unproved. The [delivery checkpoint](112-role-simulation-sections/evidence/implementation/delivery-checkpoint.json) records the remaining release steps.

## Out of scope

Other-user identity impersonation, membership edits, cross-organization simulation, broad Settings redesign and unrelated context-menu work.

The [release-gate receipt](112-role-simulation-sections/evidence/implementation/ui-v6/release-gate.json) records GitHub's rejection of normal merge under its one-review rule. The requested override-or-review choice is pending; production remains unchanged.
