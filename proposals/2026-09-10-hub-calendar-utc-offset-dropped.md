---
id: 2026-09-10-hub-calendar-utc-offset-dropped
title: Scheduling calendar draws appointments at their UTC wall-clock
status: draft
created: 2026-09-10
updated: 2026-09-10
repos: [minion_hub]
---

# Scheduling calendar draws appointments at their UTC wall-clock

Found while executing GSD plan `13-02` (UI-04 mobile composition). Out of that plan's scope — it owns
composition only, and both candidate fix sites are outside its file ownership — so it is filed here with a
matching `TODO(handoff)` in `src/routes/(app)/scheduling/calendar/+page.svelte`.

## Symptom

An 08:00 America/Lima booking is drawn on the **13:00** row of the day grid. The chip label is correct
(`hhmm()` formats the ISO string with `toLocaleTimeString`, so it reads "08:00 AM"), which makes the defect
read as a rendering glitch rather than a wrong time. Every booking is displaced by the org's UTC offset —
five hours for FACES.

## Mechanism

1. `src/server/scheduling/load-calendar-events.ts:93` serialises with `r.start.toISOString()`, i.e. a
   `Z`-suffixed UTC string.
2. `@event-calendar/core` parses event dates through `parseOffset`, which only matches a trailing
   `([+-])(\d{2}):(\d{2})$`. A `Z` suffix returns `undefined`, so `_fromISOString` skips
   `applyOffsetDiff(result, offset - inputOffset)` entirely and the UTC wall-clock digits are used verbatim.
3. `SchedulingCalendar.svelte` never sets the `timeZone` option; the library default (`'local'`) is therefore
   inert for these strings.

## Evidence

Measured on `minion_hub/tests/fixtures/mobile-composition` (built from `origin/master` `1df0a921`) at
390x844, with a seed event whose `start` is `2026-09-08T08:00:00` local serialised via `toISOString()`:

- event element inline style `inset-block-start: 576px`
- `.ec-body` height `1344px`, covering `slotMinTime 07:00` → `slotMaxTime 21:00` (96px/hour)
- `576 / 96 = 6h` after 07:00 → the 13:00 row; the "1:00 PM" gutter label sits at the same y.

## Candidate fixes (one of)

- **Server** — emit `+00:00` (or the org offset) instead of `Z` in `load-calendar-events.ts`, and keep the
  `CalendarPayload` contract explicit about it. Also covers `GET /api/scheduling/calendar`.
- **Client** — normalise the strings (or pass an explicit `timeZone`) in `SchedulingCalendar.svelte` before
  they reach the library.

Whichever is chosen, check the write path too: `MoveConfirmDialog` sends drag/resize results back as
`toISOString()`, and `TimeOffCalendar.svelte` is the other `@event-calendar/core` consumer.

## Definition of done

A booking created at a given local time renders on that time's row for a non-UTC org, drag/resize round-trips
without shifting it, and a regression test pins the parsed placement (not just the chip label).

## September11 implementation review

The explicit-offset-only candidate still used the installed core's current timezone offset for every event. The seven-file repair now separates lossless wire instants from viewer-local wall fields on a neutral UTC renderer axis. Actual installed core regressions cover winter/summer, non-hour offsets, native drag/resize callbacks and DST-day query boundaries. Source remains a private candidate pending combined browser/full-app verification.

Remaining exact seams:

- `SchedulingCalendar.svelte` contains a paired TODO for events crossing a repeated fall-back hour whose local end precedes their local start. Preserve stored instants; choose a visible fold representation before claiming those events render faithfully.
- `load-calendar-events.ts` contains a paired TODO for its start-only window filter. Bookings starting before the queried window but overlapping it can be omitted; resolve interval-overlap semantics with API/store coverage rather than silently changing query behavior in a timezone patch.
- The route seeds today using the first resource timezone and a server-local initial window. Client loading repairs missing spans, but initial-day policy across viewer/resource zones needs full authenticated route qualification. The other TimeOffCalendar consumer also remains a separate acceptance gate.

Original symptom/mechanism above is historical evidence; the chosen repair supersedes the candidate alternatives, not these remaining gates.
