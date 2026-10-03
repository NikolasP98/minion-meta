---
id: 2026-10-03-hub-calendar-temporal-readiness-spec
title: Hub calendar temporal readiness and follow-on plan
stage: spec
status: approved
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
verdict: approved
type: fix
tags: [data, logic, ui, ux]
proposal: 2026-10-02-hub-gateway-production-readiness-recon
---

# Hub calendar temporal readiness and follow-on plan

## 0. Product

HC-008 through HC-010 repair the time contract shared by the POS and Scheduling calendars and by dashboard quick ranges. A booking must appear on the same clinic day and at the same clinic time regardless of the operator's browser timezone. A drag, resize, typed override, or reschedule must persist the wall time the operator chose. A date-only quick range must name the organization's calendar dates, and clicking it after a tab has been open for hours must use the current clock.

This pass makes Slices 1–4 reviewable for implementation. Section 8 records bounded follow-on slices for HC-011 through HC-023 so the temporal patch does not absorb unrelated calendar interaction work.

### Invariants

1. Booking and ticket timestamps remain absolute instants on the wire and in storage. Calendar day/minute projection always names an explicit IANA organization timezone.
2. `YYYY-MM-DD` is a calendar key, not an instant. Date-key comparison, shifting, weekday lookup, labels, and quick-range arithmetic never parse the key through a browser-local `Date` or serialize it through `toISOString()` after local mutation.
3. An instant-to-wall projection is unambiguous. A wall-time-to-instant conversion returns a typed exact, ambiguous, nonexistent, or invalid result; a caller cannot obtain an ISO instant while ignoring that result.
4. A nonexistent DST-gap wall time blocks the write before `fetch` and presents an accessible, translated error. It is never silently shifted into another time.
5. For a repeated DST-fold wall time, a move or resize preserves the original instant's offset when that offset identifies one candidate. With no usable source offset, creation and direct drop choose the earlier candidate deterministically. Tests pin both candidates and the chosen rule.
6. Day-window boundaries use the earliest valid instant belonging to each requested organization date. A DST day may therefore be 23 or 25 hours; no code adds `86_400_000` to obtain the next local day.
7. Every calendar read and write boundary receives the server-resolved organization timezone. No calendar path falls back to `Intl.DateTimeFormat().resolvedOptions().timeZone` or browser-local `getHours()`/`getDate()`.
8. Date-only dashboard presets resolve in the organization's business timezone on CRM, Finances, and Socials. Reliability remains a viewer-timezone telemetry surface and states that policy explicitly. HC-009 does not change the existing datetime-local value contract for sub-day presets.
9. A quick-range click and stored-default application create a fresh context at invocation time. Active-preset matching advances on a small clock which is cleaned up on component destruction.
10. The implementation changes temporal behavior and focused feedback only. It does not redesign calendar layout, navigation, lanes, forms, or dashboard controls.
11. IANA formatters are cached by a bounded timezone/format key. Per-booking projection may use cached formatters; candidate enumeration runs only when a user gesture or request boundary converts wall time to an instant, never for every booking on every render.
12. A drag, resize, direct drop, or typed override captures organization identity, action scope, and timezone at gesture start. If organization/scope/timezone changes before commit, the gesture is cancelled or rejected before `fetch`; it is never reinterpreted in the new organization.

## 1. AS-IS

### HC-008 — calendar read and write zones disagree

- `src/routes/(app)/pos/appointments/+page.server.ts:32-44` and `src/routes/(app)/scheduling/calendar/+page.server.ts:40-48` resolve `?date=` and the load window in `orgTz`, derived from the first active scheduling resource, but neither page returns that timezone.
- `BookingCalendar.svelte:575-595` assigns instant-valued bookings/invoices to day columns and vertical minutes using browser-local `Date` fields. `formatTime` also formats in the browser timezone. `BookingCalendar.svelte:993-1017` derives the today highlight and now line from the browser clock.
- `BookingCalendar.svelte:1900-1917` turns a dragged organization wall day/minute into an instant by parsing a timezone-less string in the browser timezone. The same drift affects merge and group moves because they receive the same computed `start`/`end`.
- Both calendar pages bucket initial and fetched rows into week-cache keys with browser-local `dayOf`, filter visible tags with browser-local `localDay`, and navigate after create using that same projection. POS direct ticket-line drop creates its `start` with browser-local parsing (`pos/appointments/+page.svelte:314-328`).
- The calendar's Table and Board views, the detail drawer, and the shared create form format instants through browser-local `formatDate`/`formatTime`. The detail drawer reschedule and `AppointmentForm` manual override parse organization wall inputs in the browser timezone.
- `AppointmentForm` and `BookingCreateForm` build slot-query day bounds by parsing local midnight and adding 24 hours. Around DST this can query the wrong organization window even when browser and organization zones happen to match.
- Date-only calendar labels and weekday/off-hours lookup still parse `YYYY-MM-DDT00:00:00` through browser-local `Date` (`BookingCalendar.svelte:1324,1397-1414,1700`). These keys should not cross an instant conversion boundary at all.
- `src/server/scheduling/tz.ts` has reusable `Intl` projection code, but it is server-only. Its fixed-point `zonedTimeToUtc` returns one `Date` without proving whether the requested wall time was exact, absent, or repeated; existing tests cover offsets on either side of DST, not the gap/fold itself.

Observable failure: an America/Lima booking rendered from a UTC browser can move to a different day/slot, and dragging to 09:00 can persist a time other than 09:00 Lima. A DST gap can be normalized silently, while a fold has an unstated candidate choice.

### HC-009 — date-only quick ranges mix local and UTC rules

- `src/lib/components/dashboard/date-range/ranges.ts:33,49-76` mutates `Date` through local setters, then serializes through `toISOString().slice(0, 10)`.
- In America/Lima at `2026-10-03T01:30Z` (20:30 on October 2), the current `1d` helper can emit October 2–3 instead of October 1–2.
- CRM, Finances, Socials, and Reliability are the four production `DateRangeControls` callers. Finance already resolves submitted date keys through `fin_settings.timezone`; the control does not receive that timezone. CRM's server adapter widens date keys in the server process timezone. Socials computes its default end from UTC. Reliability is a global/viewer telemetry surface and opts into datetime-local values.
- Existing tests pin `now` at midnight UTC and do not cover negative/positive offset date boundaries, leap/month/year rollover, or a business timezone different from the process/browser timezone.

Observable failure: the UI can request a window one organization day ahead or behind, and the active preset can disagree with the server-resolved window.

### HC-010 — quick-range `now` freezes

- `DateRangeControls.svelte:75-86` creates `new Date()` inside a derived whose only reactive inputs are `dataMin` and `dataMax`.
- Apply, default-on-mount, and active matching reuse that object (`DateRangeControls.svelte:108-138`).
- Leaving CRM, Finances, Socials, or Reliability open across hours or midnight means the next `1h`, `24h`, or date-only click ends at the mount time.

Observable failure: recent records are omitted even though the operator just selected a relative range.

## 2. TO-BE

### Shared client-safe temporal seam

Move or extract the dependency-free IANA primitives into a client-safe scheduling/date module used by both server scheduling code and browser components. Do not add a second timezone implementation beside the existing `Intl` logic. The seam must expose and test these distinct operations:

- `instantParts(instant, timeZone)` / `instantDateKey(...)`: project an absolute instant to organization year/month/day/hour/minute and a `YYYY-MM-DD` key.
- `dateKeyAdd`, `dateKeyWeekday`, and date-key formatting: operate through UTC calendar fields solely as a carrier for date parts; they never claim that the date key is midnight UTC.
- `wallTimeCandidates(dateKey, minute, timeZone)`: enumerate zero, one, or two instants and validate each by round-trip projection.
- `resolveWallTime(..., { preferredOffsetMinutes })`: return a typed result. It rejects gaps, preserves a source offset for folds where possible, otherwise selects the earlier fold candidate, and never hides invalid IANA zones or malformed date/time input.
- `zonedDayWindow(from, to, timeZone)`: resolve inclusive date keys to a half-open instant window using the next date key rather than a fixed 24-hour addition.

The existing server imports may re-export the shared implementation for compatibility, but there must be one behavior and one DST test suite.

The server compatibility surface remains deliberate. The complete production caller inventory is `src/server/scheduling/slots.ts` (`zonedTimeToUtc`, date-key weekday/projection) and `src/server/services/pos-accounts.logic.ts` (`zonedDateKey`, consumed by package/account expiry); `toOffsetIsoString` currently has test callers only. Slot computation feeds scheduler, recurrence, and public booking paths indirectly. Their public `Date`-returning `zonedTimeToUtc` behavior remains unchanged in this batch. Migrated calendar writes call the new checked result API directly; they do not change the legacy slot conversion policy as a side effect.

Formatter caches have a hard bound and deterministic eviction or a fixed set of known keys. A tenant-provided timezone cannot grow a process-global map without limit. Candidate discovery samples a bounded instant horizon and a bounded number of offsets, round-trips every candidate, and terminates. `Australia/Lord_Howe` proves 30-minute gaps/folds, `Pacific/Kiritimati` proves the far positive boundary, and `Asia/Kathmandu` proves a non-hour offset.

A wholly skipped local date returns a typed nonexistent/invalid day boundary. It never triggers an unbounded search, fixed-24-hour substitution, or a window for a neighboring date. Midnight offset transitions are tested separately from ordinary 02:00 DST transitions.

### HC-008 — one explicit organization timezone at every boundary

- Both calendar page loads return the exact `orgTz` used for `todayIn` and `calendarLoadWindow`. The API window routes continue to accept date keys and resolve them in the same timezone.
- `BookingCalendar` requires `timeZone`. It uses it for booking/invoice day assignment, vertical minute placement, time labels, today/now, merge targeting, drag/move/resize serialization, and fold offset preservation. Date-key-only labels/weekday checks use the date-key helpers.
- POS and Scheduling pages use `data.orgTz` for cache bucketing, tag-range membership, created-booking navigation, Table/Board timestamps, drawers, and create panels. POS direct ticket drop resolves the wall slot through the typed seam and makes no request on a gap/invalid result.
- `AppointmentForm` and `BookingCreateForm` receive an explicit timezone. Their default day, slot-query window, slot labels, and manual override use it. `BookingDetailDrawer` receives it for display/edit projection and reschedule serialization. The other production callers of these shared components are migrated in the same change rather than inheriting a hidden browser fallback.
- A calendar organization switch supplies a new timezone with the new page data; the component and page projections use the new value immediately. No cached browser timezone constant survives the switch.
- The scheduling timezone source remains the first active resource from `listResources`, whose name ordering is deterministic. Finance, CRM, and Socials date ranges use the existing `fin_settings.timezone`. This batch does not invent a global timezone setting or use a browser fallback for an organization-scoped domain.
- Drag/move preserves the booking or grouped visit's existing absolute duration by resolving the new start once and adding the original duration. Resize resolves its checked wall end and refuses `end <= start`. Fold tests cover both rules.
- A gap/fold outcome is announced through the existing form/calendar error or toast infrastructure using translated copy. No new layout system or modal flow is introduced.

### HC-009 — explicit date-range timezone policy

- `RangeContext` carries a required `timeZone` for date-only preset resolution. Date keys are derived from `ctx.now` in that zone, then shifted with date-key arithmetic.
- Month/year shifts clamp to the last valid day of the target month: March 31 minus one month is February 28 (February 29 in a leap year), and February 29 minus one year is February 28. MTD and YTD begin on day 1 and January 1 in the declared timezone. No native `setMonth`/`setFullYear` rollover is allowed to spill into the next month.
- CRM, Finances, and Socials return their organization/business timezone and pass it to `DateRangeControls`. Their server-side default/custom window adapters use the same date-key policy. Finance keeps its existing `resolvePeriodWindow` behavior.
- Reliability passes the current viewer timezone because its scope can be global and its datetime-local inputs are viewer-local. `1h`/`6h`/`24h` keep their existing elapsed-millisecond resolver and datetime-local control contract; offset-bearing sub-day range values are outside HC-009.
- `all` remains the supplied real data extent; open bounds and URL keys do not change.

### HC-010 — fresh invocation clock

- `DateRangeControls` builds `{ now: new Date(), timeZone, dataMin, dataMax }` inside `applyRange` and stored-default application.
- A minute-resolution state clock drives active-preset matching. Its interval is installed on mount and cleaned on destroy; timezone/data-span prop changes recompute without retaining the old context.
- Tests inject/fake the clock; production code does not add a public debug-only prop solely for tests unless the existing mounted-test convention requires it.

## 3. Blast-radius and caller inventory

### Calendar page and shared-component matrix

| Boundary | Production callers | Current role | Required migration |
|---|---|---|---|
| Calendar server loads | POS appointments; Scheduling calendar | resolve `orgTz`, `day`, load window | return the same `orgTz`; preserve payload/query shapes otherwise |
| `BookingCalendar` | POS appointments; Scheduling calendar | grid/agenda/month projection and drag writes | required `timeZone`; all instant projection and wall serialization use it |
| Window-cache bucketing | both calendar pages | split SSR/fetched bookings (and POS invoices) into ISO weeks | organization `instantDateKey`; keep cache protocol unchanged |
| Visible tag range | both calendar pages | decide which event tags are currently visible | organization `instantDateKey`; selected-tag retention unchanged |
| Calendar Table/Board | both calendar pages | alternate projections over the same rows | explicit timezone for timestamp labels; no board/column behavior change |
| `BookingCreateDrawer` → `AppointmentCreatePanel` → `AppointmentForm` | both calendar pages | slot click and New action create | thread timezone to default day, slot read, slot label, override write |
| `AppointmentCreatePanel` direct route | POS appointments new | deep-link create | page load returns timezone and forwards it |
| `AppointmentForm` other callers | POS `ScheduleStep`; `ClientAccountDrawer` package draw | sold-line/package appointment create | owning page maps already-loaded active resources to the same org timezone and forwards it |
| `BookingCreateForm` | Scheduling bookings new | legacy standalone create form | page load returns timezone; replace default-day/slot-window/slot-label local rules |
| `BookingDetailDrawer` | both calendars; `BookingsView` | timestamp display and reschedule | explicit timezone from each host; typed wall write; duration remains absolute |
| POS direct pending-line drop | POS appointments | creates and links booking without opening form | typed organization wall conversion; gap blocks POST; fold uses earlier candidate |
| Created-booking continuation | POS appointments, Scheduling calendar, POS new route | refresh then focus created day | project returned instant in the same timezone; callback remains once |

`BookingCalendar` has two production callers. `AppointmentForm` has four effective host paths (calendar drawer/deep-link panel, sell schedule step, account package draw), and `BookingDetailDrawer` has three host paths (two calendars and `BookingsView`). All are included so adding a timezone prop cannot leave a silent browser-local fallback.

The scheduling timezone choice is deterministic because `listResources` orders by resource name before selecting the first active row; all calendar, direct-create, sell-step, account-drawer, and bookings-list hosts preserve that exact policy. Dashboard range hosts preserve `fin_settings.timezone`. An empty scheduling resource set keeps the existing `America/Lima` fallback on the server only; browser timezone is never consulted.

### Dashboard date-range matrix

| Caller | Value shape | Timezone policy | Server alignment |
|---|---|---|---|
| CRM dashboard | date-only | organization business timezone | custom inclusive bounds use `zonedDayWindow`; initial displayed keys use the same zone |
| Finances dashboard | date-only | `fin_settings.timezone` | already resolves through `resolvePeriodWindow`; return/pass the timezone |
| Socials dashboard | date-only Meta fact keys | organization business timezone for “today”/relative presets | default date keys use organization today; fact-key query contract stays date-only |
| Reliability | datetime for sub-day; date-only for longer presets | viewer timezone, stated explicitly | existing client timestamp adapter round-trips the declared viewer-local values |

### Read/write conversion boundaries

| Direction | Input | Output | Rule |
|---|---|---|---|
| read | booking/invoice ISO instant | day key + minute + label | project with explicit organization timezone |
| read | `now` instant | today key + now-line minute | project with explicit organization timezone each minute |
| read | date key | weekday/label/next key | date-key arithmetic only; never browser-local parsing |
| write | drag/resize wall day + minute | ISO instant | typed candidate resolver; gap blocks; fold preserves source offset or chooses earlier |
| write | create/manual override/direct drop wall day + minute | ISO instant | typed candidate resolver; gap blocks; fold chooses earlier without a source offset |
| write | selected day | slot-query `[from,to)` | start of selected organization day to start of next organization date |
| range read/write | organization `now` + preset | inclusive date keys | date-key arithmetic in explicit policy timezone |
| range read/write | viewer `now` + sub-day preset | datetime-local strings | preserve the existing viewer-local contract; HC-009 changes only date-only arithmetic |

### Lifecycle and accessibility boundaries

- Timezone is page data scoped to the active organization. A late request may still complete, but it cannot change which timezone converts a later user gesture.
- Gesture state stores the organization/scope generation and timezone it began with. Commit compares them to the current values; mismatch clears the ghost/pending override, reports cancellation where needed, and performs zero writes.
- A conversion error happens before a mutation request. Existing checked mutation/refresh semantics remain unchanged after a request begins; the temporal patch does not introduce retries or replay writes.
- Gap/invalid errors use an existing `role="alert"` form region or toast. Busy controls, focus restoration, and keyboard drag/resize behavior stay unchanged.
- New copy is localized. UI code uses shared primitives and semantic tokens; `lint:design` and `lint:tokens` remain green.

## 4. DELTA

| ID | Transition | Slice | Primary code boundaries | Proof |
|---|---|---:|---|---|
| HC-008A | server-only, unchecked IANA conversion → one client-safe typed temporal seam | 1 | shared scheduling/date utility; server `tz.ts` compatibility imports; calendar/date-range day-window helpers | pure exact/gap/fold/23h/25h/date-key tests |
| HC-008B | resolved-but-private `orgTz` → explicit page/component contract | 1 | both calendar loads; shared component prop types; standalone form host loads | load characterization and type checks |
| HC-008C | browser-local calendar reads → organization projection | 2 | both calendar pages; BookingCalendar; Table/Board; drawer/form labels | browser-TZ-independent component/helper tests |
| HC-008D | browser-local wall writes and fixed 24h slot windows → checked organization conversion | 3 | drag/resize/merge, direct drop, create override, detail reschedule, slot queries | exact request-body, no-request-on-gap, fold policy tests |
| HC-009 | mixed local mutation/UTC serialization → explicit timezone date-key arithmetic | 4 | date-range registry, four caller policies, aligned page-load defaults/bounds | negative/positive offset and rollover matrix |
| HC-010 | mount-frozen context → apply-time clock plus minute matching clock | 4 | DateRangeControls and mounted test | fake-time hours/midnight test and interval cleanup |

## 5. Implementation slices

### Slice 1 — Temporal contract and page payloads

**Topics:** `data`, `logic`

- Extract/reuse one client-safe IANA conversion module with typed gap/fold results and date-key primitives.
- Audit the complete `tz.ts` production caller set, keep its public `Date`-returning exports compatible, and route new checked calendar writes through the typed seam. Replace duplicate day-window internals only where the old contract is preserved.
- Return `orgTz` from both calendar loads and timezone data from every included shared-form host.
- Add pure and load-contract tests. No user-facing calendar behavior changes in isolation.

Definition of done: exact, invalid, New York and Lord Howe gap/fold, midnight transition, skipped local date, 23-hour day, 25-hour day, Kiritimati boundary, Kathmandu non-hour offset, bounded-cache, and date-key rollover/clamping tests pass; legacy server caller tests remain unchanged and both calendar load payloads expose the exact zone used to build their window.

### Slice 2 — Organization-time calendar reads

**Topics:** `data`, `logic`, `ui`, `ux`

- Migrate instant-to-day/minute/time-label projection, now/today, week bucketing, visible-tag membership, created-day navigation, and date-key labels/weekday lookup to the explicit timezone/date-key seam.
- Thread the same timezone through calendar Table, Board, drawer displays, create-form slot labels, and all effective hosts of those shared components.
- Keep layout, views, lanes, endpoint shapes, and server mutation semantics unchanged.

Definition of done: with browser TZ UTC and org TZ America/Lima, a near-midnight booking stays in the clinic day/week/filter; grid, Table, Board, drawer, and slot labels agree; 09:00 renders at 09:00; now/today and date-only weekday labels remain organization-correct.

### Slice 3 — Checked organization wall-time writes

**Topics:** `data`, `logic`, `ui`, `ux`

- Migrate drag/resize/merge, POS direct drop, create/manual override, detail reschedule, and slot-query day windows to the typed organization wall-time seam.
- Use existing alert/toast surfaces for gap/invalid feedback and preserve the source offset for a fold where possible.
- Capture organization/scope/timezone when each gesture/override begins and cancel before `fetch` when any changes. A move computes `end` from the original absolute duration; resize validates its resolved end strictly follows start.
- Remove the HC-008 `TODO(handoff)` markers only when their full read/write behavior is covered.
- Keep mutation endpoints, payload field names, conflict flows, duration semantics, and checked refresh behavior unchanged.

Definition of done: a Lima 09:00 drag/direct drop/reschedule sends `14:00Z`; a New York/Lord Howe gap makes zero requests; both fold candidates and the source-offset/earlier fallback rule are asserted; move duration stays absolute and resize ends after start around folds; spring/fall slot windows are 23/25 hours without fixed-day addition; an organization/timezone switch mid-gesture makes zero requests.

### Slice 4 — Date-only ranges and live `now`

**Topics:** `logic`, `ui`, `ux`

- Add the explicit `DateRangeControls` timezone policy and date-key arithmetic.
- Align the four production callers and their server default/boundary adapters.
- Build contexts at invocation time and advance active matching on a cleaned-up minute clock.
- Preserve URL parameter names, saved range configuration, open bounds, period coercion, and control layout.

Definition of done: all date-only presets pass the zone/boundary/rollover matrix; existing sub-day behavior stays green; a mounted control clicked after hours/across midnight uses the advanced time and does not leak an interval after destroy.

## 6. Out of scope

- No database migration, stored timestamp rewrite, organization-timezone settings redesign, scheduling API request-shape change, or new dependency.
- No per-resource multi-timezone calendar. This pass uses the same server-resolved organization timezone that currently defines the page window.
- No change to the legacy `zonedTimeToUtc(...): Date` policy used by slot computation and its recurrence/public-booking consumers. They require a separate compatibility-reviewed migration if checked gap/fold results are later desired there.
- No broad calendar or dashboard visual redesign. Feedback is limited to the existing status/toast surfaces required to prevent an invalid write.
- No offset-bearing redesign of Reliability's datetime-local range values.
- No lane mutation, cache-generation, failed-week, board keyboard, renderer-persistence, custom-field, month-capability, clipping, or header-tooltip implementation. Those are HC-011 through HC-023 in Section 8.
- No claim that unit/type checks prove visual/runtime behavior. Parent-owned browser qualification remains required.

## 7. Verification

### Test matrix for Slices 1–4

| Finding | Scenario | Required green proof |
|---|---|---|
| HC-008 read | browser UTC, org Lima, booking `2026-10-03T04:30Z` | organization day is October 2; week cache, tag filter, grid, Table/Board, drawer agree |
| HC-008 now | browser Tokyo, org Lima, controlled instant | today column and now-line minute match Lima |
| HC-008 drag | org Lima wall 09:00 | move request uses `14:00Z`; end is after start; one mutation only |
| HC-008 direct/create/edit | direct ticket drop, typed override, detail reschedule | every request uses organization conversion; created-day navigation projects the response in the same zone |
| HC-008 slot window | New York spring/fall transition day | query is `[start of day,start of next date)` and spans 23/25 hours, never fixed 24 hours |
| HC-008 gap | New York `2026-03-08 02:30` | typed `nonexistent`; translated alert; zero POST/PATCH |
| HC-008 fold | New York `2026-11-01 01:30` | two candidates; source offset is preserved for move/edit, otherwise earlier candidate is chosen |
| HC-008 half-hour DST | Lord Howe gap and fold | zero/two round-trip candidates with 30-minute separation; no whole-hour assumption |
| HC-008 skipped/midnight | a midnight transition and a wholly skipped local date | bounded typed result; no neighboring date or fixed-24-hour fallback |
| HC-008 duration | move and resize across a fold | move keeps original absolute duration; resize sends only `end > start` |
| HC-008 date keys | weekday/month/date labels under UTC, Lima, Kiritimati browser TZ | identical label/day/weekday for the same key |
| HC-008 org switch | rerender/navigate from Lima org to Tokyo org | new projection uses Tokyo; old timezone does not convert a new gesture |
| HC-009 negative offset | `now=2026-10-03T01:30Z`, org Lima | `1d` emits Oct 1–2; MTD/YTD end Oct 2 |
| HC-009 positive offset | instant at Kiritimati local 00:30 | every date-only preset ends on the Kiritimati calendar date |
| HC-009 rollover | leap day, month end, year end, 1y/2mo/3mo/6mo | valid deterministic date keys; no UTC/local drift |
| HC-009 clamp | March 31 minus one month; leap-day minus one year | February 28/29 target-day clamp, never March spillover |
| HC-010 click freshness | mount, advance hours and across midnight, click relative preset | bounds use click time, not mount time |
| HC-010 active matching | advance minute/date without prop changes | active preset recomputes; destroyed component has no live interval |

### Narrow commands

Run focused temporal/date-range tests first, followed by calendar load/component tests added by the slices. Then run `bun run check`, `bun run lint:design`, and `bun run lint:tokens`. Do not use source-text assertions as behavioral proof.

### End-to-end verification

Parent-owned Browser Harness qualification runs the app with a browser timezone different from the organization timezone and uses seeded, non-production fixtures. It verifies near-midnight placement, cache/filter membership, now line, one drag/resize, one direct/create path, one detail reschedule, and date-range clicks after a fake/advanced clock where the harness supports it. The receipt records browser TZ, organization TZ, exact request instants, visible day/time, mutation count, and any scenario that remained unit-only.

## 8. Follow-on calendar plan — HC-011 through HC-023

These slices are acceptance planning only in this pass. They require their own implementation review before production edits. Their order keeps data-integrity risks ahead of convenience and polish.

### Slice 5 — Generation-safe calendar cache and visible failure state (HC-012, HC-013)

**Topics:** `data`, `logic`, `ui`, `ux`

- Give every week key a request generation/abort identity. Mutation refresh marks visible in-flight keys dirty; obsolete or evicted responses cannot write, and dirty keys refetch after the old request settles.
- Expose per-week loading/error state. A visible failed week renders an unavailable/retry strip or blocked column, never a plausible empty schedule.
- Acceptance: deferred old response resolved last cannot overwrite new data or resurrect eviction; a failed visible week remains labeled without another scroll, Retry loads it once, and failure/success is announced accessibly.

### Slice 6 — Atomic custom-lane/group move command (HC-011)

**Topics:** `data`, `logic`, `ui`

- Prefer one authorized server command for group time/resource plus custom-property reclassification in one transaction. If the service boundary cannot be atomic, return exact per-ID/stage outcomes and reconcile every affected projection before offering a stage-specific repair.
- The calendar and Board await and present the result; no `void cv.apply(...)`, swallowed `failedIds`, silent split group, or blanket replay.
- Acceptance: inject failure in one member custom write and after custom success/before move; persistent state is atomic or explicitly partial/reconciled, and repair never duplicates the acknowledged stage.

### Slice 7 — Truthful and accessible reclassification (HC-014, HC-015)

**Topics:** `logic`, `ui`, `ux`

- For status/kind/service/tags lanes, either connect a confirmed source-specific write or prevent cross-lane ghost/drop and label the axis view-only. No gesture may preview a write the product cannot perform.
- Add a shared “Move to…” card action/menu for Board keyboard and touch use, retaining drag as an enhancement. Preserve focus and announce success/failure.
- Acceptance: every built-in axis either persists one correct change or rejects before a misleading ghost; keyboard-only Board reclassification performs one write and retains focus.

### Slice 8 — Stable facet registry and complete dimensions (HC-017, HC-018, HC-020)

**Topics:** `data`, `logic`, `ui`, `ux`

- Choose and document multi-tag semantics: explicit primary tag, or lane-aware duplicate projections with one record identity and deduplicated open/mutation behavior.
- Derive lane order from a stable org/viewer registry rather than the loaded booking union. Newly loaded weeks cannot redivide the current spatial map.
- Thread category identity/name into `CalendarBooking` and the stable source registry, including Unclassified.
- Acceptance: reversing server tag order does not change placement; loading a novel future-week facet does not move existing lanes; category produces named stable lanes and one mutation/open per booking.

### Slice 9 — Preserve cross-view state (HC-016)

**Topics:** `logic`, `ui`, `ux`

- Hoist the minimum route/org-keyed runway anchor, scroll position, and documented fan selection state, or keep renderers mounted with correct `hidden`/`inert`/focus behavior after measuring cache cost.
- Acceptance: settle a distant date and fan state, switch Calendar → Table/Board → Calendar, and restore the same date/scroll anchor and the chosen fan-state contract without duplicate fetches or focus entering a hidden renderer.

### Slice 10 — Shared custom booking fields (HC-019)

**Topics:** `data`, `logic`, `ui`, `permissions`

- Load one org-scoped custom-property definition/value projection and render it through a reusable field section across calendar Table, Board, `BookingsView`, and `BookingDetailDrawer`.
- Preserve field- and record-level read/edit authorization; restricted personas do not receive or infer hidden values.
- Acceptance: one seeded custom value has the same allowed read/edit state on all four surfaces, and restricted fixtures expose neither the value nor an enabled editor.

### Slice 11 — Explicit month capability contract (HC-021)

**Topics:** `logic`, `ui`, `ux`

- Define which ticket, grouped-visit, detail, drop, and mutation signals month supports. Add safe compact/day-level affordances; for unsupported operations provide a discoverable one-click jump to the correct day/week rather than an inert imitation.
- Acceptance: invoiced, grouped, and pending-ticket fixtures each expose the supported signal/action or an accessible transition to the full interaction view; the contract is visible and tested.

### Slice 12 — Out-of-hours containment and accessible lane labels (HC-022, HC-023)

**Topics:** `ui`, `ux`

- Clip committed booking content/hitboxes inside a dedicated track viewport, show top/bottom continuation, and keep drag/create ghosts and handles in the correct overlay layer.
- Replace native-title-only truncated lane labels with the shared accessible Tooltip or focus/tap details affordance. A lane-width preference is optional only if evidence shows the tooltip cannot make dense lanes usable.
- Acceptance: before/after-hours bookings remain discoverable with bounded hit targets; drag/create overlays are not clipped; keyboard/touch/assistive users can obtain the full lane label without hover.

## 9. Review gates

Pass 1 — Standards: approved after verifying the shared seam preserves the complete legacy server caller contract, uses bounded formatter/candidate work, follows Svelte 5 component contracts, i18n, semantic tokens/primitives, data gates, and the no-write-on-invalid-conversion rule.

Pass 2 — Spec: approved after verifying every HC-008 through HC-010 read/write boundary is inventoried; New York/Lord Howe gaps/folds, midnight/skipped dates, gesture scope changes, duration, canonical timezone sources, and date-key clamping are decidable; each DELTA has proving evidence; Slices 1–4 are implementation-sized; and HC-011 through HC-023 remain bounded follow-on acceptance rather than implicit current scope.
