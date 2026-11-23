# Hub accessibility audit: per-primitive table and governance numbers

Evidence appendix for `proposals/2026-11-20-hub-accessibility-program.md`.

- **Measured on:** hub `origin/master` = `3677e35a` (2026-11-20, `git ls-remote origin master`),
  clean detached checkout. Shared primitives come from the packed `@minion-stack/ui` tarball the
  hub pins (`package.json:26`); its `dist/*.svelte` files are byte-identical to
  `packages/ui/src/lib/*.svelte` on this branch (`diff -q`), so those rows anchor to meta paths.
- **Method:** every number below is the output of the command next to it, run from the hub
  checkout root. Every "missing" row was read in code; the anchor is the line that shows it.
- **Anchors:** hub paths are relative to `src/lib/components/` unless they start with `src/`,
  `tests/`, `scripts/` or `.storybook/`. `pkg:` means `packages/ui/src/lib/` in minion-meta.

## 1. Per-primitive table

"Slice" is the program slice that owns the fix.

| Primitive | Where | Works today (anchor) | Missing or wrong (anchor) | Slice |
|---|---|---|---|---|
| Button | `pkg:Button.svelte` | Native `<button>`/`<a>`; disabled link drops `href` (`:72-73`). | Focus is shown as `box-shadow` only: `outline-none` + `focus-visible:shadow-[var(--shadow-focus)]` (`:81-83`), so it vanishes in forced-colors. Icon shape (`:71`) does not require a name: 151 `shape="icon"`/`size="icon"` uses in hub `src/`. | S3, S4 |
| IconButton | `pkg:IconButton.svelte` | **Already exists**; `label: string` is required by type (`:6`) and becomes `aria-label` (`:46`). | Adoption only: referenced in 8 hub files against the 151 icon-shaped `Button` uses. | S3 |
| Toggle | `pkg:Toggle.svelte`, hub `ui/Toggle.svelte` | `role="switch"` + `aria-checked` + `aria-label` (`pkg:41-43`); hub type requires `label` or `ariaLabel` (`ui/Toggle.svelte:24-25`); pending state sets `aria-busy` (`:56`). | Runtime fallback to an empty name (`ui/Toggle.svelte:45`); pending spinner has no label (`:67`); focus is `box-shadow` only (`pkg:46-47`). | S3, S4 |
| Form fields (FormField, Input, Select, Textarea, Checkbox, Radio) | `pkg:` | `<label for>` wiring (`FormField.svelte:52-53`); `aria-invalid` + `aria-describedby` (`Input.svelte:72-73`, `Select.svelte:67-68`, `Textarea.svelte:65-66`, `Checkbox.svelte:49-50`); error is `role="alert"` (`FormField.svelte:71`). | Hard-coded English " required" for screen readers (`FormField.svelte:60`); focus is `box-shadow` + border colour only (`Input.svelte:74-77`, `Select.svelte:69-71`, `Textarea.svelte:67-69`, `Checkbox.svelte:51`, `Radio.svelte:48`). | S4, S6 |
| Zag-backed widgets (Combobox, Dropdown, Popover, Tooltip, ProgressBar) | hub `ui/` | Roles, states and keys come from Zag prop getters (`Combobox.svelte:158`, `Dropdown.svelte:86,105,116`, `Popover.svelte:78`, `Tooltip.svelte:92,169`, `ProgressBar.svelte:56`). Popover takes a `label` for icon-only triggers (`Popover.svelte:33,79`). | Hard-coded English default placeholder (`Combobox.svelte:38`); `outline: none` on the input (`Combobox.svelte:248`). Not tested against a pattern assertion (S0 adds it). | S0, S6 |
| MultiSelectFilter | `ui/MultiSelectFilter.svelte` | Popover trigger is a real `<button>` (`ui/Popover.svelte:77-78`); list is `role="listbox"` + `aria-multiselectable` (`:80-81`). | `aria-haspopup`/`aria-expanded` sit on an inner `<span>`, not the button (`:53-55`); options are `<button role="option">` so each is a tab stop, and the file has no `onkeydown`/arrow handling at all (`:88-90`, `:111-113`); hard-coded English `allLabel = 'All'` (`:39`) and `Remove ${opt.label}` (`:154`); 14 px remove target (`w-3.5 h-3.5`, `:155`). | S3 |
| ContextMenu | `ui/ContextMenu.svelte` | `role="menu"`/`menuitem`/`menuitemradio`/`menuitemcheckbox` (`:64`, `:196`, `:221`, `:251`); Up/Down, Right/Left for submenus, Escape/Tab, Enter/Space (`:136-160`); first row focused on open (`:101`). | No Home/End/typeahead case in the key handler (`:134-162`); the component never records or restores the invoker (no `activeElement` read in the file). Whether each host restores focus itself was not checked. | S3 |
| Dialog | `ui/foundations/Dialog.svelte` | Native `showModal()` (`:220`); focus saved and returned (`:219`, `:138-139`); `initialFocus` selector prop (`:33`, `:222-223`); `aria-labelledby` (`:290`); translated close label (`:323`). | `title` is optional (`:23`) and the name is `labelledBy ?? title` (`:81`), so a dialog with neither is unnamed. | S3 |
| ConfirmDialog | `ui/foundations/ConfirmDialog.svelte` | `title: string` required (`:15`); built on Dialog (`:82`); failure text is `role="alert"` (`:93`). | Not `alertdialog` (no role passed, `:82`); passes no `initialFocus`, so the safe action is not focused first (`:82`, `:97`). | S3 |
| Modal (deprecated) | `ui/Modal.svelte` | Thin wrapper over Dialog; `title: string` required (`:14`, `:60`). | With a custom `header` it passes `title={undefined}` (`:62`), which gives the unnamed-dialog case above unless the header supplies `labelledBy`. | S3 |
| DraggableWindow | `ui/foundations/DraggableWindow.svelte` | `role="dialog"` + `aria-modal="false"` + `aria-labelledby`/`aria-describedby` (`:234-237`); Escape closes (`:190`); Alt+Arrow moves the window, declared in `aria-keyshortcuts` (`:200-205`, `:249`); translated button labels (`:267`, `:276`). | No focus move on open and no return on close: the file has no `.focus(` call and never reads `activeElement`. | S3 |
| DraggableDialog | `ui/DraggableDialog.svelte` | Zag dialog machine, `modal: false`, `closeOnEscape: true` (`:49-54`); content wired by `getContentProps()` (`:121`). | **Not verified.** The proposal's gap 8 says it neither moves nor returns focus. Zag owns that here and the answer depends on its non-modal behaviour, which cannot be read from hub code. Needs a mounted test before S3 treats it as a defect. | S3 |
| Tabs | `ui/Tabs.svelte` | `role="tablist"` with required `aria-label` (`:25`, `:73-75`); `role="tab"`, `aria-selected`, roving `tabindex` (`:84-89`); arrows/Home/End (`:58-62`). | Every tab sets `aria-controls` to a panel id (`:86`) but the panel is left to the consumer (`:23`). 9 files use `<Tabs>` and 9 files contain `role="tabpanel"`; they were not matched one to one. | S0 (`assertPattern`) |
| Chip | `ui/Chip.svelte` | Remove is a real `<button>` with a translated label (`:47`). | The label is the generic `m.chip_remove()` and does not carry the chip's text (`:47`); the status dot is colour only, with no text alternative (`:37-39`). | S3 |
| SideNav | `ui/SideNav.svelte` | `<aside aria-label>` (`:101-103`) wrapping a `<nav>` (`:123`); `aria-current="page"` (`:154`, `:176`). | `aria-label="unsaved changes"` on a plain `<span>`, hard-coded English and ignored on a generic element (`:165`, `:188`). | S6 |
| Spinner | `pkg:Spinner.svelte`, hub `ui/Spinner.svelte` | `role="status"` + `aria-label` **when `label` is passed**, otherwise `aria-hidden` (`pkg:23-25`); hub adapter forwards `label` (`ui/Spinner.svelte:11`). | Silent by default: of 101 `<Spinner` tags in hub `src/`, 15 pass `label` on the same line (multi-line tags make this a lower bound). | S3 |
| Skeleton | `pkg:Skeleton.svelte`, hub `ui/Skeleton.svelte` | Shared one supports `label` → `role="status"` (`pkg:18-20`). | The hub adapter has no `label` prop (`ui/Skeleton.svelte:3-8`) and never passes one (`:28-31`), so all 35 `<Skeleton` uses are `aria-hidden`. | S3 |
| SegmentedControl | `ui/SegmentedControl.svelte` | `role="group"` + `aria-label` (`:59`). | `outline: none` in its style block (`:132`); replacement focus style not checked. | S4 |

## 2. Governance numbers

| Metric | Measured | Handoff / proposal said | Command |
|---|---|---|---|
| `svelte-ignore a11y_*` comments | **80** comment lines carrying **84** rule tokens | 80 | `git grep -h "svelte-ignore" -- src \| grep -c "a11y_"` |
| by rule | `no_static_element_interactions` **54**, `no_noninteractive_tabindex` 14, `click_events_have_key_events` 7, `autofocus` 4, `no_noninteractive_element_interactions` 3, `missing_attribute` 1, `media_has_caption` 1 | "51 × `no_static_element_interactions`" | `git grep -h "svelte-ignore" -- src \| grep -o "a11y_[a-z_]*" \| sort \| uniq -c` |
| `aria-label=` attributes in `.svelte` | **695** | 695 | `git grep -oE 'aria-label=' -- 'src/**/*.svelte' \| wc -l` |
| translated (`aria-label={… m.x() …}`) | **535** | 497 | `git grep -oE 'aria-label=\{[^}]*m\.[a-zA-Z_]+' -- 'src/**/*.svelte' \| wc -l` |
| hard-coded English `aria-label` | **56** static string literals (53 outside stories; 4 of them in one `.fixture.svelte`) **plus 38** expressions that contain an English literal and no `m.*()` call (outside stories) | 58 | `git grep -oE 'aria-label="[^"{]*"' -- 'src/**/*.svelte' \| wc -l`; expressions: `git grep -nE 'aria-label=\{' -- 'src/**/*.svelte' ':!**/*.stories.svelte' \| grep -vE 'm\.[a-zA-Z_]+\(' \| grep -cE "['\"\`][A-Za-z]"` |
| `aria-live` | **30** in `src/` (28 in `.svelte`, 26 files) | 30 | `git grep -o -- 'aria-live' -- src \| wc -l` |
| `role="status"` | **79** (51 `.svelte` files) | 79 | same, `'role="status"'` |
| `role="alert"` | **125** in `src/` (121 in `.svelte`, 92 files) | 125 | same, `'role="alert"'` |
| `outline-none` class | **98** in 58 files | "168 `outline-none`" | `git grep -o "outline-none" -- src \| wc -l` |
| CSS `outline: none` / `outline: 0` | **70** | (inside the 168) | `git grep -oE "outline: *(none\|0)\b" -- src \| wc -l` |
| both together | **168** in 110 files | 168 | sum of the two |
| `focus-visible` | **86** | 86 | `git grep -o "focus-visible" -- src \| wc -l` |
| `forced-colors` rules | **0** | 0 | `git grep -n "forced-colors" -- src` |
| `<Chart>` call sites without `ariaLabel` | **40 of 44** (28 product call sites, 4 named: `crm/CrmSentimentTrend.svelte:100`, `sandbox/blocks/ChartBlock.svelte:35`, `src/routes/(app)/stock/PageBody.svelte:202,214`; the other 16 are all in `src/lib/stories/Charts/Chart.stories.svelte`, none named) | "40 of 44 charts unnamed" | tag-level scan of every `<Chart …>` for an `ariaLabel` prop |
| Fallback chart name | `ariaLabel ?? m.a11y0_chartRegion()` (`charts/Chart.svelte:70`), `role="img"` (`:371-372`) | generic name | read |
| Pages / pages using `PageShell` | **162** `+page.svelte`; **102** route files reference `PageShell` | 102 of 162 | `find src/routes -name '+page.svelte' \| wc -l`; `git grep -l PageShell -- src/routes \| wc -l` |
| Files that set a `<title>` | **89** | "~87" | `git grep -l "<title" -- src \| wc -l` |
| `<title>` in `src/app.html` | none | none | `grep -n "<title" src/app.html` |
| `<main` elements | 13 occurrences; none in `src/routes/(app)/+layout.svelte`, one in `ui/foundations/PageShell.svelte:43` | `<main>` only via PageShell | `git grep -n "<main" -- src \| wc -l` |
| Skip link | none in `src/routes/(app)/+layout.svelte` or `src/app.html` | none | `git grep -in "skip" -- …` |

### Numbers that differ from the handoff or the proposal

1. `no_static_element_interactions` is **54**, not 51. The comment count (80) is right, but 4
   comments suppress two rules, so the ratchet should count **rule tokens (84)** or it will miss
   a second rule added to an existing comment.
2. Hard-coded English `aria-label`s: **56 literals + 38 untranslated expressions = 94 sites**,
   not 58. The 58 most likely counted literal attributes only.
3. Translated `aria-label`s: **535**, not 497 (the pattern used is in the table; the earlier
   pattern is unknown).
4. "168 `outline-none`" is two things added together: 98 Tailwind `outline-none` classes and 70
   CSS `outline: none`/`0` declarations. The total holds.
5. "40 of 44 charts" counts **call sites including 16 Storybook stories**. In product code it is
   24 of 28 unnamed.
6. Files with a `<title>`: **89**, not ~87.
7. `aria-live` 30 and `role="alert"` 125 include non-Svelte files (tests and `.ts`); in
   components they are 28 and 121.

## 3. Tooling that exists today

The proposal's first governance bullet ("no automated a11y engine anywhere") was wrong and is
corrected there. What is installed on `3677e35a`:

| Fact | Anchor |
|---|---|
| `@storybook/addon-a11y` and `@storybook/addon-vitest` are registered | `.storybook/main.ts:11-12`; `package.json:114,119` |
| `axe-core` 4.14.0 is in the lockfile through the addon | `bun.lock:817,1273` |
| axe runs per story but only reports: `a11y.test: 'todo'` | `.storybook/preview.ts:91-95` |
| `test:storybook` script exists | `package.json:232` |
| No workflow runs it: the only Storybook workflow builds and deploys | `.github/workflows/storybook-deploy.yml:36,43`; no `test:storybook` match in `.github/` |
| Page sweep runs in CI with a 15-minute budget | `.github/workflows/ci.yml:827-833` |
| Sweep rules: `overflow`, `targets`, `dominant-action`, `archetype`, `health`, `title`; no a11y rule | `tests/e2e/ui-audit/conformance.ts:20-27` |
| The sweep's `title` rule counts **visible** route titles per archetype, not `<title>` | `tests/e2e/ui-audit/conformance.ts:41,177-178` |
| Sweep files that are committed | `tests/ui-audit/conformance-allowlist.json`, `tests/ui-audit/current-baseline.json` |
| The decrease-only ledger the sweep compares against, `tests/ui-audit/conformance-ledger.json`, is named by the script but **is not a tracked file on master** and is not git-ignored | `scripts/ui-audit-conformance.mjs:7,37`; `git ls-files \| grep conformance-ledger` returns nothing |
| `design-lint` a11y-adjacent rules are `bare-button` and `native-select` only; nothing counts `svelte-ignore` | `scripts/design-lint.mjs:81,86` |
| Two a11y Playwright specs exist | `tests/e2e/ui-audit/canvas-accessibility.spec.ts`, `tests/e2e/ui-audit/workshop-accessibility.spec.ts` |
| The workshop one has its own config | `playwright.workshop.config.ts:7` |
| Neither spec nor that config is referenced by any workflow or `package.json` script; the critical config only matches the journey specs | `playwright.critical.config.ts:11-14` |

## 4. Not verified

- **DraggableDialog focus** (proposal gap 8, second file): depends on Zag's non-modal dialog
  behaviour at run time. Needs a mounted test.
- **"15 files with `outline-none` and no replacement"** (proposal gap 7): the 168 total is
  measured, the 15 was not re-derived. It needs a per-site check of whether a replacement focus
  style exists.
- **ContextMenu hosts**: the component does not return focus; whether its hosts do was not read.
- **Tabs consumers**: `aria-controls` targets were not matched to `role="tabpanel"` elements.
- **Spinner label rate**: 15 of 101 is a same-line lower bound.
- **How the sweep ratchets without a committed ledger**: `conformance-ledger.json` is not
  tracked on master (section 3). Whether CI generates it, restores it from elsewhere, or the
  compare step runs against nothing was not traced. Spec 137 (S0) adds its a11y rule to this
  ledger, so its owner should settle this first.
- Proposal gaps 2, 4, 5, 6, 9, 10, 12, 14, 15 were not re-audited here beyond the rows above
  that overlap them. Gap 1 (`config/NavigationGuardModal.svelte:17-34`), gap 3 and gap 11
  (`tasks/TaskCard.svelte:26` `draggable` with no `tabindex`/`onkeydown`;
  `tasks/KanbanCol.svelte:53` drop only) were re-read and hold.
- Nothing was run in a browser or with a screen reader; this is a code read.
