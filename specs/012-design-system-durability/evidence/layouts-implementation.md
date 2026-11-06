# Layouts, preferences and collection APIs implementation receipt

Owner: layout worker. Scope: T008–T011 and T015–T016. Date: 2026-10-16. All changes remain in the shared isolated feature branch; this receipt claims neither commit nor deployment.

## Observable changes

- Layout/catalog admission accepts legacy version 0/current version 1 and unknown input safely, filters unknown/duplicate IDs, applies explicit rename aliases, appends new catalog members, validates finite bounded spans and includes hidden grid cards. API validation uses the same structural grid parser; administrator/org gates remain intact.
- Grid, DataTable columns, card layouts, view selection and calendar preferences use actor/organization/namespace storage. Identity changes immediately expose the new owner's data without requiring remount. Old unattributable global keys are not imported. Storage acquisition/read/write exceptions preserve session state and expose local-only outcomes where UI saves are shown.
- Calendar factories validate and bound persisted/set values. POS and scheduling share staff only within the same actor/org. Scope changes retire prior cached values. Existing factory API is retained.
- EditableGrid uses actual container width for compact mode and row flow matching DOM order. Each card offers move, resize and visibility commands with accessible names, boundary disables, live announcements and focus restoration. Hidden cards remain available in edit mode. Compact width controls explain why width is fixed while retaining desktop spans. FieldsList adds equivalent move commands, locked-boundary guards and dependent-field state.
- Shared-default grid saves capture immutable owner/layout snapshots. Late responses cannot apply to a new scope or mark a newer layout saved. Uncertain writes block replay and offer GET-only reconciliation. Local preference status distinguishes rejection, uncertainty, checked server state and local-only storage.
- Daily dashboard uses actor/org local preservation and an organization discriminator in the existing per-profile preference section. The server retains only the last-saved organization's layout; other organizations remain preserved on that device. This is not all-organization cross-device persistence. Canonical data for another organization is ignored. Unknown outcome recovery only reads; explicitly choosing a matching saved layout adopts it locally without another write.
- DataTable exposes logical `onRowActivate(row,{source})`, record-specific labels, primary sort state and secondary rank descriptions, and keyboard/pointer column resize. Interactive descendants do not activate rows. Native reading tables and spreadsheet grids have explicit interaction modes; grids have active descendant/row/column semantics, while native tables preserve native reading semantics.
- Picker uses logical DataTable activation instead of DOM row-index lookup. Quick-add offers `createDirty` and snippet `setDirty` for custom-only controls; actual stock/party wrappers pass explicit form dirty state. Successful creation closes without a discard prompt.
- DataView accepts a readonly nonempty supported-view catalog and explicitly rejects invalid runtime catalogs. Explicit DataTable props, including false, still override preset defaults.

## Main source locations

Hub dashboard: `src/lib/components/dashboard/{editable-grid.ts,EditableGrid.svelte,dashboard-layout-cache.ts}`; `src/routes/api/dashboard-layouts/[id]/+server.ts`; `src/server/services/dashboard-layouts.service.ts`; six dashboard route callers supply localized labels.

Hub preferences: `src/lib/state/ui/{scoped-preference.svelte.ts,preference-sync.svelte.ts}`; `src/lib/components/data-view/{layout-catalog.ts,card-fields.ts,card-fields.svelte.ts,view-pref.svelte.ts}`; `src/lib/components/scheduling/kit/calendar-prefs.svelte.ts`; `src/lib/inbox/daily-cards.ts`; daily page and preference section API.

Hub interactions: `src/lib/components/scheduling/FieldsList.svelte`; `src/lib/components/data-table/DataTable.svelte`; `src/lib/components/ui/{Picker.svelte,picker.ts}`; stock/party Picker wrappers; `src/lib/components/data-view/{DataView.svelte,data-view.ts}`.

Localization additions are in `/tmp/design-layout-messages.en.json` and `.es.json`; root merges/compiles the owned locale files. Latest addition is `design_use_saved_layout`.

## Executed evidence

- `/tmp/layouts-tests-3.log`: 124/124 passed across 10 files. Covers normalization, scoped preferences, view/calendar state, table semantics, Picker logical activation, grid actions/reconciliation and preference sync at that source snapshot.
- `/tmp/layouts-final-tests.log`: 98/99 passed across 9 files after additional table storage/API/FieldsList cases. The sole failing newly-added Picker custom-dirty test stopped before component behavior because happy-dom did not supply `window.confirm`; the harness was corrected to install/restore it explicitly.
- `/tmp/layouts-last-tests.log`: affected Picker and preference-reconciliation rerun; final outcome appended below when settled. Additional reconciliation tests reject malformed responses and fence canonical results by owner.
- `/tmp/layouts-last-format.log`: final touched-file formatting succeeded. Earlier full owned-file formatting receipts remain `/tmp/layouts-final-format.log` and `/tmp/layouts-format-final.log`.
- Direct Svelte compilation reported zero warnings for Grid, DataTable, DataView, Picker, FieldsList and daily page; final Picker dirty fixture also compiles without warnings.
- `/tmp/layouts-check.log`: canceled during duplicate full-check resource contention by root instruction. It is neither a passing nor failing qualification result. Root runs one final source-settled full check/build.

Final browser and repository gates, immutable archives, review by another worker and deployment are root-owned integration steps. Scoped local and canonical tests do not claim authenticated cross-device runtime coverage.
