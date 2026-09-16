---
id: 2026-09-08-hub-scheduling-calendar-views-tags-spec
title: Scheduling calendar views, event kinds, org-wide tags
stage: deploy
status: shipped
pass: 2
created: 2026-09-08
updated: 2026-09-08
repos: [minion_hub]
type: feature
pr: 244
---

# Scheduling calendar views, event kinds, org-wide tags

## 0. Product

Owner's words (2026-09-08), on `/scheduling/calendar`:

- "add different calendar views (currently have resource calendar): weekly/monthly/agenda views; weekly has infinite side-scroll; monthly has infinite vertical scroll"
- "clearer details on the calendar items: only crop item widths on event conflict; show hover details about the procedure, the client, etc."
- "EVENT TYPES — the user wants to define different event types and integrate tags from related items (say the linked CRM contact has tags, or the catalog product has a tag)"
- "CRM customers have tags; I also want to tag events as well as catalog products."
- "for the calendar navigation, I like the arrow nav, but I also want a calendar picker when I click the date itself (native d/m/y)"

Decisions taken with the owner:

1. "Event types" = an org-defined **category on every calendar entry** (Appointment, Block, Meeting, Internal…) with a colour. The existing `sched_event_types` (bookable services) stay as they are and each service gets a default kind. In code the new concept is called **event kind** (`sched_event_kinds`) to avoid the name clash; UI label is "Event types"; the existing nav item remains "Services".
2. **One org-wide tag registry**: reuse `crm_tags` (no rename). One polymorphic `tag_links` table for bookings, services, and products. Contacts keep `crm_contact_tags`. Auto-tags stay contact-only.
3. Day view keeps per-staff columns; **week and month merge all staff** with a staff filter; every chip carries the staff dot.
4. **Pass 2 (owner, same day): "I need the calendar to be sophisticated. I want drag/drop events (with confirmation where necessary), resizing, etc. Evaluate re-inventing the wheel vs using an established open-source calendar library."** Evaluation: `@event-calendar/core` (already installed, MIT, Svelte 5, FullCalendar model, resource views + Interaction plugin free; already token-skinned in `TimeOffCalendar`) covers drag/drop, resize, drag-to-create, per-staff resource day view, side-by-side overlap layout, custom event content and hover hooks. It does NOT do infinite scroll; FullCalendar/Schedule-X put resource views behind paid licences and are not Svelte. Owner chose **library now, infinite scroll as a later slice**, and **confirm every move/resize**. §3.2 below is rewritten accordingly; the custom Day/Week/Month/Agenda grids and `lanes.ts` from pass 1 are deleted.

## 1. Data model (one additive migration `supabase/migrations/20260908000000_event_kinds_and_tag_links.sql`)

Follow `20260903000000_hr_module.sql` exactly for org isolation: `grant select, insert, update, delete … to app_ledger`, `enable row level security`, and the same `app.current_org_id` policy shape.

```sql
create table if not exists public.sched_event_kinds (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null,
  color text not null,            -- '#rrggbb' persisted domain data (like crm_tags.color)
  position double precision not null default 0,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists sched_event_kinds_org_name_uniq on public.sched_event_kinds (org_id, name);
create unique index if not exists sched_event_kinds_org_default_uniq on public.sched_event_kinds (org_id) where is_default;

alter table public.sched_bookings    add column if not exists kind_id uuid references public.sched_event_kinds(id) on delete set null;
alter table public.sched_event_types add column if not exists kind_id uuid references public.sched_event_kinds(id) on delete set null;

create table if not exists public.tag_links (
  org_id text not null,
  entity_kind text not null check (entity_kind in ('booking','event_type','product')),
  entity_id uuid not null,
  tag_id uuid not null references public.crm_tags(id) on delete cascade,
  applied_by uuid,
  applied_at timestamptz not null default now(),
  primary key (entity_kind, entity_id, tag_id)
);
create index if not exists tag_links_org_tag_idx on public.tag_links (org_id, tag_id);
create index if not exists tag_links_org_entity_idx on public.tag_links (org_id, entity_kind, entity_id);
```

Drizzle: `schedEventKinds` + the two `kindId` columns in `src/server/db/pg-scheduling-schema.ts`; `tagLinks` next to `crmTags` in `src/server/db/pg-crm-schema.ts`. No `entity_id` FK (polymorphic); orphans are tolerated and filtered by join.

Default kinds are **lazily seeded** by `listEventKinds` when an org has none: Appointment (default, accent-ish blue `#3b82f6`), Block (`#6b7280`), Meeting (`#a855f7`), Internal (`#f59e0b`).

## 2. Server contracts

Shared types live in `src/lib/components/scheduling/calendar/types.ts` (already written): `CalendarView`, `CalTag`, `CalKind`, `CalEvent`, `CalendarPayload`.

### 2.1 Event kinds — `src/server/services/scheduling.service.ts`

- `listEventKinds(ctx): Promise<CalKind[]>` — ordered by position, name; seeds defaults when empty.
- `createEventKind(ctx, { name, color }): Promise<CalKind>`
- `updateEventKind(ctx, id, { name?, color?, position?, isDefault?, active? })` — setting `isDefault: true` clears the previous default in the same transaction.
- `deleteEventKind(ctx, id)` — 409 when it is the default kind; FK `on delete set null` handles references.
- `createBooking` / `updateBooking` and `createEventType` / `updateEventType` accept `kindId: string | null` (validated as an org kind). A booking created without `kindId` stores **null** (resolution to the service's kind happens at read time, so re-assigning a service's kind updates history).

API: `GET|POST /api/scheduling/event-kinds`, `PATCH|DELETE /api/scheduling/event-kinds/[id]`. Gate: `scheduling:view` for GET, `scheduling:edit` for writes (same helpers the event-types routes use). `POST/PATCH /api/scheduling/bookings*` and `/api/scheduling/event-types*` accept `kindId` in their zod schemas.

### 2.2 Tag links — `src/server/services/tag-links.service.ts`

```ts
export type TagEntityKind = 'booking' | 'event_type' | 'product';
export async function getTagLinks(ctx, kind: TagEntityKind, ids: string[]): Promise<Map<string, CalTag[]>>;
export async function setTagLinks(ctx, kind: TagEntityKind, id: string, tagIds: string[], appliedBy: string | null): Promise<CalTag[]>; // replace-set; rejects tag ids not in the org or with kind='auto'
export async function getContactTagsBulk(ctx, contactIds: string[]): Promise<Map<string, CalTag[]>>; // crm_contact_tags ⋈ crm_tags
```

API: `GET|PUT /api/tags/[kind]/[id]` → `{ tags: CalTag[] }`; PUT body `{ tagIds: string[] }`. Gate: `booking`/`event_type` → `scheduling:edit` (GET: `scheduling:view`); `product` → the same action the sellables PATCH route uses (GET: its view action). Unknown kind → 404.

### 2.3 Calendar loader — `src/server/scheduling/load-calendar-events.ts`

`loadCalendarEvents(ctx, { from: Date; to: Date; maskAttendeePii: boolean }): Promise<CalEvent[]>` — bookings with status in `accepted|pending|completed`, `startTime` in `[from, to)`, joined with resources, event types (title + kindId), products (`fin_products.name`), then batched `getTagLinks('booking')`, `getContactTagsBulk`, `getTagLinks('product')`. Cap the range at 62 days (400 otherwise). Masking applies to `attendeePhone` exactly like `listBookings`.

API: `GET /api/scheduling/calendar?from=<ISO>&to=<ISO>` → `CalendarPayload`. Gate `scheduling:view`.

## 3. UI

### 3.1 Route `/scheduling/calendar` — query contract

`?view=day|week|month|agenda` (default `day`), `?date=YYYY-MM-DD` (org-tz today), `?staff=<id>,<id>` (empty = all), `?kind=<id>` (empty = all). Loader returns `{ view, day, resources, kinds, tags (org manual tags), events }` where `events` covers the initial window: day → that day; week → `[monday(date) − 7d, monday(date) + 14d)`; month → `[monday(first of month) − 14d, +42d)`; agenda → `[date, date + 30d)`.

### 3.2 Components — `src/lib/components/scheduling/calendar/` (pass 2: on `@event-calendar/core`)

| File | Role |
|---|---|
| `types.ts` | contracts (frozen) |
| `calendar.svelte.ts` | `CalendarStore` (events by id, loaded spans, `ensure(from,to)` fetching only missing spans from `/api/scheduling/calendar`, staff/kind filters, `kindOf`). Kept from pass 1. |
| `CalendarToolbar.svelte` | SegmentedControl Day/Week/Month/Agenda · prev/next · **date label opens a native `<input type="date">`** (`showPicker()`) · Today · staff multi-select · kind select. URL is the state. Kept from pass 1; prev/next/today/date now also drive the library instance. |
| `ec-skin.css` | The `--ec-*` semantic-token override block extracted from `TimeOffCalendar.svelte` (which imports it too — one skin, two calendars). Vars are declared ON `.ec`, so overrides target `.ec`. |
| `SchedulingCalendar.svelte` | The one view component. `@event-calendar/core` with plugins `ResourceTimeGrid`, `TimeGrid`, `DayGrid`, `List`, `Interaction`. View map: day → `resourceTimeGridDay` (resources = active staff after the staff filter, colour = resource colour), week → `timeGridWeek`, month → `dayGridMonth`, agenda → `listMonth`. Options: `headerToolbar` empty (ours), `firstDay: 1`, `locale: languageTag()`, `slotMinTime '07:00'`, `slotMaxTime '21:00'`, `slotDuration '00:15'`, `snapDuration '00:15'`, `slotEventOverlap: false` (overlaps share width — "crop only on conflict"), `nowIndicator: true`, `dayMaxEvents: true`, `editable: canAct('scheduling','edit')`, `selectable` same, `dragScroll: true`. `datesSet` → `store.ensure(start,end)` + toolbar title. Events = `store.visible` mapped to `{ id, start, end, title, resourceIds: [resourceId], backgroundColor: kindColour ?? resourceColour, classNames: [status], extendedProps: event }`. |
| `EventChip` rendering | `eventContent` renders the chip (`hh:mm · service · client` + staff dot + tag dots); the library accepts `{ html }` or `{ domNodes }` — use `mount()` from `svelte` into a node if the Svelte chip is kept, otherwise a small HTML template; either is fine, keep the smaller. |
| `EventHoverCard.svelte` | ONE floating card instance anchored to the hovered event via `eventMouseEnter`/`eventMouseLeave` (`info.el`, `info.event.extendedProps`), content as in pass 1 (time+duration, kind, service, client + contact tags, staff, product + product tags, event tags, status, notes, Open booking). |
| `MoveConfirmDialog.svelte` | Opened by `eventDrop` and `eventResize`: shows service · client, **old → new** time (and old → new staff when `newResource`), Save / Cancel. Save → `PATCH /api/scheduling/bookings/[id]` `{ start, end, resourceId? }`; 409 → toast with the server message + `info.revert()`; Cancel → `info.revert()`. Success → `store.mergeEvents` with the returned booking (or refetch the span). |
| `select` (drag on empty slot) | `goto('/scheduling/bookings/new?date=YYYY-MM-DD&time=HH:MM&resource=<id>')`; `BookingCreateForm` reads those three params to prefill date, time and staff (small S3-domain change, owned by S2b). |

`+page.svelte` = toolbar + `<SchedulingCalendar>` (+ EmptyState when no resources). `+page.server.ts` from pass 1 stays (initial window per view).

Deleted from pass 1: `DayView.svelte`, `WeekView.svelte`, `MonthView.svelte`, `AgendaView.svelte`, `lanes.ts`, `lanes.test.ts`.

### 3.2b Backend for drag/drop — booking reschedule (S1b)

`rescheduleBooking(ctx, id, { start: Date; end: Date; resourceId?: string }): Promise<SchedBooking>` in `scheduling-bookings.service.ts`:
- booking must be in the org and not `cancelled|rejected`; `end > start`; `resourceId` (if given) must be an active org resource;
- **conflict check**: any other booking on the target resource with status in `accepted|pending|completed` whose `[start − beforeBuffer, end + afterBuffer)` intersects → throw `BookingConflictError` (→ 409 `{ error: 'conflict', message }`); reuse whatever overlap/buffer logic `scheduling-public.service.ts` / `slots.ts` already use rather than writing a second one;
- outside working hours / holiday / leave is **allowed** (a human scheduler decides) — `TODO(handoff)` for a warning payload;
- updates `startTime`, `endTime`, `resourceId`, `updatedAt`; reminders read `startTime` live (verify, note if not).

`PATCH /api/scheduling/bookings/[id]` zod: `{ status? , kindId?, start?, end?, resourceId? }` — `start`+`end` together trigger `rescheduleBooking`. Also: `load-bookings-view.ts` must expose `kindId` on its `eventTypes` mapping (cross-slice gap found by S1).

### 3.3 Forms and settings

- `TagsField.svelte` (`src/lib/components/tags/TagsField.svelte`): chips with remove ×, a `Select` to add an existing tag, and an inline "New tag…" that POSTs `/api/crm/tags` (rotating `CRM_TAG_COLORS`). Props: `{ allTags: CalTag[]; value: string[] (bindable); disabled? }`. Modelled on the tag block in `src/routes/(app)/crm/[contactId]/+page.svelte`.
- `BookingCreateForm.svelte`: kind `Select` (defaults to the picked service's `kindId`, else the org default; label "Event type") + `TagsField`. After the booking POST succeeds, `PUT /api/tags/booking/<id>` when any tag is chosen. Register the two new fields in the assistant form catalog only if the catalog requires every field (check `BOOKING_FORM`); otherwise leave the catalog alone.
- `EventTypeEditor.svelte`: kind `Select` + `TagsField`; saved with the service (kind via the event-types API, tags via `PUT /api/tags/event_type/<id>` after save).
- `SellableWizard.svelte` (catalog create/edit): `TagsField`; saved via `PUT /api/tags/product/<productId>` after the create/PATCH succeeds. `/pos/catalog` list shows a Tags cell (chips) — read via `getTagLinks('product', ids)` in the catalog loader.
- `/scheduling/settings`: new "Event types" `Card`: list with colour swatch (`<input type="color">` native), inline rename, add row, delete (disabled for the default), "Set as default".
- i18n: new keys prefixed `sched_cal_`, `sched_kind_`, `tags_` in `messages/en.json` **and** `messages/es.json`. Shared message files are **append-only** (co-agents) — add keys, never reorder or remove.

## 4. Slices

| Slice | Owner | Files | Definition of done |
|---|---|---|---|
| S1 backend | subagent | migration; `pg-scheduling-schema.ts`; `pg-crm-schema.ts`; `scheduling.service.ts` (+kinds, kindId); `scheduling-bookings.service.ts` (kindId); `tag-links.service.ts` (+ unit test with the repo's mocked-db pattern, e.g. `scheduling-bookings-override.test.ts`); `load-calendar-events.ts`; API routes `event-kinds`, `tags/[kind]/[id]`, `scheduling/calendar`; zod additions | `bun run check` 0 errors; `bunx vitest run src/server/services/tag-links.service.test.ts src/server/db/pg-scheduling-schema.test.ts` green; migration dry-run parses (`psql --set ON_ERROR_STOP=1 -f` inside `begin; … rollback;` against the local stack if reachable, else reviewed line by line) |
| S2 calendar UI | subagent | everything in §3.2, `calendar/+page.svelte`, `calendar/+page.server.ts`, i18n keys | `bun run check` 0 errors; `bunx vitest run src/lib/components/scheduling/calendar` green; `DESIGN_LINT_BASE_REF=origin/master bun run lint:design` and `bun run lint:tokens` do not increase debt; headless browser check of all four views on port 5199 |
| S3 forms | subagent | `TagsField.svelte`, `BookingCreateForm.svelte`, `EventTypeEditor.svelte`, `SellableWizard.svelte`, catalog loader/list Tags cell, `scheduling/settings/+page.svelte` (+ its loader), i18n keys | same gates as S2 on its files |
| S1b reschedule | subagent | `scheduling-bookings.service.ts` (+test), bookings `[id]` PATCH route, `load-bookings-view.ts` kindId | `bun run check` 0 errors; `bunx vitest run src/server/services/scheduling-bookings*.test.ts` green |
| S2b library views | subagent (S2 resumed) | §3.2 pass 2 files; delete pass-1 grids; `BookingCreateForm` prefill params; i18n `sched_cal_*` | same gates as S2 |
| S4 integrate | orchestrator | prettier, full targeted vitest, UI-audit baseline re-pin (`node scripts/ui-audit-inventory.mjs --clean-baseline --out=tests/ui-audit/current-baseline.json` after committing route changes), migration applied to prod after merge (`FORCE_DB_MIGRATE=1 bun run db:migrate` with `SUPABASE_DB_URL` from `.env.local`), PR to `master` | PR green, prod `/scheduling/calendar` browser-verified |

Rules for every slice: Svelte 5 runes only; semantic tokens only (`ui-design-governance` skill); never run the full `bun run test` with `.env` present (it hits prod — use targeted `bunx vitest run <paths>`); prettier with `--plugin=prettier-plugin-svelte`; no `any`, no `@ts-nocheck`; open ends get a `TODO(handoff):` comment **and** a line in the meta `proposals/` ledger.

## 5. Out of scope

- **Infinite scroll** for week/month (pass-1 custom grids dropped in favour of the library) — later slice: a scroll window around the library instance; tracked in `proposals/`.
- Tags on stock items, invoices, or staff.
- Auto-tags (rule-based) for anything but contacts.
- Kind-driven behaviour (e.g. a "Block" kind that hides the customer fields) — kinds are purely categorical in this pass.

## 6. Verification (end to end)

1. Apply the migration locally (or prod after merge). `GET /api/scheduling/event-kinds` returns the four seeded kinds.
2. Create a tag in CRM settings; apply it to a contact, to a product (catalog edit), and to a service (service editor).
3. Create a booking for that contact + service with a second tag on the booking itself. `GET /api/scheduling/calendar?from&to` returns the event with `tags` (1), `contactTags` (1), `productTags` (1) and `kindId` equal to the service's kind.
4. `/scheduling/calendar?view=week`: scroll right past the loaded window → new columns appear, no viewport jump; scroll left the same. Hover the chip → card shows time, kind, service, client + contact tag, staff, product + product tag, event tag.
5. Create a second booking overlapping the first for the same staff → both chips share the column width; a third non-overlapping booking is full width.
6. `?view=month`: scroll down two months and back up; the header label follows; clicking a day number opens the day view on that date.
7. Click the date label → native date picker → pick a date → the URL and the view move.
8. Drag a booking to another time → confirm dialog shows old → new → Save → PATCH 200, chip stays; drag it onto another booking's slot on the same staff → Save → 409 toast, chip reverts. Resize the end → same dialog. Drag on an empty slot → `/scheduling/bookings/new` prefilled with date, time, staff.
9. `/scheduling/settings`: rename a kind, change its colour → the chip colour updates on the calendar.
