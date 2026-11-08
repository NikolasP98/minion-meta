# UI revision 3 — single-screen simulation role picker

Latest owner correction: simulation role picking is a single screen, not multi-step, with only a brief warning at the bottom.

Current file: [role-simulation-sections-v3.figcraft](role-simulation-sections-v3.figcraft). Desktop flow: **V3 · avatar → select role → simulate**. Mobile flow: **V3 · mobile single-screen role tray**.

- One avatar simulation item opens one tray with the organization, role search and role list.
- The tray has Cancel and **Apply role**. Selection is a draft until Apply; Apply validates and reloads directly into simulation.
- The sole warning is **Actions affect real data.** It is a footer caption, without a warning panel or full message.
- Step indicators, Next/Back buttons, permission-summary review screens and extra role confirmations are removed. The shared section-permission editor's review/apply flow remains separate.
- The thin viewport frame, compact role/exit control and existing cancellation/organization boundaries remain as previously specified. Cancelling a role change keeps the current simulated page.

The live editor document was saved as revision 3 before applying changes, preserving in-editor changes and leaving the prior revision's disk file intact. No application implementation or permission data was changed. The earlier EGM report remains historical; this design correction is not a new EGM approval.

Evidence: [frame IDs](revision-3-frames.json), [native validation](design-validation.json), [desktop/mobile renders](evidence/revision-3/).
