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

Owners/admins simulate an active organization's role from the avatar menu, including real permitted actions, and authorized users manage section access directly from main pages. Actual identity and membership remain unchanged.

## AS-IS → TO-BE → DELTA

The canonical [SpecKit specification](112-role-simulation-sections/spec.md) contains the verified remote-master baseline, stories, requirements, D1–D7 proving evidence, scope and success criteria. The current [FigCraft proposal, revision 4](112-role-simulation-sections/role-simulation-sections-v4.figcraft) uses one avatar item and a single-screen role tray with a short warning. Active simulation has a full viewport frame; the same avatar item becomes a highlighted Finish simulation action, with no separate exit control. Two independent UX audits inform section-menu placement and simulation escape behavior. Previous proposals and the master are preserved.

## Review and implementation boundary

The owner approved implementation on 2026-11-08: “begin implementation with EGM like planned. SpecKit if needed”. EGM feature and technical review converged before code; [plan](112-role-simulation-sections/plan.md), [tasks](112-role-simulation-sections/tasks.md) and [admission record](112-role-simulation-sections/egm/implementation-admission.json) preserve that boundary. Production changes are in the isolated Hub branch `feat/112-role-simulation-section-access`, based on `master` `5f647e7c`.

Session-bound effective authority, generation fencing, the approved V4 simulation UI and contextual access editor are implemented. Independent code reviews found authorization, transaction, cache-retirement and read-projection defects; repairs and exact-candidate qualification are underway in the [post-code review record](112-role-simulation-sections/egm/post-code-review.json). Focused tests, native PostgreSQL/GoTrue admission and seed replay, actual role-gated writes, contextual policy edits, desktop/mobile frames and two-tab transitions have passed. Final visual review caught and repaired assistant overlap over the new dialog actions; focused tests and actual hit-test/Escape/draft-restoration receipts pass. Final whole checks passed on frozen tree `08ef834a`:0 errors and 0 warnings,9,273 tests plus 3 architecture checks, complete production packaging and client-boundary/canary checks. The configured signer recovered. Final signed Hub source `91baf240` includes the unchanged qualified production code plus a native-fixture contract repair. All final CI check runs and the Vercel preview status succeeded. Source and evidence are published in draft PRs for human review. No merge, production deployment or shipped status is claimed; human merge remains required.

## Out of scope

Other-user identity impersonation, organization membership changes, broad Settings redesign and unrelated context menus.

## Verification

See the canonical spec's Verification section and adjacent evidence. Completion requires fresh authority, cache/delegation, browser, design-token, i18n and route-contract proof against the final candidate. Lifecycle advances only with recorded evidence.
