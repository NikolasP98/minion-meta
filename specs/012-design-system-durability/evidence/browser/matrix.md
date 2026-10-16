# Browser qualification matrix — Spec 012 / T023 (2026-10-16)

Fixture: `http://127.0.0.1:5296/recipes.html` (static build of `/tmp/minion-design-durability-render`, `__designFixture.contractVersion = 1.1.0`).
Browser: headless Chromium via browser-harness (`BU_NAME=minion-design-audit`, CDP :9223), viewports via `Emulation.setDeviceMetricsOverride`, coarse pointer via `Emulation.setTouchEmulationEnabled`, 200% text via `documentElement.style.fontSize='200%'`, keyboard via `Input.dispatchKeyEvent`. Raw per-cell values: `matrix.json` (`cells[]`, every `pass_*` flag is a measured check).

**Totals: 106 cells — 80 pass, 20 fail, 6 not measurable.**

| Step | Cells | Pass | Fail | n/m |
|---|---|---|---|---|
| 1 layout (9 recipes × 1440/390/320 × en/es) | 54 | 50 | 4 | – |
| 2 coarse targets ≥44px @390 | 9 | 6 | 3 | – |
| 3 200% text @390/@1440 (en) | 18 | 8 | 10 | – |
| 4 keyboard tab order + focus ring @1440 | 9 | 8 | 1 | – |
| 4b EditableGrid keyboard (dashboard) | 1 | 1 | 0 | – |
| 5 helper/error association (form ×2 states, controls) | 3 | 3 | 0 | – |
| 6 theme contrast (controls, detail; 18 themes × 15 pairs) | 2 | 2 | 0 | – |
| 7 decoration negative isolation (crt, voxelized) | 2 | 0 | 2 | – |
| 8 region scrolling (collection, board, calendar @390) | 8 | 2 | 0 | 6 |

## Passed

- **Document overflow 0** at every width/lang for collection, calendar, gallery, detail, form, dashboard, workspace, controls (48/48 cells). Intentional horizontal scroll regions: `div[role=grid].dt-scroll` (collection @390/@320) and `div.board` (board @390/@320); every control reported "outside the viewport" sits inside one of those regions (verified by ancestry), so no control is unreachable.
- **Scroll owner** is `div[data-part=page-body]` (overflow-y auto) in every recipe; the DataTable grid and BoardView columns are additional overflow-y owners, none scrollable with the synthetic data at 844px.
- **Coarse targets**: detail, form, dashboard, workspace, controls, calendar(shell) — all interactive boxes ≥44×44. Controls recipe: 20 targets, only the 16×16 checkbox/radio visual boxes (exception b, labels are 44×44 per `controls-targets.json`) and the negative control `button[data-test=unrelated]` 205.8×24 (exception c) are below 44.
- **Keyboard**: tab order is DOM/visual order in all 9 recipes (stops: collection 10, calendar 1, board 10, gallery 6, detail 4, form 4, dashboard 2, workspace 4, controls 16); every stop matched `:focus-visible` and showed an outline/box-shadow, except one (below).
- **EditableGrid (dashboard, keyboard only)**: Enter on "Edit layout" → per-card Zag menu; Enter opens with "Move later" pre-highlighted, ArrowDown moves, Enter commits, focus returns to the trigger. Live region (`.sr-only[aria-live=polite]`) after each action: move → `Summary: position 2, width 2, height 2`; widen → `Summary: position 2, width 3, height 2`; taller → `Summary: position 2, width 3, height 3`; hide → `Hide Notes`; reset → `Reset`. Layout state (`grid-column/row` spans, `eg-hidden`) changed accordingly and reset restored defaults.
- **Helper/error association**: form populated → `input#recipe-name` `aria-describedby="c2-helper"`, no `aria-invalid`; form validation-error → `aria-describedby="c2-helper c2-error"`, `aria-invalid=true`, `aria-errormessage=c2-error`, both ids exist and contain "Use the name your team recognizes." / "Enter a name."; controls → `input#field-c2` `aria-describedby="field-c2-helper field-c2-error"`, `aria-invalid=true`, both exist ("Persistent guidance" / "Validation error"). Select/textarea/checkbox/radio have no describedby (no helper given) — consistent.
- **Themes**: 18/18 ids switch at runtime (`data-minion-theme` + inline token overrides). 270/270 pairs ≥4.5 on controls and 270/270 on detail. Min ratio 4.51 (rose-pine-dawn, text-tertiary); per-theme minima 4.51–6.40. Screenshots: `controls-1440-en-theme-{github-light,void,crt}.png`, `detail-1440-en-theme-{new-york,concourse-day}.png`.
- **Decoration changes decorated parts**: with `decoration=crt` the `[data-test=button-md]` computed style differs in 19 properties (radius, text-transform, shadows…) and the Input in 25; voxelized 20/26.
- **Region scrolling (390×220, forced because the data is short)**: collection and board — `div[data-part=page-body]` scrolls (`scrollTop` 88 / 62 after `=200`), `[data-part=page-header]` top stays 0 → 0 while the toolbar moves 99 → 11 / 37; `window.scrollY` stays 0.

## Failures / exceptions

1. **Board: document horizontal overflow** (layout board en/es @390 and @320; also text200 board @390). `documentElement.scrollWidth` = 703 @390 (+313), 773 @320 en, 912/982 es; `window.scrollTo(500,0)` really lands at `scrollX=313`. Root cause: `span.sr-only` (position:absolute, 1×1) inside the BoardView card is not contained by `.board` (`overflow-x:auto` but `position:static`), so it escapes the region at left 702 and inflates the document scroll range. `html/body overflow-x:hidden` hides it from wheel scrolling only. Not reproducible at 1440.
2. **Coarse targets < 44px** (390, pointer:coarse):
   - `button.seg-btn` (DataView switcher, 3 per recipe) **38×22** — collection, board, gallery.
   - `input[type=text]` DataTable search **252×24** — collection.
   - `button#menu:ui-dropdown-N:trigger[data-part=trigger]` (BoardView "Move to…") **28×56** — board (×2).
3. **Clipped text at 200%** (and at 100%): `h1#recipe-title` (PageHeader title) is `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` — scrollWidth 432 vs width 250 at 390 in every recipe (9 cells @390). The README says "Header wraps"; it truncates. At 1440/200% the only clipped elements are the DataTable name cells `td#c2-cell-{one,two}-name.dt-cell` (632/497 vs 220 — ellipsis truncation; collection @390 and @1440). `span.sr-only` hits were excluded.
4. **No focus ring**: collection DataTable search `input[type=text]` ("Search…") — `outline: none`, `box-shadow: none` while `:focus-visible` is true (keyboard, 1440).
5. **Decoration touches the negative control**: `[data-test=unrelated]` keeps background-color (transparent), border (0px), text-shadow (none), filter (none), height (24px) under both decorations, but its **`font-family` changes** (Inter → `"Courier New", "JetBrains Mono NF", monospace` for crt; → `"Pixelify Sans", …` for voxelized). Matched rule: `[data-theme="crt"], [data-theme="crt"] * { font-family: … }` — the decoration sheet uses a universal descendant selector, so it is not limited to `[data-part]` controls. Full-style diff also shows width/inline-size (consequence of the font) and, for voxelized, `image-rendering`.

## Not covered

- **Calendar recipe body**: `recipes.html?recipe=calendar` renders only PageShell + PageHeader + "New task" (Recipes.svelte has no calendar branch; `calendar.html` is the separate mobile-composition fixture excluded by the brief). Calendar layout/target/keyboard cells cover the shell only; calendar region-scroll not measured.
- **Region scrolling at 390×844 / 390×360**: no region exceeded its client height with the synthetic 2-row data (6 cells "not measurable"); measured only at 390×220.
- Coarse targets were measured in EN only; ES text widths change widths, not heights, so the failing selectors are the same (not re-measured).
- Keyboard/200%/themes were run in EN only, per brief. Keyboard runs did not test Escape/Space/arrow keys outside the EditableGrid menu.
- Contrast was computed on the five surface tokens vs three text tokens only (no accent/on-accent, borders, or state colours).
- `qa` states other than populated and validation-error (loading, empty, conflict…) were not exercised.
- Fixture server note: the original :5296 server died after the keyboard run; it was replaced with `python3 -m http.server` on the same directory/port for the remaining cells (EditableGrid, describedby, themes, decoration, region-scroll).

## Appendix — re-measurement after fixes (coordinator, same session)

Fixes applied in Hub source and the fixture rebuilt from the corrected package (`remeasure-after-fixes.json`):

| Cell | Before | After |
|---|---|---|
| board 390 / 320 (es) document overflow | 703–982 px | 390 / 320 (none) — `.board { position: relative }` anchors the sr-only live region |
| collection / board / gallery 390 (es), coarse pointer, interactive targets < 44 px | `.seg-btn` 38×22, search input ×24, move trigger 28 wide | none — `(pointer: coarse)` floors in SegmentedControl, DataTable search, BoardView trigger |
| collection search input `:focus-visible` ring | none | `box-shadow` 0 0 0 3px accent/30 (`--shadow-focus`) |
| calendar pilot (`calendar.html`, actual calendar component) 390 / 1440 | not covered | document overflow none |

Dispositions of the remaining first-run failures: recipe title ellipsis = PageHeader design (README corrected); table cell ellipsis at 200 % = fixed-layout cells by design; `[data-theme=crt] *` font-family on the undecorated control = theme typography, not decoration (geometry/background/border/shadow/filter unchanged); `recipe=calendar` shell-only = the calendar pilot lives in `calendar.html`. All four are ledgered in the proposal follow-ups table.
