---
id: 2026-10-07-readiness-role-button-keyboard-spec
title: Every role="button" control honours the native button keyboard contract (HC-027)
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
findings: [HC-027]
pr: 437
---

# `role="button"` keyboard contract (HC-027)

## 0. Product

Every element that announces itself as a button must behave like one from the keyboard: Tab
reaches it, the global focus ring shows, and Enter / Space each do exactly what a click does —
once. HC-027 (`2026-10-02-hub-gateway-production-readiness-recon`): hub `role="button"` divs
omitted Space, omitted all keys, let Space scroll the page, or fired twice when a nested control
was activated. Acceptance (ledger): "Tab to each control and assert Enter and Space match click
exactly once with visible focus."

Canonicalized from the implementer's batch spec
(`~/.cache/codex-implementation/2026-10-03-hub-gw/spec-hc027-role-button-keyboard.md`); the
inventory and measurements below are theirs.

## 1. AS-IS (hub `0823c93c`, before `181b1014`)

Inventory of every `role="button"` on a non-button element (`grep -rn 'role="button"' src
--include=*.svelte` plus the one conditional `role={… ? 'button' : undefined}` in `KpiRow`).
"Ring" = the global `:focus-visible { outline: 2px solid var(--color-accent) }` in `app.css`.

| # | Site | Element | tabindex | Keys handled | Space scrolls? | Ring | Nested interactive content | Defect |
|---|---|---|---|---|---|---|---|---|
| 1 | `agents/AgentGroupHeader.svelte:88` | div | 0 | Enter+Space, no `preventDefault` | yes | global | Delete `Button`, rename `<input>` | Space scrolls; keys on nested Delete also toggle the group |
| 2–4 | `agents/AgentDashboard.svelte:141,207,283` | div card ×3 | 0 | Enter+Space + `preventDefault` | no | global | cards 2–3 wrap a `Button` | keys on the nested Button navigate the CARD's tab; `preventDefault` on keydown also cancels the Button's own click |
| 5 | `agents/AgentSettingsPanel.svelte:241` | div backdrop | -1 | Escape only | yes | global | the drawer | Enter/Space do nothing |
| 6 | `agents/SubagentTreeNode.svelte:82` | div row | 0 | Enter+Space, no `preventDefault` | yes | global | expand / steer `Button` | Space scrolls; nested keys select the row too |
| 7 | `agents/AgentSidebar.svelte:399` | div "Ungrouped" header | 0 | Enter+Space, no `preventDefault` | yes | global | none (drag target) | Space scrolls |
| 8 | `_agent-prompt-simulator/PipelineSidebar.svelte:270` | span | 0 | Enter+Space + `preventDefault` + `stopPropagation` | no | global | sits inside a `Button` | compliant |
| 9 | `flow-editor/nodes/AgentNode.svelte:152` | div node body | 0 | Enter only (settings toggle) | yes | global | `Select`, inputs, xyflow handles | Space does nothing + scrolls |
| 10 | `marketplace/AgentCard.svelte:61` | div card | 0 | Enter only → flip | yes | global | IdFooter flip `Button` | Space does nothing + scrolls; Enter on the nested flip Button flips twice |
| 11 | `my-agent/EmailCard.svelte:89` | div card (draggable) | 0 | Enter+Space + `preventDefault` | no | **none** — own `:focus-visible { outline: none }` + 2.5% tint (= hover) | none | keys compliant; computed outline `none` while focused |
| 12 | `my-agent/EventCard.svelte:123` | div card (draggable) | 0 | same as 11 | no | **none** — same, 3.5% tint | none | same invisible ring |
| 13 | `my-agent/OmnichatDock.svelte:358` | div row (draggable) | 0 | Enter+Space + `preventDefault` | no | global | none | compliant |
| 14 | `prompt/BreakdownTree.svelte:243` | div row | 0 | none (`svelte-ignore a11y_click_events_have_key_events`) | yes | global | `SectionCheckbox` | Enter/Space do nothing |
| 15 | `reliability/KpiRow.svelte:60` | div cell (conditional role) | 0 when `detail` | Enter+Space + `preventDefault` | no | own: `outline-none` + `focus-visible:bg-bg3/30` tint | none | compliant (untouched) |
| 16 | `workshop/InboxOverlay.svelte:189` | div backdrop | -1 | Escape only | yes | global | the dialog | Enter/Space do nothing |
| 17 | `workshop/InboxOverlay.svelte:380` | div file drop zone | 0 | Enter+Space, no `preventDefault` | yes | global | hidden `<input type=file>` | Space scrolls |
| 18–21 | `workshop/{MessageBoard,Portal,Rulebook,Pinboard}Overlay.svelte` backdrops | div | -1 | Escape only | yes | global | the dialog | Enter/Space do nothing |
| 22 | `workshop/RelationshipPrompt.svelte:47` | div transparent backdrop | -1 | none (`onmousedown` cancel) | yes | global | — | Enter/Space do nothing |
| 23 | `tools/[id]/_components/CodeEditorPane.svelte:132` | span `.chip-grip` drag handle | -1 | none; no click either | n/a | global | — | claims button, nothing to activate |
| 24–28 | `CodeEditorPane.svelte:175,196,218,246,269` | div `.var-row` / `.snippet-card` drag sources ×5 | 0 | none; no click either | n/a | global | Copy `Button` | claims button + tab stop, nothing to activate |

Red run (`evidence-hc027/vitest-red-prefix.log`, the final test file against the pre-fix
sources): **17 failed / 7 passed of 24** — sites 8, 11, 12, 13, 15 and the helper unit pass;
every other site fails on at least one of {Enter, Space, Space-scroll,
nested-does-not-activate-parent}; CodeEditorPane fails "drag source must not claim
role=button". Only the Chromium pass caught the invisible ring on 11–12 (happy-dom has no
computed `outline-style`).

## 2. TO-BE

One keyboard contract for every element that keeps `role="button"`:

| Invariant | Rule |
|---|---|
| Reachable | `tabindex="0"` for controls; backdrops stay `tabindex="-1"` (programmatic focus only — dismiss layers owned by HC-028's Dialog migration) |
| Visible focus | the global `:focus-visible` ring; no new per-component outlines. EmailCard / EventCard drop `outline: none` so the ring shows over their hover tint |
| Timing | **Enter on keydown, Space on keyup** (keydown Space only `preventDefault`s the scroll) — native `<button>` timing |
| Activation == click, once | the key path re-dispatches `currentTarget.click()` so the element's own click handler is the single activation path; where click is not the activation (AgentNode: click selects the xyflow node; AgentCard: click is spatial; RelationshipPrompt: cancel is on mousedown) the key path calls the intended action directly |
| Nested controls | keys bubbling from a nested control (`target !== currentTarget`) never activate the parent |
| Space pairing | Space keyup activates only if its keydown landed on the same element |

Per-site disposition:

| Disposition | Sites | Why not a native `<button>` |
|---|---|---|
| keep role + contract via `buttonKeys()` (click path) | 1, 2–4, 6, 7, 8, 11, 12, 13, 14, 17 | wrap other Buttons/inputs/checkbox (invalid inside `<button>`), are drag sources/targets, or are `w-full flex` rows the shared `Button`'s inner `<span>` would reflow; a bare `<button>` is `bare-button` lint debt (ceiling 0) |
| keep role + contract via `buttonKeys(action)` | 9 (settings toggle), 10 (`flipCard`), 22 (`onCancel`) | activation is not the element's click |
| backdrop: Escape kept, Enter/Space close when the backdrop itself is focused | 5, 16, 18–21 | contain the dialog; the role itself is HC-028's open handoff |
| drop the false role (drag sources are not buttons; the Copy `Button` / row inputs are the keyboard path) | 23, 24–28 | nothing to activate; `role="button"` + tab stop was lint-silencing, not semantics |
| untouched (compliant) | 15 KpiRow | — |

## 3. DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | `src/lib/a11y/button-keys.ts` — ONE helper `buttonKeys(activate = el => el.click())` returning `{ onkeydown, onkeyup }`; spread as `{...buttonKeys()}`; backdrops compose it after their Escape branch | helper unit case |
| 2 | Sites 1, 2–4, 6, 7, 8, 11, 12, 13, 14, 17: inline `onkeydown` lambda replaced (or added, for 14) with `{...buttonKeys()}`; EmailCard/EventCard delete `handleKey`; BreakdownTree drops the `svelte-ignore` | mounted cases per site |
| 3 | Sites 9, 10, 22: `{...buttonKeys(() => (showSettings = !showSettings))}`, `{...buttonKeys(flipCard)}`, `{...buttonKeys(onCancel)}` | mounted cases |
| 4 | Backdrops 5, 16, 18–21: `onkeydown={(e) => (e.key === 'Escape' ? close() : backdropKeys.onkeydown(e))}` + `onkeyup={backdropKeys.onkeyup}` | mounted + Chromium `portal-backdrop-focused` |
| 5 | EmailCard / EventCard: `outline: none` deleted from the `:focus-visible` rule (the tint was the hover state, not a focus indicator) | Chromium: computed `outline-style` ≠ `none` while focused |
| 6 | CodeEditorPane 23–28: `role="button"`, `tabindex` and the grip's `aria-label` removed (prohibited on a generic element; `title` stays); `svelte-ignore a11y_no_static_element_interactions` with the reason comment "Pointer-only drag handle, not a button (HC-027)" | mounted "drag source must not claim role=button" |
| 7 | `src/lib/a11y/role-button-keys.mounted.test.ts` (happy-dom; mounts all 22 affected components — AgentSidebar via `tests/fixtures/role-button-keys/AgentSidebarHost.svelte`, AgentNode via `AgentNodeHost.svelte` inside a real SvelteFlow) + Chromium fixture `tests/fixtures/role-button-keys/` (`build.mjs` copies the HC-028 fixture recipe) driven through browser-harness/CDP `Input.dispatchKeyEvent` | red 17/24 → green 24/24; native 8 cases / 45 checks / 0 failed |
| 8 | No message, token, CSS or dependency changes; net −23 lines | `messages/*`, `contract.json`, `package.json` diff empty |

## 4. Verification

- Mounted: for each site and each of Enter/Space — focusable, Tab-reachability matches the
  disposition, activation delta == 1, Space keydown `defaultPrevented`, and (where nested) the
  same key on the nested control leaves the parent count unchanged.
  `bun x vitest run src/lib/a11y/role-button-keys.mounted.test.ts` → red **17 failed / 7 passed
  (24)** on the pre-fix sources, green **24 passed (24)** after (`evidence-hc027/vitest-*.log`).
- Chromium (headless, static fixture, no server/login/data; `evidence-hc027/hc027-native-proof.json`
  v2): **8 cases, 45 checks, 0 failed** — real Tab reaches each control in order,
  `Input.dispatchKeyEvent` Enter and Space each bump the counter by exactly 1, computed
  `outline-style` of `document.activeElement` is not `none`, `window.scrollY` unchanged after
  Space, nested Button Enter leaves the parent counter unchanged; backdrop proven with
  programmatic focus (tabindex -1 by contract). PNGs per focused site in the same directory.
- `bun run lint:design` / `lint:tokens` before == after (`lint-*-{before,after}.log`);
  `svelte-check --threshold error` → `evidence-hc027/svelte-check.log`.

## 5. Implementation record

- Hub commit `181b1014` (`fix(ui): give every role=button control the native button keyboard
  contract`) on `fix/readiness-hub-ui-a11y`, PR
  [minion_hub #437](https://github.com/NikolasP98/minion_hub/pull/437) — **merged to `master`
  as squash `c43795732`** (`fix(ui): readiness accessibility batch — mentions, overlays,
  calendar toolbar, date-range menu, role=button keys`). 28 files, +783 / −81 in the lane commit.
- Tests: `role-button-keys.mounted.test.ts` red 17/24 → green 24/24; native 45/45.
- Evidence (local, not committed): `~/.cache/codex-implementation/2026-10-03-hub-gw/evidence-hc027/`.

## 6. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-ui-a11y-followups.md`
(§HC-027). None carries an in-code `TODO(handoff)` — the lane left no marker.

- `KpiRow.svelte` keeps `outline-none` + the `focus-visible:bg-bg3/30` tint as its focus
  indicator: visible, but a raw opt-out rather than the governed `.focus-ring-none` — noted, not
  changed.
- CodeEditorPane drag rows (23–28) dropped `role="button"` on the implementer's judgment that a
  drag source with nothing to activate is not a button; reviewer to confirm the disposition
  (the alternative is a keyboard reorder path, which no row has today).
- Backdrops 5, 16, 18–21 keep `role="button"` under HC-028's handoff (their role disappears with
  the Dialog migration, ledger rows #3–#4 of the same proposal); they now honour the contract but
  remain mis-typed.
- The shared Button primitive (HC-038) is untouched.
