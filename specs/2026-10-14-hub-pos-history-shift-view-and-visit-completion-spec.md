---
id: 2026-10-14-hub-pos-history-shift-view-and-visit-completion-spec
title: POS history per-shift tables + calendar totals; visit completion per service; package aggregates
stage: spec
status: approved
pass: 1
created: 2026-10-14
updated: 2026-10-14
repos: [minion_hub]
type: feature
tags: [logic, test]
---

# POS history per-shift tables + calendar totals; visit completion per service; package aggregates

## 0. Product

Owner feedback batch 2026-10-14 (FACES clinic), four asks decided in chat the same day:

1. `/pos/history` is always one table per shift, each with its own header and a readable
   payment summary, plus week/month views of totals per payment method.
2. Completing a multi-service visit must confirm EVERY service's stock consumption (the
   clinic enters ml / units at completion); removing a visit's first service must not 404;
   notes must not interrupt typing.
3. The catalog drops its coverage banner; a package row aggregates stock / cost / margin
   from its sessions.
4. Confirm that selling a package grants its N individual sessions (confirmation only).

Owner feedback batch 2026-10-14 (FACES, WhatsApp 16:20 Lima + annotated screenshots).
Confirmed against PostHog replay `01a13c14-4b83-7ab6-9fea-dc04bc6fcfd9` (10-14 20:22Z–) and
production rows (see AS-IS evidence). Four independent slices, one hub PR each.

## Slice 1 — `/pos/history`: one table per shift, summary panel, calendar totals

### AS-IS
- `src/routes/(app)/pos/history/+page.svelte` renders ONE `DataTable` over all tickets with
  `groupBy` = shift (hub #518). The column header (ID · Fecha · Cliente · Total · Estado ·
  Turno) sits above the first group row, outside every shift's "dropdown" (image #9).
- A "Turno" group chooser (`groupOptions`) lets the user flatten the list (image #5 toolbar).
- The per-shift payment breakdown is a run of inline chips in the group header
  (`shift-totals` + `diffCell` badges, image #6): methods, net amounts and the close-count
  diffs are interleaved on one wrapping line and hard to read.
- No calendar reading of the shift history exists.

### TO-BE
- The page is ALWAYS grouped by shift. No group chooser.
- Each shift is a collapsible section (chevron, same affordance as today's group row). The
  shift whose `closedAt` is null (or the newest one) starts expanded; the rest collapsed.
  Section header: open time, `Abierta` badge or `→ close time`, cashier name, ticket count,
  net total.
- Inside an expanded section, in this order:
  1. a compact **summary table** (image #7 layout: one row per payment method, method name
     left, net amount right; a `Total` row on top in the header weight; below the method
     rows, when the shift is closed and carries `expected`, one row per method with the
     expected / counted / difference — difference badge green when balanced, warning
     otherwise). This replaces the inline chips.
  2. the shift's **own `DataTable`** with its own column header: ID · Fecha · Cliente · Total ·
     Estado · Cajero · Métodos. No `Turno` column (the section already is the shift).
     `chrome={false}` (no per-table toolbar), no group chooser, shared `storageKey`
     (`pos-history-tickets`) so column prefs apply to every shift's table.
- One page-level search box (above the sections) filters tickets in every shift by
  humanId / customer / cashier (pass `search` to each table, or filter rows before
  passing). A shift whose filtered rows are empty still shows its header + summary.
- A **view toggle** (Lista · Semana · Mes) in the page toolbar. Week and month views show,
  per calendar day (org time zone, `America/Lima` fallback as the appointments page does),
  the day's net total and one line per payment method with its net amount. Compact: month
  = 7-column grid, 5–6 rows, each cell = day number, bold total, method lines in caption
  size (truncate beyond 4 methods with `+n`); week = 7 columns, same cell, more room.
  Prev / next / today navigation; the selected day is kept in `?date=` + `?view=` search
  params like `/pos/appointments` does. Days with no payments render empty.
- Day buckets fold **every payment row stamped on the day** (refund counter-rows included,
  negative), i.e. the same net reading `foldPayments.methodTotals` gives per shift. The
  server returns each payment's timestamp for that; `payments-fold.ts` grows a
  `dayTotals(payments, tz)` sibling with a unit test.

### DELTA
- `+page.server.ts`: `listPaymentsFor` (pos.service) also selects the payment's created
  timestamp; the page returns the raw payment list (ticketId, shiftId, method, amount,
  refund, at) next to `methodTotals`. Resolve `orgTz` the way
  `pos/appointments/+page.server.ts` does.
- `+page.svelte`: rewrite the body as described. Delete the inline `shift-totals` /
  `diffCell` chips. Keep `shiftDifference` math (reuse in the summary table).
- New messages (en + es): view labels (list / week / month), summary headings (method,
  amount, expected, counted, difference), empty day. Append at the END of both JSON files
  (co-agents append too — never reorder).
- Tests: `payments-fold.test.ts` gains `dayTotals` cases (tz boundary at 23:30 Lima =
  04:30Z next day lands on the Lima day; refund nets negative). `bun run check`,
  `bun run lint:design && bun run lint:tokens`, `bunx vitest run src/routes/\(app\)/pos/history`.
- **Out of scope:** server pagination (existing handoff), per-cashier calendar, exports.

## Slice 2 — Visit completion confirms every service's consumption; removing the lead service; notes autosave

### AS-IS (evidence: prod rows 2026-10-14, replay above)
- A visit (grouped bookings, `metadata.groupId`) is completed through
  `ConsumptionConfirmDialog` with `bookingId = anchorId` and `productId =
  detail.booking.productId` — the LEAD only (`BookingDetailDrawer.svelte` ≈ L1702,
  self-documented `TODO(handoff)` beside it). FACES visits are led by `Control` /
  `Reserva de Consulta` (no consumption) with the real service (`Botox Full Face`,
  `Afinamiento Facial (individual)`) as a member → the dialog says
  `sched_complete_no_defaults` and the member's accrual is realized best-effort at the
  default, un-confirmed (images #14, #17 is the expected UI). Prod proof: group
  `a67bce65…` (10-14) = Reserva de Consulta + Afinamiento + Botox Full Face, members'
  accruals `realized` with no user confirmation.
- Removing the lead service from the drawer (`confirmRemoveService`) deletes that booking
  row server-side, then `reloadDetail()` re-fetches the deleted `anchorId` → the drawer
  shows `404` (images #15, #16; replay: repeated "Citas" reloads 22:01Z).
- Notes `createAutosave` fires a PUT every 2 s while typing (`maxWaitMs` default) and each
  PUT awaits `onchanged()` = the calendar page's full `invalidate` → visible jank while
  typing ("se guarda a cada rato y no me deja terminar de escribir").
- Side finding (no code): prod has NO `stk_consumption` row for `Pb Serum Ojeras` (PBO);
  every other service the owner listed is mapped.

### TO-BE
- The completion dialog takes the visit's **members** (`{bookingId, productId, title}[]`,
  the single-booking case = one member). It loads rows per member (open accruals, else the
  product's default map) and renders them grouped under the member's title. Confirm POSTs
  `…/[memberId]/complete` for every member (sequentially, members whose row list is empty
  still complete with `lines: null`), merges `stockWarning`s, then the host's existing
  visit-wide status call runs as today. "Sin consumo" empty state only when NO member has
  rows.
- Removing the lead: when `removeRow.id === anchorId`, after a 2xx the drawer navigates to
  a surviving member (`onnavigate(survivorId)`, survivor = first `detail.visit.members`
  id ≠ removed) instead of reloading the deleted id. Never a 404 panel.
- Notes: save on idle only — `debounceMs: 1500`, `maxWaitMs: 15_000`; the save itself does
  NOT call `onchanged`; the textarea's `onblur` flushes and then calls `onchanged` once (the
  hover card reads notes, so the grid refreshes when the user leaves the field).

### DELTA
- `ConsumptionConfirmDialog.svelte`: new `members` prop (keep `bookingId`/`productId` as
  the one-member sugar so `pos/appointments/+page.svelte` keeps compiling; that page passes
  members when the clicked box is a visit — see `booking-groups.ts` for the members of a
  box). `ConsumptionRow` gains `bookingId`; `completionLines` is applied per member.
- `BookingDetailDrawer.svelte`: pass `detail.visit.members` (id, productId, title);
  `confirmRemoveService` survivor navigation; notes autosave options + blur handler.
- Tests: `consumption-lines.test.ts` (or new) for grouping/per-member lines; a drawer
  mounted test is NOT required — verify remove-lead + multi-service completion in the QA
  stack browser and paste the evidence in the PR.
- **Out of scope:** per-member warehouse choice; editing a service's default map from the
  dialog; the `BookingsView.svelte` third copy (existing handoff).

## Slice 3 — Catalog: drop the coverage banner; package rows aggregate stock / cost / margin

### AS-IS
- `pos/catalog/+page.svelte` ≈ L483 renders `.coverage-banner` ("15 productos facturados no
  están en el catálogo · 42 productos del catálogo nunca facturados") above the table
  (image #11). Owner: remove it.
- A bundle row (`kind: 'bundle'`, e.g. `AF1 Afinamiento de Rostro (completo)` = 4 ×
  `AF2 Afinamiento Facial (individual)`) shows `—` for Stock, Cost and Margin (image #18)
  because `costForProducts` / `applyRecipeAvailability` only read `stk_consumption`, which a
  bundle does not carry.

### TO-BE
- No coverage banner on the catalog page (the `catalogCoverage` read goes too unless
  another consumer needs it — grep first).
- A bundle row derives from its children (`fin_product_components`, qty per edge):
  - cost = Σ child.cost × qty (null when any child's cost is null);
  - margin = price − cost, marginPct as today;
  - stock = min over children of ⌊child.stockQty / qty⌋ (null when any child's stock is
    null). Example from prod: AF2 stock 17, cost 42.38, AF1 price 1,800 ⇒ AF1 stock 4,
    cost 169.52, margin 1,630.48.
- Children are the catalog's own enriched rows (same list), so the derivation is a pure
  pass over `enriched` + the bundle edges — no new DB round trip beyond `listBundleEdges`
  (already org-wide, check whether the page already loads it for the composition column).

### DELTA
- `+page.server.ts`: pure `aggregateBundles(rows, edges)` in a sibling `.ts` with a unit
  test (the numbers above); apply after `enriched`, before the masked branch is reached
  (masked rows stay null).
- `+page.svelte`: delete the banner block + its style; drop `coverage` from the load if
  unused elsewhere.
- **Out of scope:** nested bundles (a bundle whose child is a bundle — compute one level,
  leave `—` deeper, comment `shortcut:`), revenue/billed roll-ups.

## Slice 4 — Confirmation only: a package sale grants N schedulable sessions

Verified in prod config, no code: `fin_product_components` has AF1 → 4 × AF2, N3 (NCTF-3S)
→ 3 × NCTF-1S, PB3 → 3 × PBO; `createGrantsForTicketLine` (pos-packages.service) mints one
grant per edge with `sessions = qty` on sale, and `/pos/accounts` lists them as pending to
schedule (hub #511/#516 flow). The booking picker already hides bundles (#511).

**Out of scope:** server pagination of the history window; a lint rule forbidding bare
`:global(.x)` selectors (ledger: `proposals/2026-10-14-hub-global-class-selector-lint.md`);
nested bundles; the `Pb Serum Ojeras` stock mapping (owner data, not code).

## Verification

- Hub PRs merged to `master`: #522 (catalog), #523 (shift banner leak), #525 (history),
  #524 (visit completion). Each ran `bun run check`, the slice's vitest folders, the route /
  service boundary contracts, `lint:design`, `lint:tokens` and prettier in the foreground.
- Production (Vercel `c2bea4172`, 2026-10-15 02:45Z) browser-checked: history list shows one
  table per shift with its own header + summary table; month view shows per-day totals per
  method; catalog has no banner and `AF1` shows stock 4 (= ⌊17/4⌋); the shift banner's
  "Abrir caja" button measures 81×32 px after client-side navigation from Home (was 26×24).
- Not browser-verified: completing a two-service visit (unit-tested per-member line split
  and result merge; no safe pending two-service visit to complete on production data).

