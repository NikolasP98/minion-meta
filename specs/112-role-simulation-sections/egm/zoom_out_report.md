# EGM Stage 5 — initial Zoom Out

Actual fresh-context reviewer result, 2026-11-08. Reviewed the draft before the minor fixture clarification and before the custom-section review frame was added. This is not the five-stage EGM completion verdict.

## Reviewer result (verbatim)

Stage 5 — Initial Zoom Out, Mode REVIEW, completed for the full `specs/112-role-simulation-sections/spec.md`. This is one review stage, not completion of the five-stage EGM process. No files, branches, worktrees or application state were changed.

Read in full: the `egm-zoom-out` persona, `zoom-out-standard.md`, target spec, adjacent `ux-navigation.md` and `ux-simulation.md`, and baseline Hub contributor instructions. Confirmed baseline HEAD is `5f647e7c9db91f9a3ab0ad18c2dbf9d565dff38e`.

No Blocker or Major finding under the Zoom-Out Standard at this initial-draft altitude. The objective is clear, both requested capabilities address concrete workflow gaps, and the draft distinguishes navigation visibility from data authority. Its real-action warning, non-elevation requirement, protected exit, and unsupported-channel restriction are necessary boundaries for the owner-selected live mode. I found no speculative caching, queueing, framework or configuration proposal to remove.

1. **Severity: Nit**
   **Affected scope:** User Story 3 independent test, `spec.md:83`, against Story 1 acceptance scenario 5 and FR-001, `spec.md:67,122`.

   The test asks a custom-role member with `users:manage` but without `settings:manage` to change access and observe the result under simulation. That fixture establishes permission-management authority, but does not establish the actual owner/admin authority required to start simulation. It could therefore fail for the correct reason or encourage coupling these two deliberately separate permissions.

   **Simpler alternative:** Split the proof: the custom-role member performs contextual access editing; an actual owner/admin verifies the resulting role through simulation. Alternatively, explicitly give the fixture actual owner/admin eligibility and explain how its effective permissions still exercise `users:manage` without `settings:manage`.

Reuse and architectural observations for the later technical design:

- The existing `buildCapabilities(roles, overrides)` already evaluates arbitrary role sets, subresource inheritance, own-record scope, field levels and explicit page rules. `listRoleCatalog`, `isAssignableRoleKey`, and `invalidateRbac` provide existing catalog, validation and invalidation seams. Extend this engine with effective request context rather than create a second simulation permission engine. The draft does not currently require a duplicate engine, so this is a reuse recommendation, not a defect.
- The separate navigation/access gates and existing page/section keys substantiate the proposed shared contextual editor. `NavContextMenu` currently returns early on `settings:manage`; the spec correctly requires independent `users:manage` handling. Existing role-manager controls contain reusable semantics, although their immediate-save behavior cannot directly satisfy the proposed reviewed Apply transaction.
- Delegation is a real architectural boundary. `resolveAssistantPrincipal` resolves persisted member authority independently of browser permission strings, and `requireAssistantCapability` feeds both assistant reads and writes. Gateway WebSocket authentication also has its own credential path. Fresh transaction authorization exists separately in `resolveFreshCapabilitiesInTransaction`, including background dispatch consumers. These confirm that changing layout permissions alone is insufficient. The draft explicitly recognizes this and permits disabling unsupported action channels; that is a defensible way to bound the first delivery. No demand for helper-level implementation details is warranted now.

Source coverage: inspected all source files explicitly named in the target at their relevant interfaces, plus the profile-menu mounting points, role-manager controls, route-policy helpers, delegated principal/action authorization, representative delegated read/write routes, gateway credential flow and a background authority consumer.

Limits: this was static source review. I did not verify deployed behavior, execute authorization tests, inspect every authorization consumer, or perform FigCraft rendering/prototype interaction. I inspected the proposal archive structure and verified the local master’s stated SHA-256. The PR 971 master copy and its claimed hash equality were not independently verified; visual fidelity, text-overlap observations and prototype no-write behavior remain unverified by this stage.

## Author disposition

The one Nit is addressed in Story 3: the custom-role member proves contextual access management without `settings:manage`; a separate actual owner/admin proves simulation of the affected role. No new role eligibility is inferred from access-management permission.

The native proposal now has nine TO-BE frames; the added custom-section review maintains the Front desk target rather than linking to the CRM module review. Product implementation and runtime authority proof remain outside this design delivery.

Next EGM checkpoint: Stage 6 comprehension review. Design critique, intermediate Zoom Out, implementation readiness, formal SpecKit planning, owner approval, implementation and release remain unperformed. The new proposal ledger records these remaining steps.
