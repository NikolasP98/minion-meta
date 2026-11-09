---
id: 2026-10-07-readiness-calendar-toolbar-coarse-pointer-spec
title: Calendar toolbar controls stay distinct on a narrow coarse-pointer viewport (UI-002)
stage: dev
status: implementing
pass: 2
verdict: pending
created: 2026-10-07
updated: 2026-10-07
repos: [minion_hub]
tags: [ui, ux, test]
type: fix
proposal: 2026-10-07-hub-readiness-ui-a11y-followups
findings: [UI-002]
pr: 437
---

# Calendar toolbar on a narrow mobile viewport (UI-002)

## 0. Product

On a phone, the Team calendar (`/scheduling/calendar`) and the POS appointments calendar
(`/pos/appointments`) share one toolbar: presentation switcher (calendar / table / board), view
tabs (day / week / month / agenda), date navigation (previous / date / next / today), the options
kebab, and the route's own tools (staff filter, event-type select, tag filter, and on the Team
calendar the "show linked tags" switch). Every control must be a distinct, readable,
keyboard-reachable 44 px target, with no overlap and no document overflow — also while week-load
error banners are visible above the toolbar and after they are retried away. Acceptance is the
readiness ledger's (`2026-10-02-hub-gateway-production-readiness-recon`, UI-002): "At 390×844 and
coarse pointer, presentation/view/date controls and linked-tags control remain distinct, readable,
keyboard reachable and correctly sized, with no overlap or document overflow. Repeat after visible
week errors wrap and after they clear."

Governance floor cited: `.claude/skills/ui-design-governance/SKILL.md` — "Any toolbar gets a 44 px
(`--control-height-touch`) floor on `button`/`select`/`[role=switch]` under
`(max-width: 767.98px), (pointer: coarse)`, addressed BY ROLE" (`aed995b8`), and "Test open
controls at narrow widths … UI-002's toolbar overlap remains an open finding."

Canonicalized from the implementer's batch spec
(`~/.cache/codex-implementation/2026-10-03-hub-gw/spec-ui002-calendar-toolbar-mobile.md`); the
measurements below are theirs.

## 1. AS-IS (measured, pre-fix)

Fixture: `tests/fixtures/mobile-composition` (the ACTUAL `scheduling/calendar/+page.svelte`
route, synthetic September 2026 seed, `$app/*` stubs, no auth, no network beyond the static
loopback server), built at `1f1def7a`, driven in the headless Chromium at `127.0.0.1:9223` through
Browser Harness with `Emulation.setDeviceMetricsOverride(390×844, mobile)` + touch emulation +
`pointer: coarse`. Evidence: `evidence-ui002/before/`.

`document.documentElement.scrollWidth` = 390 = clientWidth (no document overflow — the earlier
parent check was right that overflow is not the defect). The toolbar itself does not scroll
(390/390). The defect is vertical:

| control (DOM order) | element | x | y | w | h | intersects |
|---|---|---|---|---|---|---|
| Calendar | button | 19 | 68 | 44 | 44 | Day |
| Table | button | 67 | 68 | 44 | 44 | Week |
| Board | button | 115 | 68 | 44 | 44 | Week, Month |
| Day | button | 19 | 104 | 46 | 44 | Calendar, Previous |
| Week | button | 69 | 104 | 57 | 44 | Table, Board, date |
| Month | button | 130 | 104 | 61 | 44 | Board, date |
| Agenda | button | 195 | 104 | 68 | 44 | date, Next |
| Previous | button | 16 | 137 | 44 | 44 | Day |
| 7 – Sep 13 (date / picker trigger) | button | 68 | 137 | 185 | 44 | Week, Month, Agenda |
| Next | button | 261 | 137 | 44 | 44 | Agenda |
| Today | button | 313 | 137 | 61 | 44 | — |
| Calendar options (kebab) | button | 16 | 189 | 44 | 44 | — |
| Staff · All staff | button | 16 | 251 | 96 | 44 | — |
| Event type | select | 120 | 251 | 76 | 44 | — |
| Tags | button | 204 | 251 | 45 | 44 | — |
| Show linked tags | button[role=switch] | 257 | 251 | **44** | **44** | — (label 65×63, **3 lines**) |

9 intersecting pairs. Root causes, read from the code:

1. `SegmentedControl` (`src/lib/components/ui/SegmentedControl.svelte`) sets
   `.seg { height: var(--control-height-sm) }` (28 px) with `align-items: stretch`. The toolbar's
   by-role rule raises its `button`s to `min-height: 44px`; a fixed 28 px group cannot grow, so
   the buttons spill 16 px below it and the flex-wrap rows (sized by the 28 px group) stack the
   presentation switcher onto the view tabs and the tabs onto the date row. Measured: both `.seg`
   groups 28 px tall, children overflowing (`overflowsChildren: true`).
   `ArchitectureGraph.svelte` (HC-024) already carries a per-caller workaround for the same cause
   (`height: auto; min-height: 44px` on its own `SegmentedControl`).
2. The same by-role rule applies `min-width`/`min-height: 44px` to `[role='switch']`, which in
   `@minion-stack/ui` `Toggle` IS the visual track (`h-5 w-9`, `rounded-full`). The track becomes
   a 44×44 disc and, with `.cal-tools` not wrapping, the switch's label is squeezed to a 65 px,
   three-line sliver beside it.

Desktop (1280×900, fine pointer) was unaffected: one 44 px toolbar row, groups 28 px, view
buttons 22 px, 0 intersections.

With two week-load errors visible (Oct 5–11, Oct 12–18 — the static server 404s unseeded weeks)
the banners wrap inside 390 px and the toolbar moves down by their height with the same 9
intersections; after a fixture-only transport returning the seed scope and clicking each Retry,
both banners clear and the toolbar returns to y=57 with the same 9 intersections. The Retry
buttons themselves measure 56×28 (see open ends).

The existing native check (`tests/e2e/ui-audit/calendar-mobile.spec.ts`, "Calendar toolbar
targets remain usable") was green on this state: it asserted each target's own box ≥ 44 px and
within the viewport, never that targets are disjoint or that a group contains its members.

## 2. TO-BE

At `(max-width: 767.98px), (pointer: coarse)` the toolbar wraps into distinct rows/groups and:

- **Distinct**: no two visible toolbar controls' bounding boxes intersect; every
  `SegmentedControl` group contains its buttons (no child bottom past the group bottom).
- **Sized**: every `button`/`select` ≥ 44×44 CSS px (`--control-height-touch`, the governance
  floor). The switch keeps its track (20 px) and carries a 44×44 hit box centred on it —
  `elementFromPoint` at ±21 px from the track centre in all four directions resolves to the
  switch — and the labelled switch control occupies a 44 px row so the hit box stays inside the
  toolbar rather than under the grid.
- **Readable**: the switch label stays on ≤ 2 lines (measured: 1) and never intersects the track;
  route-mounted tools wrap into rows of their own.
- **No overflow**: `document.documentElement.scrollWidth == clientWidth` and
  `.cal-toolbar.scrollWidth <= clientWidth`.
- **Keyboard**: DOM/Tab order unchanged — switcher → view tabs → previous, date, next, today →
  kebab → staff, kind, tags, switch — every control `tabIndex 0`, enabled, with an accessible
  name; no control nests another.
- **Invariant across states**: identical with two week-error banners visible and after they are
  retried and cleared.
- **Desktop / fine pointer unchanged**: groups 28 px (`md`: 32 px), view buttons 22 px, "Today"
  28 px, one row.

## 3. DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | `src/lib/components/ui/SegmentedControl.svelte` — `.seg { height }` → `min-height` (and `.seg.md`). The group height is a floor its members can raise; desktop rendering is byte-identical because member content (≈22 px) never exceeds the floor. Root-cause fix at the primitive, so every toolbar applying the governance by-role floor is covered (ArchitectureGraph's local workaround becomes redundant, left untouched). | `.seg` containment assertion in `toolbarLayout()`; desktop 1280×900 unchanged |
| 2 | `src/lib/components/scheduling/BookingCalendar.svelte`, inside the existing `(max-width: 767.98px), (pointer: coarse)` block: the 44 px `min-width`/`min-height` rule targets `button:not([role='switch'])` and `select`; `[role='switch']` gets `position: relative` and a `::before` hit box `inset: min(0px, calc((var(--control-height-touch) - 100%) / -2))` (a 44×44 transparent target centred on the track, never shrinking a wider track); `.cal-tools :global([data-component='toggle-compat']) { min-height: var(--control-height-touch) }` so the labelled switch control owns a 44 px row; `.cal-tools { flex-wrap: wrap; min-width: 0 }`. Semantic tokens only (`--control-height-touch`); no new tokens, no JS, no new breakpoint, no message changes. | switch hit-box probe + label ≤ 2 lines + pairwise intersection = 0 |
| 3 | `tests/e2e/ui-audit/calendar-mobile.spec.ts` "Calendar toolbar targets remain usable at 320×740 / 390×844 / 600×390": adds `toolbarLayout()` — pairwise intersection of visible controls, `.seg` containment, toolbar `scrollWidth <= clientWidth`, the switch hit-box probe, track < 44 px, label ≤ 2 lines; the per-target size loop excludes the switch (its target is the hit box). | red pre-fix (9–10 pairs at every width), green post-fix |
| 4 | `src/lib/components/scheduling/calendar-toolbar.mounted.test.ts` (happy-dom, mounts the real route with the mobile-composition seed): tab/reading order, focusability, accessible names, no nested controls, switch label a sibling of the track; plus the compiled-CSS contract above (`UI002_CSS_BASE_REF=HEAD` reproduces the pre-fix red). happy-dom has no layout, so geometry lives in the Chromium spec. | 3/3 post-fix; 2 failed / 1 passed against `HEAD` CSS |

## 4. Verification

- BEFORE/AFTER JSON + PNG at 390×844 coarse (plain, two errors visible, recovered) and 1280×900
  fine: `evidence-ui002/{before,after}/`; measurement script `evidence-ui002/logs/measure.js`,
  driver `drive.py`.
- AFTER (390×844 coarse, all three states): 0 intersections; groups 50 px tall containing 44 px
  buttons; switch 36×20 with hit probes up/down/left/right = true; label 112×21, 1 line; document
  390/390; toolbar 390/390; Tab order as listed, 16 controls then focus leaves the toolbar.
- Playwright: pre-fix red `logs/playwright-calendar-mobile-toolbar-PRE-FIX-red.log`; post-fix
  `logs/playwright-calendar-mobile-toolbar-POST-FIX-green.log` (4/4), full spec
  `logs/playwright-calendar-mobile-full-POST-FIX.log` (11 pass; the 2 failures are foreign and
  equally red pre-fix — see open ends).
- Vitest mounted: 3/3 post-fix; `UI002_CSS_BASE_REF=HEAD` → 2 failed / 1 passed
  (`logs/vitest-mounted-PRE-FIX-red.log`).
- `bun run lint:design` 0 violations, `bun run lint:tokens` 0,
  `node scripts/design-lint.mjs --ci --base-ref HEAD`: "no changed file increased governed debt".

## 5. Implementation record

- Hub commit `0823c93c` (`fix(calendar): keep toolbar controls distinct at coarse-pointer
  widths`) on `fix/readiness-hub-ui-a11y`, draft PR
  [minion_hub #437](https://github.com/NikolasP98/minion_hub/pull/437).
- Tests: Playwright toolbar cases red (9–10 intersecting pairs per width) → 4/4 green; full
  `calendar-mobile.spec.ts` 11 pass / 2 foreign failures (already red at `1f1def7a`); vitest
  mounted 2 failed / 1 passed (pre-fix CSS) → 3/3.
- Evidence (local, not committed): `~/.cache/codex-implementation/2026-10-03-hub-gw/evidence-ui002/`
  (`before/`, `after/`, `logs/`).

## 6. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-ui-a11y-followups.md`.

- `CalendarWindowIssues.svelte` Retry is a 28 px `sm` Button on a coarse pointer (measured
  56×28). Governance asks shared error/retry controls for the toolbar's touch-height check; not
  UI-002's toolbar scope — `TODO(handoff): UI-002` at the site.
- `calendar-mobile.spec.ts` "A single-staff selection needs no sideways scroll" and "Staff and
  event-type filters narrow the grid" expect the aggregate lane beside a single staff column and
  were already red at `1f1def7a` after #434 — `TODO(handoff): UI-002` at the site; re-baseline the
  single-staff lane count.
- The POS appointments calendar shares the component and the fix but was not separately measured
  (its toolbar has no switch; same switcher/tabs/nav/tools).
- Toolbar redesign, `@minion-stack/ui` Toggle changes, other toolbars' own 44 px rules,
  overlay/dialog components (HC-028 lane), HC-043.
