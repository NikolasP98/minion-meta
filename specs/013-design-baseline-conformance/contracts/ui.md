# UI contracts addendum (feature 013)

Extends `../012-design-system-durability/contracts/ui.md`.

## Baseline (runtime) — amended after analysis
- Un-layered, normal-specificity rules in `app.css` (Tailwind utilities live in `@layer utilities`; a layered or `:where()` rule loses to `min-h-*` utilities and Svelte-scoped `min-height: 0`), under `@media (pointer: coarse), (max-width: 767.98px)`: every `button, [role=button], [role=switch], [role=checkbox], [role=radio], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=option], input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea` outside `[data-dense]` has `min-height: var(--active-control-min-height)` (icon-only: `min-width` too). The `min-height: 0` / `min-h-*` escapes that remain are enumerated as dense with reasons. Dense surfaces (`data-dense`): DataTable body, icon-tool clusters (`.dt-tool`), telemetry (`.t-telemetry`), chart canvases — each keeps a reachable alternative.
- Density mode lives on the existing `AppViewport` (`data-density="compact|comfortable"`, `compact` = today, mounted by `(app)/+layout.svelte`), not on `<html>`; mapping to DataTable density: compact → `normal` (44, today), comfortable → `comfortable` (52).

## Density preference
- Section `density` in `/api/me/preferences/[section]`; value `{ version: 1, mode: 'compact' | 'comfortable' }`, default `compact`; local scoped copy via `createScopedPreference('density', …)`; applied through the `AppViewport` prop from the SSR-loaded preferences (no flash).

## Archetype manifest — amended after analysis
- The registry is the existing `src/lib/routes/route-design-manifest.ts` (`RouteArchetype`: dashboard | collection | record-detail | form-settings | master-detail | workspace-editor | canvas-kanban | terminal-remote-desktop | public-auth, 100 % coverage proven by `route-design-contracts.test.ts`). PageShell's own enum is reconciled to these names. A generic `archetype-composition.test.ts` walks each page's layout chain up to `(app)` and asserts per archetype: collection = PageShell + PageHeader + one toolbar (DataView / FilterToolbar / DataTable toolbar) + the manifest's scroll owner; record-detail = PageShell + PageHeader|DetailHeader; form-settings = PageShell|SectionShell + commit footer or autosave; dashboard = PageShell + EditableGrid|KPI grid; master-detail/workspace-editor/canvas-kanban = SectionShell|PageShell per manifest. `KNOWN_NONCONFORMING` carries reasons; an unlisted non-conforming page fails.

## Action scope — amended
- `ActionScope = 'shell'|'page'|'collection'|'selection'|'row'|'field'`; PageHeader's `primaryActions` snippet carries at most one control, proven by a DOM-count test on the pilots (`[data-part='primary-actions'] > *` ≤ 1); extras move to `secondaryActions`/overflow. No typed registry.

## Collection states — amended
- `DataView` stays headless (012). `CollectionState.svelte` (same directory) accepts `state: CollectionState` (`initial-load|refreshing|stale|empty|no-results|denied|partial|failed|recovered`), `message?`, `onRetry?` (read-only) and action snippets; pages compose it above the renderer or through DataTable's `empty`/`errorContent` slots; it uses `ui/EmptyState`, `Skeleton`, `Spinner xs` only and never a second global spinner.

## Content contract
- `messages/{en,es}.json` gain `verb_save`, `verb_cancel`, `verb_create`, `verb_delete`, `verb_archive`, `verb_restore`, `verb_retry`, `verb_review`, `verb_export`, `verb_import` (append-only, both languages in one commit). `scripts/qc/content-contract.test.ts`: (1) across ALL keys, identical EN text must map to one ES text (divergences fixed by value change — keys are never removed — or allow-listed with reasons); (2) per-file ratchet over money/date formatter bypasses (`scripts/qc/.content-contract-baseline.json`, decrease-only): no new file, no count increase; the three pilots are at zero.
