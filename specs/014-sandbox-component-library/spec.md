# Feature Specification: Sandbox component library — save, share, drag in

**Feature Branch**: `docs/spec-014-sandbox-component-library` | **Repos & PR bases**: minion_hub → `master` (lands inside the sandbox POC branch, hub #542) · minion-meta → `dev` (this spec)

**Created**: 2026-10-16 | **Status**: Draft | **Tags**: logic, data (new column; visibility rule between users of one org) | **Human gates**: spec 010's owner gate on the POC PR

**Input**: Owner, 2026-10-16 (verbatim): "on a dynamic page's 'edit mode', add a way to see the custom component library for manually dragging in components created by the user (and shared if published by said user)"

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (hub `feat/sandbox-pages-poc` after spec 013).
- Elements live in `sandbox_elements(org_id, page, title, html, css, js, w, h, position, created_by)`; the POC reads and writes `page = 'default'` only, though `page` was added so "multiple pages come free" (migration `2026101600_sandbox_elements.sql`, spec 010 D7). Listing is by org + page with no per-user rule (`sandbox.service.ts:listElements`).
- Edit mode (spec 013) reorders and resizes what is on the board; the only way to get a new element is the assistant. Nothing can be kept for reuse, and nothing an admin builds is visible to another admin except on that same board.
- `EditableGrid` keeps `editing` private; the page cannot react to edit mode.

**TO-BE.**
- **Library = elements on the reserved page `library`**, plus one column `published boolean default false`. Saving a board element to the library snapshots its code into a library row owned by the viewer (unpublished). A library row is visible to its creator, and to every admin of the org once the creator publishes it. Service rule: `page <> 'library' or created_by = viewer or published`. Only the creator can flip `published`; the row also reports `mine` so the UI can show the right actions without knowing ids.
- **Edit mode shows the library.** `EditableGrid.editing` becomes bindable; when the sandbox page is in edit mode a Component library panel appears above the board: each entry shows title, size and Shared/Mine; actions: add to page (append), share/stop sharing and remove (creator only). Entries are draggable: dropping one on a board cell inserts a copy before that cell; dropping elsewhere appends. Every element card gets a "Save to library" action.
- Adding is a copy: the library row is never referenced by the board, so later edits to the board element do not change the library entry (and vice versa). The empty board still renders the grid toolbar so the library can seed the first element.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 data | migration `2026101601_sandbox_elements_published.sql`; service: `published`/`mine` columns, library visibility in `listElements`, creator-only `published` in `upsertElement`; routes accept `published` (PATCH) and `page` (POST, already) | service SQL reviewed; client helpers tested |
| S2 client | `src/lib/sandbox/library.ts` (`listLibrary`, `saveToLibrary`, `addToPage`, `setPublished`, `removeFromLibrary`, drag MIME) + test; `LibraryPanel.svelte`; `EditableGrid` `bind:editing`; sandbox page drop zone + insert-before; `ElementFrame` save action; i18n EN/ES | `library.test.ts` (copy shape, page targets, events); svelte-check, design/token lint; manual: save → appears in panel → drag onto a cell → inserted before it → reload keeps it |

## User Scenarios & Testing
1. Admin A builds a KPI card with the assistant, clicks "Save to library", enters edit mode: the panel lists it as Mine. A drags it onto the second cell: a copy lands before it; reload keeps the order.
2. A clicks "Share": admin B (same org) sees it in their panel as Shared and can add it; B cannot unshare or remove it.
3. Unshared entries of A never appear for B (service rule, not UI).
4. Removing a library entry leaves every copy on boards untouched.

## Requirements
- FR-001 Library rows are ordinary `sandbox_elements` rows on page `library`; no new table.
- FR-002 Visibility: creator or published; enforced in SQL, not in the client.
- FR-003 `published` can only be changed by the creator (SQL guard); other fields keep the existing admin rule.
- FR-004 Adding to a page is a copy of `title, html, css, js, w, h`.
- FR-005 `EditableGrid` without `bind:editing` behaves exactly as before.

## Out of scope / open ends (ledger)
- **Out of scope:** an agent-facing `sandbox.library` tool (the canvas map could point at reusable components); cross-org sharing; versioning of library entries; thumbnails/previews in the panel (title + size only).
- `mine` relies on `created_by`; rows created before `created_by` was populated (none in QA) would show as not mine.
