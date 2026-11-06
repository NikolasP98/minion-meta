# Implementation Plan: Sandbox component library

**Spec**: `spec.md` | **Date**: 2026-10-16 | **Repo**: minion_hub, branch `feat/sandbox-pages-poc` (hub #542)

## Constitution Check
| Principle | Status |
|---|---|
| I Spec before code | PASS |
| II AS-IS/TO-BE/DELTA | PASS |
| III Slice-scoped | PASS — S1 data (migration + service + route), S2 client (helpers, panel, grid binding, page, frame, i18n) |
| IV Required build steps | migration file; `i18n:compile` (11 keys EN/ES); prettier, svelte-check, lint:design/tokens, `vitest run src/lib/sandbox src/lib/components/dashboard`, seed contract |
| V Security gates | data-tagged: visibility rule in SQL (creator or published) + creator-only `published`; same admin capability as every sandbox write |

## Design decisions
- **D1 No new table.** Library entries are `sandbox_elements` rows on page `library` + `published`. Same CRUD, same RLS, same size limit; one `alter table`.
- **D2 Visibility and ownership in SQL.** `listElements` filters `page <> 'library' or published or created_by = viewer`; `upsertElement` only applies `published` when `created_by = viewer`. Rows return `mine` so the panel never needs the viewer's id.
- **D3 Copies, not references.** Add-to-page and save-to-library both POST `{title, html, css, js, w, h}`; no foreign key, no cascade.
- **D4 Drag = HTML5 drag with a JSON payload** (`application/x-minion-component`); drop on a cell → insert before it via the existing `reorder` + `host.arrange`; elsewhere → append. No dnd library.
- **D5 `EditableGrid.editing` bindable** so the page can mount the panel only in edit mode; the empty board still renders the grid toolbar so the library can seed the first element.

## Files
```
supabase/migrations/2026101601_sandbox_elements_published.sql
src/server/sandbox/sandbox.service.ts · src/routes/api/sandbox/elements/[id]/+server.ts
src/lib/sandbox/library.ts · library.test.ts · host.svelte.ts (record fields)
src/lib/components/sandbox/LibraryPanel.svelte · ElementFrame.svelte
src/lib/components/dashboard/EditableGrid.svelte · src/routes/(app)/sandbox/+page.svelte
messages/en.json · messages/es.json
```
