# Quickstart: validating spec 139

## Prerequisites

- A fresh hub clone of `origin/master` with the slice branch checked out. Run `bun install --frozen-lockfile`, `bunx svelte-kit sync`, `bun run i18n:compile`.
- **Never** run the full suite. Unset `SUPABASE_DB_URL` and every production variable in that shell. Run only the files below, in the foreground, one gate at a time (`svelte-check` runs out of memory next to another gate).
- Local QA stack (hub QA-stack recipe): `bun run qa:up`, then `bun run dev:local`. Apply the slice's migration to the local database the way the recipe does for other migrations.
- The local stack has no WhatsApp. "A client reply" is a row inserted into the local `messages` table (SQL below). "The agent's message" is checked in `sched_reconfirm_events` and in the mocked send of the tests, not on a phone.
- Seeded org needs: one service with "requiere confirmación", one without, one resource with availability next week, one client with a phone, and reminders enabled with a WhatsApp channel chosen (the S1 seed adds a sent reminder and an open case).

Fake inbound reply (local database only):

```sql
insert into messages (client_id, org_id, direction, channel, account_id, sender_id, content, occurred_at)
values ('qa-' || gen_random_uuid(), '<org>', 'inbound', 'whatsapp', '<account or null>', '<client phone>', 'no voy a poder', now());
```

Run the reminders tick locally:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:<port>/api/scheduling/reminders/tick
curl -s -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:<port>/api/jobs/tick     # inbox rules
```

## S1 — a "no" stops cancelling; staff are told

Automated:

```bash
bun x vitest run src/server/services/reminder-compose.test.ts \
  src/server/scheduling/reminders.test.ts \
  src/server/scheduling/reconfirm.test.ts \
  src/server/services/reminders-transition.test.ts \
  src/server/services/reconfirm.service.test.ts \
  src/server/services/inbox/rules/appointment-reconfirm.test.ts \
  src/server/entitlements/ai-call-inventory.test.ts \
  scripts/qa/seed/seed.contract.test.ts
bun run qa:check-baseline
bun run check
```

What the tests must prove (spec DELTA rows 1 and 2):
- a reply "no" never calls `setBookingStatus(…, 'cancelled')`; it opens one case; the booking status is unchanged;
- a second "no" adds an event and no second case;
- a negation with confidence 0.6 is logged as negation and acted on as unclear;
- an `accepted` booking that got only a 24 h reminder is scanned;
- a reply already covered by a logged verdict is not classified again (no second classifier call);
- a reply from another WhatsApp account of the org is ignored;
- the rule emits one draft per case and resolves it when the case closes or the booking is no longer live.

Manual (QA stack):
1. Book the "requiere confirmación" service for next week. Run the reminders tick. Expect one `sched_reminders` row, `stage = 'confirmation'`, `status` `sent` or `failed` (no gateway locally; for the check, set it to `sent` by SQL).
2. Insert the fake reply "no voy a poder". Run the reminders tick.
   - Expect: the booking is still `pending`. One `sched_reconfirm_cases` row, `closed_at` null. One `sched_reconfirm_events` row of kind `verdict` with a confidence.
   - Expect: the stock reservation and the package session of the booking are untouched (the drawer still shows them).
3. Run the jobs tick. Expect one inbox notification "Dijo que no puede asistir" for a user with `scheduling:manage`. Its link opens the calendar on the appointment's day.
4. Cancel the booking from the drawer. Run the jobs tick. Expect the case closed (`booking_closed`) and the notification resolved.
5. Repeat step 2 on a new booking with the reply "sí". Expect `accepted`, no case, one `verdict` event.

## S2 — the agent asks; no answer goes to staff

Automated:

```bash
bun x vitest run src/server/services/reconfirm.service.test.ts \
  src/server/services/stale-sends.service.test.ts \
  src/server/services/reminder-compose.test.ts \
  src/server/auth/scheduling-read.test.ts
bun run i18n:compile && bun run check
```

What the tests must prove (DELTA rows 1 and 5):
- a new case sends exactly one `ask` message to the reminder's phone and account, with the idempotency key `reconf-<caseId>-ask`; a second tick sends nothing;
- the template names the service, the date and the business, and contains no placeholder;
- with a fake clock: no reply by `wait_until` → `no_answer`; a reply that is not understood → `unclear`; `wait_until` is never later than 2 h before the start;
- a case opened less than 2 h before the start sends nothing and gets `late_reply`;
- an opted-out contact gets no message;
- a human message in the chat after the case opened → `staff_handling`, no agent send;
- a failed send → `send_failed`; a message stuck in `sending` for 15 minutes is failed by the sweep;
- the service never calls `setBookingStatus` with anything but `'accepted'`.

Manual (QA stack): repeat S1 step 2, run the reminders tick twice.
- Expect one `agent_message` event with step `ask` (`failed` locally, because there is no gateway: the case shows `send_failed`). To see the happy path locally, point `gatewayCall` at the QA gateway stub if the recipe has one; otherwise rely on the test.
- Set `wait_until` to the past by SQL, run the tick: expect `no_answer`, and after the jobs tick the notification "Sin respuesta".

## S3 — staff see and act on the case

Automated:

```bash
bun x vitest run src/lib/components/scheduling/reconfirm-section.mounted.test.ts \
  src/lib/components/scheduling/booking-detail-drawer.mounted.test.ts \
  src/routes/\(app\)/scheduling/reminders/reminders-settings.mounted.test.ts \
  src/server/services/calendar-window.service.test.ts \
  src/routes/api/scheduling/reconfirmations/\[id\]/close/server.test.ts
bun run i18n:compile
bun run lint:design && bun run lint:tokens     # debt may only decrease
bun run check
```

What the tests must prove (DELTA row 6 and FR-005):
- the drawer shows the badge and the section only while a case is open, and the closed result afterwards;
- each result shows its text and the right actions; "Marcar como atendido" calls the close route and the badge disappears;
- a user without `scheduling:manage` gets 403 from the close route, with the permission message;
- the settings page shows "Recordatorios apagados" when off, "WhatsApp desconectado" when a chosen account has `linked === false`, the "could not check" notice when the catalog is null, and none of them when all is well;
- the wait-time field saves 1–168 and refuses 0 with the range message.

Manual (QA stack, with the seeded open case):
1. Open the inbox notification. Expect the calendar on the right day with the drawer open.
2. Expect "Por reconfirmar" beside the status badge, the summary, the conversation link, and the four actions.
3. Hover the block in the calendar. Expect the badge in the hover card.
4. Press "Marcar como atendido". Expect the badge gone at once and the notification resolved after the jobs tick.
5. Settings → Recordatorios: turn reminders off and on; set the wait time to 12.
6. Keyboard only: reach every action in the section; the badge text is read by a screen reader.

## S4 — the agent understands the answer and can move the appointment

Automated:

```bash
bun x vitest run src/server/services/reminder-compose.test.ts \
  src/server/scheduling/reconfirm.test.ts \
  src/server/services/reconfirm.service.test.ts \
  src/server/services/scheduling-bookings-assistant-reschedule.test.ts \
  src/server/services/scheduling-bookings-reschedule.test.ts
bun run i18n:compile && bun run check
```

What the tests must prove (DELTA rows 3 and 4):
- "el lunes en la tarde" → up to three offered slots, same service and same staff member, all on Monday afternoon in the resource timezone;
- a pick of option 2 → the booking moves, becomes `accepted`, its time-based reminder claims are gone, the case is `rescheduled` and closed; all in one transaction (a thrown conflict leaves the booking, the status and the case untouched);
- a pick with confidence below 0.75, or of an option that was not offered, moves nothing;
- the slot was taken meanwhile → `wants_other_date`, closing message, nothing moved;
- no time named, or a grouped visit → `wants_other_date`, no offer;
- "ya no quiero la cita" → `declined`, booking untouched; "mejor sí voy" → `will_come`, `pending` becomes `accepted`;
- an org without `ai.proactive` never calls the classifier and ends as `no_answer` or `unclear`.

Manual (QA stack): the classifier needs `OPENROUTER_API_KEY`; without it every answer is `unclear` and only the test proves the flow. With a key: insert the reply "el lunes en la tarde", run the tick, read the `offer` event, insert "la 2", run the tick, and check the booking's new time in the calendar.

## First day in production (owner, after S2)

Not code. In order:
1. Schedule `/api/scheduling/reminders/tick` on netcup and update `src/lib/automations/system-automations.ts`.
2. FACES: reconnect WhatsApp, choose the account in Recordatorios, turn reminders on.
3. Book a test appointment for an internal phone, answer "no" from it, and watch: the booking stays, the question arrives, the inbox shows the report.
