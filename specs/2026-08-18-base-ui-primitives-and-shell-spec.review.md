---
spec: 2026-08-18-base-ui-primitives-and-shell-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 review

- Set `status: approved`, `pass: 2`, and `verdict: approved` because all correctness gaps were resolvable from the approved program, related specs, and operator memory without a human product decision.
- Added `ui`, `logic`, `test`, and `docs` tags so factory routing reflects the component logic, browser proof, and `DESIGN.md` work this spec actually requires.
- Added the downstream WorkDetail spec to `related` so the primitive dependency already described in the body is represented in frontmatter.
- Corrected the stale five-link AS-IS to the shipped Pipeline/Request/Board/Practices/Settings fold, citing `/memory/MINION/sdlc-board-triage-and-phase-gates.md` rather than preserving the proposal's older route snapshot.
- Added recon for test tooling, feature flags, and current route/query targets so implementation does not guess at absent-checkout scripts or paths.
- Replaced the browser-harness blocker with bounded unit/component support in Slice 1 and Playwright/axe/visual support in Slice 3, making the required proof implementable if the repo lacks a harness.
- Defined the fixed six-member `IntegrityMark` union and required recon-recorded status/risk mappings plus explicit unknown handling, removing an unverifiable “exhaustive variants” criterion.
- Separated controlled `AsyncButton` presentation from lifecycle request ownership and `ActionOutcome` live-region rendering, preventing the extraction from duplicating mutation or revision state.
- Defined terminal live-region roles, timer-free persistence, and callback-controlled retry/dismiss behavior so all seven action states have testable ownership and transitions.
- Required stable button width within a 1 CSS px tolerance and `aria-busy` only during submission, replacing subjective width and timing checks.
- Preserved the existing consequential-action contract by forbidding retry UI from replaying approval unless the current lifecycle API explicitly supplies that action.
- Extended Popover/KebabMenu proof to Tab/Shift+Tab containment, menu roles, Arrow keys, Home/End, Escape/outside close, and connected-trigger focus return, preventing a regression from the existing partial ARIA menu.
- Defined Clipboard success and failure behavior around the resolved/rejected Clipboard promise while preserving the visible revision text.
- Mapped Overview, Work, Request, Runs, and More to the current routes, including Work/Runs query precedence and More's Practices/Settings contents, removing the shell's largest route ambiguity without adding routes.
- Made the skip-link contract DOM- and focus-verifiable with a first interactive element and `main-content` focus target.
- Added `--bottom-nav-height`, the exact content-padding calculation, zero/nonzero safe-inset cases, and bounding-box assertions so “not obscured” is measurable.
- Added `PUBLIC_MOBILE_SHELL_V2` with false/unset rollback behavior and documented the local-versus-Vercel configuration boundary, matching the approved program's `PUBLIC_*_V2` requirement without authorizing deployment changes.
- Expanded responsive proof through 1920px and added axe plus committed visual baselines, matching the approved program's 320→1920 verification matrix.
- Added conditional test/config/environment files to the slice file lists so required harness and flag work cannot violate the spec's own scope guard.
- Added a route/navigation impact zone for the shipped UI fold and a Vercel build-flag impact zone, while retaining the intentionally narrow `repos: [minion-base]` boundary.
- Reconciled out-of-scope deployment configuration with in-scope local flag documentation and explicitly left production enablement to the operator.
- Replaced the final “missing harness is a blocker” escape hatch with exact flag-off/on, route, accessibility, safe-area, visual, and lifecycle-preservation evidence.

## Human flags

None.
