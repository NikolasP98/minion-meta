---
spec: 2026-08-18-base-attention-queue-responsive-runs-spec
pass: 2
verdict: approved
reviewer: factory-review
created: 2026-08-18
---

# Pass 2 correctness and consistency review

## Changes made

- Set the spec to pass 2 with `status: approved` and `verdict: approved` because all identified contradictions were deterministically correctable from approved artifacts and memory.
- Added the UX plan and WorkDetail spec to `related` so every authority and adjacent owner cited by the body is represented in frontmatter.
- Corrected the primitives dependency from a nonexistent bottom-sheet contract to its actual `Popover`/`Disclosure` behavior, leaving responsive sheet presentation owned here.
- Replaced the obsolete standalone `/runs` assumption with the shipped `/kanban?view=factory` surface and expected `FactoryRuns` integration points, per `/memory/MINION/sdlc-board-triage-and-phase-gates.md` (UI FOLD SHIPPED).
- Anchored lazy-log recon to Base's existing segment-allowlisted Factory proxy and log-tail surface, per `/memory/MINION/minion-factory-agent-pipeline.md`, while retaining the stop-for-revision guard if run-scoped authorization is absent.
- Defined attention precedence as highest-to-lowest and added a visible fail-closed `unclassified` result so unknown or insufficient data cannot be falsely labeled safe, complete, risky, or decision-required.
- Made attention mode and focused-stage mode mutually exclusive: clean `/kanban` is the attention default, selecting `stage` shows one stage, and clearing it returns to attention.
- Made attention-group and stage query values mutually exclusive and specified canonical `pushState`/`replaceState` behavior so apply/cancel/reset/back-forward requirements are testable.
- Required URL-state serialization to preserve the existing `view=factory` route state rather than letting board filters break the Runs surface.
- Clarified that mobile stage state remains URL-persisted but cannot hide desktop lanes, and must restore when the viewport returns to mobile.
- Defined active-filter count as non-default dimensions so multi-select values do not produce an ambiguous badge count.
- Changed WorkItemCard from an unconditional single internal link to at most one resolvable link, with explicit unavailable action/detail states, because UI-004 precedes the internal issue-route work owned by UI-005.
- Added exact lazy-log validation and bounds (recognized 128-character run id, fixed upstream route, latest 200 lines or 128 KiB, text/control handling) so the endpoint definition of done is verifiable.
- Added central feature-flag/environment-reference scope and negative flag cases so the exact `=1` opt-ins and rollback behavior are machine-checkable.
- Narrowed the out-of-scope retry prohibition to consequential lifecycle retries while keeping the specified read-only log retry in scope.
- Updated slice and end-to-end proofs for `unclassified`, attention-to-stage transitions, unresolved detail links, canonical Factory-view URLs, axe results, and exact route-preservation behavior.
- Preserved the intrinsic-width and measured-sticky requirements from `/memory/MINION/overflow-hidden-kills-sticky.md`; no root clipping workaround is permitted.

## Human flags

None. Implementation must still stop for a new spec revision if recon finds missing dependency exports, missing explicit attention predicates, or no authenticated run-scoped log-read capability.
