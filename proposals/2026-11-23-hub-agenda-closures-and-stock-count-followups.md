---
id: 2026-11-23-hub-agenda-closures-and-stock-count-followups
title: Agenda closures follow-ups (slot engine, drag warnings, per person) + a stock count screen with loans and returns
status: draft
created: 2026-11-23
updated: 2026-11-23
repos: [minion_hub]
source: 147-agenda-closures
value: 6
effort: M
---

# Agenda closures follow-ups + stock count screen

Open ends left by spec 147 (Cerrar agenda), plus the stock-count request from the same FACES staff messages (2026-11-23).

## AS-IS

- **Slot engine ignores closures.** The public booking page and the assistant can still offer a time inside a closure in an org that has working-hours schedules. FACES has none, so its engine offers no slots anyway. Staff and the assistant send the same `source: 'internal'` and `bypassRules: true` (`api/scheduling/bookings/_handlers.ts:166-167` vs `api/gateway/actions/booking-create/+server.ts:64-65`), so nothing tells the two callers apart.
- **No warning when dragging or dropping an appointment into a closure.** Only the create drawer warns (spec 147).
- **Closures are org-wide only.** There is no per-person closure, and HR leave never reaches the agenda grid.
- **Stock counts are done on paper.** Staff write "19 + 3 me devolvió = 22" or "12 (+1 le presté a Mauricio)", and an agent posts one adjustment per count (STE-2026-00694, 00722, 00723). Loans to a colleague and returns of unused units from a doctor have no movement of their own.
- **The owner's goal for counts** (2026-11-23): "The idea of manual counts is to control deviations within a specific timeframe and determine root-causes for consistent deviations."

## TO-BE

1. An explicit `respectClosures` option on `getSlotsForEventType` and `CreateBookingInput`, set only for the public page, the assistant's slot options, gateway booking-create and assistant reschedule. Closures enter `computeSlots` unpadded by service buffers.
2. A drag-move, resize or drag-in into a closure asks before committing, using the `mergeAsk` ConfirmDialog pattern (`BookingCalendar.svelte` `onDragEnd`).
3. Per-person closures: a nullable `resource_id` on `sched_closures`, and HR-approved leave shown as a closure on that person's column.
4. **Count screen.** Staff type the quantity on the shelf for each item. The screen shows the difference against the system and posts one adjustment with a reason per line. Every count keeps its differences, so a report can show items that are off again and again over a period (the owner's root-cause goal).
5. **Loans and returns.**
   - "Prestar a <persona>" is a transfer to a "Préstamos" warehouse; the movement type already exists. "Devolver" moves the unit back.
   - "Devolución sin usar" is an add-back that names the doctor.
   - The shelf count then equals the system with no margin notes.

## DELTA

Each item is its own slice with its own spec. Proof: unit tests for item 1 (no slot inside a closure for public/assistant; staff unaffected), mounted tests for item 2, and a QA-stack journey for the count screen.

## Out of scope

Changing how the ledger orders back-dated movements. The ledger refuses rows older than a bin's newest row by design (`stock.service.ts` `assertPostedAtAdmissible`), which is why the 17/11 trade was posted on 23/11 with `metadata.occurredOn`.
