---
id: 2026-10-10-hub-uiux-consistency-followups
title: Hub UI/UX consistency — deferred follow-ups from the 2026-10-10 audit
status: draft
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [ui, logic]
value: 6
effort: M
source: hub-uiux-consistency-2026-10-10
---

# Hub UI/UX consistency — deferred follow-ups

## Owner ask (verbatim, 2026-10-10)

> "Async loading indicators and spinners are inconsistent across the app… I want a subtle
> spinner available on each page (maybe add it to the sidemenu somewhere for a more 'global'
> feel). There are too many types of spinners that I feel are saturating the UI."
> "In many cases, like when a new item is created in the catalog, stock, events, the UI isn't
> responsive to the point where the created element is visible right after… the user either
> gets an error or a 'discard changes' dialog (even though the item's been created)."
> "Many pages have sizing and spacing OFF for known elements and layouts."
> "find places where 'save' buttons are redundant where async saves can take their place…
> Save buttons… when the user is making a destructive or important decision."

## What shipped (hub PR `feat/uiux-consistency-2026-10-10`)

Six parallel audits (loading indicators, post-create staleness, spacing/sizing, i18n
overflow, view-element parity, save-vs-autosave) produced 55 ledger findings; the review is
`.lavish/hub-uiux-consistency-2026-10-10.html`. Shipped: ONE global busy spinner in the
sidebar; `createAutosave` primitive; `runCompoundMutation` refreshes after any committed
primary; `Dialog` forgets `touched` on a clean save; shared `createBookingFilter`; the
`raw-loading` sweep; control-height/field-gap/icon-size alignment; `raw-control-height`
design-lint rule; SectionNav overflow fix; module-scope `m.*()` thunks; locale-aware number
formatting; first wave of Save-button → autosave conversions.

## AS-IS (what is still open after the PR)

| # | Finding (audit anchor) | Evidence |
|---|---|---|
| 1 | `/pos/catalog` and `/pos/sell` hand-roll their own `.view-toggle` switchers and board/gallery cards instead of `DataView` + `SegmentedControl` + `BoardView` | `pos/catalog/+page.svelte:461-486,520-559,730-738,814-824`; `pos/sell/+page.svelte:1257-1280,1697-1740` |
| 2 | Three localStorage idioms for "remember my view/axis" (`stored()`, `readPreference`, bare `localStorage.getItem`) | `pos/catalog:131-172`, `pos/sell:221-256`, `sessions/SessionKanban.svelte:18-26` vs `scheduling/kit/calendar-prefs.svelte.ts` |
| 3 | Four toolbar-row shapes (`dt-toolbar`, `dv-bar`, `bb-bar`, `eg-bar`) with different height/border/padding | `DataTable.svelte:4340`, `scheduling/calendar:545`, `BookingBoard.svelte:178`, `EditableGrid.svelte:264` |
| 4 | `BookingsView` shows 6 always-visible row-action buttons; tables use a hover rail; boards an open+menu | `BookingsView.svelte:297-366`, `BookingTable.svelte:115-126`, `BoardView.svelte:166-177` |
| 5 | `/scheduling/bookings` is an orphaned 4th rendering of the bookings dataset with no shared filter/switcher | `scheduling/bookings/+page.svelte` vs `scheduling/calendar/+page.svelte` |
| 6 | `TimeOffCalendar` is a third calendar renderer (`@event-calendar/core`) whose focused date lives in the vendor instance (lost on reload) | `team/TimeOffCalendar.svelte` |
| 7 | Action runtime has no reversible (policy O) action kind; autosave masquerades as `confirmed` and self-dismisses failures | `services/actions/definition.ts:45,52`; `records/autosave.svelte.ts` |
| 8 | Remaining Save-button → autosave candidates (HYBRID + lower-traffic AUTOSAVE rows of the audit): brain settings, gmail retention, contact meta rows, reminder stages, backups schedule, channel edit form, CRT config, custom-property cell, tag rename, `EditableName` ✓ button, home/settings persona | audit §2 inventory |
| 9 | ~95 bare `toLocaleString()`/`toLocaleDateString()` sites fall back to the BROWSER locale, not the app language | 52 files (e.g. `BrainKnowledgeCard.svelte:68-81`, `ShiftBanner.svelte:92`) |
| 10 | DataTable header ellipsis silently truncates long ES column labels (`Conjunto de anuncios`, `Reproducciones`) — no min-width floor keyed off the longer locale | `DataTable.svelte:4566-4569` |
| 11 | `ShellRow` relative-time strings and raw `status` enum are untranslated; shells list header has fixed px columns with no ellipsis | `shells/ShellRow.svelte:8-13,29`, `shells/+page.svelte:125` |
| 12 | Dead message keys `ads_col_adset`, `fin_preset_ytd` | `messages/*.json` |
| 13 | Autosave PATCH endpoints lack a version/receipt contract (spec §3.3) — concurrent field edits can clobber | `api/stock/items/[id]`, `api/scheduling/event-types/[id]`, custom-property values |
| 14 | `crm/customers` `newContact()` swallows a non-OK response with no toast | `crm/customers/+page.svelte:644` |

## TO-BE

One view-switcher primitive, one view-pref kit, one toolbar-row contract, one row-action
affordance; every bookings surface shares `createBookingFilter`; one calendar renderer; a
first-class `optimistic` action policy in the runtime; every formatted number/date reads
`appLocale()`; every policy-O endpoint returns `{entity, version}` and rejects stale writes
with 409.

Invariants: no new spinner variants (ratchet), no Save button on a policy-O field, no
`disabled={busy}` button without `loading`.

## DELTA (slices)

- S1 — `DataView` migration of `/pos/catalog` + `/pos/sell`; `createViewPref()` kit; delete
  both bespoke switchers (#1, #2).
- S2 — `.view-toolbar` contract (`--view-toolbar-h`) adopted by the four toolbar rows;
  `BookingsView` row actions behind the hover rail or folded into `/scheduling/calendar?view=table` (#3, #4, #5).
- S3 — Retire `TimeOffCalendar` onto `BookingCalendar` (#6).
- S4 — `policy: 'optimistic'` in the action runtime + `createAutosave` migration; endpoint
  version contract for stock items, event types, custom-property values (#7, #13).
- S5 — Second autosave wave (#8) + `appLocale()` sweep (#9) + i18n leftovers (#10–#12, #14).

## Out of scope

Redesigning the information architecture of any module; new tokens beyond
`--view-toolbar-h`; the notification inbox work (separate proposal).

## Definition of done

Each slice lands as its own hub PR with the design-lint ratchet green, `bun run check`
clean, and the ledger rows in `.lavish/hub-uiux-consistency-2026-10-10.html` flipped to
"shipped" with the PR number.
