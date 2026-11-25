# Tasks: Reminder negation follow-up

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md) (R1–R9, corrections C1–C7), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md)

**Tests**: included, because the spec's DELTA table names a proof for every row. Tests are written before the code they prove wherever a task says "test first".

Paths are in the hub repository. "SVC" is `src/server/services/`, "SCHED" is `src/server/scheduling/`, "CMP" is `src/lib/components/scheduling/`. `[P]` = can run in parallel with the other `[P]` tasks of the same phase (disjoint files). Slice S1 = phases 1–3; S2 = phase 4; S3 = phase 5; S4 = phase 6. Every slice is one PR to `master` from a fresh clone.

Run only the test files named in quickstart.md, in the foreground. Never the full suite.

## Phase 1: Setup (S1)

- [ ] T001 Fresh hub clone on `feat/139-reminder-negation-followup-s1` from `origin/master`; `bun install --frozen-lockfile`, `bunx svelte-kit sync`, `bun run i18n:compile`
- [ ] T002 Confirm the two facts research could not prove by reading: (a) the JEV decisions endpoint accepts the S1 request (one `choice` over three options) with the local `OPENROUTER_API_KEY`; (b) the migration applies on the QA stack after `20261003140000_notification_legacy_reconciliation.sql`. Record both in the PR body

## Phase 2: Foundational (S1) — schema and pure helpers

- [ ] T003 Write `supabase/migrations/20261123120000_reconfirm_cases.sql` per data-model.md: `sched_reconfirm_cases`, `sched_reconfirm_events`, checks, the three indexes, `sched_reminder_config.negation_wait_hours`, RLS + grants loop copied from `20261025100000_crm_doors.sql:76-89`. Idempotent throughout
- [ ] T004 Drizzle mirrors `schedReconfirmCases`, `schedReconfirmEvents` and `negationWaitHours` in `src/server/db/pg-reminders-schema.ts`; add `negationWaitHours: 24` to the default shape in `SVC/reminder-config.service.ts:29-41` so the type still compiles
- [ ] T005 [P] QA seed in `scripts/qa/seed/scheduling.ts`: one sent client reminder and one open case on a seeded booking; keep `scripts/qa/seed/seed.contract.test.ts` green (pairing rule, `scripts/qa/check-migration-seed-pairing.ts:3-7`)
- [ ] T006 [P] Test first: `SCHED/reconfirm.test.ts` for `acted` (0.74 → unclear, 0.75 → verdict), `waitUntil` (24 h; capped at start − 2 h; null inside 2 h), `casePhase` and `caseTitle` for every row of the result table in data-model.md
- [ ] T007 [P] Create `SCHED/reconfirm.ts` with `CONFIDENCE_MIN`, `LATE_MS`, `acted`, `waitUntil`, `casePhase`, `caseTitle` (fixed Spanish titles) until T006 passes
- [ ] T008 [P] Test first, then code: `keywordVerdict` in `SCHED/reminders.ts` wrapping `parseYesNo` (`:128`): `'no'` → `negation`; confidence 1 for replies of at most three words, 0.5 otherwise ("no sé a qué hora es" → 0.5). Tests in `SCHED/reminders.test.ts`

## Phase 3: User Story 1 — a "no" opens a case and staff are told (S1)

- [ ] T009 [US1] Test first: extend `SVC/reminder-compose.test.ts` for the new `inferConfirmationReply`: the request goes to the decisions endpoint with the reminder text and the replies in `state`; the verdict is the winning option and the confidence its probability; no key, timeout, non-200 and malformed body each return `unclear` with confidence 0; "quiero cambiar la fecha" criteria sit under `negation`
- [ ] T010 [US1] In `SVC/reminder-compose.ts` add the private `jevDecide(state, questions)` (bounded body, 8 s timeout, `assertAiCallAllowed` when enforced, cost from `usage.cost`) and rewrite `inferConfirmationReply` to return `Classified<ReplyVerdict>` per contracts/api.md. `src/server/entitlements/ai-call-inventory.test.ts` must stay green without a new row
- [ ] T011 [P] [US1] Test first: `SVC/reconfirm.service.test.ts` (mocked `withOrgCore`, style of `doors-followup.service.test.ts`): `openCase` creates one case and one `verdict` event; a second call for the same subject returns `created: false` and adds only an event; `closeCase` is idempotent; `closeStaleCases` closes a case whose booking is `cancelled` (`booking_closed`) and one whose start changed (`moved_by_staff`); the module imports no cancel, release or redemption function
- [ ] T012 [US1] Create `SVC/reconfirm.service.ts` with `openCase`, `logVerdict`, `lastInboundAt`, `getCaseForBooking`, `openCaseBookingIds`, `closeCase`, `closeStaleCases` until T011 passes. Never log message text or phone numbers
- [ ] T013 [US1] Test first: rewrite `SVC/reminders-transition.test.ts` for the new scan: "no" never calls `setBookingStatus` with `'cancelled'` and calls `openCase`; "sí" on `pending` sets `accepted`; "sí" on `accepted` changes nothing; a low-confidence negation is logged and opens nothing; a reply at or before the cursor triggers no classifier call; replies from another account are not read; an unclear reply older than the wait time opens a case with result `unclear`; a reply after the start opens a case with `late_reply`; a booking closed during the scan is skipped as today (`BookingTransitionError`)
- [ ] T014 [US1] Rewrite `scanConfirmationReplies` in `SVC/reminders.service.ts:328-415`: candidate query for `pending` and `accepted` bookings with any sent client reminder in 7 days (start later than now − 1 day), carrying the latest reminder's `content`, `channel`, `recipient`, the send account and the booking's `metadata->>'groupId'`; inbound query filtered by account and by `occurred_at >` cursor; classify (JEV when `inferConfirmation`, else `keywordVerdict`); `logVerdict`; act per plan S1; write the CRM activity `booking_reconfirm` for a negation. `ConfirmScanResult` becomes `{ confirmed, opened, unclear }`; update `src/routes/api/scheduling/reminders/tick/+server.ts` counters (`declined` stays, always 0)
- [ ] T015 [P] [US1] Test first, then code: `SVC/inbox/rules/appointment-reconfirm.ts` + `.test.ts` per contracts/api.md (one draft per case phase, keys of other phases resolved, everything resolved when the case is closed by staff or the booking is not live, `expiresAt` for phase `done`, calls `closeStaleCases` first); register in `SVC/inbox/rules/index.ts`
- [ ] T016 [US1] Gates, one at a time: the S1 vitest list of quickstart.md, `bun run qa:check-baseline`, `bun run check`. Manual S1 steps 1–5 on `bun run dev:local`. Independent code audit. Draft PR `fix(scheduling): a client's "no" to a reminder no longer cancels the appointment — staff get a report`; the body lists C1–C5 and the T002 findings

## Phase 4: User Story 1 + 2 — the agent asks; silence goes to staff (S2)

- [ ] T017 [P] [US1] Test first, then code: `reconfirmAskTemplate(ctx)` in `SVC/reminder-compose.ts` (es and en, text in contracts/api.md): names service, date, business; no placeholder left; under 600 characters. Tests in `SVC/reminder-compose.test.ts`
- [ ] T018 [P] [US2] `negationWaitHours` in `ReminderConfigPatch` and `saveReminderConfig` (`SVC/reminder-config.service.ts:44-89`) and in `putSchema` (`src/routes/api/scheduling/reminders/config/+server.ts:14-24`, int 1–168)
- [ ] T019 [US1] Test first: extend `SVC/reconfirm.service.test.ts` for `advanceCases` with a fake clock and a mocked `gatewayCall`: one `ask` per case, idempotency key `reconf-<caseId>-ask`, sent to the case's recipient and account; second tick sends nothing; `wait_until` set and capped; inside 2 h → `late_reply`, no send; opted-out contact → no send; human outbound message since the case opened → `staff_handling`; send error → `send_failed`; `wait_until` passed with no inbound → `no_answer`, with inbound → `unclear`; cap of 25 per org; `setBookingStatus` only ever called with `'accepted'`
- [ ] T020 [US1] Implement `advanceCases` in `SVC/reconfirm.service.ts`: claim the `agent_message` event (`sending`) through the unique index, send with `gatewayCall('channels.send', …)`, finalize the event, mirror the message into `messages` with `insertMessages` (shape of `SVC/reminders.service.ts:256-283`, `metadata.kind = 'reconfirm'`), update `agent_state` and `wait_until`
- [ ] T021 [US2] Call `advanceCases` from `src/routes/api/scheduling/reminders/tick/+server.ts` after the scan, inside the same `withAiUsageOrg` scope; add `cases` to the JSON response; keep `src/server/auth/scheduling-read.test.ts` green
- [ ] T022 [P] [US2] Test first, then code: third sweep in `SVC/stale-sends.service.ts` for `sched_reconfirm_events` (`kind = 'agent_message'`, `send_status = 'sending'`, older than 15 minutes); extend `SVC/stale-sends.service.test.ts`
- [ ] T023 [US2] Gates: the S2 vitest list, `bun run i18n:compile`, `bun run check`. Manual S2 steps. Audit. Draft PR `feat(scheduling): the agent asks a client who can't come how to proceed, and staff hear when nobody answers`

## Phase 5: User Story 1 + 2 — staff see and act on the case (S3)

Blocked until the FigCraft demo (plan "FigCraft demo") is linked from the spec. Invoke the `ui-design-governance` skill before the first edit.

- [ ] T024 [P] [US1] `getBookingDetail` adds `reconfirm` (`SVC/scheduling-bookings.service.ts:3830`), masked like the attendee fields; `loadCalendarWindow` marks bookings with `reconfirm: true` (`SVC/calendar-window.service.ts:74`); extend `SVC/calendar-window.service.test.ts`
- [ ] T025 [P] [US2] Test first, then code: `src/routes/api/scheduling/reconfirmations/[id]/close/+server.ts` + `server.test.ts`: 200 and idempotent; 404 unknown id; 403 without `scheduling:manage`; writes a `staff_action` event; does not touch the booking. Add it to the write-endpoint inventory test if that test is on `master`
- [ ] T026 [P] [US2] `linked` on `CatalogAccount` (`SVC/crm-contacts.service.ts:2415-2421`) read in `SVC/crm-channels.service.ts:24-31, 61-67`; `src/routes/(app)/scheduling/reminders/+page.server.ts` returns `channelsChecked` (false when the catalog is null)
- [ ] T027 [P] [US1] Messages in `messages/es.json` and `messages/en.json`, appended in one commit: badge "Por reconfirmar", section title, the result texts of data-model.md, the four actions, the two refusal texts, the settings field and the four notices of contracts/api.md
- [ ] T028 [US1] Test first: `CMP/reconfirm-section.mounted.test.ts`: each result shows its text; actions per state; "Marcar como atendido" posts to the close route and calls `onclosed`; nothing renders without a case; the conversation link is absent when there is no contact
- [ ] T029 [US1] Create `CMP/ReconfirmSection.svelte` (Svelte 5 runes, kit `Badge` and `Button`, semantic tokens only) until T028 passes; render it and the badge in `CMP/BookingDetailDrawer.svelte` (badge beside the status badge at `:1031-1033`; Reagendar reuses the drawer's reschedule mode, Cancelar cita the existing dialog); extend `CMP/booking-detail-drawer.mounted.test.ts`
- [ ] T030 [P] [US1] Badge in the two hover cards of `CMP/BookingCalendar.svelte` (`:3053-3062`, `:3152-3161`) when `b.reconfirm`; add `reconfirm?: boolean` to the calendar booking type
- [ ] T031 [P] [US1] `src/routes/(app)/scheduling/calendar/PageBody.svelte`: `?booking=<id>` opens the drawer once and is then removed from the address with `replaceState`; update the TODO at `SVC/inbox/rules/appointment-overdue.ts:64-66` and the meta proposal `2026-09-28-hub-booking-deep-link-param.md` (POS page still open)
- [ ] T032 [US2] Settings in `src/routes/(app)/scheduling/reminders/PageBody.svelte`: wait-time field (autosave like the toggles at `:83-101`, range message on refusal) and the notices; mounted test `src/routes/(app)/scheduling/reminders/reminders-settings.mounted.test.ts`
- [ ] T033 [US1] Gates, one at a time: the S3 vitest list, `bun run i18n:compile`, `bun run lint:design`, `bun run lint:tokens` (debt may only decrease), `bun run check`, the a11y gate the hub runs for changed components. Manual S3 steps 1–6. Audit. Draft PR `feat(scheduling): appointments a client declined show "Por reconfirmar" with the agent's summary and next steps`

## Phase 6: User Story 1 — the agent understands the answer and can move the appointment (S4)

- [ ] T034 [US1] Before coding, check with one real request that the decisions endpoint accepts several `choice` questions together (research R3). If it does not, switch `day` and `part_of_day` to `noul` questions per option and note it in the PR
- [ ] T035 [P] [US1] Test first, then code: `dateWindow` and `pickOfferSlots` in `SCHED/reconfirm.ts` (weekday → its next occurrence within 14 days in the resource timezone; `tomorrow`, `day_after`, `next_week`; morning before 12:00, afternoon 12:00–18:00, evening after; at most three, spread over the window; nothing before now + 2 h)
- [ ] T036 [P] [US1] Test first, then code: `inferReconfirmAnswer` in `SVC/reminder-compose.ts` (one `jevDecide` request; `pick` only among the offered options; failures → `unclear`, confidence 0) and the `offer`, `confirm` and three `closing` templates with their messages (es, en)
- [ ] T037 [P] [US1] `excludeBookingId` option on `getSlotsForEventType` (`SVC/scheduling-slots.service.ts:158-164`, `:239-245`); one test that a booking does not block its own overlapping slot
- [ ] T038 [P] [US1] Export `setBookingStatusInTx` and extract `rescheduleAssistantBookingInTx` in `SVC/scheduling-bookings.service.ts` (`:1095`, `:1726-1750`); `SVC/scheduling-bookings-assistant-reschedule.test.ts` and `SVC/scheduling-bookings-reschedule.test.ts` stay green unchanged
- [ ] T039 [US1] Test first: extend `SVC/reconfirm.service.test.ts` per quickstart S4: offer for "el lunes en la tarde" (same event type, pinned resource); pick → moved, `accepted`, reminder claims for time-based client stages deleted, case `rescheduled` and closed, all in one transaction; a conflict thrown inside leaves booking, status and case untouched and ends `wants_other_date`; low-confidence or unknown pick moves nothing; no time named → `wants_other_date`; grouped visit → no offer; `declined`; `will_come`; second reply after an offer that is not a pick → `wants_other_date`; org without `ai.proactive` never calls the classifier
- [ ] T040 [US1] Implement the answer step, the offer and `acceptOfferedSlot` in `SVC/reconfirm.service.ts` per contracts/api.md; build `summary` from the typed answers; send the `confirm` or `closing` message after the transaction commits (a failed closing message does not change the result). Mark the one-offer-round and grouped-visit limits with `// shortcut:` comments
- [ ] T041 [US1] Gates: the S4 vitest list, `bun run i18n:compile`, `bun run check`. Manual S4 with a key. Audit. Draft PR `feat(scheduling): a client who asks for another time can pick a free slot and the appointment moves itself`

## Phase 7: Ledger and go-live (after S2; not a hub PR)

- [ ] T042 Meta proposal `proposals/2026-11-23-hub-reminder-negation-followups.md` listing every open end, each with its in-code `TODO(handoff)`: one offer round; no slot offer for grouped visits; a human reschedule does not reset reminder claims (research R6); the deep link on `/pos/appointments`; the unverified gateway auto-reply overlap; the handoff mapping for spec 134 (research R9)
- [ ] T043 Owner/ops: schedule `/api/scheduling/reminders/tick` on netcup, set its `wiring` in `src/lib/automations/system-automations.ts:132-137` in a small hub PR, then follow quickstart "First day in production"

## Dependencies

- Phase 2 before phase 3. T003 → T004 → everything that touches the tables. T006 → T007.
- In phase 3: T009 → T010; T011 → T012; T012 and T010 → T013 → T014. T015 needs T012.
- S2 needs S1 merged. S3 needs S1 merged and the FigCraft demo; it does not need S2. S4 needs S2 merged.
- T042 is written as the open ends appear and is complete before S4 is merged.

## Implementation strategy

- **MVP = S1.** It alone satisfies SC-001 (no appointment cancelled by a client reply) and "staff are told about every negation". It sends nothing new to clients, so it is safe to merge before the tick is scheduled.
- S2 adds the first outbound message; merge it before go-live so a "no" is never met with silence.
- S3 can be built in parallel with S2 once the demo is approved.
- S4 is the only slice that lets the agent write a booking. Ship it after a week of S2 verdict logs has been read, so `CONFIDENCE_MIN` is checked against real replies.
