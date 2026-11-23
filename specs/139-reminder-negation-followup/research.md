# Research: spec 139

All code facts were read on hub `origin/master` `484c6a03` (2026-11-23, read-only clone `~/.cache/claude-tmp/hub-till`). Gateway facts were read in the local gateway checkout (branch `fix/ci-cost-remaining-gaps`, not `DEV`), and only for one type definition. No production access was used. "Reminders have never run in production" comes from the spec's AS-IS and was not re-queried.

## Spec corrections

The spec stays as written; the plan follows the code where they differ.

- **C1 — The scan does not run on the jobs tick, and its own tick is not scheduled.**
  - The spec says `scanConfirmationReplies` "runs on the jobs tick". It runs only from `GET /api/scheduling/reminders/tick` (`src/routes/api/scheduling/reminders/tick/+server.ts:35-40`). `/api/jobs/tick` runs the job runtime, the inbox rules, door follow-ups and the stale-send sweep (`src/routes/api/jobs/tick/+server.ts:42-67`).
  - The reminders tick is listed as `wiring: 'unscheduled'` (`src/lib/automations/system-automations.ts:132-137`, under the comment "Dropped from the crontab on 2026-07-25 … never restored", `:120-122`). It is not in `vercel.json` either. The manifest is hand-verified, so the crontab itself was not checked here.
  - Consequence: "FACES enables reminders and reconnects WhatsApp" is not enough. Someone must also schedule the tick. This is probably the main reason `sched_reminders` has 0 rows.
- **C2 — Replies are read only for appointments that are `pending` and got the `confirmation` stage.**
  - Query: `reminders.service.ts:333-348` (`b.status = 'pending'`, `rem.stage = 'confirmation'`).
  - A booking is `pending` only when its service has `requiresConfirmation`; otherwise it is created `accepted` (`scheduling-bookings.service.ts:522`).
  - The 24 h and 2 h reminders ask "¿Confirmas tu asistencia?" (`reminder-compose.ts:82-85`), but a reply to them is never read. The `confirmation` template does not ask anything (`:80`); the SÍ/NO line is appended only for `pending` bookings with inference off (`reminders.service.ts:237-244`).
  - So User Story 1 ("answers the confirmation with 'no voy a poder'") does not reach the code today for an `accepted` appointment. The plan widens the scan to `pending` and `accepted` and to any client stage (S1).
- **C3 — Today "wants to reschedule" is UNCLEAR, not NO.** The prompt says "If they want to reschedule or are unsure, answer UNCLEAR" (`reminder-compose.ts:40`). The spec's negation includes "want to change". The new prompt moves it to negation.
- **C4 — Replies are matched by phone only, in any WhatsApp account of the org.** `reminders.service.ts:356-365` filters `channel = 'whatsapp'` and the last 9 digits of `sender_id`; it does not filter `account_id`. The spec's "in the chat where the reminder was sent" needs the account the reminder used (`sched_reminders.channel` + the config's `accountId`, `reminders.service.ts:245-250`). The case stores it and the scan filters on it.
- **C5 — "On unclear: nothing; the scan retries" hides a cost.** The scan re-reads every reply since the reminder on every tick and, with inference on, calls the model again for the same text (`reminders.service.ts:370-376`). There is no cursor. The verdict log added here is the cursor.
- **C6 — Two things the spec asks to show do not exist yet.**
  - "Pendientes tray chip": the tray lists paid services without a date (`listPendingSchedulingLines`), not appointments. The brief limits the badge to the drawer, the hover card and the inbox, and the plan follows it.
  - The inbox link: `?booking=` is not wired on the calendar page (`inbox/rules/appointment-overdue.ts:64-67`, open proposal `2026-09-28-hub-booking-deep-link-param.md`). S1 links with `?date=…&booking=…` so it lands on the right day; S3 wires `booking`.
- **C7 — "WhatsApp desconectado" has no stored signal.** The hub's channel rows only mirror the `enabled` flag (`inbox/rules/index.ts:15-25`). The live source is the gateway RPC `channels.status` through `getChannelCatalog` (`crm-channels.service.ts:49-74`), which the reminders settings page already calls (`scheduling/reminders/+page.server.ts:16`). The gateway snapshot has `linked` and `needsRelink` (gateway `src/channels/plugins/types.core.ts:103-112`), but the hub drops them (`crm-channels.service.ts:24-31`). S3 passes `linked` through. The notice is shown on the settings page only; a tick cannot rely on it.

Smaller notes:
- Without the `ai.proactive` entitlement, `inferConfirmation` reads as false and the keyword parser decides (`reminders.service.ts:24-29`). The keyword parser calls any message containing the token "no" a decline (`src/server/scheduling/reminders.ts:125-139`), for example "no sé a qué hora es".
- The spec's `repos: [minion_hub, minion]` can drop `minion`: no gateway change is needed (R1).

## R1 — Hub tick or gateway agent

- **Decision**: hub only. The conversation is a small state machine advanced by the reminders tick. Each step sends one templated message and makes at most one model call.
- **Evidence that the hub has every piece**:
  - sending: `gatewayCall('channels.send', { channel, to, text, accountId, idempotencyKey })` (`reminders.service.ts:245-251`);
  - reading replies: the `messages` table (`reminders.service.ts:356-365`);
  - classifier: the JEV decisions request already used by the assistant router (`assistant-router.service.ts:30-31`, R3);
  - slots: `getSlotsForEventType` (`scheduling-slots.service.ts:158`);
  - strict move: `rescheduleAssistantBooking` (`scheduling-bookings.service.ts:1726`);
  - AI usage scope per org and the module check already wrap the tick (`reminders/tick/+server.ts:31-34`).
- **Rationale**: the guards in spec §5 ("never cancels", "only about this appointment") are enforced by code that has no cancel call, rather than by a prompt. Every step is testable with a fake clock and a mocked send. It works for an org without AI up to the question and the report.
- **Alternatives rejected**:
  - A gateway agent with a scoped task. It needs a gateway change, hub tools exposed to it, and prompt-level guards for money and sessions. It would give a more natural conversation, which is not needed for three bounded steps.
  - Running from `/api/jobs/tick`. It runs every 30 minutes (`system-automations.ts:81`), too slow for a chat.
- **Known limit**: the hub cannot see whether a gateway agent already answers on the same number (owner question 2).

## R2 — Case and log tables

- **Decision**: two tables. `sched_reconfirm_cases` holds one row per case. `sched_reconfirm_events` is an append-only log of verdicts, agent messages, client messages and staff actions; it also logs verdicts for appointments that never get a case (yes, unclear).
- **Rationale**: the brief asks for a verdict log "new table or case log"; one log table serves both and is the scan's cursor (`inbound_at`).
- **One open case per appointment**: partial unique index on `(org_id, subject_key) where closed_at is null`. `subject_key` is the visit's `groupId` when the booking is in a merged visit (`groupIdOf`, `scheduling-bookings.service.ts:1752`), else the booking id. A second negation hits the conflict and adds an event.
- **Alternatives rejected**:
  - Case data in `sched_bookings.metadata`. Not queryable for the rule, and no place for the log.
  - Reusing `sched_reminders` for agent messages. Its unique key is (booking, stage, channel, role) (`pg-reminders-schema.ts:77-83`); a conversation has several messages.

## R3 — Classification and confidence ("JEV eval")

- **Fact**: the hub already calls the JEV classifier. `assistant-router.service.ts:30-31` posts to OpenRouter's decisions endpoint with the model `~typesafe/jev-latest`. The request carries a `state` text and typed `questions` (`:71-85`, `:167-175`); a `choice` answer comes back with a **probability per option** (`readMode`, `:99-124`). The model cannot return free text.
- **Decision**:
  - Model path: `inferConfirmationReply` becomes one JEV request with one `choice` question over `yes`, `negation`, `unclear`. The state holds the reminder text (`sched_reminders.content`), the appointment, and the replies, fenced as data. The verdict is the winning option; **the confidence is its probability**. Missing key, timeout, non-200 or an unusable answer give `unclear` with confidence 0, as today (`reminder-compose.ts:36`, `:52-54`).
  - Keyword path (no `ai.proactive`, or inference off): `parseYesNo` keeps its token sets. Confidence is 1 when the reply has at most three words ("no", "no gracias", "sí confirmo"), else 0.5.
  - `CONFIDENCE_MIN = 0.75`, one constant in `src/server/scheduling/reconfirm.ts`. Below it the verdict is logged as given and acted on as unclear.
  - The answer step (S4) is also one JEV request, with several typed questions: `intent` (choice), `pick` (choice over the offered options), `day` and `part_of_day` (choices). The staff summary line is built from these answers by a template. No generated text reaches the client or the booking.
- **Where the call lives**: a small private `jevDecide(state, questions)` in `reminder-compose.ts`, which is already in the AI-call inventory as a `tick` site (`ai-call-inventory.test.ts`, entry `reminder-compose.ts`; the test matches `openrouter.ai`). It calls `assertAiCallAllowed` when enforcement is on, like the router (`assistant-router.service.ts:141`). The router's own function is not reused: it is tied to the assistant's manifests and attempt receipts (`:144-163`), and its header says the request should not become a shared abstraction (`:11-13`). The two call sites duplicate about 30 lines.
- **Cost**: a direct `fetch` bypasses the usage middleware of `getOpenRouterModel`, so the cost returned by the provider (`usage.cost`, `assistant-router.service.ts:197-199`) is stored on the verdict event.
- **Rationale**: a probability from a typed decision model is a real confidence. Asking a chat model to grade itself is not. The spec wants thresholds tunable later; a logged probability and one constant are enough. No settings field.
- **To verify in S1 and S4** (not provable by reading code): that the endpoint accepts several `choice` questions in one request (the router sends one `choice` plus several `noul`). If not, `day` and `part_of_day` become `noul` questions per option.
- **Alternative rejected**: `generateText`/`generateObject` returning a self-reported confidence and a free-text date. It needs output validation and gives an uncalibrated number.

## R4 — Staff report through an inbox rule

- **Fact**: `upsertNotification` is insert-or-skip on the dedupe key; it never updates a row (`inbox/inbox.service.ts:262-300`). A case's text changes as it moves on.
- **Decision**: the dedupe key carries the case **phase**: `reconfirm:<org>:<caseId>:<phase>`, phase `agent` (the agent is talking), `staff` (staff must act) or `done` (the agent solved it). The rule emits the draft of the current phase and resolves the keys of the other phases. At any time a case has one unresolved notification. No change to the inbox service.
- **Scope and capability**: `scope: 'role'`, `capability: 'scheduling:manage'`, as `service-paid-unscheduled.ts:40-42`.
- **Resolution**: when staff close the case, when the booking is no longer live, and for phase `done` 48 hours after it closed (`expiresAt`).
- **Alternative rejected**: a new `refreshNotification` that edits the row and clears read marks. More inbox code for the same result.

## R5 — Wait time

- **Decision**: `sched_reminder_config.negation_wait_hours`, integer, default 24, allowed 1–168. `wait_until = min(last agent message + wait, appointment start − 2 h)`. It is recomputed on each agent message.
- A case opened less than 2 h before the start, or after it, gets no agent message and goes to staff (`late_reply`). This covers the spec edge case "a reply arrives after the appointment time".

## R6 — Slot offer and booking

- **Decision**:
  - The classifier answers two typed questions about the client's words: `day` (tomorrow, the day after, a weekday, next week, none) and `part_of_day` (morning, afternoon, evening, none). A pure helper turns them into a date window in the resource timezone. A date the options cannot express ("el 28") counts as no time named. The hub computes the slots: `getSlotsForEventType(ctx, eventTypeId, from, to, { pinnedResourceId: booking.resourceId })`, then a pure `pickOfferSlots` keeps up to three inside the part of day.
  - The offered slots and the booking's `updatedAt` are stored on the case. A pick is valid only for a stored option.
  - Booking uses the existing strict path. `rescheduleAssistantBooking` already does the availability preflight, the conflict check and the in-place move, keeps funding, and refuses a stale booking (`scheduling-bookings.service.ts:1572-1690`, `:1726-1750`). Its body is extracted to `rescheduleAssistantBookingInTx` and exported with `setBookingStatusInTx`, so the move, `pending → accepted` and the case result commit together.
- **Gap fixed on the way**: `getSlotsForEventType` does not exclude the booking being moved from the busy list (`scheduling-slots.service.ts:230-236`; the private `loadBusy` already takes `excludeId`, `:101-109`). Without it the client cannot be offered a slot that overlaps her own current appointment. S4 adds the option.
- **Reminders for the new date**: time-based stages are claimed once per booking (`pg-reminders-schema.ts:77-83`), and no reschedule clears them (the only delete is on booking delete, `scheduling-bookings.service.ts:3281`). `acceptOfferedSlot` deletes the booking's client rows for stages with `minutesBefore`, so the new date is reminded. The same gap exists for a human reschedule; that is outside this spec.
- **Shortcuts, stated**:
  - One offer round. Anything other than a pick after the offer ends as `wants_other_date`.
  - Grouped visits get no slot offer: the strict path refuses them ("use the group move flow", `scheduling-bookings.service.ts:1592-1596`). They end as `wants_other_date`.
  - No offer when the client names no time (spec §3.3). The question invites a day and time to make that less common.

## R7 — Guards

- **Never cancels**: `reconfirm.service.ts` imports no cancel, release or redemption function. A test asserts that `setBookingStatus` is only ever called with `'accepted'`.
- **Staff takeover**: before each agent send, the service looks for an outbound, non-bot message to the same phone and account since the case opened. If there is one, the case gets `staff_handling` and the agent stops. Door follow-ups use the same idea (`doors-followup.service.ts:36-37`, reason `staff_replied`).
- **Double send**: each agent message is claimed as an event row in `sending` before the send and carries the idempotency key `reconf-<caseId>-<step>`, the pattern of `reminders.service.ts:166-190`. `reapStaleSends` fails rows left in `sending` (`stale-sends.service.ts:19-35`).
- **Opt-out**: a contact with `_reminders_opt_out` gets no agent message (`reminders.service.ts:102`, `:147`); the case goes straight to staff.

## R8 — What an org without AI gets

`ai.proactive` gates only the model calls. Without it: keyword verdicts, the templated question, the wait, and the staff report with result `no_answer` or `unclear`. With it and "Que la IA lea las respuestas" on: the full flow of S4. This follows the owner rule that AI is the premium layer.

## R9 — Handoff to spec 134

Spec 134 will add the statuses `reconfirm` (Por reconfirmar) and `unscheduled` (Desagendada). When it ships, it applies this mapping; none of it is in the code of this spec:

| This spec | Spec 134 |
|---|---|
| open case (`closed_at is null`) | status `reconfirm` |
| result `wants_other_date` | status `unscheduled`, reason `sin_fecha` |
| result `rescheduled` or `will_come` | status `accepted` (already written here) |
| staff action "Marcar como atendido" | replaced or joined by Archivar / Anular |
| badge derived from the case | the status badge itself; the derived badge is removed |

Spec 134 should read cases through `getCaseForBooking` and keep the tables.
