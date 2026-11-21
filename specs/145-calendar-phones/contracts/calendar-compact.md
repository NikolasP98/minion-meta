# Contract: `BookingCalendar` additions

Every default reproduces today's behaviour.

## Props

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `compact` | `boolean` | `false` | Phone toolbar (one row + week strip, sheets instead of popovers), phone month cells, empty days in the list. |
| `onadd` | `() => void` | none | Renders "+" in the compact toolbar. |
| `kebabBadge` | `number \| null` | `null` | Count shown on the compact "…" button. |
| `kebabAttention` | `boolean` | `false` | Dot on the compact "…" button. |
| `onopen` | `(bookingId: string, opts?: { reschedule?: boolean }) => void` | as today | Second argument added; existing callers ignore it. |
| `actions` (snippet) | `(booking, ctx?: { touch: boolean })` | as today | In the summary sheet `ctx.touch` is true: render labelled 44 px buttons, no destructive actions. |

Existing props the hosts now vary on phones: `weekDays` (3), `subBy` (`'none'`), `features.agenda` (on).

## Feature flags (`calendar-features.ts`)

| Flag | Default | Meaning |
|---|---|---|
| `tapSummary` | `false` | A touch tap on a block opens the summary sheet instead of calling `onopen`. |

## Behaviour that changes for every caller

- Touch and pen pointers scroll the grid; press-and-hold (400 ms) starts create or move. Mouse is unchanged.
- A drag (mouse or touch) scrolls the calendar at the edges.
- On coarse pointers a block is at least 24 px tall and keeps its real height (the grid is `data-dense`), and the resize edge is hidden.
- With fewer than seven days per screen the week view starts on the selected date instead of its Monday.
- Blocks at least 44 px tall show a status icon and name; every block has a full accessible name.
- Date and view changes are announced in a polite live region.

## `longpress` action (`lib/actions/longpress.ts`)

`use:longpress={fn}` keeps working. New form: `use:longpress={{ ms, slop, onhold, onend }}`; `onhold` receives `{ x, y, pointerId, target }`. Both forms now ignore non-primary pointers and reset the click-swallow flag on every pointer down.

## `BookingDetailDrawer`

New prop `startInReschedule?: boolean` (default `false`): once the appointment has loaded, opens the existing reschedule form (once per open).

## Public CSS custom properties

Unchanged: `--cal-gutter`, `--cal-head-h`, `--cal-month-row`, `--cal-col-min`. None added.

## `CollapsibleFilters`

New prop `compact?: boolean`: when passed it replaces the component's own media check (and makes the server render match).
