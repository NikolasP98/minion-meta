# UI revision 5: avatar ring and role-first menu

Historical intermediate direction: [revision 6](ui-revision-6-viewport-footer.md) replaces only the avatar-ring indicator and retains the role-first menu and atomic role replacement.

The owner accepted the ring preview, requested an edit action, and then selected **Option B — Role first** from the independent UX review examples on 2026-11-09. The latest request adds dividers around the simulation group. These direct instructions supersede V4's viewport frame and Finish-only active item. Historical FigCraft V4 and frame receipts remain preserved.

## AS-IS

Signed Hub head `e14e300c` had a viewport frame and a single active Finish item. A local ring iteration removed the frame. The first role-edit iteration joined Finish and a pencil icon; the owner found the paired actions confusing. Two independent UX specialists identified that the pencil appeared to edit the Finish command. They proposed separate action rows, a role selector with a separate exit, and a small control card. The owner chose the role-first selector.

## TO-BE

- A quiet amber ring surrounds the existing account-avatar trigger on desktop/mobile, preserving its dimensions. A polite app-level status still announces the selected role. No viewport frame remains.
- The active avatar menu has a divider, a current-role row showing “Simulating as” and the role with a chevron, a separate amber Finish simulation row, and a divider. Clicking the role row opens the same single-screen picker with the current role selected.
- The unchanged selection cannot be applied. Cancel retains the current simulation. Apply atomically replaces the selected role and reloads under the new authority, including bounded page fallback. Finish restores actual authority from its own row.
- A valid active mode exposes a fresh catalog based on actual Owner/Admin eligibility and authority ceilings. Invalid, expired or revoked modes keep Finish available; role editing is unavailable.
- Replacement retains the original return target, start and expiry, rotates the generation and audits actual identity plus old/new roles. It never clears simulation as an intermediate step. Membership/profile assignments remain unchanged.

## DELTA and proving boundaries

ProfileMenu now owns the ring and role-first rows, and SimulationStatus retains the accessible announcement. The shared Dropdown receives only an optional accessible-label prop; the experimental split-row API is removed. RoleSimulationDialog supports both first entry and active editing. The existing role-simulation POST supports atomic replacement under the existing session lock and generation check. No wire-schema or database migration change is needed.

Focused mounted UI/client/server tests exercise action separation, current-role selection, disabled unchanged Apply, Cancel, real transition shape, and existing generation controls. Eight current native cases cover replacement, above-ceiling/foreign/stale/invalid rejection, original timing/return preservation, audit identity and unchanged membership. The unrelated warm-viewer-policy case was deliberately excluded from this local lane to preserve the live user's shared QA policies; prior full-lane receipts remain historical. Actual browser evidence and fresh whole-project checks are recorded with delivery receipts. Human merge and production deployment remain separate gates.

The interactive comparison source is `.lavish/simulation-menu-options/index.html` in the meta workspace; its review session ended after the owner's Option B selection. It uses Minion's installed design tokens, fonts and the current 224px menu width.
