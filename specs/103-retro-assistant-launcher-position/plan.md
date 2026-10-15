# Implementation Plan: Assistant Launcher Stays in Its Corner

**Branch**: `103-retro-assistant-launcher-position` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/103-retro-assistant-launcher-position/spec.md`

## Summary

The floating assistant launcher in `minion_hub` currently persists its dragged pixel
position to `localStorage`, so it reappears at the dragged spot after a hard refresh
(violates FR-001/FR-004), and a window resize re-runs the same nearest-edge snap it uses on
drag-release (violates FR-005/FR-006), which can throw the launcher onto a different edge
than the one the user put it on. The fix replaces persistent storage with session-scoped,
in-memory position state that resets on every reload, and replaces resize-time re-snapping
with resize-time re-derivation of the launcher's pixel position from a stored *fraction* of
the free viewport area — so the same relative spot on the same edge is reproduced at any
viewport size, including sizes where the stored absolute pixel location would otherwise go
off-screen.

## AS-IS evidence (pre-existing behavior)

Anchors are to the lines the fix actually removed (available only as the "-" side of the
shipped diff, `gh pr diff 539 -R NikolasP98/minion_hub`, since the pre-fix file is not
separately checked out here):

- **Reload restores the drag**: `onMount` read `localStorage.getItem('assistant-launcher-pos')`
  and set `pos` from it directly — the removed lines are the entirety of FR-001/FR-004's bug.
- **Resize re-snaps**: the removed `onResize` handler called `if (pos) snapToEdge();` on every
  `resize` event — `snapToEdge()` picks whichever of the four edges is now nearest, which is
  not necessarily the edge the pixel position was already on, reproducing FR-005's bug.
- **In-viewport clamp, not edge-preservation**: the removed `$effect` only clamped `pos.left`/
  `pos.top` into viewport bounds on resize; it did not preserve the edge, so on a large enough
  resize the clamped pixel coordinate could sit on a different edge than before.

## Technical Context

**Language/Version**: TypeScript, Svelte 5 (runes: `$state`, `$effect`, `<script module>`)

**Primary Dependencies**: SvelteKit 2, Tailwind 4 (existing component styling, unchanged)

**Storage**: None persisted by design (FR-004) — session-scoped in-memory state only, for
the lifetime of the browser tab (survives client-side navigation per FR-003, not a reload)

**Testing**: Vitest (hub's existing unit test runner, `bun run test`); no component-level
test harness currently exercises `FloatingAssistant.svelte`'s drag/resize math directly —
see Complexity Tracking

**Target Platform**: Browser, `minion_hub` SvelteKit web app

**Project Type**: Single project — one existing frontend component, no new surface

**Performance Goals**: No added layout thrash; resize handling must stay at today's single
`resize` listener (no polling), consistent with the existing `measureLauncher()` pattern

**Constraints**: Zero added network or persisted-storage calls (FR-004); must not regress
existing drag, edge-snap, or docked/expanded visual behavior (Assumptions)

**Scale/Scope**: One file — `src/lib/components/layout/FloatingAssistant.svelte` — no other
file in `minion_hub` reads or writes `assistant-launcher-pos`, so the slice is self-contained
(confirmed by scope of the shipped diff: 1 file, +25/-34 lines)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec before code | **PASS (retroactive)** | This spec is being written after the fact for audit purposes; the real PR #539 shipped with no spec at all, which is the violation this retrospective exists to document. Going forward, this plan is what should have existed before the PR. |
| II. AS-IS → TO-BE → DELTA, with evidence | **PARTIAL** | The Spec Kit `spec.md` template has no AS-IS/TO-BE/DELTA sections — User Stories + FRs cover TO-BE, and the "AS-IS evidence" section above was added to this plan (not the spec) to satisfy the Minion contract, sourced from the diff's removed lines rather than a live pre-fix anchor (no pre-fix checkout exists in this read-only audit). This is a real gap between the two templates, not a clean pass — see `analysis.md` and `sdd-notes.md`. |
| III. Slice-scoped delivery | **PASS** | One slice, one file, ships as one PR against `minion_hub`'s registered PR base (`master`, per repo-policy), from an isolated worktree, hub's own gates (`bun run check`, `lint:design`, `lint:tokens`) run before the PR — matches what #539 actually did. |
| IV. Required build steps are spec requirements | **PASS, with a named exception** | No new route/endpoint/nav link → RBAC wiring N/A. No new user-facing string → Paraglide `m.*()`/`i18n:compile` N/A. This is hub UI code, so `lint:design && lint:tokens` is required; the change touches only positioning math and element attributes already present (no new color/spacing/radius/shadow/z-index token use), so zero token debt is expected — `#539`'s own gates section confirms `lint:design` passed with no debt increase. |
| V. Security and data human gates | **N/A** | Not security- or data-tagged: no auth, RBAC, credentials, tenant scoping, or production data mutation involved. |

**Overall**: No blocking violation. Principle II is flagged PARTIAL, not FAIL, because the
gap is a template mismatch (Spec Kit's spec.md has no AS-IS slot) rather than missing
evidence — the evidence exists, just relocated into this plan. See `analysis.md` finding
A1 and the template-change recommendation in `sdd-notes.md`.

## Project Structure

### Documentation (this feature)

```text
specs/103-retro-assistant-launcher-position/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── tasks.md              # Phase 2 output (speckit-tasks)
└── analysis.md           # Phase 3 output (speckit-analyze)
```

No `contracts/` directory: the feature has no API surface (it is a single client-only UI
component's internal position state), so there is nothing to contract.

### Source Code (repository root)

This is `minion_hub` (not the meta-repo) — `~/.cache/claude-tmp/hub-ro/` in this audit's
read-only checkout, `minion_hub/` in a real working tree.

```text
src/
└── lib/
    └── components/
        └── layout/
            └── FloatingAssistant.svelte   # The entire slice — only file touched
```

**Structure Decision**: Single project, single file. No new directories, modules, or
dependencies. The existing component already owns all launcher drag/snap/position state
(`pos`, `dragging`, `launcherSize`, `snapToEdge`, `snapHome` — see spec evidence anchors
above); the fix is confined to how that state is seeded, stored, and re-derived on resize.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| No test added for the fraction math (`frac → pixels`) despite Constitution Principle II's "the test that proves each transition" | Out of this plan's control — the real PR shipped untested; a spec-compliant version of this plan requires one (see `tasks.md` T-last and `retro-scorecard.md` §3) | N/A — this row documents a gap this retrospective is flagging, not a deliberate, justified tradeoff the original author made |
