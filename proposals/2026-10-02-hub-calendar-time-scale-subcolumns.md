---
id: 2026-10-02-hub-calendar-time-scale-subcolumns
title: Calendar — time-axis scale by dragging the gutter + custom subcolumns per day
status: draft
created: 2026-10-02
repos: [minion_hub]
tags: [ui, ux]
spec: specs/2026-09-27-hub-calendar-standardization-spec.md
---

# Calendar: time-axis scale + classifying subcolumns

Owner request 2026-10-02 (screenshot of `/pos/appointments`, the time gutter
circled): "implement scaling, meaning the user can drag the 'time' area and drag
up (decrease) / down (increase) scale. This helps space out events" (priority),
and "now I want to be able to add custom subcolumns to classify events" on top
of the existing two-per-day Invoiced | Scheduled split.

## Shipped (hub `feat/pos-calendar-time-scale-subcolumns`)

- **Scale**: the `.axis-scale` gutter is a vertical `role="slider"`. Pointer
  drag down = taller hours, up = shorter, multiplicative (`px0 · 2^(dy/160)`),
  clamped `PX_PER_HOUR_MIN..MAX` (24..240), integer px so gridlines, labels and
  boxes never land on sub-pixel seams. The minute under the pointer at press
  stays put on screen (scrollTop compensates). Keyboard: Arrow ±4, Page ±16.
  Reported through `onpxperhour`; `createCalendarPrefs` persists it per
  namespace (`hub-<ns>-calendar-px-per-hour`). Both `/pos/appointments` and
  `/scheduling/calendar` wire it.
- **Subcolumns**: `subBy` (status | kind | staff | service | tags | none) in
  the kebab, same `ColorSourcePicker` as the colour sources. Distinct values in
  the LOADED window (unset last, "Unclassified") subdivide every column's
  scheduled region; lanes pack inside a subcolumn; dividers + header labels.
  Composes with the Invoiced | Scheduled split (subcolumns live in the
  scheduled half). Week runway shows fewer days than `weekDays` while a
  subcolumn would fall under 64px; day view widens `.col` the same way.
  Persisted as `hub-<ns>-calendar-subcolumns`.

- **Custom columns + drop-to-reclassify** (owner follow-up, same day: "I need
  events to be reclassified if dropped in another subcolumn … custom columns
  are set at the events level. They're not groupings of another table").
  NO migration: `scheduling.bookings` registered as a custom-property table
  (registry row, policy = scheduling module, entity authorization over
  `sched_bookings`), so `app_table_properties` / `_values` carry the org's
  own event-level select columns. Each active select column is a subcolumn
  source (`prop:<id>`): one lane per option + "Unclassified"; values load
  lazily for the loaded window; a drop into another lane WRITES the option
  (optimistic, per record with version, re-read on refusal); "Unclassified"
  clears. Staff lanes reclassify via `onmove`'s `resourceId`. Kebab gains
  "Manage custom columns…" (shared `CustomPropertyManager`, mounted outside
  the popover).

Browser-verified on the local QA stack (private headless Chromium): drag
down/up, keyboard, reload persistence, status/service subcolumns, split +
subcolumns, drag-move ghost inside the subcolumn; "Room" column created,
three lane-to-lane drops with the DB value following each (v1→v3→null).

## Open ends (TODO(handoff) sites in `BookingCalendar.svelte`)

1. **Built-in lanes are view-only on drop.** status / kind / service / tags
   keep their value when dropped elsewhere (the ghost stays in its own lane).
   Status has a workflow (cancel/complete), kind/service need a booking PATCH,
   tags an add/remove — each is its own write path + confirm.
1b. **Custom column surfaces.** The value is only visible/editable on the
   calendar lanes today: the appointments list table and the booking drawer
   do not show `scheduling.bookings` custom columns yet (DataTable's
   `customProperties` wiring exists — thread it into `BookingsView`).
2. **Multi-tag bookings file under their FIRST tag** (`bookingFacet`). A
   booking with two tags appears once. Duplicating across subcolumns needs the
   box key to carry the tag id and the move/merge paths to ignore duplicates.
3. **`category` is not offered** as a subcolumn source: the booking payload
   carries only `categoryColor`, no category name/id. Thread
   `fin_products.category` onto `CalendarBooking` to enable it (one entry in
   `SUBCOLUMN_SOURCES`).
4. **Subcolumn set = loaded window.** Scrolling the runway far enough to load
   new weeks can add a value and re-divide every column. Pinning the set to
   the org's full value list (all statuses, all staff) would be stable but
   wastes width on empty lanes; a per-viewer "always show these values" list
   is the real answer.
5. **Header labels truncate at 64px** ("QA …"). A `Tooltip` per label (native
   `title` is used today) or a wider floor via a kebab setting.
