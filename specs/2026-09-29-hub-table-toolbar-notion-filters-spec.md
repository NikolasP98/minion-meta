---
id: 2026-09-29-hub-table-toolbar-notion-filters-spec
title: Tables — Notion-style filters (basic + advanced rule tree), group-by picker, trailing add-column, table options menu; catalog "Show inactive" becomes an Active filter
stage: dev
status: implementing
pass: 2
next_slice: 4
created: 2026-09-29
updated: 2026-09-29
repos: [minion_hub]
tags: [ui, ux]
---

# Table toolbar + Notion-style filters

Owner request 2026-09-29 (screenshot of `/pos/catalog`, four numbered items + six
Notion screenshots):

1. The **Show inactive** toggle goes away. Inactive visibility is a normal filter
   applied to the **Active** column (default: only active rows).
2. Grouping is no longer a row of tabs. A **group icon button** opens the list of
   axes; once picked, the button becomes icon + selected label in an active
   style. Hovering it animates in a small **×**: × clears the grouping, any other
   part of the button reopens the picker.
3. **Add column** leaves the toolbar. The table's **always-last column** is an
   add-column affordance: its header cell holds the "+ Add column" button, its
   body cells are empty.
4. The **settings (⚙) button** stops opening the custom-property manager. It opens
   **table options**: how records open (page / modal with expand / tray with
   expand, for me / for everyone) and a link to the custom-property manager.
5. **Filters like Notion.** Basic filters are per-property chips whose operators
   depend on the column type; an **advanced filter** is a rule tree over any
   columns with And/Or groups, nesting, duplicate / wrap-in-group / turn-into-
   filter. Text: contains / does not contain / starts with / ends with / is /
   is not / is empty / is not empty. Number: = ≠ > ≥ < ≤ / between / empty.
   Date: is / before / after / on-or-before / on-or-after / between / relative
   (today, yesterday, tomorrow, this week, past week/month/year, next week/
   month) / empty. Select: is (any of) / is not / empty. Checkbox: checked /
   unchecked.

## 0. Product

The hub's shared `DataTable` gets Notion's data-source filtering and a cleaner
toolbar: one "+ Filter" entry point, per-property chips that open a rule editor,
an advanced rule tree for anything the chips can't say, a compact group-by
picker, an add-column cell at the end of the header row, and a table-options
menu where the record open mode lives. `/pos/catalog` is the first consumer:
its Show-inactive toggle becomes a default `Active is checked` chip.

**Out of scope:** persisting filters across reloads (no `storageKey` filter
state); server-mode (`server` prop) support for non-default operators or the
advanced tree — server tables keep the legacy operator per kind and hide "Add
advanced filter" (ledger §1); saved filter views; filtering custom-property
columns beyond what their existing `filter` config exposes.

## AS-IS (hub master `6a8c952d`)

- `src/lib/components/data-table/filters.ts` — `FilterValue` = `enum {values}` |
  `text {text}` | `number {min,max}` | `date {min,max}`; `matchesFilter` is
  fixed-operator (any-of / contains / inclusive range). `filterToParam` encodes
  for server mode (`crm/customers` binds `filters` and maps them to query params).
- `ColumnFilter.svelte` (358 lines) — the header popover per filterable column:
  enum checklist, text input, min/max inputs. Outside-pointerdown + Escape
  dismissal (no fixed backdrop — sticky `<thead>` is a containing block).
- `DataTable.svelte` 4366 lines. Toolbar (`.dt-toolbar`, line ~2429): search,
  counts, `toolbar` snippet, right cluster = `actions` snippet → **"+ Add
  column"** (`dt-custom-add`, `openCustomManager(null,true)`) → **⚙ Settings2**
  (`openCustomManager()`, tooltip "Manage custom columns") → export → columns
  menu (`Columns3`; contains **Open records in** SegmentedControls + column
  visibility/reorder) → add (+). Chip bar `.dt-chips` (line ~2660): one `Chip`
  per live column filter with × + caller `chips` snippet + Clear all; hidden when
  nothing is filtered. Header row: select th, expand th, columns (with
  `ColumnFilter` when `c.filter`), filler th when `!hasFill`, `dt-act` th when
  `rowActions`. Pipeline `view` (line ~1582): search → per-column
  `matchesFilter` → sort. `filters` is `$bindable` (seeded from `initialFilters`
  as enum values).
- `/pos/catalog/+page.svelte` — PageHeader actions: `Toggle` "Show inactive"
  (`?inactive=1` → `listSellables({includeInactive})`), `SegmentedControl` of
  axes (Flat/Type/Body area/Product used for the table; Type/Body area/Product
  used for the board), table|board view toggle. `active` column is
  `custom: true` (a Toggle cell), no `filter`.

## TO-BE

### Filter model (`filters.ts`)

```ts
export type TextOp = 'contains'|'not_contains'|'starts_with'|'ends_with'|'is'|'is_not'|'is_empty'|'is_not_empty';
export type NumberOp = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'between'|'is_empty'|'is_not_empty';
export type DateOp = 'is'|'before'|'after'|'on_or_before'|'on_or_after'|'between'|'relative'|'is_empty'|'is_not_empty';
export type RelativeDate = 'today'|'yesterday'|'tomorrow'|'this_week'|'past_week'|'past_month'|'past_year'|'next_week'|'next_month';
export type EnumOp = 'is'|'is_not'|'is_empty'|'is_not_empty';   // `is` = any of `values`
export type BooleanOp = 'checked'|'unchecked';

export type FilterValue =
  | { kind: 'enum'; op?: EnumOp; values: string[] }
  | { kind: 'text'; op?: TextOp; text: string }
  | { kind: 'number'; op?: NumberOp; min: number | null; max: number | null }
  | { kind: 'date'; op?: DateOp; min: string | null; max: string | null; rel?: RelativeDate }
  | { kind: 'boolean'; op: BooleanOp };

export interface FilterRule { id: string; key: string; value: FilterValue }
export interface FilterGroup { id: string; logic: 'and' | 'or'; items: Array<FilterRule | FilterGroup> }
```

- `op` absent ⇒ legacy behaviour (enum `is`, text `contains`, number/date
  `between`), so every existing `FilterValue` literal and `filterToParam`
  consumer keeps working unchanged. Single-operand number/date ops (`eq`, `gt`,
  `before`, `is`, …) read their operand from `min`.
- `isFilterActive`: `is_empty` / `is_not_empty` / `boolean` / date `relative`
  with a `rel` are active with no operand; the rest as today.
- `matchesFilter(value, raw, now = new Date())` implements every op. Empty =
  `null | undefined | ''` (and an empty array). Relative windows are computed
  in local time from `now`, both endpoints inclusive (governance range rule):
  `this_week` = Mon..Sun of `now`'s week; `past_week` = the 7 days ending today;
  `past_month` / `past_year` likewise; `next_week` / `next_month` = the days
  after today through +7 / +30.
- `matchesGroup(group, row, matchOf: (key) => ((row) => unknown) | null)`
  recursive; an unknown key or an inert value matches (never hides rows).
  `and` of zero items = true, `or` of zero items = true.
- `defaultOp(kind)`, `opsFor(kind)`, `opNeedsOperand(kind, op)`, `newId()`,
  `emptyGroup()`, `emptyRule(key, kind)` helpers. `filterToParam` unchanged for
  default ops; for a non-default op it emits `op:<payload>` (server consumers
  today only ever receive default ops because server tables hide the others).

### Components (all in `src/lib/components/data-table/`)

- `filter-ops.ts` — i18n labels: `opLabel(kind, op)`, `relLabel(rel)`,
  `kindIcon(kind)` (lucide: `Type` text, `Hash` number, `Calendar` date,
  `ListChecks`/`List` enum, `CheckSquare` boolean).
- `FilterRuleEditor.svelte` — props `{ kind, options?, value: FilterValue, onValue, optionIcon? }`.
  Row 1: op `Select` (themed). Row 2 (when `opNeedsOperand`): enum → search +
  checklist (reuse ColumnFilter's list markup); text → `Input`; number → one
  input, or two for `between`; date → `<input type="date">` ×1/×2, or a
  relative `Select` for `relative`; boolean → nothing (op is the value).
- `FilterChip.svelte` — Notion chip `Label: summary ⌄` (accent-tinted when
  active). Click opens a `Popover` containing the column label + the
  `FilterRuleEditor` + a "…" `Dropdown` with **Delete filter**. Keeps a
  hover-reveal × (same affordance as the group picker) that removes the rule.
- `FilterAddMenu.svelte` — trigger = toolbar icon Button (`ListFilter`, tooltip
  "Filter"). Popover: search `Input` (autofocus) + list of filterable columns
  (kind icon + label; click → `onPick(key)`), footer **Add advanced filter**
  (`onAdvanced()`; hidden in server mode).
- `AdvancedFilterBuilder.svelte` — props `{ group: FilterGroup, columns:
  FilterColumnMeta[], onChange, onDelete }`. Recursive: each row = `Where` /
  `And` / `Or` label (the SECOND row's label is a `Select` that sets the
  group's `logic`; later rows repeat it as text) + property `Select` + op
  `Select` + operand (from `FilterRuleEditor` with the op row hidden — export
  an `operandOnly` prop) + "…" `Dropdown` (Remove · Duplicate · Turn into group
  / Turn into filter · Wrap in group). Nested groups render in an indented
  bordered box. Footer: **+ Add filter rule ⌄** (`Dropdown`: Add rule · Add
  group) and **Delete filter** (trash, danger fg). Hosted by a chip
  `N rule(s) ⌄` (`ListFilter` icon) in the chip bar that opens a `Popover`.
- `GroupByPicker.svelte` — props `{ options: {value,label}[], value: string,
  onChange(value), noneLabel? }`. Value `''` = none. Idle: icon-only ghost
  Button (`Rows3`), tooltip "Group by". Active: icon + selected label, accent-
  tinted pill; a `×` (icon Button, `aria-label` "Clear grouping") that is
  `opacity:0; width:0` and transitions in (`--duration-fast`, `--ease-enter`)
  on hover / focus-within (always visible on touch: `@media (hover: none)`).
  Click on × → `onChange('')`; click anywhere else → `Dropdown` of options
  (checkmark on the current one, "No grouping" first when `noneLabel`).
  `ColumnFilter.svelte` → thin shell: keeps its trigger button, badge and
  outside-click/Escape dismissal; its panel body is `FilterRuleEditor` (op +
  operand). The header popover and the chip therefore edit the SAME rule.

### DataTable changes

- **Props**: `advanced = $bindable<FilterGroup | null>(null)`; `filterBar?:
  boolean` (default `true` when any visible column has `filter`, `false` in
  `plain` variant); `filters` unchanged.
- **Kind resolution** `filterKindOf(c)`: `c.filter.kind ?? (c.filter.options ?
  'enum' : c.type === 'boolean' ? 'boolean' : c.type === 'number' || c.numeric
  || c.money ? 'number' : c.type === 'date' ? 'date' : 'enum')`.
- **Enum options** for the builder/chips: `c.filter.options?.()` else distinct
  values from `data` through `c.filter.match ?? accessor` (cap 200, sorted).
- **Pipeline**: after the per-column loop, `if (advanced) list = list.filter(row
  => matchesGroup(advanced, row, matchOf))` where `matchOf(key)` resolves the
  column's `filter.match ?? accessor` (or `null`). `filterActive`,
  `filterSignature` and the "showing N of M" count include `advanced`.
- **Toolbar right cluster** (order): `actions` snippet → **group picker** (only
  when the caller passes `groupOptions` — NOT in this slice; the catalog hosts
  it in its own view-bar) → **Filter** icon (`FilterAddMenu`, when `filterBar`)
  → **⚙ table options** (when `canSwitchOpenMode || customBundle?.canManage`)
  → export → columns → add (+). The **"+ Add column" toolbar button is
  removed**.
- **Table options popover** (⚙, `Popover`): heading "Table options"; section
  "Open records in" = the two SegmentedControls moved out of the column menu
  (scope me/everyone, mode page/modal/tray) — remove them from the column
  menu; section "Properties": row **Custom properties…** (`Settings2`) →
  `openCustomManager()` (gated `canManage`). Tooltip text of ⚙ becomes
  "Table options".
- **Chip bar**: one `FilterChip` per live basic filter; one advanced chip
  when `advanced` has ≥1 rule; caller `chips`; Clear all (clears both). Picking
  a property in `FilterAddMenu` creates the rule with `defaultOp` and an inert
  operand (chip shows the label with "…" summary) and opens that chip's popover
  immediately; "Add advanced filter" creates `emptyGroup()` with one blank rule
  on the first filterable column and opens the builder.
- **Trailing add-column cell**: when `customEnabled && customBundle?.canManage`
  (and not `server`, matching today's gate) the header row ends with
  `<th class="dt-th dt-add-col">` after `dt-act`, holding a ghost `Button`
  (`Plus` + "Add column" text, tooltip) → `openCustomManager(null, true)`; a
  `<col>` of `ADD_COL_W = 44` in the colgroup; an empty `<td aria-hidden>` in
  every body row (including group header rows' `colspan` math and the footer
  row). It is NOT sticky — it scrolls with the last data column like Notion's.
- Column menu (`Columns3`) keeps only visibility + reorder.

### Catalog page

- Remove `Toggle` "Show inactive", `toggleShowInactive`, the `?inactive` param;
  `+page.server.ts` always `includeInactive: true`.
- `active` column gains `type: 'boolean'` and `filter: {}` (kind resolves to
  `boolean`; its `match` = `(s) => s.active`). Page state
  `let tableFilters = $state<Record<string, FilterValue>>({ active: { kind:
  'boolean', op: 'checked' } })` + `bind:filters={tableFilters}` → the table
  opens with an `Active: Checked` chip; removing it reveals inactive rows.
- `SegmentedControl` of axes → `GroupByPicker` (`noneLabel` = "Flat" for the
  table view; the board keeps Type/Body area/Product used with no none entry).

### Invariants

- Every existing `FilterValue` literal still type-checks and behaves as before
  (no `op` = legacy op). `crm/customers` server filters unchanged.
- Governance: semantic tokens only; `Button`/`Select`/`Popover`/`Dropdown`/
  `Input`/`Tooltip` primitives; no native `<select>`; every panel dismisses on
  outside-pointerdown + Escape (Zag wrappers do this); icon sizes from
  `iconSizes`; `bun run lint:design && bun run lint:tokens` non-increasing.
- i18n: `messages/en.json` + `es.json` append-only, `bun run i18n:compile`.
- Add-column cell is the LAST cell in header, body, group and footer rows; the
  row-actions column keeps its sticky behaviour.
- Relative date windows are inclusive of both endpoints and computed in local
  time from an injectable `now` (tests pin it).

## DELTA — two parallel slices + one wiring slice

### Slice 1 — (stage 1A) filter core + editors (no `DataTable.svelte` edits)

**Topics:** ui, ux
Branch `feat/table-filters-core`. `filters.ts` (model, ops, `matchesFilter`,
`matchesGroup`, helpers) + `filters.test.ts` (every op × kind, empties, relative
windows with pinned `now`, nested and/or groups, unknown key inert);
`filter-ops.ts`; `FilterRuleEditor.svelte`; `FilterChip.svelte`;
`FilterAddMenu.svelte`; `AdvancedFilterBuilder.svelte` (+ a vitest that renders
a two-rule group, duplicates a rule, wraps one in a group, turns it back, and
switches logic); `ColumnFilter.svelte` rehosted on `FilterRuleEditor`; i18n keys.

### Slice 2 — (stage 1B) toolbar + header + catalog (edits `DataTable.svelte`)

**Topics:** ui, ux
Branch `feat/table-toolbar`. `GroupByPicker.svelte` (+ test: idle icon-only,
active label, × clears, body click opens options); trailing add-column cell
(+ test: it is the last `th`/`td`, colspans intact, absent without
`canManage`); ⚙ → table options popover with Open-in moved out of the column
menu (+ test); toolbar "+ Add column" removed; catalog: toggle removed,
`includeInactive` always, `GroupByPicker` in the view-bar; i18n keys.

### Slice 3 — wiring (after 1A + 1B merge into `feat/table-toolbar-filters`)

**Topics:** ui, ux
`DataTable.svelte`: `advanced` prop, `filterKindOf`/enum-options/`matchOf`,
pipeline, toolbar Filter icon (`FilterAddMenu`), chip bar with `FilterChip` +
advanced chip + builder popover, Clear all; catalog `active` boolean default
filter; `DataTable.test.ts` cases (add a property → chip + popover; advanced
group narrows rows; Clear all resets both; boolean default chip on a fixture);
Playwright `tests/e2e/ui-audit/table-filters.spec.ts` on `/pos/catalog` (default
`Active` chip present; removing it shows an inactive seeded sellable — seed one
via `scripts/qa/seed/pos.ts` if none exists; "+ Filter" → pick "Stock" → `>`
`100` narrows rows; group picker shows "Type" and its × clears).

### Slice 4 — polish (owner feedback 2026-09-29 on the shipped slice)

**Topics:** ui, ux

Hub branch `feat/table-polish-round2` (merges `fix/chips-stacking`,
`fix/table-toolbar-polish`, `feat/catalog-editor-autosave`): one chip contract
app-wide (`.chip`/`.chip-x` in `app.css`); nested floating panels stack above
their host (`portalInLayer` writes the layer on the CONTENT); table options are
per-user with an org "Apply to everyone" kebab gated on `settings:manage`;
toolbar = Export → [Filter · Group by (`Layers`) · Columns · ⚙] segment → +,
one icon-button recipe; `groupOptions` prop hosts `GroupByPicker` (ledger §3
closed); header context menu with Aggregate ▸ / Filter ▸ flyouts; column and
context menus dismiss via document listeners (the pointer-cursor backdrop is
gone); row click no longer opens a record and the `.dt-open` arrow is
right-aligned on an opaque surface; the catalog editor autosaves on blur with a
title-bar `SaveIndicator`, flat sections, no back button inside a peek and an
inline-editable name heading.

## Verification

- `bun run check`, `bun run test src/lib/components/data-table`, `bun run
  lint:design` (`DESIGN_LINT_BASE_REF=origin/master`) `&& bun run lint:tokens`,
  `bun run i18n:compile`, prettier `--plugin prettier-plugin-svelte`.
- QA stack (`bun run qa:up --ttl`, `qa:seed`) + Playwright spec above with
  `E2E_BASE_URL` / owner persona.
- Merge guard: `gh pr view N --json statusCheckRollup` all SUCCESS/SKIPPED.

## Ledger (open ends → `proposals/2026-09-29-hub-table-filters-followups.md`)

1. Server-mode tables (`server` prop) expose only the default operator per kind
   and no advanced tree; `filterToParam`'s `op:` prefix has no server parser yet.
2. Filter state is not persisted (no `storageKey` participation) — Notion keeps
   filters per view.
3. `GroupByPicker` is hosted by the catalog page only; a `groupOptions` prop on
   `DataTable` is the obvious next step once a second table needs it.
