---
id: 2026-11-10-hub-native-popover-top-layer-spec
title: Shared floating panels open in the browser top layer
stage: dev
status: implementing
pass: 1
created: 2026-11-10
updated: 2026-11-10
repos: [minion_hub]
type: fix
tags: [ui, ux, test]
---

# Shared floating panels open in the browser top layer

## 0. Product

The owner asked for the native HTML/CSS features from "New HTML and CSS Features: Write Less
JavaScript" to be adopted where they remove hand-built workarounds, and for Storybook to
capture each one. This slice covers the native `popover` attribute: menus, popovers, tooltips
and combobox lists always open above drawers and are never clipped by their container. The
z-index tiers that were added to work around stacking bugs stop being needed.

## AS-IS

Hub base: `origin/feat/storybook` (hub draft PR #648). Zag `@zag-js/*` 1.42, `@floating-ui/dom`
1.7.6.

- `src/lib/components/ui/portal-in-layer.ts` wraps Zag's `portal`. It has two rules:
  1. A panel born inside a native `<dialog>` is portalled INTO that dialog and not to
     `<body>`. A modal dialog is top-layer, so a body-portalled panel could never paint above
     it. That was the owner report of 2026-09-26: the drawer's "Add tag" popover opened
     underneath the drawer.
  2. A nested panel (detected with `closest('[data-part="content"]')`) gets
     `calc(var(--layer-modal) + 1)` on its positioner and content. Other panels get
     `var(--layer-modal)`. That was the owner report of 2026-09-29: FilterChip's kebab menu
     painted under its own popover.
- There are three consumers: `Popover.svelte` (the positioner is always mounted, and the
  content is `hidden` when closed), `Dropdown.svelte` (same) and `Tooltip.svelte` (mounted
  only while open, inside `{#if tip.open}`).
- `Combobox.svelte` is NOT portalled. Its list renders inline with `strategy: 'fixed'` and
  `.cb-content { z-index: var(--layer-dropdown) }`, so an `overflow: hidden` ancestor clips
  it, and any later sibling stacking context covers it.
- Layer tokens come from `@minion-stack/design-tokens/tokens.css`: `--layer-dropdown: 30`,
  `--layer-modal: 50`, `--layer-toast: 60`. A body-portalled panel at 50 is covered by any
  element in the root stacking context whose z-index is above 50.
- `foundations/Dialog.svelte` renders native `<dialog>.showModal()`. Its `.dialog-positioner`
  has `overflow: visible` and its `.dialog-content` has `overflow: hidden`.
- Prior art inside the hub: `foundations/DraggableWindow.svelte`, `layout/FloatingAssistant.svelte`
  and `assistant/AssistGuide.svelte` are already `popover="manual"` plus `showPopover()`.
  They re-parent into the open dialog so the modal does not make them inert.
- Floating-ui 1.7 is top-layer aware. In `getOffsetParent` and `getClippingRect`,
  `isTopLayer(floating)` uses the window as the offset parent and drops clipping ancestors.
  Zag defers `computePosition` and `focusMenu` with `raf`. Svelte 5 effects and action
  updates flush in a microtask, so a `showPopover()` driven by the open state always runs
  before Zag measures or focuses.
- `floating-layer.svelte.ts` (the rule that only one floating panel shows at a time) and the
  SSR contract (a closed Popover/Dropdown keeps its items in the server HTML;
  `ProfileMenu.test.ts`) are independent of stacking.

Browser reality (PostHog, last 30 days of hub pageviews):

- most traffic is Chrome/Edge/Opera 154–157;
- Firefox 155–159;
- Mobile Safari 26–27;
- Desktop Safari 18: 2 users, 79 pageviews.

Every engine in that list ships `popover` (Safari 17+). Safari 18 lacks CSS anchor
positioning, so positioning stays in floating-ui.

## TO-BE

- The positioner of each of the four panels carries `popover="manual"`. When Zag reports the
  panel open, `showPopover()` runs; when Zag reports it closed, `hidePopover()` runs. Zag's
  open state stays the single source of truth.
- The popover is "manual", not "auto", so the browser adds no light-dismiss or Escape
  handling and Zag keeps owning outside-click, Escape, focus and nesting.
- Stacking comes from top-layer order: a panel shown later paints above earlier top-layer
  elements. That includes a modal dialog, a DraggableWindow, the FloatingAssistant and a
  host panel. The `--layer-modal` / `+ 1` tiering is deleted.
- `portal-in-layer.ts` stays as a thin wrapper. The portal itself is still needed for two
  reasons:
  - Inside a modal dialog, a top-layer element outside the dialog's subtree is inert.
  - Moving the panel out of its host keeps three things unchanged: event bubbling (a menu
    click must not reach a clickable parent row), inherited text styles, and the
    "style the panel's own classes" contract that callers already follow.
- Combobox gets only the top-layer half (`topLayer`) and stays inline, so its DOM position,
  event path and scoped styles do not change.
- One base-layer rule in `src/app.css` undoes the user-agent popover box for Zag positioners:
  `inset`, `border`, `background`, `color` and `overflow`. The base `*` reset already zeroes
  margin and padding. Zag's inline `position`, `top`/`left` and `translate3d` keep placing
  the panel.

Invariants (unchanged):

- keyboard navigation, focus return to the trigger, Escape, outside-click, and a Dropdown
  opened from inside a Popover;
- Tooltip never takes focus (a manual popover with no `autofocus` runs no focusing steps);
- Combobox typing keeps working while the list is open;
- placement is the same: same Zag strategy, same coordinates;
- the closed-panel SSR markup;
- the floating-layer suppression rule.

Accepted trade-off: an open panel now paints above toasts (`--layer-toast`) where the two
overlap. Today, toasts are already under every modal drawer.

## DELTA

1. `portal-in-layer.ts`: add `topLayer(node, open)`. It is feature-detected, idempotent, and
   wrapped in try/catch, so a disconnected node or an engine without the API leaves the panel
   in normal flow. `portalInLayer(node, open)` portals first, then shows; the z-index
   tiering is removed. Proven by the play functions in item 5.
2. `Popover`, `Dropdown`, `Tooltip`: `popover="manual"` + `use:portalInLayer={open}`. The
   stale z-index commentary and Popover's `z-[var(--layer-modal)]` are removed.
3. `Combobox`: `popover="manual"` + `use:topLayer={api.open}`. The dead
   `.cb-content` z-index is removed.
4. `src/app.css`: the UA popover reset for `[data-part='positioner'][popover]`.
5. Storybook (`src/lib/stories/Overlays/*.stories.svelte`):
   - `InsideModalDialog` and `InsideOverflowHidden` for all four components;
   - `NestedInDialog` for Dropdown: a Dropdown inside a Popover panel inside a modal dialog.
   Each story has a `play` function that opens the panel and asserts four things:
   - `:popover-open`;
   - the rect is inside the viewport and larger than the overflow box;
   - the panel sits next to its trigger (placement is unchanged);
   - `elementFromPoint` hits the panel, so it paints on top. Tooltip is excluded from this
     check because it is `pointer-events: none`.
   Behaviour assertions:
   - Dropdown: focus moves into the menu, and Escape returns it to the trigger and hides
     the popover;
   - Tooltip: focus does not move;
   - Combobox: typing filters while the list stays open and the input keeps focus.
   They run in real Chromium in the storybook vitest project.
6. The existing happy-dom tests (`Popover.viewport.test.ts`, `floating-layer.mounted.test.ts`)
   stay green. They prove Escape and focus return and the suppression rule with the new
   attribute present.

### Slice 1 — top-layer panels

**Topics:** `ui`, `test`

Items 1–6 make up one hub PR. It is a draft, stacked on `feat/storybook`.

## Out of scope

- CSS anchor positioning (Safari 18 lacks it).
- `popover="auto"` or invoker commands (`commandfor`).
- `ContextMenu.svelte`, `Select.svelte`, `MultiSelectFilter.svelte` and `PickerCombobox.svelte`,
  which have their own layering. A follow-up can adopt `topLayer` there.
- Any change to `Dialog.svelte` or `DraggableWindow.svelte`.

## Verification

From the hub clone, under the shared gate lock:

- `bunx vitest run --project unit src/lib/components/ui/Popover.viewport.test.ts src/lib/components/ui/floating-layer.mounted.test.ts`;
- `STORYBOOK_TESTS=1 bunx vitest run --project storybook src/lib/stories/Overlays/{Popover,Dropdown,Tooltip,Combobox}.stories.svelte`;
- `bun run check`;
- `bun run lint:design && bun run lint:tokens`.

Then, by hand:

- In the hub, open a customer drawer and use "Add tag": the popover paints above the drawer.
- Use FilterChip's "…" menu: the menu paints above its popover.
