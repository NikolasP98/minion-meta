# Spec 152 review — two passes, 2026-11-26 (PR A; PRs B–E are reviewed here when they start)

Reviewer: the implementing agent, against hub master `83d9f28e`, re-read on `456c90b5`.

## Pass 1 — is the AS-IS true, and does the mechanism hold?

| # | Finding | Evidence | Outcome |
|---|---|---|---|
| 1 | The unsaved-changes prompt has an Escape handler, so "Escape does nothing" needed proof. It is on the outer `div`; the inner panel stops key propagation and nothing moves focus into either, so the handler never runs. | `NavigationGuardModal.svelte:16-36` at `83d9f28e` | AS-IS stands; SC-002 tests it. |
| 2 | The shared `Dialog` guards dismissal of a dirty form with its own "discard changes?" prompt. Rendering the unsaved-changes prompt through it could stack one on the other. | `Dialog.svelte` `guardDismiss` | The prompt passes `guardDismiss={false}`; a test proves no second prompt opens. |
| 3 | The command palette draws its own surface; the shared dialog's header and padding would change its look. | `CommandPalette.svelte` | `Dialog` gains a `bare` presentation: same native modal dialog, the caller draws the surface. No rival overlay mechanism. |
| 4 | A `bare` dialog has no visible title to point `aria-labelledby` at. | — | It is named with `aria-label` from the same `title` prop; one new string "Command palette" already existed (`shortcuts_commandPaletteName`). |
| 5 | Requiring a name by type breaks the two wrappers that forward an optional title. | `Sheet.svelte`, `ui/Modal.svelte` | The union type is carried through both; no real caller was unnamed (`bun run check`: 0 errors). |
| 6 | Changing a confirmation's role changes how tests and code find it. | `grep` for `role="dialog"` / `getByRole('dialog'`: 2 mounted tests, 6 e2e specs, `FlowCanvas.svelte:313` | The 2 tests and the flow canvas guard are updated; the 6 e2e lookups target sheets and plain dialogs, not confirmations. |
| 7 | The palette's list is always open, so the combobox pattern's "Escape closes the popup" does not apply. | APG combobox | Waived in the test with a comment; Escape closing the dialog is proved by the dialog pattern. |

## Pass 2 — complete, consistent, testable?

| # | Finding | Outcome |
|---|---|---|
| 8 | "Focus trapped" cannot be asserted in happy-dom (native `<dialog>` inertness is a browser behaviour, and `assertPattern` does not check Tab trapping). | Proof is the native modal `<dialog>` (`showModal()`); stated under "Not covered" in the PR. |
| 9 | Only one of the four changes is visible. | One demo frame pair (unsaved-changes prompt); the other three are stated as "same look". |
| 10 | `DraggableWindow` is non-modal by design (the page stays usable). | It stays `role="dialog"` without `aria-modal`; only focus in / focus back is added. |
| 11 | Constitution IV: no new string, no route, API or permission; tokens only. | Confirmed (`lint:design`, `lint:tokens` clean). |
