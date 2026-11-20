# UI revision 4 — full viewport frame and avatar-only finish

Owner direction: the full viewport frame indicates simulation. To finish, the user opens the avatar menu, where the same role-picker item becomes a highlighted menu action that finishes the simulation.

Current file: [role-simulation-sections-v4.figcraft](role-simulation-sections-v4.figcraft). Desktop flow: **V4 · avatar → role → simulate → avatar → finish**. Mobile flow: **V4 · mobile avatar → role → simulate → finish**.

- With simulation off, the avatar item **Simulate a role…** opens the existing single-screen tray. Its brief warning remains **Actions affect real data.**
- While active, the full viewport has a fixed perimeter on all four edges, including navigation and overlays. It does not alter page geometry or intercept pointer input.
- The existing account avatar remains available. Its simulation item is highlighted and reads **Finish simulation**, with the current role beneath it. It finishes and reloads directly; it does not reopen the role picker.
- There is no separate simulation chip or floating/sidebar/empty-page exit button. To choose another role, finish the current simulation, then use the normal avatar item again.
- A role with no available pages still has the account shell and avatar. Accessible avatar text and mode-change announcements communicate simulation and its current role without adding a visual banner.

The live editor rejected its document-switch request before execution. Revision 4 therefore derives from the saved revision 3 in an isolated native engine, leaving the user's open editor document and any unsaved edits untouched. Prior revision files remain available. This is a native design revision; application RBAC, permission data and implementation approval have not changed.

See [frame IDs](revision-4-frames.json), [native validation](design-validation.json), and [desktop/mobile evidence](evidence/revision-4/). The earlier EGM report remains historical; this is not a new review verdict.
