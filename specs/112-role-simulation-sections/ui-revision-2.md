# UI revision 2 — avatar tray and viewport frame

Owner feedback, 2026-11-08: replace the avatar's inline role list with one item opening a modal/tray with additional steps; replace the top simulation banner with a subtle frame around the viewport so existing layouts are unaffected.

## Interaction

1. Avatar menu → **Simulate a role…**. The menu contains one simulation entry.
2. Tray, **Choose role**: the active organization is fixed and named. Search/select one organization role. Selecting is a draft, not a permission change.
3. Tray, **Review**: show role permissions, own-record/field limits, destination after reload, and the real-action notice. **Apply role & reload** is the only entry/change commit. Cancel, Back, Close or Escape preserve the current mode.
4. Active mode: a quiet, 2px viewport perimeter uses the shared warning-border token. It is fixed, pointer-transparent, outside document flow and does not add app padding. A compact labelled role control lives in the existing sidebar utility slot; its label opens the tray and its 44px exit target stops simulation.
5. Mobile: a full-width bottom tray uses the same steps. The compact simulation utility sits above the safe area. The frame remains outside content flow. The page's normal interactive footer must remain reachable; production implementation must use the shell's existing overlay/safe-area contract rather than covering navigation controls.

Role/org context and **Actions are real** are disclosed in Review and remain available through the control/tray and accessible description. A text label complements the frame so color is not the only signal. No animation is required.

## FigCraft

Current file: [role-simulation-sections-v2.figcraft](role-simulation-sections-v2.figcraft).

Desktop flow: **V2 · avatar → choose role → review → simulate**. Mobile flow: **V2 · mobile role tray**. The active-role change examples keep the current role-scoped page behind the tray and preserve it on cancellation. The all-denied role has a review and exit-capable empty state. The section-access frames remain available on the second row.

The prior [proposal](role-simulation-sections.figcraft) is preserved because it was already open in the user's editor. Revision 2 opens as its own document. Its renders use the product's existing New York surfaces, the shared blue accent/on-accent pair and the semantic warning recipe. Records and role summaries are illustrative. Prototype actions only navigate between design frames.

## Evidence and review boundary

See [frame IDs](revision-2-frames.json), [design validation](design-validation.json), and [renders](evidence/revision-2/). These establish artifact structure and visual inspection, not implemented app behavior. The previous EGM Stage 5 report remains historical for revision 1; the new UI feedback is not a new EGM approval. Spec status stays draft and the security approval/merge gates remain unchanged.
