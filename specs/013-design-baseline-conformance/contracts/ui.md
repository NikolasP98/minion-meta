# UI contracts addendum (feature 013)

Extends `../012-design-system-durability/contracts/ui.md`.

## Baseline (runtime)
- Under `(pointer: coarse)`, every `button, [role=button], [role=switch], [role=checkbox], [role=radio], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=option], input:not([type=hidden]), select, textarea, a[href].btn-like` outside `[data-density="dense"]` has `min-height: var(--control-height-touch)` and, for icon-only controls, `min-width` too. Dense surfaces: DataTable body, icon-button clusters (`.dt-tool`), telemetry (`.t-telemetry`), chart canvases — each sets `data-density="dense"` and keeps a reachable alternative (row menu, keyboard).
- Density mode: `<html data-density="comfortable|compact">`; tokens `--density-row`, `--density-control`, `--density-gap` resolve per mode; comfortable equals the current values.

## Density preference
- Section `density` in `/api/me/preferences/[section]`; value `{ version: 1, mode: 'comfortable' | 'compact' }`; local scoped copy via `createScopedPreference('density', …)`; applied by `$lib/themes/runtime.ts` next to `data-theme`.

## Archetype manifest
- `src/lib/routes/archetypes.ts`: `Record<routeId, 'collection'|'detail'|'create-edit'|'dashboard'|'settings'|'workspace'|'none'>` covering every `(app)` `+page.svelte`; the conformance test reads each page source and asserts the archetype's composition: collection = PageShell + PageHeader + one toolbar (DataView or FilterToolbar) + a region that owns scroll; detail = PageShell + PageHeader/DetailHeader + sections; create-edit = PageShell + form footer; dashboard = PageShell + EditableGrid or KPI grid; settings = SectionShell/SettingsNav; workspace = SectionShell. Unknown route → test fails.

## Action scope
- `ActionScope = 'shell'|'page'|'collection'|'selection'|'row'|'field'`; PageHeader renders exactly one `primary` action and folds the rest into overflow; declarations on pilots are props, not a new registry.

## Collection states
- `DataView` accepts `state: CollectionState` (`initial-load|refreshing|stale|empty|no-results|denied|partial|failed|recovered`) + `onRetry` (read-only); it renders the shared presentation and never a second global spinner (uses `AsyncBoundary`/`Skeleton`/`EmptyState`).

## Content contract
- `messages/{en,es}.json` gain `verb_save`, `verb_cancel`, `verb_create`, `verb_delete`, `verb_archive`, `verb_restore`, `verb_retry`, `verb_review`, `verb_export`, `verb_import` (append-only, both languages in one commit). `scripts/qc/content-contract.test.ts`: (1) no two keys with the same EN text map to different ES texts for verb keys; (2) no `toLocaleString`/`toFixed`/`Intl.NumberFormat` on money fields and no hand-rolled date formats outside `$lib/utils/format`.
