---
id: 2026-11-21-hub-calendar-phones-followups
title: "Calendar on phones — follow-ups left open by slice 1 (spec 145)"
status: review
created: 2026-11-21
updated: 2026-11-21
repos: [minion_hub]
tags: [ui]
source: agent-handoff
---

# Calendar on phones — follow-ups left open by slice 1

Open ends of hub slice S1 of [spec 145](../specs/145-calendar-phones/spec.md). Each has a `TODO(handoff)` at its site unless it predates the slice.

## AS-IS

| # | Open end | Where | Evidence |
|---|---|---|---|
| 1 | The phone-only parts of `/pos/appointments` ("…" rows, the cash-shift dialog opened from them, the unscheduled-services sheet) have no automated browser test. The mobile fixture mounts the scheduling calendar page only. | `src/routes/(app)/pos/appointments/PageBody.svelte` (kebab rows) · `tests/fixtures/mobile-composition/` | Checked by hand at 390 × 844 on the local QA stack; screenshots in the slice PR. |
| 2 | On a first visit without the `hub_phone` cookie the address may not get `view=day` when the router is not started yet. The page still shows Día. | both `PageBody.svelte` files, the `replaceState` effect | Seen in the browser: URL stayed `?date=…`. |
| 3 | The assistant's OPEN chat panel does not clear a reserved corner, so it can cover the calendar's floating "+". Only the launcher moves. | `src/lib/components/layout/FloatingAssistant.svelte` | Read in code; not reproduced. |
| 4 | In the list view a week-strip day tap navigates (a load) instead of scrolling. | `BookingCalendar.svelte`, existing agenda TODO | Implementer report. |
| 5 | The linked-tags switch track fills its whole 44 px touch area on coarse pointers (phone Filters sheet and the 768 px toolbar). Predates the slice. | `Toggle` / `app.css` | Two `test.fixme` in `tests/e2e/ui-audit/calendar-mobile.spec.ts`. |
| 6 | `tests/e2e/ui-audit/calendar-lanes.spec.ts` fails all 9 tests on `master` (waits for `.head-subs`), at every width. Predates the slice. | that spec | Ran on untouched master `3677e35a`: 9 failed. |
| 9 | Phone layout stories for the two pages (`src/lib/stories/Layouts/`, task T025) were not written; the compact calendar and the week strip have stories. | spec 145 `tasks.md` T025 | — |
| 7 | Free gaps in the list view ("Libre · + Agendar") shown in the option C mock-up. Deferred by the spec: needs the server's slot calculation. | spec 145 Assumptions | — |
| 8 | Single tab stop with arrow-key navigation across the grid. Deferred by the spec to the accessibility program. | spec 145 Out of scope | — |

## TO-BE

1. A POS page in the mobile fixture (or a QA-stack browser test) covering the "…" rows, the shift dialog and the unscheduled sheet at 390 × 844.
2. The address always carries `view=day` after the first phone visit.
3. The open assistant panel stays clear of a reserved corner.
4. Week-strip taps in the list scroll to the day.
5. The switch shows a track shorter than its hit area; the two `fixme` tests pass.
6. `calendar-lanes.spec.ts` green on master.
7. and 8. Their own specs.
9. Phone layout stories for `/pos/appointments` and `/scheduling/calendar`.

## Out of scope

Slices S2 to S4 of spec 145 (touch, list and month cells, status and announcements), which are already specified.
