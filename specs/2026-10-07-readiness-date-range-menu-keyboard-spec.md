---
id: 2026-10-07-readiness-date-range-menu-keyboard-spec
title: Date-range configuration menu is a composite menu with coarse-pointer targets (HC-029)
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
findings: [HC-029]
pr: 437
---

# Date-range ⋯ menu keyboard model and target sizing (HC-029)

## 0. Product

`DateRangeControls` (every dashboard's from/to + quick pills + period picker) has a ⋯ "Show / hide
ranges" menu that toggles which quick ranges render as pills and stars one as the default. HC-029
(P2, `2026-10-02-hub-gateway-production-readiness-recon`): the menu is announced as a menu but has
no composite keyboard model, and under a coarse pointer none of its targets reach the toolbar
floor. Acceptance: open by Enter and context menu, navigate with arrows/Home/End, toggle/default,
Escape/Tab with focus return; measure every visible target under coarse pointer.

Canonicalized from the implementer's batch spec
(`~/.cache/codex-implementation/2026-10-03-hub-gw/spec-hc029-date-range-menu-keyboard.md`); the
measurements below are theirs.

## 1. AS-IS

Hand-rolled panel (`{#if menuOpen}<div role="menu">` + `<svelte:document>` listeners) in
`src/lib/components/dashboard/DateRangeControls.svelte`. Evidence: `evidence-hc029/before-*`
(static fixture `scripts/qa/hc029/fixture`, real `app.css`, headless Chromium 152 via CDP,
`before-targets-and-keys.json`), mounted red run `vitest-red-prefix.log` (6/6 fail).

| Key (native Chromium) | AS-IS |
| --- | --- |
| Enter on ⋯ trigger | opens (native click) but focus stays on the trigger; no item highlighted |
| ContextMenu key / right-click on a pill | opens; focus stays on the pill |
| Shift+F10 | not synthesized by Chromium via CDP in either run (inconclusive, not a product defect) |
| ArrowDown / ArrowUp / Home / End | nothing — no `aria-activedescendant`, no highlight |
| Space on the open trigger | re-activates the trigger: menu CLOSES |
| Enter/Space on a row | only after Tab-walking into the row buttons (native button activation) |
| Escape | closes (document listener); focus never left the trigger so "return" is accidental |
| Tab | walks INTO the first row button; menu stays open; items are in the tab sequence |

Names: the ★ buttons had no text and only a `title` ("Set as default") — 11 identically named
`aria-pressed` buttons. The row toggle carried `role=menuitemcheckbox` on a focusable native
button inside a `role=menu` with no owner-managed focus.

Targets (390×844, `pointer: coarse` emulated): 34/34 visible targets undersized. Date inputs
107×28 / 121×28; quick pills 37–48×24; ⋯ trigger 32×24; row toggles 61–74×28; ★ 30×24; period
pills 46–57×22. The scoped rules `.dr-cfg-btn`, `.dr-row-toggle`, `.dr-star` never matched at
all: those classes are forwarded to the `<Button>` component and Svelte's scoping hash is not
applied through a component prop (governance "real ancestor anchor").

Minimum: `--control-height-touch` = 44px (`packages/design-tokens/contract.json`); governance
rule "any toolbar gets a 44px floor on `button`/`select`/`[role=switch]` under
`(max-width: 767.98px), (pointer: coarse)`" (`aed995b8`). 44×44 CSS px is the floor used here.

## 2. TO-BE

WAI-ARIA menu-button pattern, delivered by the `@zag-js/menu` machine (the engine under the shared
`Dropdown`) — `Dropdown` itself cannot host two actions per row nor
`menuitemcheckbox`/`menuitemradio` items, so the machine is wired directly in the component with
the same positioner/content shape (`Dropdown.svelte`), unportaled and anchored `bottom-end` to ⋯
exactly where the old panel sat.

| Key | TO-BE (invariant) |
| --- | --- |
| Enter / Space / ArrowDown on ⋯ | opens, focus moves to the menu (`role=menu`, `tabindex=0`), first item highlighted via `aria-activedescendant` |
| Right-click or ContextMenu key anywhere on the pill group | opens the same menu (anchored to ⋯), focus moves into it; no item pre-highlighted |
| ArrowDown / ArrowUp / Home / End | move the highlight across every row item (toggle, ★, toggle, ★ …); typeahead on the range label |
| Space / Enter on a highlighted item | toggle = flips `aria-checked` and the pill; ★ = sets (re-pick clears) the default; menu stays open (`closeOnSelect:false`) |
| Escape / outside pointerdown | closes; focus returns to ⋯ (Zag `focusTrigger`), including after a context-menu open |
| Tab / Shift+Tab | closes, default NOT prevented, focus returns to ⋯ synchronously so the browser's own sequential navigation moves on from the trigger (proven: lands on the period pill "Day") |

Rows: toggle = `menuitemcheckbox` (name = label), ★ = `menuitemradio` named
`"<Set as default> · <label>"`, both `tabindex=-1` (out of the tab sequence, highlight-driven).
Highlight reads exactly like hover (`[data-highlighted]` shares the hover recipe).

Targets under `(max-width: 767.98px), (pointer: coarse)`: every visible control ≥ 44×44 (inputs,
quick pills, ⋯, row toggles, ★, period pills). Fine pointer at ≥768px keeps the 24/28px desktop
recipe (toolbar rule is coarse/narrow only).

## 3. DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | `DateRangeControls.svelte`: replace `menuOpen` + document listeners with `useMachine(menu.machine, { id: $props.id(), closeOnSelect:false, positioning:{placement:'bottom-end'} })`; trigger spreads `getTriggerProps()`; group `oncontextmenu` → `api.setOpen(true)`; always-mounted positioner/content (`hidden` by Zag); rows spread `getOptionItemProps({type:'checkbox'\|'radio'})` with `tabindex={-1}`; content `onkeydown` closes on Tab before delegating to Zag. `.dr-menu` is `position:relative; z-index: var(--layer-popover)` (layer on the CONTENT; Zag copies it to the positioner). Forwarded-class rules re-anchored (`.dr-quick :global(.dr-cfg-btn)`, `.dr-row :global(.dr-row-toggle\|.dr-star)`), highlight recipe added, coarse/narrow 44px floor added (`min-height` on all, `min-width` on icon-only + pills, `.seg { height:auto }` so the group grows). | mounted test 6/6; native key dispatch log |
| 2 | `DateRangeControls.menu.mounted.test.ts` (6 cases: Enter-open+highlight, context-menu open+focus, arrows/Home/End, Space/Enter toggle+default without closing, Escape focus return, Tab closes without preventDefault and focus on trigger). | red on the old component 6/6 → green 6/6; existing `DateRangeControls.test.ts` 3/3 unchanged |
| 3 | Native proof: `scripts/qa/hc029/fixture` (vite + real app.css, no app shell/login/data) + `scripts/qa/hc029/drive.py` (browser-harness/CDP: 390×844 coarse + 1280×900 fine, closed/open target JSON + PNGs, real key dispatch Enter→ArrowDown→Space→End→Home→Escape→Enter→Tab, ContextMenu key as `rawKeyDown` vk93, right-click). | after: 0/34 undersized at 390 coarse |
| 4 | No new dependency (`@zag-js/menu` already installed), no new i18n keys (★ name composes `dr_set_default` + label), no change to `date-range/*`. | `package.json` / `messages/*` diff empty |

## 4. Verification

- `bun x vitest run src/lib/components/dashboard/DateRangeControls.menu.mounted.test.ts src/lib/components/dashboard/DateRangeControls.test.ts` → 9/9.
- `bun run lint:design` exit 0, `DESIGN_LINT_BASE_REF=HEAD` → "no changed file increased governed
  debt"; `bun run lint:tokens` → 0 violations.
- `bun x svelte-check --threshold error` → `evidence-hc029/svelte-check.log`.
- Evidence: `evidence-hc029/{before,after}-targets-and-keys.json`, PNGs at both viewports
  closed/open, `after-keyboard-after-space.png`.

## 5. Implementation record

- Hub commit `821801d5` (`fix(dashboard): give the date-range configuration menu a real menu
  keyboard model`) on `fix/readiness-hub-ui-a11y`, draft PR
  [minion_hub #437](https://github.com/NikolasP98/minion_hub/pull/437).
- Tests: `DateRangeControls.menu.mounted.test.ts` red 6/6 failed → green 6/6; with the existing
  `DateRangeControls.test.ts` 9/9. Native targets 34/34 undersized → 0/34.
- Evidence (local, not committed): `~/.cache/codex-implementation/2026-10-03-hub-gw/evidence-hc029/`.

## 6. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-ui-a11y-followups.md`.

- Shift+F10 cannot be synthesized through CDP on Linux headless (browser-level key); the DOM
  `contextmenu` path it would take is the same one the ContextMenu key and right-click proved.
- Desktop (fine pointer) targets stay at the 24/28px recipe by governance; the ⋯ icon button is
  30×24 not square because `Button shape="icon"` loses `px-0` to `px-2` in Tailwind order — a
  shared-primitive quirk, not fixed here and carrying no in-code marker (ledgered in the proposal).
- Context-menu opens return focus to ⋯ (the menu's owning trigger), not to the pill that was
  right-clicked — the WAI-ARIA menu-button return point.
