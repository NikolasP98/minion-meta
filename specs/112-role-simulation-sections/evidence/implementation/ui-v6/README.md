# UI revision 6 qualification and release checkpoint

Signed Hub source `71d3743d020a518b95ad1a090b76ca46f16fd56f`, tree `43043adce9bce6a95cf765e2211fe7ae833c7393`, implements the owner-approved role-first menu, quiet viewport indicator, sidebar footer, avatar key badge and POS search alignment. [The source-bound receipt](qualification.json) separates local checks, historical captures and pending release proof.

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

## Authorized release, pending proof

The owner approved the latest UI and requested push plus production verification. That authorization is distinct from the earlier commit-signing approval. Source is signed and pushed in review-ready [Hub PR 646](https://github.com/NikolasP98/minion_hub/pull/646). [CI 42577143704](https://github.com/NikolasP98/minion_hub/actions/runs/42577143704) and [desktop 42577143739](https://github.com/NikolasP98/minion_hub/actions/runs/42577143739) have not yet completed all release checks at this checkpoint: desktop is successful, while the two remaining browser jobs are pending. The [read-only production preflight](production-preflight.json) confirms database-role/catalog prerequisites and the runtime privileges needed by the session migration, including public-schema CREATE and ownership needed to alter the audit table. The role-simulation migration was not yet applied at that check. This does not prove migration execution or deployment. [Production-before API metadata](production-before.json) records the prior live source `5f647e7c` on a READY production deployment; it does not show the new feature live. Merge, production deployment and authenticated production verification remain unproved. The earlier green [ci-final.json](../ci-final.json) belongs to source 91baf240 and is preserved as historical evidence.
