# Hub Hotkeys Expansion — Spec & Plan

**Date:** 2026-07-05 · **Status:** ✅ SHIPPED to `dev` @ `6e4bb202` (2026-07-06; T1 `04eee80a`, T2 `7c4491e0`, T3 `a0f1fa15`; merged dev green 0/0, browser-QA'd — see §8) · **Repo:** `minion_hub/`
**Builds on:** hotkey layer shipped in `57b0dfaa` (`src/lib/hotkeys/index.ts` wrapping `@tanstack/svelte-hotkeys@0.10.0`)

## 1. Goal

Extend the hub's keyboard layer from "app combos + Enter-to-send" to full
list/table interaction and navigation idioms, matching desktop + power-web
conventions (WAI-ARIA grid, Gmail/Linear/Notion), with every destructive
shortcut inheriting existing RBAC gates — no new permission paths.

## 2. Standards baseline (researched)

### Selection idioms (OS file-manager conventions)
| Input | Meaning |
|---|---|
| Click | select one (replace) / open row |
| Ctrl/Cmd+click | toggle row in/out of selection (no navigation) |
| Shift+click | select contiguous range from anchor |
| Ctrl/Cmd+A | select all *within the focused grid* (not the page) |
| Del / Backspace | delete current selection (gated, confirmed/undoable) |
| Escape | clear selection |

### WAI-ARIA grid pattern
Arrow-key row navigation, Home/End, Enter/Space activate, roving tabindex
(one tab stop per grid). Multi-select adds Shift+Arrow extend, Shift+Space
row-select, Ctrl+A.

### Power-web idioms (Gmail / Linear / Notion)
- `j`/`k` next/prev row; `x` toggle-select focused row; Enter opens.
- `/` focuses search. `?` opens shortcuts cheat-sheet.
- `g` then key nav sequences (modifier-free, cross-platform, no browser collisions).
- Del/Backspace deletes selection (Notion); undo (`z`/Mod+Z) or confirm pairs with it.

### Safety rules for destructive keys
1. Only fire on explicit non-empty selection.
2. Input-safe: never while typing (lib's `ignoreInputs` default already true for bare keys).
3. Route through the **same permission-gated action the UI button uses** — never a new endpoint call.
4. Confirm or make undoable.

## 3. Layer architecture (existing, unchanged)

- `src/lib/hotkeys/index.ts` is the only import point (`$lib/hotkeys`); alpha engine swappable in one file.
- `createHotkey(combo, cb, opts)` — global, component-lifecycle-scoped, call at top of `<script>`.
- `createHotkeyAttachment` / `createHotkeysAttachment` — element-scoped via `{@attach}` (the right scope for per-table keys).
- Options are `MaybeGetter` → `() => ({ enabled })` for reactive gating.
- Matcher exact-matches all modifiers; manager fires ALL matching registrations (no priority) — so per-element attachments are preferred over global bindings for anything contextual.
- `Mod` = ⌘ mac / Ctrl elsewhere; `formatForDisplay` for kbd hints (set in onMount to avoid SSR mismatch).
- `getHotkeyRegistrations()` + `meta: {name, description}` = the registry that will feed the `?` cheat-sheet.

### New layer additions (this phase)
- `gridKeys(...)` helper (working name) in `$lib/hotkeys`: bundles the table attachment
  (Ctrl+A, Escape-clear, Del→danger action, j/k roving focus) so DataTable and
  non-DataTable lists share one implementation.
- Optional `sequence('g h', cb)` helper IF `g`-nav ships (dependent on recon
  of the palette/nav registry; TanStack hotkeys has no built-in sequences —
  keep it tiny or cut it).

## 4. RBAC design rule (non-negotiable) — VERIFIED

A `Del` hotkey never knows about permissions. It fires
`bulkActions.find(a => a.danger)` — the array the parent already constructs
conditionally. **Verified in code:**

- Permission data reaches pages solely via `(app)/+layout.server.ts:76-91` →
  `page.data.permissions.permissions` (flat `string[]` of `module:action`
  tokens). Client helper: `canAct(module, action)` at
  `src/lib/access/can.svelte.ts:18`.
- `crm/customers/+page.svelte:182-200`: `bulkActions = $derived.by(() => {
  if (!canAct('crm','edit')) return []; … push({danger:true, onSelect}) })` —
  no cap ⇒ no danger action ⇒ Del no-ops, identical to the kebab item being
  absent.
- Server backstop is central, not per-endpoint: `hooks.server.ts:227-235` →
  `apiWriteCapability(path, method)` maps DELETE → `*:delete` over
  `API_WRITE_PREFIXES` (crm/finance/stock/brains/…). The hotkey introduces
  zero drift because it fires the same client callback as the button.

Generalized: every write/destructive hotkey binds to an existing gated
callback, never to a fetch. DataTable gets **no permission logic**.

> ⚠️ Concurrent-session note: `rbac.service.ts` + roles UI are another
> session's uncommitted WIP; `DataTable.svelte` itself has a small uncommitted
> foreign hunk (filterActive count). **All implementation happens in an
> isolated worktree off `origin/dev`** (`.worktrees/hotkeys-expansion`) so no
> foreign WIP rides into commits. `apiWriteCapability`/`API_WRITE_PREFIXES`/
> hooks backstop are pre-existing committed mechanisms — safe to rely on.

> ⚠️ Concurrent-session note: `rbac.service.ts` + roles UI are another
> session's uncommitted WIP. This work must not touch those files; it relies
> only on the committed permission-prop patterns.

## 5. Opportunity inventory (from recon)

### 5.1 DataTable (flagship — one file lights up every migrated table)

`src/lib/components/data-table/DataTable.svelte`. Already owns all selection
state; rows have **no** tabindex/keydown/role today — clean slate, zero
conflicts (repo-wide: only `TeamTab.svelte:458` stopProp guard on an open
menu and `AgentCard.svelte:49` Enter-flip, neither table-row scoped).

Existing internals to build on (do not reinvent):
| Piece | Where |
|---|---|
| `selectable` / `selectedIds` ($bindable Set) / `onSelectionChange` | props L117-119 |
| `bulkActions: BulkAction<T>[]` (`{label, danger?, onSelect(ids, rows)}`) | prop L120, type L71-75 |
| `toggleRow(id, e?)` — single-id toggle, no range | L556 |
| `toggleAll()` — all `viewIds` or clear | L565 |
| `viewIds` = filtered+sorted ids (NOT windowed) | L562 |
| `emitSelection(next)` / `runBulk(a)` | L552 / L569 |
| Search input `bind:value={search}` (no ref/id yet) | L651 |
| Row `<tr onclick={onRowClick…}>` | L836 |
| Bulk kebab renders only when `bulkActions?.length && selectedIds.size>0` | L662-676 |

Additions (all inside DataTable, active only when `selectable`):
1. **Ctrl/Cmd+click row** → `toggleRow(id)` instead of `onRowClick` (guard in the row onclick, before nav).
2. **Shift+click row** → range-select from `lastAnchor` over `viewIds` slice; plain click updates the anchor.
3. **Ctrl+A** (element-scoped attachment on the table wrapper, which gets `tabindex="0"`) → `toggleAll()` select-all path. Never global — a page-level Ctrl+A must keep native behavior outside the table.
4. **Escape** → clear selection, enabled only when `selectedIds.size > 0` (so it doesn't fight overlay Escapes).
5. **Del/Backspace** → `const danger = bulkActions?.find(a => a.danger); if (danger && selectedIds.size) runBulk(danger)`. No danger action ⇒ no-op (§4).
6. **`/`** → focus the search input (bare key, lib's `ignoreInputs` default keeps it typing-safe). Needs a `bind:this` ref on the input.
7. **j/k or ArrowDown/ArrowUp roving focus + Enter opens + x/Space toggles** — focused-row index over `flatRows`, `scrollIntoView({block:'nearest'})`, Enter → `onRowClick(row)`, Space/x → `toggleRow`. Visual: reuse row hover style for `.dt-row.focused`.

Consumers lit up for free: crm/customers (full: selection + danger delete),
stock items/entries/consumption, finances/invoices, socials/posts,
brains/agents (all `selectable` today but selection-dead — keys make the
existing checkboxes usable; Del stays inert there until each page adds a
gated danger bulkAction — desired property, not a gap).

### 5.2 Non-DataTable lists

| Surface | Opportunity | Gate |
|---|---|---|
| `sessions/SessionsList.svelte` | `/` focus its `search` input (L94) | read-only, none |
| `users/TeamTab.svelte` | none this phase (row-expand pattern, kebab per-row delete) | `can('users:invite')` etc. |
| `brains/BrainDocumentsTable.svelte` | none this phase (per-row Trash under `{#if canEdit}` L113) — candidate for DataTable migration later | `canEdit` prop |
| CRM merge resolver, reliability tables, backups | read-only, skip | — |

### 5.3 Navigation & shell

- **`?` shortcuts cheat-sheet** — the layer's designed payoff:
  `getHotkeyRegistrations()` is exported and has ZERO call sites today. New
  `ShortcutsOverlay.svelte` mounted in `(app)/+layout.svelte` beside
  `<CommandPalette />` / `<FloatingAssistant />`; renders registrations
  grouped by `meta`, combos via `formatForDisplay()`. Bindings without
  `meta` don't show — so T-tasks add `meta: {name, description}` (paraglide
  `m.*()` strings) to every registration worth surfacing.
- **`g`-then-key nav chords** (Gmail/Linear style, modifier-free): reuse the
  canonical registries — `palettePageRoutes()` from `src/lib/nav/routes.ts`
  (RBAC via `canClient(r.requires)`) **plus** business modules from
  `sections.ts` (`BUILTIN_PLUGIN_ITEMS`, gate via `canViewPath(href)`).
  TanStack has no sequence support → tiny chord shim: bare `g` binding
  (input-safe by default) opens a ~1.5s one-shot window for the second key.
  No new registry, no nav duplication.
- **Back-nav** already handled by `createBackNav` (`src/lib/nav/back-nav.svelte.ts`) — no hotkey needed this phase.

### 5.4 Quick wins (ranked by recon, effort→value)

| # | Win | Detail |
|---|---|---|
| 1 | `?` cheat-sheet | see 5.3 — Low effort / High value |
| 2 | `submitOnModEnter(fn)` helper + migrate 3 hand-rolled sites | `CrmHygiene.svelte`, `_agent-prompt-simulator/PipelineSidebar.svelte`, `_workshop-canvas/TaskPromptDialog.svelte` |
| 3 | `g`-nav chords | see 5.3 — Med effort / High value |
| 4 | Stock item `[`/`]` prev/next | ONLY free detail page: `stock/items/[id]/+page.server.ts:16` already loads the full `listItems` array — return ordered ids, index off them |
| 5 | AgentCreateWizard `Mod+Enter` → `handleNextOrCreate()` (L265; keydown currently Escape-only) | Low/Med |
| 6 | Onboarding `Enter`/`→`/`←` step nav (`next()`/`prev()` L35-36, zero key handling today) | Low |

Deferred (recon-confirmed not worth it now): `[`/`]` on 5 hand-rolled tab
pages (shared `Tabs.svelte` already has full ARIA arrow-nav; only brains/[id],
users, work, memberships, marketplace/[slug] roll their own — low traffic);
CRM/invoice/brain/entry prev-next (needs a shared ordered-id store — net-new
plumbing); ~70 element-local a11y `Enter`/`Space` activation handlers (correct
as-is, not layer candidates).

### 5.5 Deliberately out of scope
- Escape-to-close overlay unification → @zag-js/dialog refactor (separate initiative).
- WorkshopCanvas ⌘Z / FlowCanvas Shift-hold — canvas-custom, stays hand-rolled.
- Overriding native browser shortcuts (Mod+T/W/L etc.) — never.

## 6. Implementation plan

Executed by sonnet-5 subagents, **sequentially** in one worktree
(`.worktrees/hotkeys-expansion` off `origin/dev`) — sequential because all
three tasks add paraglide keys to `messages/en.json`/`es.json` and T2/T3
depend on T1's layer helpers. Each task commits atomically and leaves
`bun run check` green.

### T1 — DataTable grid keys + layer helpers (flagship)
Files: `src/lib/hotkeys/index.ts`, `src/lib/components/data-table/DataTable.svelte`.
- Layer: add `submitOnModEnter(fn)` (mirror of `submitOnEnter`, `'Mod+Enter'`).
- DataTable (all behavior only when `selectable`; keys element-scoped via
  attachment on the table wrapper with `tabindex="0"` — never global):
  - Ctrl/Cmd+click row → `toggleRow(id)` (skip `onRowClick`); Shift+click →
    range from last anchor over `viewIds`; plain click sets anchor.
  - Ctrl+A → select all `viewIds`; Escape → clear (enabled only
    `selectedIds.size > 0`); Del/Backspace → `bulkActions?.find(a=>a.danger)`
    via `runBulk` (no danger action ⇒ no-op — RBAC rule §4).
  - `/` → focus search input (add `bind:this` ref).
  - ArrowDown/ArrowUp (+ j/k) roving focus over `flatRows`, Enter →
    `onRowClick`, Space → `toggleRow`; `.dt-row.focused` visual;
    `scrollIntoView({block:'nearest'})`.
  - Bare keys are input-safe by lib default (inline-edit inputs unaffected).

### T2 — Shell: `?` cheat-sheet + `g`-nav chords
Files: new `src/lib/components/layout/ShortcutsOverlay.svelte` + small g-nav
module, mount both in `(app)/+layout.svelte`; add `meta` to existing
CommandPalette/FloatingAssistant registrations.
- `?` (Shift+/) opens overlay listing `getHotkeyRegistrations()` with
  `formatForDisplay`; Escape closes (gated `enabled: open`).
- `g` chord shim → second key routes via `palettePageRoutes()` +
  `BUILTIN_PLUGIN_ITEMS`, gated `canClient`/`canViewPath`; show a transient
  hint while the window is open.

### T3 — Scattered quick wins
Files: `CrmHygiene.svelte`, `PipelineSidebar.svelte`, `TaskPromptDialog.svelte`
(→ `submitOnModEnter`), `SessionsList.svelte` (`/` focus search),
`AgentCreateWizard.svelte` (Mod+Enter advance), `onboarding/+page.svelte`
(Enter/arrow steps), `stock/items/[id]/` (`[`/`]` prev-next via already-loaded
list).

### Ship
Merge worktree branch → `dev`, push, FF `dev:master` (Vercel deploys master),
browser-harness verification pass (§7), delete worktree.

## 7. Verification

- `bun run check` 0 err / 0 warn (strict SvelteKit build is the prod gate).
- browser-harness live probes on dev server: modifier-click selection, Ctrl+A scoping (table-focused vs page), Del no-op without danger action / without selection, `/` focus, `?` sheet.
- RBAC probe: viewer-role page (no danger bulkAction passed) → Del inert.

## 8. QA results (browser-harness, worktree dev server :5175, 2026-07-06)

Verified live: `?` sheet open + Escape close (renders globals + Tables & Lists
section); DataTable on /stock/items — Ctrl+click toggle (1), Shift+click range
(5), Escape clear (0), Ctrl+A (24/24), **Del no-op** with no danger bulkAction
(RBAC-safe path), `/` focuses search, j/k/arrows roving focus, Enter opens row
(/finances/invoices → detail); g-nav chords `g c`→/crm, `g f`→/finances with
armed hint pill; onboarding ArrowRight/ArrowLeft step nav; sessions `/` focus.

Implementation notes discovered during build/QA:
- The lib ships native `createHotkeySequence` (recon missed it) — g-nav uses
  it, zero hand-rolled chord code. `?` = RawHotkey `{key:'/', shift:true}`
  escape hatch (typed combos exclude shifted punctuation).
- Known limitation: with a DataTable focused, its element-scoped `J`/`K`
  stopPropagation before a g-armed second key — `g k` won't complete from
  inside a focused table. Accepted.
- `[`/`]` stock item prev-next could NOT be live-QA'd: stock **detail** pages
  500 on origin/dev against the shared dev PG — `stk_warehouses.is_default`
  is selected by the accruals workstream's code but its migration isn't
  applied to that DB. Pre-existing drift, unrelated to hotkeys; ⚠️ blocks
  prod (`dev:master`) until the accruals migration lands.
- browser-harness gotchas: `press_key()` delivery is flaky — `js()` dispatch
  of untrusted KeyboardEvents on `document` reliably drives both TanStack
  managers; multiple `js()` round-trips between chord keys blow the 1.5s
  sequence timeout (dispatch both keydowns in ONE `js()` call).
