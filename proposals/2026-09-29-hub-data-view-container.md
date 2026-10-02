---
id: 2026-09-29-hub-data-view-container
title: Data view container — one configurable host for table / board / calendar / chart / map views with shared filters, groups and advanced filters
status: draft
created: 2026-09-29
repos: [minion_hub]
tags: [ui, ux]
---

# Data view container (`DataView`)

Owner ask 2026-09-29: visualize a dataset as table / chart / board / calendar /
map like Notion; make the available views a **per-instance, per-page
configuration** (a product-detail table stays strictly a table); and let the new
component own the filter / group / advanced-filter configuration that the
in-flight spec `2026-09-29-hub-table-toolbar-notion-filters-spec.md` is adding to
`DataTable`.

Everything below is measured against hub master `6a8c952d`.

---

## 1. AS-IS inventory

### 1.1 `DataTable` — 46 instances in 34 files

`src/lib/components/data-table/DataTable.svelte` — **4366 lines, 79 typed props**.
Pipeline `view` at `:1582` (search → per-column `matchesFilter` → multi-sort;
`if (server) return data`). Group headers at `:1699` via `groupRows(view, groupBy)`.
Toolbar at `:2429`, chip bar at `:2660`.

Prop usage across the 46 instances:

| Prop | Count | Notes |
|---|---|---|
| `variant="plain"` | **24** | embedded, chrome-less tables inside cards/drawers — **these must never gain a view switcher** |
| `storageKey` | 17 | localStorage `dt:<key>`, layout only (`hidden`/`order`/`widths`/`wrap`/`aggregates`, `:1125–1161`) — **never filters, never grouping** |
| `tableId` | 9 | anchors the org config (`app_table_config`) + open-mode; 8 defs in `src/lib/tables/defs/index.ts` (`stock.items`, `stock.entries`, `pos.catalog`, `crm.customers`, `finances.invoices`, `finances.purchases`, `socials.campaigns`, `team.people`) — `pos.tickets` at `pos/tickets/[id]/+page.svelte:250` is **unregistered** |
| `rowActions` | 9 | |
| `groupBy` | **3** | `pos/catalog:549`, `pos/sell:1188`, `finances/purchases:268` |
| `bind:filters` + `server` | **1** | `crm/customers:851` / `:832` — the only server-mode table |
| `chrome` | 3 | `pos/sell` passes `chrome={false}` and re-implements search itself |

Columns declaring `filter:` exist in **11 files** (~20 columns):
`crm/customers` (7), `pos/catalog:277,302`, `stock/items:161`, `stock/entries:128,142`,
`finances/invoices:76`, `brains/agents:51`, `socials/posts:47,48`, `settings/tables:95`,
`team/PeopleView:234`, `team/TeamSettingsView:126`, `team/TimeOffView:116`.

State ownership: `filters` / `search` / `sort` / `expanded` / `selectedIds` are
`$bindable` on `DataTable` and live **inside the component** unless the page binds
them. Only `crm/customers` mirrors them to the URL, through
`src/lib/components/data-table/kit/url-state.svelte.ts` (238 lines,
`createTableUrlState`, params `q` / `sort` / `f.<col>` / `page` / `x`). That kit's own
header names **seven** pages that hand-roll the same three moves; **one** adopted it.

### 1.2 Boards / galleries — 2 view-switchable surfaces, both in `/pos`

- **`/pos/catalog` — table | board.** `src/routes/(app)/pos/catalog/+page.svelte`
  (853 lines). View state is **localStorage only**, three keys, with a local
  `stored()` whitelist reader: `:137` `VIEW_KEY='pos-catalog-view'`,
  `:138` `BOARD_AXIS_KEY`, `:143` `TABLE_AXIS_KEY`, `:146` `stored()`, `:153/161/163`
  the `$state`s, `:164/167/170` three `$effect`s that write back. Switcher markup
  `:409–443` (a `SegmentedControl` whose `value`/`items` swap by view, plus a
  hand-rolled 2-button `.view-toggle`). Board markup `:481–516`, board CSS
  `:709–815` (107 lines).
  **The board is fed the raw set.** `:47` `let sellables = $state(data.sellables)`;
  `:190` `groupRows(sellables, catalogGroupSpec(boardAxis))`; the table at `:518`
  gets `data={sellables}` and filters *internally*. So search and every column
  filter apply in table view and are silently dropped in board view.
  Show-inactive is a **URL param** (`:129–135` `goto('?inactive=1')`,
  `+page.server.ts:34`) — so this one page splits data filters into the URL and
  view/grouping into localStorage.
- **`/pos/sell` — gallery | table.** `src/routes/(app)/pos/sell/+page.svelte`
  (1745 lines). This is the **correct** hand-rolled version: `:190` `filtered`
  (its own `search` `$state` at `:151` + category), `:234` `groupSpec`, `:237`
  `galleryGroups = groupRows(filtered, groupSpec)`, and the same `groupSpec` handed
  to `DataTable groupBy` at `:1188`. One pipeline, two renderers, by hand.
  Persistence: localStorage, keys `pos-sell-view` (`:155`) and `pos-sell-group`
  (`:166`), with a **second copy** of `stored()` at `:168`. Switcher `:1086–1111`.
- Non-switchable boards: `sessions/SessionKanban.svelte` (141) — four hard-coded
  status columns, buckets by hand at `:38–40` (bypasses `groupRows`), collapse
  state in localStorage `'kanban-collapsed'` (`:18–26`); `tasks/KanbanCol.svelte`
  (67) + `TaskCard.svelte` (44). No CRM pipeline/deals board exists
  (`CrmFunnel.svelte` is a progress ladder).
- Hand-rolled vertical grouped lists (board candidates):
  `workforce/issues/+page.svelte:46–57` (status buckets, filter from the URL),
  `workforce/inbox/+page.svelte:54–68` (day buckets),
  `home/+page.svelte:264–290` (day dividers over `calendarItems` `$state` `:84`).

### 1.3 Calendars — 3 surfaces, 2 renderers

- `src/lib/components/scheduling/BookingCalendar.svelte` — **4236 lines**.
  `interface Props` `:212–360` already carries the exact contract this proposal
  would otherwise invent: `features?: Partial<CalendarFeatures>` (`:316`),
  geometry (`:319–326` `startHour`/`endHour`/`pxPerHour`/`snapMin`/`monthRowRem`/
  `headHeightPx`/`gutterPx`), tone + colour vocabulary (`:329–334`), field
  catalogs (`:337–338`), snippets (`:340–350` `block`/`hoverCard`/`visitCard`/
  `toolbarStart`/`kebabItems`/`empty`). `src/lib/components/scheduling/calendar-features.ts`
  (60 lines) is the **allow-list precedent**: `CALENDAR_FEATURE_DEFAULTS` at `:13`
  (13 flags, only `agenda` default-off) + `resolveFeatures()` at `:52`.
- Kit under `scheduling/kit/`: `window-cache.svelte.ts` (139),
  `calendar-prefs.svelte.ts` (110, localStorage `hub-<ns>-calendar-*`),
  `settled-day.svelte.ts` (54), `booking-mover.ts` (92), plus pure helpers
  (`calendar-window.ts` 224, `booking-groups.ts` 108, `lanes.ts`, `fan-out.ts`, …).
  There is **no `lib/components/calendar*` directory**; `scheduling/calendar/`
  holds only `types.ts` (27) and `ec-skin.css` (62).
- `/scheduling/calendar` — **migrated off `@event-calendar/core`** (header `:2–14`,
  spec 2026-09-27 S3). State: `view`+`date` in the **URL** (`+page.server.ts:43–45`
  `parseCalendarView`/`parseCalendarDate`; `navigate():227–233`), scroll-settled day
  via `replaceState` (`:195`), `staff` (`:151`) / `kindId` (`:153`) seeded from the
  URL then local, `tagFilter` pure local `$state` (`:168`), colour sources /
  `weekDays` / `split` in **localStorage** via `createCalendarPrefs('scheduling')`
  (`:251`), `showInheritedTags` a **server user preference** (`:126`, PUT
  `/api/me/preferences/calendar` `:136`).
- `/pos/appointments` — same shape minus staff/kind (`tagFilter:155`,
  `settled:179`, `navigate:210`, `createCalendarPrefs('pos'):247`, tray state in
  localStorage `:251–260`). The two pages duplicate ~80 lines of identical glue.
- `/team?tab=timeoff` — `team/TimeOffCalendar.svelte` (240) is the **last
  `@event-calendar/core` consumer** (`:9`, keeping the dep at `package.json:18`),
  with its own 3-value `CalendarView` (`:2`) and its own toolbar `:131–146`; view is
  plain `$state` seeded from the viewport in `TimeOffView.svelte:76`, and **the date
  lives inside the vendor instance, so a reload resets it**.

### 1.4 Charts — 6 route surfaces, ~26 ECharts instances, zero row→option mapping

`src/lib/components/charts/Chart.svelte` (446) wraps ECharts 6 and takes **a raw
`EChartsOption`** — props `:12–44`: `options`, `class`, `style`, `height`,
`onItemClick`, `onLegendToggle`, `notMergeUpdate`, `ariaLabel`,
`tableCategoryLabel`. It has no concept of rows, columns or fields. Every chart
in the hub hand-builds its option object.

| Surface | Charts | Filter / range / group state, and where it lives |
|---|---|---|
| `finances/+page.svelte` | 4 (`:409`,`:415`,`:431`,`:436`) | `fromDate:38`,`toDate:40`,`bucket:42`,`mode:44`,`prodMode:45`,`hiddenBands:52`,`netHidden:55` — local `$state` mirrored to the URL by `navigate():62–73`; `DateRangeControls storageKey="finances"` `:364`; `EditableGrid id="finances-dashboard-v2"` `:471` |
| `reliability/+page.svelte` (2055) | 3 direct (`:1809`,`:1845`,`:1863`) + ~13 in panels | **localStorage blob** `FILTER_STORAGE_KEY:68`, `loadFilters:88`, `saveFilters:98`, `persistFilters:112`; `selectedCategories:218`, `selectedSeverities:219`, `selectedFailureModes:222`, `scopeMode:224`, `activeTab:235`. Date range in a **module store**: `src/lib/state/reliability/reliability.svelte.ts:158–161`. Not in the URL at all |
| `socials/+page.svelte` | 2 (`:136`,`:141`) | `fromDate:21`,`toDate:23` → URL via `navigate():25`; `DateRangeControls` `:191`; `EditableGrid` `:189` |
| `socials/campaigns/[campaignId]` | 1 (`:251`) | none — range comes only from `?from&to` server-side |
| `stock/+page.svelte` | 2 (`:157`,`:169`) | **none** — window is the server constant `SERIES_DAYS = 90` (`+page.server.ts:14`); `EditableGrid` `:249` |
| `crm/insights/+page.svelte` | 1 ECharts (via `CrmSentimentTrend.svelte:100`) + 1 d3-cloud (`:264`) | URL params only (`setParam:28`) |
| `crm/+page.svelte` (837) | 0 ECharts — hand-rolled CSS bars `:258–319` | URL only (`onRangeChange:200`); `DateRangeControls` `:477`; `EditableGrid` `:500` |

Plus in-component charts (`AgentMemoryPanel:328`, `GatewayHealthPanel:257`,
`LatencyPanel:133`, `PerformanceMonitorPanel:295`, `ActivityLogTable:427,429`,
`AgentActivityPanel:544,564`, `AgentLlmAnalytics:556…616`), and four separate
sparkline implementations (`charts/Sparkline.svelte` is **dead code**;
`components/Sparkline.svelte` is live; `EChartsSparkline`; `KpiSparkline`).

Already-shared dashboard chrome: `dashboard/DateRangeControls.svelte` (365,
controlled, 4 consumers) + `dashboard/date-range/` SDK + `EditableGrid.svelte`
(373, localStorage `dash:layout:<id>`) + `GET/PUT /api/dashboard-layouts/[id]`
(org default, admin-only PUT).

### 1.5 Maps / timeline / other

- **Maps: nothing, and nothing to map.** No `leaflet` / `mapbox` / `maplibre` /
  `google.maps` in `package.json` or `src/`, no PostGIS. `crm_contacts`
  (`src/server/db/pg-crm-schema.ts:40–77`) is `id, org_id, human_id,
  display_name, profile_id, owner_id, party_id, lifecycle_override, source,
  custom_fields, deleted_at, created_at, updated_at` — **no address, city,
  district, postal code, lat or lng**; `parties`
  (`src/server/db/pg-party-schema.ts:25–62`) has `doc_type`/`doc_number` and no
  address either. Custom-property types are `text|number|date|select|
  multi_select|formula` — no address/geo type. The only `country` column is a
  holiday-source discriminator (`pg-hr-schema.ts:76`).
- Timelines exist, none generic: `JourneyTimeline` (200), `DocTimeline` (144, 4
  consumers), `SubagentTimeline` (111), `team/RosterTimelineHeader/Row` (180 — a
  real Gantt-ish day grid with its own shared scroll owner
  `team/timeline.svelte.ts` and `?person` URL param, `PeopleView:471,484`). A
  Gantt **API** exists with no renderer (`api/projects/[id]/gantt/+server.ts`,
  `projects.service.ts:717`). Graphs: `overview/OverviewGraph.svelte` (516,
  d3-force + PixiJS), `reliability/architecture/ArchitectureGraph.svelte` (1214).
  Gallery: `artifacts/ArtifactGallery.svelte` (110), one consumer.

### 1.6 Persistence mechanisms in play — four, for the same class of state

1. Ad-hoc `localStorage`: `dt:<storageKey>` (layout), `pos-catalog-view` /
   `-board-axis` / `-table-axis`, `pos-sell-view` / `-group`,
   `minion-hub-reliability-filters`, `hub-<ns>-calendar-*`, `dash:layout:<id>`,
   `dash-range-cfg:<key>`, `kanban-collapsed`.
2. URL search params, hand-built per page (`goto`/`replaceState`) — except
   `crm/customers`, the only user of the kit.
3. Per-user server preferences: `api/me/preferences/[section]/+server.ts`,
   `VALID_SECTIONS:8` — 11 sections with per-section validators, incl.
   `tableOpenIn` (`isValidTableOpenIn:43`), `recordOverview` (`:29`), `calendar`.
4. Per-org config: `app_table_config` (`server/db/pg-schema/table-config.ts:9`),
   `TableEntryConfig { idPrefix, fields, openIn }` (`lib/tables/registry.ts:45–51`),
   edited on `/settings/tables`; plus `/api/dashboard-layouts/[id]`
   (org default, `requireAdmin` on PUT).

Precedence is already solved once, for open-mode:
`resolveOpenMode(explicit, userPref, orgCfg)` → `'page'` (`lib/records/peek.svelte.ts:40–47,63`).

---

## 2. Duplication found (concrete)

1. **Two hand-rolled view switchers, already diverged.**
   `pos/catalog:418–443` and `pos/sell:1086–1111` are the same
   `.view-toggle` + `.vt-btn[.on]` markup; their scoped CSS has drifted —
   catalog uses `--color-surface-2` and `--space-1`, sell uses `--color-bg3`
   (a compat alias) and `--space-1, 4px`, and only sell sets
   `height: var(--control-height-sm)`. Governance says a repeated control is a
   primitive; there is no `ViewSwitcher`.
2. **Two copies of the same `stored()` localStorage whitelist reader**
   (`pos/catalog:146`, `pos/sell:168`) plus a third idiom in
   `SessionKanban:18–26` — while `createCalendarPrefs`
   (`scheduling/kit/calendar-prefs.svelte.ts:30`) is the one that got extracted.
3. **The catalog board silently ignores the table's filters** (§1.2). This becomes
   a visible regression the moment the in-flight filters spec lands: the table
   will open with a default `Active is checked` chip while the board keeps
   rendering inactive rows from `sellables`.
4. **Two axis states for one dataset.** `pos/catalog` keeps `boardAxis` and
   `tableAxis` separately (`:161`, `:163`), with two option lists (`axisItems`,
   `tableAxisItems` `:196–200`) and a `SegmentedControl` whose `value`/`items`
   swap by view — because the axis is stored per view instead of per dataset.
5. **Search implemented three ways**: inside `DataTable` (`rowText:1414`),
   re-implemented in `pos/sell:190` because it passes `chrome={false}`, and
   re-implemented again per chart page as a date/category filter set.
6. **"Show inactive" is a bespoke server round-trip** (`pos/catalog:129–135` +
   `+page.server.ts:34`) for what the filters spec makes a normal boolean filter.
7. **Four filter-state conventions across the chart pages** (URL via manual
   `goto`; localStorage blob + module store in `reliability`; nothing in `stock`
   and `socials/campaigns/[id]`), and every chart drill-down
   (`AgentLlmAnalytics:141` cross-filters, `ActivityLogTable:62`,
   finances `mode`/`prodMode`/`hiddenBands`) is ephemeral and unshareable.
8. **The URL kit is written and unused**: `data-table/kit/url-state.svelte.ts`
   names seven candidate pages; one adopted it. Its own missing
   `FilterValue ⇄ TableFilterValue` bridge is flagged at
   `crm/customers/+page.svelte:183–186` and in
   `proposals/2026-09-28-hub-table-standardization-followups.md` §1.
9. **Two calendar renderers** and two `CalendarView` types
   (`calendar-window.ts:15` vs `TimeOffCalendar.svelte:2`); the two
   `BookingCalendar` pages duplicate ~80 lines of window-cache / settled-day /
   navigate / prefs / mover glue. (Out of this proposal's scope, but the same
   pattern: a shared kit exists, the call-site glue was never shared.)

---

## 3. TO-BE — the `DataView` container

Not a rewrite of `DataTable`. A thin host that owns the *dataset-level* state the
in-flight filters spec is already making standalone, picks a renderer, and hands
every renderer the **same** rows.

### 3.1 Prerequisite: lift the pipeline out of `DataTable`

`DataTable.svelte:1582`'s `view` derived depends only on `data`, `columns`,
`search`, `searchFields`, `filters`, `sort`, and two pure helpers —
`acc` (`:803`) and `rowText` (`:1414`), plus `defaultCmp` (`:1570`). It is
extractable verbatim into `data-table/pipeline.ts`:

```ts
export function applyView<T>(input: {
  rows: readonly T[]; columns: DataColumn<T>[];
  search: string; searchFields?: (row: T) => string;
  filters: Record<string, FilterValue>; advanced?: FilterGroup | null;
  sort: SortSpec[]; now?: Date;
}): T[];   // search → per-column matchesFilter → matchesGroup(advanced) → multi-sort
```

`DataTable`'s derived becomes `server ? data : applyView({…})`. ~60 lines move;
the block becomes unit-testable without mounting a 4366-line component.
**Sequencing:** this touches the exact block the filters spec's Stage 2 rewrites,
so it must land *after* that merges — parallel PRs on one hot block produce
semantic clashes, not textual ones.

### 3.2 Contract sketch

```svelte
<DataView
  {data} {columns}                       {/* same DataColumn<T>[] as DataTable */}
  getRowId={(r) => r.id}
  tableId="pos.catalog"                  {/* anchors org config + per-user prefs */}
  views={['table', 'board']}             {/* allow-list; 1 entry ⇒ no switcher rendered */}
  bind:current                           {/* 'table' | 'board' | … */}
  bind:search bind:filters bind:advanced bind:sort
  bind:groupValue                        {/* '' = none; the axis is per DATASET, not per view */}
  groupOptions={[{ value: 'category', label: … }, …]}
  groupSpecOf={(value) => catalogGroupSpec(value)}
  board={{ card: cardSnippet, collapsible: true }}
  gallery={{ card: cardSnippet, columns: 'auto' }}
  table={{ /* every DataTable prop it doesn't own, spread through */ }}
>
  {#snippet toolbarExtra()}…{/snippet}
</DataView>
```

- **`views` follows `calendar-features.ts` exactly** — a `DATA_VIEW_DEFAULTS`
  record + `resolveViews(partial)`, not a new invention. Code sets the ceiling;
  the org may narrow it (`app_table_config[tableId].views`); the user picks within
  what's left. `views.length === 1` ⇒ no switcher, no extra chrome, no behaviour
  change. **That is the literal answer to the product-detail case**: those 24
  `variant="plain"` instances are either `views={['table']}` or, better, left as
  bare `<DataTable>` and never touched.
- **One pipeline.** The container computes `rows = applyView({…})` once and passes
  it to whichever renderer is current — `<DataTable data={rows} …>` for `table`,
  `groupRows(rows, groupSpecOf(groupValue))` for `board`/`gallery`. This is
  exactly what `/pos/sell` already does by hand and what `/pos/catalog` fails to do.
- **Chrome.** In `table` view the container renders nothing extra; `DataTable`
  keeps its own toolbar and the switcher goes into the existing `actions`
  snippet slot (`:2429` cluster). In every other view the container renders a thin
  bar: search `Input` + `FilterAddMenu` + `FilterChip` row + `GroupByPicker` +
  switcher — all four are standalone components that the filters spec's Stage 1A
  is already building outside `DataTable.svelte`. No toolbar is hoisted, nothing
  is forked.
- **Persistence**, reusing the two mechanisms that exist:
  - per-user: a new `tableViews` section in
    `src/routes/api/me/preferences/[section]/+server.ts` (`VALID_SECTIONS:8` +
    an `isValidTableViews` validator next to `isValidTableOpenIn:43`), shape
    `{ [tableId]: { view?: DataViewKind; group?: string } }`, capped like the
    others (200 ids, 40-char ids). ~25 lines.
  - per-org default + allow-list narrowing: `views?: DataViewKind[]` and
    `defaultView?: DataViewKind` on `TableEntryConfig`
    (`src/lib/tables/registry.ts:45`), surfaced on `/settings/tables` next to
    `openIn` (`/settings/tables/+page.svelte:115`).
  - precedence: reuse the `resolveOpenMode` shape —
    `explicit prop > user pref > org config > first allowed view`.
  - **Filters stay unpersisted** in this proposal (that is the filters spec's own
    ledger item 2, and Notion persists them *per saved view* — which is a
    different, later feature).
  This deletes `pos-catalog-view`, `pos-catalog-board-axis`,
  `pos-catalog-table-axis`, `pos-sell-view`, `pos-sell-group` and both `stored()`
  copies.

### 3.3 Which Notion view types are worth building

| View | Verdict | Why |
|---|---|---|
| **table** | **now** — it is `DataTable`, unchanged | 46 instances |
| **board** | **now** | `/pos/catalog` has one; `groupRows` already backs it; fixes the filter-bypass bug |
| **gallery** | **now** (same renderer as board, one axis = none) | `/pos/sell` has one; ~30 extra lines over board |
| **calendar** | **later, and probably never as a `DataView`** | `BookingCalendar` (4236 lines) already has a *richer* config contract than this proposal (`:310–359`), its own kit, its own per-user prefs and a domain row type (`CalendarBooking` with start/end/resource/status). Wrapping it buys a switcher and costs a second contract. The real calendar work is retiring `TimeOffCalendar` + `@event-calendar/core`, which is orthogonal |
| **chart** | **later, only on explicit request** | `Chart.svelte` takes a raw `EChartsOption` and nothing else. A chart view needs a net-new `rowsToOption({x, y, series, kind})` mapper, and **none of the ~26 existing charts wants to be driven by a table's rows** — they are hand-tuned option objects over server aggregates, already hosted by `EditableGrid` + `DateRangeControls` + `/api/dashboard-layouts`. A `DataView` chart would be a second, competing dashboard system |
| **map** | **never, until the schema changes** | Zero geo columns anywhere (§1.5), no geocoding path, no map dependency. A map is a migration + a geocoding service + a renderer, not a view |
| **timeline / Gantt** | **not now** | Four bespoke timelines exist, none generic; the Gantt API has no renderer and no one asked |

---

## 3.5 Shipped 2026-10-02 — S1 landed on the CALENDAR pages first (hub PR #428)

Owner (2026-10-02): "I want calendars to have a view switcher as well … to
switch between cals, tables, cards, etc." — picked "calendar pages first".
The §3.3 "calendar: probably never as a DataView" verdict is superseded in
one specific sense: `BookingCalendar` is NOT wrapped; it is one of the
renderers a `DataView` host switches between.

- `src/lib/components/data-view/`: `data-view.ts` (`DATA_VIEW_KINDS`,
  `parseDataView`), `DataView.svelte` (the host: `views` per page, `value`,
  `onchange`, hands the `switcher` snippet back so each renderer places it in
  its own toolbar), `BoardView.svelte` (generic kanban: explicit columns +
  trailing unclassified, card snippet, native drag between columns via
  `onmove`). `SegmentedControl` gained `icon` + `iconOnly`.
- Calendar pages: `?view=` now also takes `table` | `board`
  (`parseCalendarPageView` / `calendarViewOf` keep the week data window);
  `BookingTable` (DataTable on `scheduling.bookings`, custom columns live) and
  `BookingBoard` (axis = status | staff | any custom select column; a drop
  writes status via the mover, staff via `onmove`, a custom column via the
  shared `createBookingCustomValues` store). Switcher sits at the start of the
  calendar toolbar; table/board get a bar with it + the tag filter.
- NOT done here: S0 pipeline extraction, `/pos/catalog` + `/pos/sell`
  migration (they keep their bespoke `.view-toggle`), S2 persistence (view
  lives in the URL only; the board axis is a per-viewer pref), gallery.

## 4. Verdict

**Yes for table + board + gallery; no for chart, calendar and map.**

It simplifies development and maintainability *narrowly and provably*: today
exactly two pages switch views, they hand-roll the same switcher with CSS that has
already drifted, they keep two copies of the same localStorage reader, they store
the group axis twice, and one of them silently drops the table's filters — a bug
that the in-flight filters spec is about to make visible. A container that owns
`search`/`filters`/`advanced`/`groupValue`/`sort` once and feeds one
`applyView(rows)` to every renderer removes all five. It does **not** simplify
anything for the other 44 `DataTable` instances, and it would actively complicate
charts and calendars, both of which already have better-fitting hosts.

**LOC.** Removed: `/pos/catalog` ≈ 240 (view/axis state `:137–172`, switcher
`:409–443`, board markup `:481–516`, board CSS `:709–815`) minus the ~50 lines of
card snippet that survive as a snippet; `/pos/sell` ≈ 150 (view/axis state
`:155–176`, switcher `:1086–1111`, gallery markup + CSS) — and its bespoke
`search`/`filtered` at `:151,190` folds into the container. Added: `DataView.svelte`
≈ 200, `BoardView.svelte` ≈ 140 (markup + CSS, one renderer for board *and*
gallery), `data-view.ts` (defaults + `resolveViews` + precedence) ≈ 60,
`pipeline.ts` ≈ 60 **moved** (net zero), preferences validator ≈ 25, registry
fields ≈ 15. Net ≈ **+50 lines**, against −2 divergent switchers, −2 `stored()`
copies, −5 localStorage keys, −1 duplicated axis state, −1 real bug.
This is a consolidation, not a size win; anyone selling it as a LOC reduction is
selling the chart/calendar/map views too.

**Pages that drop bespoke state:** 2 (`/pos/catalog`, `/pos/sell`). Candidates
that could adopt later without new view types: `workforce/issues` (already
status-bucketed by hand, filter in the URL) and `SessionKanban`.

**Risk.**
- `DataTable.svelte` is 4366 lines / 79 props. The container must **not** add a
  prop to it; if `views` ends up inside `DataTable` the proposal has failed.
- The pipeline extraction touches the same derived block as the filters spec's
  Stage 2 → strict sequencing, not parallel branches.
- `variant="plain"` (24 instances) and the `server` mode (1) must be explicitly
  out of scope. `server` tables cannot participate: the container's `applyView`
  would double-filter an already-scoped server page (the guard at `:1583`).
- Keyed shells: the container must not remount `DataTable` when the view flips
  away and back, or column widths / open groups / selection reset. Keep both
  renderers in one `{#if}` with stable keys and rely on the shared bound state.
- `pos/catalog`'s `sellables` is mutable `$state` (`:47`, mutated at `:73,87,101,116`
  for optimistic edits) — the container must pass rows through, never copy them
  into its own state.

**Recommendation:** do S0+S1, adopt on the two pages that already switch views,
then stop and re-evaluate against real requests. Do not build chart, calendar,
map or timeline views speculatively.

### Slice plan

| Slice | Content | Effort |
|---|---|---|
| **S0** | Extract `applyView()` into `data-table/pipeline.ts` + unit tests; `DataTable`'s `view` derived becomes a call. **Lands after the filters spec Stage 2 merges.** | 0.5 day |
| **S1** | `DataView.svelte` + `BoardView.svelte` (board + gallery) + `data-view.ts` (`DATA_VIEW_DEFAULTS` / `resolveViews`) + `ViewSwitcher` primitive (replacing both `.view-toggle` copies); migrate `/pos/catalog` and `/pos/sell`; reuse `FilterAddMenu` / `FilterChip` / `GroupByPicker` from the filters spec; Playwright: board honours the table's `Active` chip and its search | 2–3 days |
| **S2** | Persistence: `tableViews` preferences section + `views`/`defaultView` on `TableEntryConfig` + `/settings/tables` row; delete the 5 localStorage keys and both `stored()` copies | 1 day |
| **S3** | *Only on explicit request.* Chart view: `rowsToOption({x,y,series,kind})` over `Chart.svelte`, wired on exactly one table. Do **not** retrofit the 6 existing chart surfaces | 2–3 days |
| **—** | Calendar view, map view, timeline view: not planned (§3.3) | — |

---

## 5. Open questions for the owner

1. Is a **board over an existing table with no board today** (e.g. `crm/customers`
   grouped by stage, `workforce/issues` by status) something you actually want, or
   is the goal only to make the two `/pos` switchers consistent? The answer decides
   whether S1 is a cleanup or a feature.
2. When someone switches `/pos/catalog` to board view, should their **search and
   filters carry over** (the fix this proposal assumes), or is board view
   deliberately "show me everything"?
3. Should the chosen view be **remembered per user** (a preference, as proposed),
   **pinned per organization** by an admin on `/settings/tables` like `openIn`, or
   **shareable in the URL**? Only the first two are in S2.
4. Notion's chart view charts *the view's own rows*. Your existing dashboards chart
   *server aggregates*. Do you want a table-driven chart view at all, or are the
   `/finances`, `/crm`, `/socials`, `/reliability`, `/stock` dashboards already the
   chart story?
5. A map needs an address on the customer record — there is none anywhere in the
   schema today. Do you want customer addresses captured (which is a CRM data
   feature with its own value), or should map drop off the list entirely?
