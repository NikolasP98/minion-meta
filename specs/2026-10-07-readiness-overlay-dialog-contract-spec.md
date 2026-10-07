---
id: 2026-10-07-readiness-overlay-dialog-contract-spec
title: Hand-rolled overlays join the shared native dialog contract (HC-028)
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
findings: [HC-028]
pr: 437
---

# Overlay dialog contract (HC-028)

## 0. Product

Every blocking overlay in the hub must behave like one dialog: the page behind it is inert, Tab
and Shift+Tab stay inside, Escape closes it from whichever control has focus, a click outside
follows a stated policy, the page does not scroll underneath, and focus returns to the control
that opened it. HostsOverlay (the finding's named offender in
`2026-10-02-hub-gateway-production-readiness-recon`) swallowed Escape from its own inputs because
its inner panel stopped keydown propagation before the backdrop's Escape handler could see it.

Canonicalized from the implementer's batch spec
(`~/.cache/codex-implementation/2026-10-03-hub-gw/spec-hc028-overlay-dialog-contract.md`); the
inventory and measurements below are theirs.

## 1. AS-IS

The canonical primitive already exists: `src/lib/components/ui/foundations/Dialog.svelte` is a
native `<dialog>` opened with `showModal()` (top layer, inert background, UA focus trap, Escape →
`cancel`), with `acquireDialogScrollLock()` (`dialog-scroll-lock.ts`) and `returnFocus` captured
from `document.activeElement` at open (`Dialog.svelte:113-120, 83-89`). `Sheet`, `ConfirmDialog`
and the deprecated `Modal` wrap it. `AssistGuide.svelte:28` and `DraggableWindow.svelte:85`
already document "Hub dialogs are native `<dialog>.showModal()`" as the convention.

Twenty-one files declare `role="dialog"`/`aria-modal` (baseline `32964676`). Inventory, modal
claims only:

| Overlay (file:line of root) | Modal / inert bg | Tab trap | Escape from inner input | Outside click | Scroll lock | Focus return | Disposition |
|---|---|---|---|---|---|---|---|
| `hosts/HostsOverlay.svelte:126-141` | `aria-modal` only; no inert | none | **swallowed** — inner `onkeydown={e.stopPropagation()}` (l.140) blocks the backdrop handler (l.132) | closes (backdrop `onclick`) | none | none | **migrated** |
| `builder/_builder-hub/DeleteConfirmModal.svelte:15` | claim only | none | n/a (no input); Escape on root only | closes | none | none | **migrated** |
| `flow-editor/…/DeleteChapterModal.svelte:10-11` | claim only | none | n/a; Escape on backdrop div | closes | none | none | **migrated** |
| `flow-editor/…/ConditionModal.svelte:12-13` | claim only | none | works only because keydown bubbles to backdrop (l.12) | closes | none | none | **migrated** |
| `builder/_builder-hub/RegistryAgentSheet.svelte:35` | claim only | none | n/a; Escape on root | closes | none | none | **migrated** |
| `builder/SkillCreateWizard.svelte:49-57` | claim only | none | bubbles to root (l.43) | closes (even while `creating`) | none | none | **migrated** |
| `data-table/ExportDialog.svelte:46-48` | claim only; dismiss layer is a full-viewport `Button` (cursor hijack, governance anti-pattern) | none | **no Escape path at all** | closes | none | none | **migrated** |
| `agents/SectionProseEditor.svelte:270-285` | claim only | none | swallowed (inner `stopPropagation` l.285) | closes — discards unsaved `slot.dirty` edits | none | none | deferred, `TODO(handoff)` |
| `agents/AgentSettingsPanel.svelte:238-253` | no claim; no inert | none | window-level listener (l.235) — also fires for nested Zag menus | closes | none | none | deferred, `TODO(handoff)` |
| `builder/AgentCreateWizard.svelte:237-245` | claim only | none | root handler | `handleOverlayClick` | none | none | deferred (wizard), `TODO(handoff)` |
| `marketplace/AgentCreatorWizard.svelte:148-151` | claim only | none | **none** | none | none | none | deferred (wizard), `TODO(handoff)` |
| `workshop/RelationshipPrompt.svelte:44-59` | claim only; anchored at canvas (x,y) | none | input handler (l.31) | mousedown backdrop cancels | none | input autofocus only | deferred (needs anchor API), `TODO(handoff)` |
| `my-agent/EaselBoard.svelte:323` | `aria-modal="true"` claimed, nothing modal | none | window listener | n/a (full-screen) | none | none | deferred mis-claim, `TODO(handoff)` |
| `my-agent/ZenMode.svelte:103` | same mis-claim | none | window listener (defers to Zag menu) | n/a | none | none | deferred mis-claim, `TODO(handoff)` |
| `layout/BugReporter.svelte:99-102` | `aria-modal="true"` on a non-blocking floating panel | none | window listener | n/a | none | none | deferred mis-claim, `TODO(handoff)` |

Non-modal by design, out of this contract (no `aria-modal` claim, panel lives inside the page
flow): `builder/ChapterEditor.svelte:273` (in-layout drawer),
`flow-editor/nodes/NodeConfigPanel.svelte:81` (canvas side panel), `my-agent/IconPicker.svelte:37`
(popover), `FlowCanvas.svelte:300-313` (canvas Escape router), `AssistGuide.svelte:175` and
`DraggableWindow.svelte:228` (native `<dialog>` with `aria-modal="false"`, intentional).

Evidence: `evidence/hc028-hosts-overlay-red-v1.log` — the mounted test run against the
unmigrated HostsOverlay fails 4/4, including `closes on Escape pressed INSIDE the URL input`
(`expected true to be false` at `hosts-overlay.mounted.test.ts:82`).

## 2. TO-BE

One contract, owned by `Dialog.svelte`; a blocking overlay never re-implements any row:

| Behavior | Mechanism (all from the primitive) |
|---|---|
| Modal / inert background | `showModal()` → `dialog:modal`; everything outside is inert (UA) |
| Tab / Shift+Tab | UA focus trap of the top-layer dialog |
| Escape from any inner control | UA `cancel` event → `handleCancel` → `requestClose('cancel')` (only when `dismissible`) |
| Outside click | `handleBackdropClick`: target is the `<dialog>` itself → `requestClose('backdrop')` (only when `dismissible`) |
| Scroll lock | `acquireDialogScrollLock()` on open, released on close/destroy |
| Focus return | `returnFocus = document.activeElement` at open; `.focus()` queued on close/destroy |
| Accessible name | `title` or `labelledBy` (asserted while open) |

Per-overlay outside-dismissal policy:

| Overlay | `dismissible` | Why |
|---|---|---|
| HostsOverlay, DeleteConfirmModal, DeleteChapterModal, RegistryAgentSheet, ExportDialog, ConditionModal | `true` | Escape = backdrop = Cancel; nothing is lost that a reopen cannot redo (ConditionModal state lives in `skillEditorState`, not the dialog) |
| SkillCreateWizard | `true` (unchanged) | Open end: should become `!creating` once migrated beyond mechanical scope — a pending POST must not be dismissed |
| SectionProseEditor (deferred) | must be `false` while any `slot.dirty !== null` | a stray click currently discards edits |
| AgentCreateWizard / AgentCreatorWizard (deferred) | step-scoped; `false` while a request is in flight | wizards collect multi-step input |
| RelationshipPrompt (deferred) | `true` | transient canvas prompt |
| EaselBoard / ZenMode / BugReporter | n/a — not dialogs | drop `aria-modal="true"` (BugReporter → `"false"` like DraggableWindow) or open through the primitive |

Invariants: no new focus-trap code, no new dependency, no z-index on the overlay (the top layer
stacks it; nested Zag panels keep `--layer-modal + 1` on their CONTENT node per `portalInLayer`).

## 3. DELTA

| # | Transition | Proof |
|---|---|---|
| 1 | **Mechanical migrations (done):** replace each hand-rolled backdrop+panel pair with `<Dialog …>` keeping content and callbacks; `{#if}`-mounted overlays pass `open={true}` and route `onclose` to the parent's existing close callback; bindable ones (`HostsOverlay` via `ui.overlayOpen`, `ExportDialog`) use `bind:open`. Files: `hosts/HostsOverlay.svelte`, `builder/_builder-hub/DeleteConfirmModal.svelte`, `builder/_builder-hub/RegistryAgentSheet.svelte`, `builder/SkillCreateWizard.svelte`, `data-table/ExportDialog.svelte`, `flow-editor/skills/[id]/_components/ConditionModal.svelte`, `…/DeleteChapterModal.svelte`. Overlay/surface/header/close-button CSS removed; button/field recipes untouched. | `hosts-overlay.mounted.test.ts` (4) + `overlay-dialog-contract.mounted.test.ts` (6 overlays × 4); native proof 7 overlays × 9 checks |
| 2 | **Deferred, non-mechanical (`TODO(handoff)` at each root):** SectionProseEditor (header controls + dirty-gated dismissal), AgentSettingsPanel (680 px two-column drawer vs `Sheet`'s 28 rem; window-level Escape), AgentCreateWizard, AgentCreatorWizard, RelationshipPrompt (needs a positioned/anchored dialog decision). | ledger entries in the proposal |
| 3 | **Mis-claims (`TODO(handoff)`):** EaselBoard, ZenMode, BugReporter declare `aria-modal="true"` without any modal behavior. | ledger entries in the proposal |
| 4 | **Proof harness:** `src/lib/components/hosts/hosts-overlay.mounted.test.ts` and `src/lib/components/ui/foundations/overlay-dialog-contract.mounted.test.ts` in happy-dom; `tests/fixtures/overlay-dialog/` builds the real components into a credential-free page and `verify.mjs` drives isolated headless Chromium (Playwright binary) for `dialog:modal`, inert `focus()`, 12×Tab/12×Shift+Tab containment, scroll lock, Escape inside the innermost control, focus return and outside-click dismissal. | the harness itself |

## 4. Verification

- Red: `evidence/hc028-hosts-overlay-red-v1.log` (4 failed / 4, pre-migration HostsOverlay).
- Green: `evidence/hc028-mounted-green-v2.log` — 2 files, 28 passed. happy-dom's `showModal()`
  is attribute-only, so the test supplies the one UA step (document-level Escape → `cancel` on
  the open modal) and spies `showModal`; everything else is the real primitive.
- Native: `evidence/hc028-native-v2/hc028-native-proof.json` — 7 overlays, 63 checks, Chromium
  149.0.7827.55, no page errors; screenshots `hc028-open-*.png`.
- `svelte-check --threshold error`: 0 errors (`evidence/hc028-svelte-check-v3.log`).
  `lint:tokens`: 0 violations. `lint:design`: no category above baseline.

## 5. Implementation record

- Hub commit `4fa49266` (`fix(ui): move hand-rolled overlays onto the shared native dialog
  contract`) on `fix/readiness-hub-ui-a11y`, draft PR
  [minion_hub #437](https://github.com/NikolasP98/minion_hub/pull/437).
- Tests: mounted red 4 failed / 4 → green 28 passed across 2 files; native proof 63/63 checks.
- Evidence (local, not committed): `~/.cache/codex-implementation/2026-10-03-hub-gw/evidence/hc028-*`
  (`hc028-hosts-overlay-red-v1.log`, `hc028-mounted-green-v2.log`, `hc028-native-v2/`,
  `hc028-svelte-check-v3.log`).

## 6. Out of scope / open ends

Every open end below is ledgered in `proposals/2026-10-07-hub-readiness-ui-a11y-followups.md`.

- Exit animations for `{#if}`-mounted overlays (the parent unmounts on close; `onDestroy` closes
  the native dialog immediately — same as before, which had none).
- Redesign of the deferred overlays (DELTA 2) and the three mis-claims (DELTA 3) — eight
  `TODO(handoff)` sites.
- SkillCreateWizard stays `dismissible` while `creating` (a pending POST can be dismissed) — no
  in-code marker was left; ledgered in the proposal.
- Any change to `Dialog.svelte` — no gap in the primitive was found; the root cause was overlays
  not using it.
