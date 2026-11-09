# UI revision 6: quiet viewport frame and footer

The owner's latest request restores the viewport indicator in place of the avatar ring: thinner, with a slight pulse. Role-first Option B and its two dividers remain approved. This revision supersedes only the ring indicator in V5. The owner also requested an evenly arranged sidebar footer and the underline search used by POS Accounts.

## AS-IS

The local V5 candidate uses an avatar ring and role-first selector. The footer compresses status/upload/bug/notifications/search/DEV/avatar into a single utility strip above branding. POS Sell has a narrow boxed field while Accounts/DataTable use a transparent underline field.

## TO-BE

- A layout-neutral, pointer-transparent 1px viewport perimeter uses an opaque blend of 45% warning foreground and 55% canvas, gently breathing between 0.65 and 1 opacity over 3.2 seconds. Reduced motion disables the pulse. The existing native-top-layer behavior keeps the line above dialogs and popovers. The avatar ring is removed.
- The active avatar menu keeps the role-first selector and a separate amber Finish row, bounded by dividers. It identifies the selected role and retains an accessible app-level mode announcement.
- The active-only avatar badge is a 16px circle with the same opaque warning/canvas base color as the frame. It has 2px padding and a rendered 10px KeyRound glyph. The avatar ring stays removed.
- Expanded sidebar footer: five evenly spaced 32px utility targets with 16px icons, followed by a brand/version and DEV/account row. Coarse-pointer targets grow to 44px; the collapsed rail remains centered with sufficient inset. Existing navigation, notifications, upload, bug report, status, search and account behavior remain.
- POS Sell and Accounts/DataTable use one shared CompactSearch primitive: transparent background, search icon, quiet underline, matching focus/hover behavior and responsive touch height. Sell caps it at 240px and retains all controls on the right.

## DELTA and validation

Reuse the qualified SimulationFrame top-layer implementation and refine only its border, opacity animation and reduced-motion treatment. ProfileMenu removes the indicator ring while preserving role-first/Finish controls. Sidebar passes the existing branding link/version through a snippet to the footer's account row; the status indicator opts into a comfortable target without changing other consumers. Extract DataTable's search recipe into CompactSearch, preserving dt-search selector, value/ref binding and server input callback.

Existing mounted DataTable, role menu/tray, frame, client and POS route checks pass 122 cases. Connection status adds 2 passing existing cases. Native role-change coverage remains 8 executed cases with one unrelated shared-policy mutation case intentionally excluded locally. Browser qualification checks current-role preselection, Cancel generation preservation, atomic replacement and Finish, full frame geometry/pulse/reduced motion, expanded/collapsed footer containment, and shared search behavior. Exact source and later gates are recorded in the delivery receipt; no production deployment is implied.

## Final source and release authorization

Signed Hub `71d3743d020a518b95ad1a090b76ca46f16fd56f`, tree `43043adce9bce6a95cf765e2211fe7ae833c7393`, contains the final opaque frame/badge color and padded key glyph. The owner approved this UI and requested push plus production verification. [Current evidence](evidence/implementation/ui-v6/README.md) records local qualification, capture boundaries and pending exact-source CI. Production deployment and authenticated runtime proof are not yet established.
