# API and server contracts: spec 139

All paths are in the hub. New HTTP routes sit under `/api/scheduling`, so the central guard maps their writes to the scheduling module (`src/server/services/rbac.service.ts:875`); each handler also calls its own gate, as the neighbours do (`src/routes/api/scheduling/reminders/config/+server.ts:32-35`). If the write-endpoint inventory test (hub branch `house-rules/h5-write-inventory`) is on `master` when a slice is cut, the new POST is added to it.

## Server functions

### Classifier (`src/server/services/reminder-compose.ts`)

```ts
export type ReplyVerdict = 'yes' | 'negation' | 'unclear';
export interface Classified<V extends string> {
  verdict: V;
  confidence: number;                       // 0–1; the option's probability (JEV) or 1 / 0.5 (keyword)
  via: 'jev' | 'keyword';
  probabilities?: Record<string, number>;   // logged, not acted on
  cost?: number | null;
}

// S1 — replaces today's Promise<'yes' | 'no' | 'unclear'> (reminder-compose.ts:31-34)
export async function inferConfirmationReply(
  messages: string[],
  about: { serviceTitle: string; whenText: string; locale: string; reminderText: string | null },
): Promise<Classified<ReplyVerdict>>;

// S4
export type AnswerIntent = 'other_date' | 'decline' | 'will_come' | 'pick' | 'unclear';
export async function inferReconfirmAnswer(
  messages: string[],
  about: { serviceTitle: string; whenText: string; locale: string; agentText: string; offered: string[] },
): Promise<Classified<AnswerIntent> & {
  pick: number | null;                                   // index into `offered`, only when intent = pick
  day: 'tomorrow' | 'day_after' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'next_week' | null;
  partOfDay: 'morning' | 'afternoon' | 'evening' | null;
}>;
```

- Both never throw. Missing key, timeout (8 s), non-200 or an unusable answer return `{ verdict: 'unclear', confidence: 0, via: 'jev' }`.
- Both go through a private `jevDecide(state, questions)` in the same file (research R3).
- `parseYesNo` (`src/server/scheduling/reminders.ts:128`) keeps its signature; a new `keywordVerdict(text): Classified<ReplyVerdict>` wraps it and maps `'no'` to `'negation'`.

### Pure helpers (`src/server/scheduling/reconfirm.ts`)

```ts
export const CONFIDENCE_MIN = 0.75;
export const LATE_MS = 2 * 60 * 60 * 1000;

export function acted<V extends string>(c: Classified<V>): V | 'unclear';   // below CONFIDENCE_MIN → 'unclear'
export function waitUntil(now: Date, start: Date, waitHours: number): Date | null; // null when start − 2 h has passed
export function casePhase(c: { agentState: string; result: string | null; closedAt: Date | null }):
  'agent' | 'staff' | 'done' | null;                                         // null = nothing to show
export function caseTitle(c: { agentState: string; result: string | null }): string; // fixed Spanish, data-model.md table
export function dateWindow(day, partOfDay, now: Date, timezone: string): { from: Date; to: Date } | null; // S4
export function pickOfferSlots(slots: Slot[], partOfDay, timezone: string, max = 3): Slot[];             // S4
```

### Case service (`src/server/services/reconfirm.service.ts`)

```ts
// S1
export async function openCase(ctx, input: {
  bookingId: string; subjectKey: string; contactId: string | null;
  channel: string; accountId: string | null; recipient: string;
  bookingStartAt: Date; result?: 'unclear' | 'late_reply' | null;
  verdict: Classified<ReplyVerdict>; texts: string[]; inboundAt: Date;
}): Promise<{ caseId: string; created: boolean }>;
// insert … on conflict (open-case unique index) do nothing; `created: false` = a second negation,
// which only adds a `verdict` event to the open case.

export async function logVerdict(ctx, input: { bookingId; caseId?; verdict: Classified<string>; texts: string[]; inboundAt: Date }): Promise<void>;
export async function lastInboundAt(ctx, bookingIds: string[]): Promise<Map<string, Date>>;   // the scan's cursor
export async function getCaseForBooking(ctx, bookingId: string): Promise<ReconfirmCaseView | null>; // latest case, open first
export async function openCaseBookingIds(ctx, bookingIds: string[]): Promise<Set<string>>;
export async function closeCase(ctx, caseId: string, by: { profileId: string | null; action: CloseAction; note?: string | null }): Promise<'closed' | 'already_closed' | 'not_found'>;
export async function closeStaleCases(ctx, now: Date): Promise<number>;   // booking not live → booking_closed; start changed → moved_by_staff

// S2
export async function advanceCases(ctx, now: Date, cap = 25): Promise<{ asked: number; timedOut: number; failed: number; /* S4: */ offered: number; rescheduled: number }>;

// S4
export async function acceptOfferedSlot(ctx, caseId: string, pick: number): Promise<'rescheduled' | 'slot_taken'>;
```

`ReconfirmCaseView` (what the drawer gets): `{ id, open: boolean, agentState, result, title, summary, openedAt, waitUntil, contactId, recipient, events: Array<{ kind, verdict, confidence, content, step, createdAt }> }`. `recipient` and `content` are masked for a viewer without attendee PII access, the same way `getBookingDetail` masks (`scheduling-bookings.service.ts:3830-3834`, `maskAttendeePii`).

`acceptOfferedSlot` runs **one** `withOrgCore` transaction:
1. lock the case row; it must be open, `agent_state = 'offered'`, and `pick` must index `offered_slots`;
2. `rescheduleAssistantBookingInTx(tx, ctx, bookingId, { start, resourceId, expectedUpdatedAt: offer_booking_updated_at })`;
3. `setBookingStatusInTx(tx, ctx, bookingId, 'accepted', { reason: 'client picked a new time' })` when the booking is `pending`;
4. delete the booking's `sched_reminders` rows for client stages with `minutesBefore`;
5. case: `result = 'rescheduled'`, `agent_state = 'done'`, `closed_at = now()`, `close_action = 'agent'`; one `system` event.

`SlotUnavailableError`, `BookingConflictError` and `AssistantRescheduleError` roll the transaction back and return `'slot_taken'`; the caller sets `wants_other_date`.

### Booking service (`src/server/services/scheduling-bookings.service.ts`)

- S3: `BookingDetail` gains `reconfirm: ReconfirmCaseView | null` (`getBookingDetail`, `:3830`).
- S4: export `setBookingStatusInTx` (`:1095`, private today) and a new `rescheduleAssistantBookingInTx(tx, ctx, id, input)` holding the body of `rescheduleAssistantBooking` (`:1733-1748`); the public function becomes a one-line wrapper. Behaviour unchanged.

### Slots (`src/server/services/scheduling-slots.service.ts`)

- S4: `getSlotsForEventType(..., opts)` gains `excludeBookingId?: string`, passed to `loadBusy` (`:239-245`, parameter already exists at `:101-109`).

### Other

- S2: `ReminderConfigPatch.negationWaitHours?: number` and the default `24` (`reminder-config.service.ts:29-54`).
- S2: `reapStaleSends` adds `update sched_reconfirm_events set send_status = 'failed' … where kind = 'agent_message' and send_status = 'sending' and created_at < limit` and returns its count (`stale-sends.service.ts:19-35`).
- S3: `CatalogAccount.linked: boolean | null` read from the gateway snapshot (`crm-channels.service.ts:24-31`, `:61-67`; type at `crm-contacts.service.ts:2415-2421`). `null` = the gateway did not say.
- S3: `loadCalendarWindow` returns bookings with `reconfirm?: true` (`calendar-window.service.ts:74`), from one `openCaseBookingIds` query.

## Inbox rule (S1)

`src/server/services/inbox/rules/appointment-reconfirm.ts`, key `appointment.reconfirm`, registered in `rules/index.ts:26-37`.

| Draft field | Value |
|---|---|
| `scope`, `capability` | `'role'`, `'scheduling:manage'` |
| `kind` | `'appointment.reconfirm'` |
| `severity` | `info` for phases `agent` and `done`; `warning` for `staff` |
| `title` | `caseTitle(case)` |
| `body` | `<servicio> · <cliente> · <fecha y hora>` and the summary when there is one |
| `href` | `/scheduling/calendar?date=<YYYY-MM-DD>&booking=<bookingId>` |
| `subjectType`, `subjectId` | `'sched_booking'`, booking id |
| `dedupeKey` | `reconfirm:<orgId>:<caseId>:<phase>` |
| `expiresAt` | phase `done`: `closed_at + 48 h` |

`resolve`: the keys of the case's other phases, and every key of a case closed by staff or whose booking is no longer live. The rule calls `closeStaleCases` first.

## HTTP routes

### `GET /api/scheduling/reminders/tick` (existing, S2)

After `scanConfirmationReplies`, call `advanceCases(ctx, now)` inside the same `withAiUsageOrg` scope (`reminders/tick/+server.ts:31-46`). The JSON response gains `cases: { opened, asked, timedOut, failed, offered, rescheduled }`; `declined` stays in the response and is always 0 (nothing reads it; removing a key is a separate cleanup).

`ConfirmScanResult` becomes `{ confirmed: number; opened: number; unclear: number }`.

### `PUT /api/scheduling/reminders/config` (existing, S2)

`putSchema` gains `negationWaitHours: z.number().int().min(1).max(168).optional()` (`reminders/config/+server.ts:14-24`). Gate unchanged: `requireOrgCapability(locals, 'scheduling', 'manage')`.

### `POST /api/scheduling/reconfirmations/[id]/close` (new, S3)

- Gate: `requireOrgCapability(locals, 'scheduling', 'manage')`, then `getCoreCtx`, then the module check — the three lines of `reminders/config/+server.ts:32-35`.
- Body: `{ note?: string }` (zod, max 500).
- Effect: `closeCase(ctx, id, { profileId, action: 'attended', note })` and one `staff_action` event. It does not touch the booking.
- Responses: `200 { ok: true }` (also when already closed: idempotent); `404` for an unknown id in this org.

### `GET /api/scheduling/bookings/[id]` (existing, S3)

The payload gains `reconfirm` (see `ReconfirmCaseView`). Read gate unchanged (`requireSchedulingRead`).

## Refusals and notices (Spanish, each names the next step)

Server refusals return a `code`; the UI maps it to a message key.

| Where | Code / condition | Message (es) |
|---|---|---|
| close route | 403, no `scheduling:manage` | "Tu rol no puede cerrar este seguimiento. Pide a un administrador el permiso de gestionar la agenda." |
| close route | 404 `not_found` | "Este seguimiento ya no existe. Actualiza la cita para ver su estado." |
| config PUT | 400, wait time out of range | "El tiempo de espera va de 1 a 168 horas. Escribe un número en ese rango." |
| settings notice | `config.enabled` is false | "Recordatorios apagados. Los clientes no reciben mensajes ni seguimiento. Actívalos arriba para empezar." |
| settings notice | no WhatsApp account chosen | (existing `sched_rem_needs_account`, `PageBody.svelte:240-244`) |
| settings notice | a chosen WhatsApp account has `linked === false` | "WhatsApp desconectado. El número {nombre} no está vinculado, así que no se envía nada. Vuelve a vincularlo en Canales." |
| settings notice | the gateway did not answer | "No pudimos comprobar la conexión de WhatsApp. Vuelve a intentarlo en unos minutos." |
| drawer, result `send_failed` | — | "No se pudo escribir al cliente. Llámalo o escríbele desde la conversación." |
| drawer, result `no_answer` | — | "El cliente no respondió. Llámalo para confirmar la cita." |

## Agent message templates (es; en mirrors)

Deterministic, in `reminder-compose.ts`, built from the same `ReminderContext` (`:14-23`). Facts are never rewritten by a model.

| Step | Text |
|---|---|
| `ask` (S2) | "Hola {nombre}. Entiendo que no podrás venir el {cuándo} a tu cita de {servicio} en {negocio}. ¿Prefieres que te busquemos otra fecha (dime qué día y a qué hora te acomoda), o no deseas continuar con la cita?" |
| `offer` (S4) | "Tenemos estos horarios con {especialista}: 1) {slot1} 2) {slot2} 3) {slot3}. Responde con el número del que prefieras." |
| `confirm` (S4) | "Listo, tu cita de {servicio} quedó para el {nuevo cuándo}. ¡Te esperamos!" |
| `closing`, `wants_other_date` (S4) | "Gracias. El equipo de {negocio} te escribirá para coordinar una nueva fecha." |
| `closing`, `declined` (S4) | "Entendido. Le avisamos al equipo de {negocio}; te contactarán si hace falta algo más." |
| `closing`, `will_come` (S4) | "Perfecto, mantenemos tu cita del {cuándo}. ¡Te esperamos!" |

## CRM timeline

The scan keeps writing `booking_confirmed` for a yes (`reminders.service.ts:399-412`). For a negation it writes kind `booking_reconfirm` with the body "Dijo que no puede asistir; en seguimiento" in place of `booking_declined`. Nothing else in `src/` reads these kinds.
