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

Open ends of hub slices S1 to S4 of [spec 145](../specs/145-calendar-phones/spec.md). Each has a `TODO(handoff)` at its site unless it predates the slice.

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
| 10 | Hold gestures on phones (hold to create, hold to move, edge scrolling) have no automated browser test. | `BookingCalendar.svelte`, `src/lib/actions/longpress.ts` | Checked by hand with CDP touch events on the mobile fixture (S2 PR #710). |
| 11 | No slice was tried on a real iPhone or Android phone, or with VoiceOver or TalkBack. | all of spec 145 | Only desktop Chromium with phone emulation was used. |
| 12 | On phones each week that fails to load shows its own alert banner. | `CalendarWindowIssues.svelte` | Seen on the fixture with several failed weeks. |
| 13 | A pen on a desktop gets the touch behaviour (hold to drag, no context menu). | `BookingCalendar.svelte`, `lastPointerType` | Read in code. |
| 14 | The spoken appointment count counts appointments, so a visit drawn as one block with two services counts as two. | `BookingCalendar.svelte`, announcement effect | Fixture: "20 appointments" with 19 blocks on screen. |
| 15 | The products marker can cover the end of the status word on blocks 72 to 90 px tall. | `BookingCalendar.svelte`, `.evt-products` / `.evt-status` | Audit of S4, worked out from the CSS. |
| 16 | Month chips show status by colour only. Predates the spec. | `BookingCalendar.svelte`, `.m-chip` | Audit of S4. |
| 17 | Missing tests: month title with more than 6 rows on screen; a merged visit whose lead is cancelled (status line and list row); the 72 px status-line boundary with a "cancelled" line. | `calendar-status.mounted.test.ts` and the S3 mounted tests | Audits of S3 and S4. |

## TO-BE

1. A POS page in the mobile fixture (or a QA-stack browser test) covering the "…" rows, the shift dialog and the unscheduled sheet at 390 × 844.
2. The address always carries `view=day` after the first phone visit.
3. The open assistant panel stays clear of a reserved corner.
4. Week-strip taps in the list scroll to the day.
5. The switch shows a track shorter than its hit area; the two `fixme` tests pass.
6. `calendar-lanes.spec.ts` green on master.
7. and 8. Their own specs.
9. Phone layout stories for `/pos/appointments` and `/scheduling/calendar`.
10. Browser tests that drive touch events for hold to create, hold to move and edge scrolling.
11. A recorded check on one iPhone and one Android phone, with the screen reader on.
12. One banner for all failed weeks on phones.
13. A pen on a desktop behaves like a mouse.
14. The spoken count matches the number of blocks (or says "visits").
15. The status word never sits under the products marker.
16. Month chips name their status in text for screen readers.
17. Those three tests exist.

## Out of scope

Nothing from spec 145 itself: all four slices are built (hub #706, #710, #718, #722).
