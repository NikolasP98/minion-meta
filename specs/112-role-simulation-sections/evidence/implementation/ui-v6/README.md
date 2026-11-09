# UI revision 6 qualification and release checkpoint

Signed Hub source `71d3743d020a518b95ad1a090b76ca46f16fd56f`, tree `43043adce9bce6a95cf765e2211fe7ae833c7393`, implements the owner-approved role-first menu, quiet viewport indicator, sidebar footer, avatar key badge and POS search alignment. [The source-bound receipt](qualification.json) separates local checks and historical captures; [production release](../production/release.json), [schema](../production/schema.json), [build/migration](../production/build-excerpt.txt) and [bounded runtime proof](../production/runtime.json) now establish the shipped deployment.

## Current behavior

The avatar menu groups the current-role selector and a separate Finish simulation row between two dividers. The single-screen picker preselects the current role. Cancel preserves role and generation. Apply replaces the role atomically under the actual actor ceiling, retaining the original return target and lifetime. The actual person, membership and assignments remain unchanged.

A pointer-transparent, layout-neutral 1px frame surrounds the viewport. Its base color is an opaque blend of 45% warning foreground and 55% canvas, rather than a transparent 45%-opacity border. It breathes from 0.65 to 1 opacity over 3.2 seconds; reduced motion makes it static. The final active-only avatar badge is a 16px circle with the same base color, 2px padding and a rendered 10px KeyRound glyph. There is no avatar ring.

The expanded sidebar footer has five evenly spaced 32px utilities with 16px icons, then a brand/version and DEV/account row. Coarse-pointer targets use 44px. The collapsed rail remains centered. Accounts/DataTable and Sell share CompactSearch; Sell keeps its 240px search on the left and Activity, filters and view controls on the right.

## Local checks and captures

- [122 focused tests across seven files](focused-role-footer-pos.txt) and [two connection-status tests](focused-connection-status.txt) pass.
- [Whole-project type checking](check.txt) reports zero errors and zero warnings for the recorded role-first/footer/search candidate. The final badge icon/color/padding detail followed that run; current exact-HEAD CI supplies the remaining final-head check/build proof.
- [Formatting](format.txt) passes for the recorded candidate. [Final design lint](design-lint-final.txt) reports no increased changed-file debt, and [final token lint](token-lint-final.txt) reports zero violations.
- [Native role replacement](native-role-replacement.json) executes eight passing cases. One existing shared viewer-policy mutation case is deliberately filtered to preserve the live QA policy; this is not a full-lane claim. [Cleanup](native-cleanup.json) removes only generated sessions/audits/custom roles and preserves pre-existing rows.
- [Cancel/pulse/reduced-motion proof](browser-cancel-pulse.json) and [role replacement/fallback proof](browser-role-replacement.json) record real local browser behavior.
- [Final-source Finish proof](browser-finish-final.json) returns the actual Owner to a fully loaded POS Sell page at `/es/pos/sell`, with the frame and key badge removed and the ordinary account label restored. The [before](before-finish-final.png), [Finish menu](finish-menu-final.png) and [fully loaded after](after-finish-final.png) captures use final source 71d3743d.

| Capture | What it proves | Boundary |
| --- | --- | --- |
| [Final-source before Finish](before-finish-final.png) | Active frame and key badge in the final running app | Final source 71d3743d |
| [Final-source Finish menu](finish-menu-final.png) | Separate avatar Finish action | Final source 71d3743d |
| [Final-source after Finish](after-finish-final.png) | Fully loaded Sell, ordinary Owner mode, no frame/badge | Final source 71d3743d |
| [Final key badge](avatar-key-badge-final.png) | Final 16px circle, 2px padding and 10px glyph | Final badge detail |
| [Expanded footer](footer-frame-desktop.png) | Footer arrangement and viewport containment | Captured before final badge detail |
| [Role-first menu](role-first-menu.png) | Selector, separate Finish and dividers | Captured before final badge detail |
| [Collapsed footer](footer-collapsed.png) | Centered utility/account controls | Captured before final badge detail |
| [Final-source mobile Sell](pos-toolbar-mobile-source71.png) | Underline search, wrapped action group and no overflow at 390px | [All action targets are at least 44px](pos-toolbar-mobile-source71.json) |
| [Earlier mobile Sell toolbar](pos-toolbar-mobile.png) | Responsive action group | Historical boxed-search candidate; not final search proof |
| [Selected role](current-role-preselected.png) | Current role is preselected in the tray | Not final badge-color proof |
| [Cancel](cancel-keeps-manager.png) | Manager simulation remains active | Not final badge-color proof |

No customer record, sale, payment or shared policy was changed during these UI checks. Historical V4, ring-only and earlier QA-control receipts remain preserved; they do not prove the final UI or release.

## Final CI and production release

The [final-source CI receipt](ci-release-final.json) records all 18 check runs and Vercel preview status successful on source `71d3743d`, with the CI merge tree exactly equal to candidate tree `43043adc`. It includes 9,279 unit tests passed (301 declared skips), three architecture checks, zero type errors/warnings, and 245 browser fixture cases passed across five projects with no skips. Native and QA assertion counts and their execution boundaries are retained in that receipt. The browser matrix exercises actual components with synthetic identity/HTTP/WS; it is not production runtime evidence.

The generic page-conformance sweep is not a full-fleet pass: its initial ledger is absent and the existing CI comparison intentionally exits zero. [Archived baseline comparison](ci-conformance-comparison.json) shows selected touched-page metrics unchanged or improved; POS Sell's small-target count falls from six to two, and both residual selectors predate this change. The [final local coarse-pointer capture](pos-toolbar-mobile-coarse-source71.png) and dedicated toolbar measurements prove the changed toolbar targets independently. Other dynamic-route/registry/toast differences remain bounded audit observations, without established feature attribution.

The owner explicitly approved merge and the admin override after GitHub rejected normal merge under its one-review rule. Hub PR 646 merged as `206d9ae218efd4bf682d6c4063797c7441f4d52a` at `2026-11-09T14:32:08Z`. Its tree `43043adce9bce6a95cf765e2211fe7ae833c7393` is identical to tested source `71d3743d`. Vercel production deployment `dpl_3B3Q5eVoS9Tp2mVCSN9Ckk3Mn4fj` is READY for `hub.minion-ai.org` on that merge commit. The production `bun run vercel-build` log records migration `20261108010000` applied at 14:32:18Z and build completion at 14:36:17Z. Post-merge CI 42635636172 succeeded. These events replace the earlier blocked release checkpoint; the failed normal merge receipt remains historical.

Read-only production schema inspection passes: migration present; mode table RLS and FORCE RLS enabled; no browser policies or browser-role privileges; runtime CRUD privileges; expected session/profile cascade foreign keys; audit defaults and actual-actor attribution trigger.

Authenticated production verification passes within a read-only boundary. The eligible five-role catalog returns 200 with private/no-store, and an unauthenticated request returns 401. Home and POS Sell route-data loaders return 200 type:data with no error nodes. The live role tray has five choices, a brief real-data warning, disabled initial Apply and enabled Apply after selecting Viewer; Cancel closes it without starting simulation. Home navigation More → Page access opens the actual editor through a 200 read; unchanged Review is disabled and Cancel closes it without a policy write. POS Sell is fully loaded with a 240×24 transparent underline search, right-aligned Activity and no horizontal overflow at 1440px. The final production session is inactive with no dialog, frame or key badge. No production Start, role replacement, Finish, business-data write or policy write was replayed. Those transitions remain qualified by local/native/CI evidence on the identical deployed tree.

The [earlier release gate](release-gate.json), [preflight](production-preflight.json) and [production-before metadata](production-before.json) remain historical. They are not overwritten with later success. Private production screenshots are excluded from public evidence. The [delivery checkpoint](../delivery-checkpoint.json) records current deployment and verification scope.

Historical [ci-final.json](../ci-final.json) remains bound to source `91baf240`; it is not substituted for this final receipt.
