---
id: 2026-11-08-hub-role-simulation-section-access-spec
title: Organization role simulation and contextual section access
stage: done
status: shipped
verdict: approved
pass: 4
created: 2026-11-08
updated: 2026-11-09
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

## Verification and shipped production delivery

On 2026-11-09 the owner approved the latest UI and requested push plus production verification. This direct release authorization is distinct from the earlier signing approval. [Current CI 42577143704](https://github.com/NikolasP98/minion_hub/actions/runs/42577143704) and [desktop 42577143739](https://github.com/NikolasP98/minion_hub/actions/runs/42577143739) completed successfully: all 18 check runs and Vercel preview status passed. The initial production preflight is historical: the release now has applied-migration/schema proof and authenticated read-only checks. The owner explicitly approved merge and the admin override after GitHub rejected normal merge under its one-review rule. Hub PR 646 merged as `206d9ae218efd4bf682d6c4063797c7441f4d52a` at `2026-11-09T14:32:08Z`. Its tree `43043adce9bce6a95cf765e2211fe7ae833c7393` is identical to tested source `71d3743d`. Vercel production deployment `dpl_3B3Q5eVoS9Tp2mVCSN9Ckk3Mn4fj` is READY for `hub.minion-ai.org` on that merge commit. The production `bun run vercel-build` log records migration `20261108010000` applied at 14:32:18Z and build completion at 14:36:17Z. Post-merge CI 42635636172 succeeded. These events replace the earlier blocked release checkpoint; the failed normal merge receipt remains historical.

Read-only production schema inspection passes: migration present; mode table RLS and FORCE RLS enabled; no browser policies or browser-role privileges; runtime CRUD privileges; expected session/profile cascade foreign keys; audit defaults and actual-actor attribution trigger.

Authenticated production verification passes within a read-only boundary. The eligible five-role catalog returns 200 with private/no-store, and an unauthenticated request returns 401. Home and POS Sell route-data loaders return 200 type:data with no error nodes. The live role tray has five choices, a brief real-data warning, disabled initial Apply and enabled Apply after selecting Viewer; Cancel closes it without starting simulation. Home navigation More → Page access opens the actual editor through a 200 read; unchanged Review is disabled and Cancel closes it without a policy write. POS Sell is fully loaded with a 240×24 transparent underline search, right-aligned Activity and no horizontal overflow at 1440px. The final production session is inactive with no dialog, frame or key badge. No production Start, role replacement, Finish, business-data write or policy write was replayed. Those transitions remain qualified by local/native/CI evidence on the identical deployed tree. The [delivery checkpoint](112-role-simulation-sections/evidence/implementation/delivery-checkpoint.json) records current verification boundaries.

## Out of scope

Other-user identity impersonation, membership edits, cross-organization simulation, broad Settings redesign and unrelated context-menu work.

The [release-gate receipt](112-role-simulation-sections/evidence/implementation/ui-v6/release-gate.json) preserves GitHub's earlier normal-merge rejection. The owner subsequently approved the admin override; it is not an unresolved permission request.

Production evidence: [release](112-role-simulation-sections/evidence/implementation/production/release.json), [applied migration/build](112-role-simulation-sections/evidence/implementation/production/build-excerpt.txt), [schema](112-role-simulation-sections/evidence/implementation/production/schema.json), and [authenticated read-only runtime](112-role-simulation-sections/evidence/implementation/production/runtime.json). No private production screenshots are published.
