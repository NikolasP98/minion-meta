# Data model: spec 139

One hub migration, additive and idempotent (`create table if not exists`, `add column if not exists`, policy created only when missing). It runs in the production build on Vercel.

Convention followed: `supabase/migrations/20261025100000_crm_doors.sql:74-89` (enable + force RLS, policy `<table>_org_guc` on `app.current_org_id`, grants to `app_ledger`). `org_id` is `text`, as in every `sched_*` table (`src/server/db/pg-reminders-schema.ts:14-19`). Drizzle mirrors go in `src/server/db/pg-reminders-schema.ts`.

## Migration — `20261123120000_reconfirm_cases.sql` (S1)

### `sched_reconfirm_cases` (one row per case)

| Column | Type | Rule |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `org_id` | text not null | RLS key |
| `booking_id` | uuid not null | `references sched_bookings(id) on delete cascade` (same as `sched_reminders`, `pg-reminders-schema.ts:18-19`) |
| `subject_key` | text not null | the visit's `groupId` for a merged visit, else the booking id as text |
| `contact_id` | uuid | the booking's CRM contact, for the conversation link |
| `channel` | text not null | channel the reminder used (`whatsapp`) |
| `account_id` | text | account the reminder used; null = the gateway default |
| `recipient` | text not null | phone the reminder was sent to |
| `booking_start_at` | timestamptz not null | appointment start when the case opened; a different start later means someone moved it |
| `agent_state` | text not null default `'none'` | `none`, `asking`, `offered`, `done` |
| `result` | text | null while undecided; see the list below |
| `summary` | text | one line for staff, built from typed answers |
| `offered_slots` | jsonb not null default `'[]'` | `[{ "start": iso, "resourceId": uuid }]`, at most 3 (S4) |
| `offer_booking_updated_at` | timestamptz | the booking's `updated_at` when the offer was made (S4) |
| `wait_until` | timestamptz | deadline for the client's answer |
| `last_inbound_at` | timestamptz | newest client message already handled (cursor) |
| `opened_at` | timestamptz not null default `now()` | |
| `closed_at` | timestamptz | null = open; the badge shows while null |
| `closed_by` | uuid | profile that closed it; null for the system |
| `close_action` | text | `attended`, `agent`, `booking_closed`, `moved_by_staff` |
| `close_note` | text | optional staff note, 500 characters |

Checks:
- `agent_state in ('none','asking','offered','done')`
- `result is null or result in ('rescheduled','will_come','declined','wants_other_date','no_answer','unclear','late_reply','send_failed','staff_handling')`
- `close_action is null or close_action in ('attended','agent','booking_closed','moved_by_staff')`
- `(closed_at is null) = (close_action is null)`

Indexes:
- `sched_reconfirm_cases_open_uniq`: unique `(org_id, subject_key) where closed_at is null`. This is the "one open case per appointment" rule.
- `sched_reconfirm_cases_booking_idx`: `(org_id, booking_id)`.

What each result means, and what staff read:

| `result` | Staff text (es) | Who closes the case |
|---|---|---|
| null, `agent_state = 'none'` | Dijo que no puede asistir | staff |
| null, `agent_state in ('asking','offered')` | El agente está consultando al cliente | — |
| `rescheduled` | Reprogramada por el agente | the agent, at once |
| `will_come` | Confirmó que asistirá | the agent, at once |
| `declined` | No desea continuar | staff |
| `wants_other_date` | Quiere otra fecha | staff |
| `no_answer` | Sin respuesta | staff |
| `unclear` | Respuesta poco clara | staff |
| `late_reply` | Respondió cerca de la hora de la cita | staff |
| `send_failed` | No se pudo escribir al cliente | staff |
| `staff_handling` | El equipo ya está conversando con el cliente | staff |

State moves (the only ones the code makes):

```text
open (none) ──S2 send ok──▶ asking ──answer──▶ done + result
     │                        │  └─S4 offer──▶ offered ──pick──▶ done + rescheduled (closed)
     │                        └─wait_until──▶ done + no_answer | unclear
     └─late / opted out / send failed / staff wrote──▶ done + late_reply | send_failed | staff_handling
any open state ──staff close | booking no longer live | start changed──▶ closed
```

### `sched_reconfirm_events` (append-only log)

| Column | Type | Rule |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `org_id` | text not null | RLS key |
| `booking_id` | uuid not null | `references sched_bookings(id) on delete cascade` |
| `case_id` | uuid | `references sched_reconfirm_cases(id) on delete cascade`; null for a verdict that opened no case |
| `kind` | text not null | `verdict`, `agent_message`, `client_message`, `staff_action`, `system` |
| `verdict` | text | `yes`, `negation`, `unclear`, or an S4 intent (`other_date`, `decline`, `will_come`, `pick`) |
| `confidence` | numeric(4,3) | 0–1; null for non-verdict rows |
| `via` | text | `keyword` or `jev` |
| `content` | text | the agent's message, or the client text that was classified |
| `send_status` | text | `sending`, `sent`, `failed`; only for `agent_message` |
| `step` | text | `ask`, `offer`, `confirm`, `closing`; only for `agent_message` |
| `message_id` | text | gateway message id |
| `inbound_at` | timestamptz | newest client message this row covers; the scan's cursor |
| `data` | jsonb not null default `'{}'` | probabilities, model, cost, error, staff note |
| `created_at` | timestamptz not null default `now()` | |

Checks: `kind` and `send_status` value lists as above.

Indexes:
- `sched_reconfirm_events_booking_idx`: `(org_id, booking_id, created_at)`.
- `sched_reconfirm_events_case_step_uniq`: unique `(case_id, step) where kind = 'agent_message'`. One message per step per case, so two overlapping ticks cannot send twice (the claim pattern of `reminders.service.ts:166-190`).

Rows are only inserted. The one update is `send_status` of an `agent_message` from `sending` to `sent` or `failed`, guarded by `send_status = 'sending'` (as `reminders.service.ts:207-208`).

### `sched_reminder_config.negation_wait_hours`

```sql
alter table public.sched_reminder_config
  add column if not exists negation_wait_hours integer not null default 24;
-- check added only when missing: between 1 and 168
```

Default 24 for every org, existing rows included. The service default shape (`reminder-config.service.ts:29-41`) gains the same value.

### RLS and grants

For both new tables, in one `do $$ … $$` loop copied from `20261025100000_crm_doors.sql:76-89`:
- `enable row level security`, `force row level security`;
- policy `<table>_org_guc`: `using` and `with check` `org_id = current_setting('app.current_org_id', true)`;
- `grant select, insert, update, delete on … to app_ledger`.

All reads and writes go through `withOrgCore`. No new `getCoreDb` call site (the tick's existing one is already in `src/server/db/rls-bypass-inventory.json:262-266`). The stale-send sweep adds one statement to a file that already bypasses RLS by design (`stale-sends.service.ts:19-35`).

## What is deliberately not stored

- No new booking status and no column on `sched_bookings`. "Por reconfirmar" is `exists (open case)`.
- No copy of the whole conversation. `content` holds only the texts the classifier read and the agent's own messages; the full thread stays in `messages`.
- No per-org confidence threshold. One constant.

## Data already there that this spec reads

| Data | Where | Used for |
|---|---|---|
| reminder sent to the client | `sched_reminders` (`stage`, `channel`, `recipient`, `content`, `sent_at`, `status = 'sent'`, `recipient_role = 'client'`) | which appointments to scan; the reminder text for the classifier |
| the org's send account | `sched_reminder_config.channels` / `account_id` (`effectiveChannels`, `reminder-config.service.ts:16-21`) | `account_id` on the case |
| client replies | `messages` (`direction = 'inbound'`, `channel`, `account_id`, `sender_id`, `content`, `occurred_at`) | classification |
| staff replies | `messages` (`direction = 'outbound'`, `is_bot = false`) | staff-takeover guard |
| opt-out | `crm_contacts.custom_fields->>'_reminders_opt_out'` (`reminders.service.ts:102`) | no agent message |

## Retention and privacy

Client message text is personal data. It stays under the same RLS as `messages`. Console logs carry only ids and error names. Cases and events are deleted with their booking (`on delete cascade`), which only happens for a booking nothing references (`BookingReferencedError`, `src/routes/api/scheduling/bookings/[id]/+server.ts:33-36`).
