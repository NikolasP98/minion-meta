# Feature Specification: Sandbox canvas awareness, user-editable layout, two-tier builder

**Feature Branch**: `docs/spec-013-sandbox-canvas-two-tier` | **Repos & PR bases**: minion_hub → `master` (lands inside the sandbox POC branch, hub #542) · minion-meta → `dev` (this spec)

**Created**: 2026-10-16 | **Status**: Draft | **Tags**: logic (no new data exposure: same element rows, same admin gate) | **Human gates**: spec 010's owner gate still applies to the POC PR as a whole

**Input**: Owner, 2026-10-16 (verbatim): "charts are generating, great start. I need you to also give the agent better context of the canvas. This needs better layout awareness. Also, allow the user to edit the layout like in dashboard pages. Okay, I was thinking of a 2-tier builder: tier 1 focuses on the technical mechanics and building of components and their apis. Tier 2 is focused on the outer layer, layout and identifying existing components to avoid duplicates. We need to improve this further."

## AS-IS → TO-BE → DELTA *(constitution Principle II)*

**AS-IS** (hub `feat/sandbox-pages-poc` @ `8c1a41bf` + spec 012 commit).
- The sandbox page renders `host.elements` in a static 4-column CSS grid; each `ElementFrame` spans its own `w` and fixes its height at `h × 16rem` (`+page.svelte:63-70`, `ElementFrame.svelte:70,82`). Nothing lets the user reorder or resize; the only layout inputs are the `w`/`h` the agent passed to `sandbox.upsert_element`.
- Dashboard pages already have a viewer-editable grid: `EditableGrid.svelte` (drag grip to reorder, bottom-right handle to resize, Edit/Done toolbar) with pure helpers in `editable-grid.ts`. It persists to localStorage (`dash:layout:<id>`) and an org default (`/api/dashboard-layouts`), merged over code defaults. The sandbox's layout, by contrast, is already server data: `sandbox_elements(position, w, h)` (`sandbox.service.ts:121-123,192`) with `PATCH /api/sandbox/elements/[id]` accepting `position`, `w`, `h` (`[id]/+server.ts:12-14`).
- The agent's view of the canvas is one tool: `sandbox.list_elements` → `[{id, title, w, h}]` (`tools.ts:432-445`), nothing in the envelope. On `/sandbox` the core hint is one sentence ("call sandbox.datasets, then sandbox.preview, before writing an element") and the `sandbox` manifest (~1.1 KB) is pure tier-1 mechanics: runtime API, sizing, error handling (`turn-router.ts:146-175`, `assistant-context.ts:93-121`). There is no instruction about duplicates, placement, or what already exists; the owner's screenshot shows two near-identical "daily revenue vs bookings" elements built in consecutive turns.
- `buildAssistantContext` has no way for a page to contribute text; only tools are page-scoped (`model-context.ts`).

**TO-BE.**
- **User-editable layout.** `/sandbox` renders its elements through `EditableGrid` in a new controlled mode (`onchange`): no localStorage, no org default; every reorder/resize is reported and the page writes it to the element rows (`position` = index in order, `w`, `h`) after a short debounce, then reloads. The element rows are the single layout truth for the user, the agent and every other admin.
- **Canvas awareness (tier 2 context).** A tiny page-context hook (`setPageContext(text)` / `getPageContext()`, `src/lib/assistant/page-context.ts`) lets any page add model-only text to the envelope. The sandbox sets a canvas map derived from the element rows — one line per element in display order: index, full id, title, `w×h`, the datasets its JS queries and the chart type if any (`describeElement` / `canvasSummary` in `src/lib/sandbox/canvas.ts`). It refreshes on every element change, so the agent always sees the current board without a tool call.
- **Two-tier builder.** Tier 2 (curation/layout) lives in the always-on sandbox core hint next to the canvas map: check the map before adding; if an element already covers the same datasets/intent, update it by id instead of adding; place with `sandbox.arrange`; sizing conventions (KPI `w=1`, chart `w=2`, time series `w=4`). Tier 1 (mechanics) stays the gated `sandbox` manifest + `sandbox.preview`/`upsert_element` descriptions. New tool `sandbox.arrange {order?: string[], sizes?: [{id, w, h}]}` writes positions/sizes without touching element code. `sandbox.list_elements` returns the same per-element description as the map.
- Removing: nothing. The `w`/`h` on `upsert_element` keep working (initial size); the grid's row unit replaces the hard-coded `16rem`.

**DELTA.**
| # | Transition | Proof |
|---|---|---|
| S1 layout | `EditableGrid` gains `onchange` (controlled); sandbox page renders through it; `host.arrange(updates)` PATCHes changed rows then reloads; `ElementFrame` drops its own span/height | existing `editable-grid.test.ts` untouched; dashboard behaviour unchanged (no `onchange` ⇒ old path); manual: drag + resize persists across reload |
| S2 awareness | `page-context.ts`; `canvas.ts` (`describeElement`, `canvasSummary`); sandbox page sets/clears it; `assistant-context.ts` appends `getPageContext()` | `canvas.test.ts` (datasets + chart detection, ordering, empty board); `assistant-context.test.ts` (page context appears when set, absent when cleared) |
| S3 tier 2 | core hint rewritten (dedupe + arrange + sizing); `sandbox.arrange` tool; `list_elements` richer | `tools.test.ts` (six tools; arrange PATCHes position per order and sizes per id, announces change) |

## User Scenarios & Testing

1. **Owner drags the KPI card first and widens the time series** → Edit layout → drag/resize → Done; reload shows the same board; `sandbox.list_elements` reports the new order and sizes.
2. **"Build daily revenue vs bookings" when it already exists** → the agent sees it in the canvas map and updates that element by id (one element, not two).
3. **"Put the revenue charts side by side at the top"** → the agent calls `sandbox.arrange` with an order/sizes; no element code is rewritten.
4. **Dashboard pages** → unchanged: no `onchange` ⇒ localStorage + org-default path as before.

## Requirements
- FR-001 The element rows are the only layout store for the sandbox (no localStorage layout).
- FR-002 The canvas map MUST be rebuilt from the current element list on every change and cleared on page unmount.
- FR-003 `sandbox.arrange` MUST only PATCH `position`/`w`/`h`, never element code; unknown ids are reported, not created.
- FR-004 `EditableGrid` without `onchange` MUST behave exactly as before.
- FR-005 Canvas-map lines stay short (≤ ~160 chars per element) so a 12-element board costs < 2 KB.

## Out of scope / open ends (ledger)
- **Out of scope:** Tier 1 as a separate sub-session (`sessions_spawn`) so element HTML/JS never enters the main context — the next step once the two-tier protocol proves itself; drag-and-drop between pages; per-user sandboxes (spec 010 assumption still open).
- `describeElement` infers datasets/chart type from the element JS by regex (`dataset: '…'`, `type: '…'`); an element that builds its spec dynamically shows "no query". Acceptable for the POC; a declared `meta` field on the element record is the upgrade.
- `EditableGrid`'s narrow-container fallback (≤ 620px ⇒ one column) now applies to the sandbox (was 2 columns ≤ 1024px).
