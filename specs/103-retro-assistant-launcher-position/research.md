# Phase 0 Research: Assistant Launcher Stays in Its Corner

## Unknowns from Technical Context

None marked `NEEDS CLARIFICATION` — the component, its state shape, and its existing
drag/snap functions are all already in the codebase (see plan.md's AS-IS evidence and
Project Structure). The only open decisions are design choices, resolved below.

## Decision 1: What replaces `localStorage` for the dragged position?

- **Decision**: A module-scope (`<script module>`) variable, not `sessionStorage`.
- **Rationale**: FR-003 requires the dragged spot to survive in-app client-side navigation;
  FR-004 requires it to NOT survive a reload. A Svelte `<script module>` binding is
  reinitialized to its literal default on every full page load (new JS module evaluation)
  but is shared across every mount/remount of the component within that load — which is
  exactly the shell's re-mount pattern on client-side navigation (the shell re-keys per
  module, per the component's own re-parenting comment at `root` in
  `FloatingAssistant.svelte`). `sessionStorage` would also satisfy FR-003, but it additionally
  survives an in-tab reload (sessionStorage is reload-durable, only tab-closure clears it),
  which would violate FR-004 — this is exactly the ask's internal contradiction the
  Clarifications section resolved in favor of "hard refresh always resets."
- **Alternatives considered**: `sessionStorage` (rejected — survives reload, see above);
  a Svelte store singleton (rejected — same reload-survival property as module scope, no
  added value, adds an import); `localStorage` (rejected outright — it is the bug being
  fixed).

## Decision 2: What replaces resize-time re-snapping?

- **Decision**: Store the settled position as a fraction of the free viewport area
  (`fx, fy` each in `[0, 1]`, where `0`/`1` are the margin-inset edges) and re-derive pixel
  `left`/`top` from that fraction whenever viewport size or measured launcher size changes.
- **Rationale**: FR-005 requires the launcher to stay on the *same edge* through a resize.
  A fraction anchored to one edge (e.g., `fx = 1` for "flush right") stays `1` through any
  resize — re-deriving pixels from it can never move the launcher to a different edge. The
  previous behavior instead re-ran the full nearest-edge-of-four decision on every resize,
  which can flip to a different edge whenever the aspect ratio changes enough that a
  different edge becomes nearest.
- **Alternatives considered**: Clamp-only (what the previous code already did, see plan.md
  AS-IS) — rejected, it does not preserve the edge, only keeps the absolute pixel position
  on-screen; re-running `snapToEdge()` on resize (today's actual prior behavior) — rejected,
  it is the bug (FR-005).

## Decision 3: Scope of the fix

- **Decision**: One file, `FloatingAssistant.svelte`; no shared utility extracted.
- **Rationale**: Confirmed by the shipped diff's scope (plan.md Technical Context,
  "Scale/Scope") — the position state and every function that reads or writes it already
  live in this one component, and no other file references the `localStorage` key being
  removed.
- **Alternatives considered**: Extracting the fraction math into a shared
  `$lib/utils/viewport-anchor.ts` helper for reuse — rejected for this slice as premature
  (no second caller exists); flagged as a possible follow-up, not a requirement.
