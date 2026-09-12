---
id: 2026-09-12-erp-core-modules-attachments-recon
title: "ERP core modules (CRM, Stock, Scheduling) + Attachments — codebase recon"
stage: spec
status: draft
pass: 1
created: 2026-09-12
updated: 2026-09-12
repos: [minion_hub]
type: research
parent: 2026-09-12-erp-core-modules-attachments-spec
---

# ERP core modules + attachments — recon (hub `origin/master` = `c4878dbb`, 2026-09-12)

Read-only survey of a detached worktree at `c4878dbb` (post-360; PR #248 jobs/stock chain is the tip, #249 calendar-tz is an ancestor). Paths are relative to `minion_hub/`; `file:line` pointers are from this commit. Nothing was run against a database.

Reference material read: brief `specs/2026-09-12-erp-core-modules-attachments-spec.md`; `specs/2026-09-08-hub-scheduling-calendar-views-tags-spec.md` (shipped, PR #244); `specs/2026-07-19-pos-stock-split-implementation-spec.md` (shipped); `specs/2026-08-03-crm-customers-server-pagination-spec.md` (superseded); `.planning/operations/360/CONTINUATION-LEDGER.md` §"Continuation 2026-09-11"; hub `CLAUDE.md`.

What master carries since the calendar spec shipped (ledger 2026-09-11): #249 `ef6d4638` org-timezone round-trip fix; #250 `1d491db8` mobile Home/Calendar composition + calendar toolbar + Playwright mobile fixtures; #247 security containment (assistant SQL fail-closed, bound actors); #248 durable jobs + stock invoice-issue identity (five migrations `20260909090100–090500` applied to prod by the owner).

---

## 1. Scheduling

### 1.1 Routes
| Route | Role |
|---|---|
| `src/routes/(app)/scheduling/calendar/+page.server.ts` | org tz = first active resource (`:30`); `?view` `:33-36`, `?date` `:38-39`, prefetch window per view `:41-55`; calls `loadCalendarEvents`, `listResources`, `listEventKinds`, `listTags`, `shouldMaskSensitive` |
| `src/routes/(app)/scheduling/calendar/+page.svelte` | toolbar + `SchedulingCalendar`; mirrors URL filters into `CalendarStore` `:20-23`; stale pre-#249 `TODO(handoff)` comment at `:26-35` (bug already fixed — delete) |
| `src/routes/(app)/scheduling/bookings/+page.svelte` (+`new/`) | `BookingsView`; create form at `bookings/new` (`BookingCreateForm`) |
| `event-types/`, `links/`, `reminders/`, `resources/`, `settings/` | services (event types), public links, reminders, staff, org settings incl. Event kinds card |
| `src/routes/api/scheduling/bookings/+server.ts` | `GET:16` list, `POST:56` create. **No DELETE.** |
| `src/routes/api/scheduling/bookings/[id]/+server.ts` | `PATCH:38` only — `status` \| `kindId` \| `start+end(+resourceId)` → reschedule (zod refine `:30-34`); 409 on `BookingConflictError` `:56-58`; cancel = `PATCH {status:'cancelled'}` |
| `bookings/[id]/complete`, `/accrual`, `/order` | complete (realizes stock accruals `:46`), ad-hoc accrual, `createOrderFromBooking` |
| `src/routes/api/scheduling/calendar/+server.ts` | `GET:13` range → `CalendarPayload` (62-day cap) |
| `event-kinds/` (+`[id]`), `event-types/` (+`[id]`), `resources/` (+`[id]`, `/availability`), `slots/`, `links/`, `public/[slug]/*`, `reminders/*`, `hr/*` | CRUD as named |
| `src/routes/api/tags/[kind]/[id]/+server.ts` | `GET:30` / `PUT:43` replace tag set; kind ∈ `booking\|event_type\|product` |

### 1.2 Components (`src/lib/components/scheduling/`)
Flat: `BookingCreateForm`, `BookingsView` (+`bookings-view.ts`), `EventTypeEditor`, `AvailabilityEditor`, `WeekHoursEditor`, `MemberCalendarStrip`, `ProcedurePickerField`, `ResourcePickerField`, `ServicePickerField`, `RevenueByResource`, `UtilizationHeatmap`, `SchedulingNav`, `service-rows.ts`.
`calendar/`: `SchedulingCalendar.svelte` (335 lines), `CalendarToolbar.svelte`, `EventHoverCard.svelte`, `MoveConfirmDialog.svelte`, `calendar.svelte.ts` (store), `types.ts`, `ec-skin.css`, `calendar.svelte.test.ts`.

`SchedulingCalendar.svelte` — `@event-calendar/core` plugins `[ResourceTimeGrid, TimeGrid, DayGrid, List, Interaction]` (`:254`). Event mapping `:100-110`: `backgroundColor = store.kindOf(ev)?.color ?? ev.resourceColor` (`:106`) — **colour comes from the event kind, not from tags**; `classNames:[status]`; `extendedProps = CalEvent`. `eventContent` (`:187`) builds a **raw HTML chip** (`chipHtml` `:72-95`): staff dot, `hh:mm`, service title, client name, then up to 3 tag dots + `+N` merged from `ev.tags ∪ ev.contactTags ∪ ev.productTags` (`:77-91`) — tag dots exist but are not distinguishable by origin and there is no per-user toggle. `eventDrop`/`eventResize` → `openMove` (`:131-142`) → `MoveConfirmDialog` (`PATCH` at `MoveConfirmDialog.svelte:70-73`; 409 → toast + `revert()` `:97-103`; success → `store.patchEvent`). `select` on empty slot → `goto('/scheduling/bookings/new?date&time&resource')` (`:204-214`). Hover card anchored on `eventMouseEnter/Leave` (`:190-199`), single link `/scheduling/bookings?focus={id}` (`EventHoverCard.svelte:125`). Options `:173-186`: 07:00–21:00, 15-min slot/snap, `slotEventOverlap:false`, `editable/selectable = canEdit`.

**There is no booking edit form** (no `BookingEditForm.svelte`) and **no delete path** in UI or API. Existing-booking edits are limited to drag/resize (calendar) and status buttons in `BookingsView.svelte:264-290` (+ "create sales order" `:295-301`).

### 1.3 Server
- `src/server/services/scheduling-bookings.service.ts`: `createBooking:252` (resolves/creates CRM contact `resolveCrmContact:162` / `ensureCrmContact:200`; post-commit `accrueConsumption` `:432`), `listBookings:457`, `setBookingStatus:486` (releases accruals on cancel/reject/no-show `:497`), `setBookingKind:506`, `getBooking:520`, `rescheduleBooking:553` (buffer-padded `intervalsOverlap` from `slots.ts`; `BookingConflictError:41` thrown `:625`; `CONFLICT_STATUSES:541`). **No `updateBooking`** (title/notes/contact/service/product are immutable after create).
- `src/server/services/scheduling.service.ts`: resources `:31-122`, availability `:150`, `listEventKinds:216` (lazy-seeds 4 defaults), kinds CRUD `:247-333`, event types `:348-497`, links `:507-552`.
- `src/server/services/tag-links.service.ts`: `getTagLinks:21`, `setTagLinks:59` (replace-set, validates org + rejects `kind='auto'`), `getContactTagsBulk:108`.
- `src/server/scheduling/load-calendar-events.ts`: `loadCalendarEvents:37` — statuses `accepted|pending|completed`, `startTime >= from` only (`TODO(handoff):76` — events starting before `from` are invisible), joins resources/event types/`fin_products`, batched tag lookups `:90-92`, serialises via `toOffsetIsoString(r.start, r.resourceTimezone)` `:96-97`.
- Other: `scheduling-slots.service.ts`, `scheduling-public.service.ts`, `scheduling-analytics.service.ts`, `src/server/scheduling/{slots,reminders,tz,load-bookings-view}.ts`.

### 1.4 Tables (`src/server/db/pg-scheduling-schema.ts`; base DDL predates `supabase/migrations/`, only `20260908000000_event_kinds_and_tag_links.sql` is in-tree)
| Table | Line | Notes |
|---|---|---|
| `sched_resources` | `:43` | kind staff/room/equipment, `profileId`, **`timezone` default `America/Lima` `:53`**, `color`, `metadata` |
| `sched_schedules` / `sched_availability` | `:69` / `:96` | per-resource weekly hours + date overrides |
| `sched_event_types` (services) | `:117` | slug/title/length/buffers, **`productId:145`** → `fin_products` (soft), **`kindId:148`** FK set-null, `color` |
| `sched_event_kinds` | `:167` | `color` not null `:173`, `isDefault`, uniq (org,name) `:181`, one default/org `:182` |
| `sched_event_type_resources` | `:189` | join |
| `sched_bookings` | `:207` | `eventTypeId` FK `:213`, `resourceId` FK `:216`, start/end, status, title, notes, attendee name/email/phone, **`crmContactId:229`** (soft), **`partyId:231`** (soft), **`productId:233`** (soft → `fin_products`), **`kindId:237`** FK, `source`, `rescheduledFromId`, `metadata` jsonb. **No `invoiceId`, no attachments.** |
| `sched_links` | `:262` | public booking links |
| `tag_links` | `pg-crm-schema.ts:209` | `entity_kind` check lives only in SQL (`…20260908000000…sql:30`): `booking\|event_type\|product`; PK `(entity_kind, entity_id, tag_id)`; `applied_by`; RLS policy `tag_links_org_guc` `:55-58` |

Reverse links into bookings: `sales_orders.source_booking_id` (`pg-sales-schema.ts:35`, unique partial `:67`), `pos_ticket_lines.booking_id` (`pg-pos-schema.ts:119`; `pos.service.ts:581` issues no stock for booking-owned lines), `sched_reminders.booking_id` (`pg-reminders-schema.ts:48`), `stk_accruals.source='booking'+source_id` (`pg-schema/stock.ts:248-250`). **Nothing links a booking to `fin_invoices`** except transitively via a POS ticket's `invoiceProviderRef`.

### 1.5 Timezone (PR #249, `ef6d4638`)
`src/server/scheduling/tz.ts` — Intl-only helpers: `utcToZonedParts:44`, `tzOffsetMinutes:61`, `zonedTimeToUtc:72`, `zonedDateKey:111`, **`toOffsetIsoString:127`** (explicit `±HH:MM`, never `Z`, because `@event-calendar/core` `parseOffset` ignores `Z`). Client `calendar.svelte.ts`: `offsetIso:24`, `calendarWallTime:33`, `calendarMoveIso:45`; calendar instance runs on a neutral `timeZone:'UTC'` axis (`SchedulingCalendar.svelte:168`). Tests: `tz.test.ts`, `calendar.svelte.test.ts`. Open: no org-level tz setting — "org tz" is the first active resource's tz (`calendar/+page.server.ts:30`); fold-spanning events `TODO(handoff)` at `SchedulingCalendar.svelte:98`.

### 1.6 Tests
Unit: `src/server/scheduling/{tz,slots,reminders}.test.ts`; `src/server/services/scheduling-bookings-{reschedule,accrual,override}.test.ts`, `tag-links.service.test.ts`; `src/server/db/pg-scheduling-schema.test.ts`; `src/lib/components/scheduling/calendar/calendar.svelte.test.ts`, `service-rows.test.ts`; `src/routes/(app)/scheduling/bookings/bookings-routes.characterization.test.ts`. **No tests** for `scheduling.service.ts`, `load-calendar-events.ts`, public/slots/analytics services.
E2E: `tests/e2e/ui-audit/calendar-mobile.spec.ts` (390×844 `:155,:172,:218`; 600×390 `:173`; per-view widths `:136`) on fixture `tests/fixtures/mobile-composition/CalendarFixture.svelte`; viewport table `tests/e2e/ui-audit/viewports.ts` has 768/1280 but the calendar spec does not exercise them; **no drag/drop/resize Playwright coverage**.

### 1.7 `TODO(handoff)` (scheduling)
- `scheduling-bookings.service.ts:631` — reschedule outside hours/holiday/leave allowed silently; no `warnings[]` payload.
- `load-calendar-events.ts:76` — overlap-window inclusion for bookings starting before `from`.
- `SchedulingCalendar.svelte:98` — fold-spanning rendering when local end <= start.
- `BookingCreateForm.svelte:238` — `resourceId` only from `?resource=` deep link; no visible staff picker.
- `calendar/+page.svelte:26` — stale (fixed by #249).

### 1.8 Per-user preferences
Mechanism exists: `src/server/services/user-preferences.service.ts` (`getUserPreferences:12`, `upsertUserPreference:24`, table `userPreferences` from `@minion-stack/db/pg`, keyed by profile id) + `preferences.service.ts:21 loadUserPreferences`. **Scheduling does not use it** — all calendar state is URL-only (`CalendarToolbar.svelte:2`, `navigate():57-68`; filtering client-side `calendar.svelte.ts:77-85`). The brief's "toggleable per user" artifact overlay can persist through `upsertUserPreference` with zero schema work.

---

## 2. CRM

### 2.1 Routes and services
Pages `src/routes/(app)/crm/`: `+page` dashboard; `customers/+page.svelte` (~800 lines, DataTable with stage/funnel/tag/score filters; tag filter is a `<select>` `:779-784`, **no tag chip column**); `[contactId]/+page.svelte` (1587 lines) + `+page.server.ts` (80); `cleanup/`, `insights/`, `settings/`.
API `src/routes/api/crm/`: `contacts` GET/POST, `contacts/[id]` GET/PATCH/DELETE, `contacts/[id]/{tags POST|DELETE, notes, message, prefill, similar-wins, funnel, funnel/analyze, journey/analyze}`, `contacts/{sync,bulk-delete,export.csv}`, `tags` GET/POST, `tags/[id]` DELETE, `tags/[id]/evaluate`, `cleanup/*`, `insights/*`, `parties` (+`[id]`, `reconcile`), `accounts`, `dni-lookup`, `ruc-lookup`, cron ticks.
`src/server/services/crm-contacts.service.ts` (~2350 lines): `rankContactsPage:400` / `rankContacts:474`, `getContact:1356`, `createContact:1482`, `updateContact:1561`, `softDeleteContact:1668`, `hardDeleteContact:1728`, `addNote:1735`, custom fields `:1168-1554`, tags `listTags:1844`, `createTag:1854`, `deleteTag:1891`, `applyTag:1898`, `removeTag:1913`, `applyTagBulk:1991`, `getContactTags:2012`; dedupe/merge in `crm-cleanup.service.ts`; 15 further `crm-*.service.ts` (finance, journey, insights, relationship, …).

### 2.2 Tags
Schema `src/server/db/pg-crm-schema.ts`: `crm_tags:179` (`name`, `color` nullable, `kind` manual/auto, `rule` jsonb, `position`, `createdBy`; uniq (org,name)); `crm_contact_tags:231` PK (contact, tag), both FK cascade; `tag_links:209` (never applies to contacts — contacts keep `crm_contact_tags`). Auto-tags are evaluated live (`[contactId]/+page.server.ts:47-52`, `evaluateTagRule` in `crm-scoring.ts`), never stored, contact-only.
Rendering is fragmented — four hand-rolled idioms, one shared field:
- `src/lib/components/tags/TagsField.svelte` (chips `:79` `style:--c`, color-mix `:131-133`; creates tags via POST with `CRM_TAG_COLORS` from `src/lib/components/crm/tag-colors.ts`). Used by `pos/SellableWizard.svelte:434`, `scheduling/BookingCreateForm.svelte:338` (PUT `/api/tags/booking/{id}` `:258`), `scheduling/EventTypeEditor.svelte:229`.
- `crm/[contactId]/+page.svelte:714-737` manual + auto chips, add via `<Select class="addtag">`.
- `SchedulingCalendar.svelte:75-95` raw-HTML dots (`.ec-chip-tag`), `EventHoverCard.svelte:109-116` `<Chip style:background>`, `pos/catalog/+page.svelte:378-381` `.tag-chips`.
No shared `TagChip`/`TagDot` component; no tag picker built on `Picker`.

### 2.3 Picker adoption
`ui/Picker.svelte` wrappers: `pos/CustomerPicker.svelte`, `crm/PartyPicker.svelte`, `scheduling/{Service,Procedure,Resource}PickerField.svelte`, `stock/StockItemPicker.svelte`, `channels/ChannelAssignmentPicker.svelte`. `CustomerPicker` used in `pos/sell:30`, `pos/appointments:23`, `BookingCreateForm:11`. Contact picking is Picker-based everywhere it exists; tags are the remaining Select-based surface.

### 2.4 RLS / org scoping
`src/server/db/with-org-core.ts` `withOrgCore:85` / `withOrgCoreTransaction:24` set `app.current_org_id` (`:43`) — every CRM service runs inside it. `ownerFilter` / `shouldMaskSensitive` (from `rbac.service.ts`) are applied in **loaders** (`crm/[contactId]/+page.server.ts:31-35,44`; `crm/+page.server.ts:3`), not inside services. Only two in-tree migrations touch CRM (`20260825100000_crm_contact_activity_rollup.sql`, `20260908000000_event_kinds_and_tag_links.sql`); `crm_contacts`/`crm_tags`/`crm_contact_tags` DDL and policies are out-of-tree (see memory: schema not reproducible from repo).

### 2.5 Contact detail interconnection
Loader fans out to `getContact`, `getContactTimeline`, `getContactTags`, `contactFinanceSummary`/`contactCashflow` (`crm-finance.service`), `contactConnections`, `contactJourney`. Page sections: identity `:462`, funnel `:654`, lifecycle+tags `:695-737`, identities `:753`, financials `:800` (invoice deep links `/finances/invoices/{id}` `:822` — matched by document number, not FK), journey `:890` (booking milestones `:913` **without links to `/scheduling`**), notes `:930`. **No bookings list, no files/attachments section.** `fin_invoices` has no `contact_id`/`party_id` (`pg-finance-schema.ts:24`); the CRM→invoice join is `clientDocNumber` (RUC/DNI).

### 2.6 Open ends
`TODO(handoff)`: `crm/customers/+page.svelte:167` (assistant `?new=1` party form POST), `api/crm/ruc-lookup/+server.ts:13` (DNI twin in crm-sdk), `crm-deposit-rule.ts:178` (unwired). Zero `type="file"`/upload usage anywhere under CRM.

---

## 3. Stock

### 3.1 Routes and services
Pages `src/routes/(app)/stock/`: dashboard (`EmptyState` only here `:114`), `items/`, `items/[id]/` (bins, ledger, consumption, supplier, valuation), `entries/` (+`new/`, `[id]/`), `warehouses/`, `commitments/` (accruals). **`EmptyState` missing** on items/entries/warehouses/commitments and `pos/catalog`.
API `src/routes/api/stock/`: `items` GET/POST, `items/[id]` PATCH, `items/[id]/components`, `entries` GET/POST, `entries/[id]` GET/PATCH/DELETE, `entries/[id]/{submit,cancel}`, `entries/from-invoice` POST, `warehouses` (+`[id]`), `ledger`, `bins`, `maintenance/rebuild-bins`, `consumption` (+`[id]`), `accruals` (+`preview`); `_errors.ts` maps `StockError`.
`src/server/services/stock.service.ts`: items `:74-350`, warehouses `:385-422`, entries `listEntries:510`…`cancelEntry:853`, `getBins:923`, `getLedger:938`, `rebuildBins:977`, consumption `:1056-1193`, `buildInvoiceIssuePreview:1252`, `buildServiceIssuePreview:1514`, `createServiceIssue:1642`, `createSourcedIssue:1698`, `createIssueFromInvoice:1762` (#248: locks `fin_invoices` row, identity from DB `:1782-1798`), `findEntryByInvoice:1876`. Pure logic `stock.logic.ts`; accruals `stock-accruals.service.ts` (`accrueConsumption:76`, `releaseAccruals:215`, `realizeAccruals:341`, `listAccruals:466`, `availableToPromise:506`); cost `item-cost.service.ts` (`costForProducts:157`).

### 3.2 Tables (`src/server/db/pg-schema/stock.ts`)
`stk_items:28` (`finProductId:64` soft → `fin_products`, `defaultSupplierPartyId:44` soft → parties, moq, uom conversions, svg; uniq `(org,code)` `:70`, partial uniq `(org,fin_product_id)` `:77`); `stk_warehouses:82` (`archivedAt:93`); `stk_entries:105` (`partyId`, `metadata` carries `invoiceId|source|sourceId|ticketId`; uniq `stk_entries_org_active_invoice_issue_uniq:129` from #248); `stk_entry_lines:141`; `stk_ledger:171` append-only; `stk_bins:192`; `stk_consumption:212` (`finProductId` + `itemId` + `qtyPerUnit`); `stk_accruals:242` (`source` booking|order + `sourceId`, status open|realized|released); `stk_item_components:297` DAG. Migrations: `20260702130000_stock.sql` … `20260909090200_stock_invoice_issue_identity.sql` (11 files).

### 3.3 Links
- POS ticket → stock: `pos.service.ts:660 postTicketStock` → `resolveIssueLines:523` (recipe beats 1:1 bridge; booking-owned lines skipped `:581`) → `createSourcedIssue` with `metadata{source:'pos',sourceId}`; ticket stamped `stockEntryId`/`stockWarning` (`pg-pos-schema.ts:73`).
- Invoice → stock: `createIssueFromInvoice:1762`, entered from `finances/invoices/[id]/+page.svelte:244,272` and gateway action `api/gateway/actions/stock-issue-from-invoice/+server.ts:36`; loader `findEntryByInvoice` (`finances/invoices/[id]/+page.server.ts:21`).
- Booking → stock: accrual only (`scheduling-bookings.service.ts:432,497`; realize at `bookings/[id]/complete/+server.ts:46`); read side `load-bookings-view.ts:21,113`; UI `BookingsView.svelte:17` (`stock/ConsumptionGauge.svelte`, `qtyConsumption` edit `:177-179`).
- Catalog triangle: `sched_event_types.product_id` → `fin_products` ← `stk_items.fin_product_id` ← `stk_consumption.fin_product_id` (doc at `pg-schema/stock.ts:196-201`); `createSellable:1235` chains product → item → consumption sequentially, not in one tx (`:1226-1233`). Product tags via `getTagLinks('product')` at `pos/catalog/+page.server.ts:47`, `catalog/[productId]/edit/+page.server.ts:16`.
- No `contact_id`/`booking_id` in any stock table; no attachment columns anywhere in `src/server/db` (only `src/server/db/schema/files.ts:12 b2FileKey`, legacy SQLite mirror).

### 3.4 Open ends
`stock.service.ts:752` (archived warehouses accepted), `:1761` (multi-process invoice/stock race unqualified); `pos.service.ts:1406,1420` (trackStock/uom transitions on update); `SellableWizard.svelte:488`; `finance.service.ts:81`, `finance-statements.service.ts:160,440`, `finance-statement-parser.ts:28`.

---

## 4. Storage

### 4.1 Driver and file service
- `src/server/storage/blob.ts`: `BlobStorageDriver:13` = `put`, `getSignedUrl(key, expiresIn)`, `delete` — **no presigned PUT**; `getStorage:27` (provider by `STORAGE_PROVIDER`, only `'s3'`), `isStorageConfigured:36`.
- `src/server/storage/drivers/s3.ts`: `resolveS3Config:42` env chain `STORAGE_*` → `B2_*` (`B2_ENDPOINT`, `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET_NAME` default `minionhub`), `put:101`, `getSignedUrl:117` (default 3600 s), `delete:124`, 30 s timeout + one retry `:91`. `@aws-sdk/s3-request-presigner` already a dependency (`package.json:7`). Tests `blob.test.ts`, `drivers/s3.test.ts`.
- PR #119 (`168bed9a`, 2026-08-18): bucket closed, every read presigns; **presigned-GET is the only mode** (no public/presigned switch).
- `src/server/services/file.service.ts`: `uploadFile:20` (key `${tenantId}/${category}/${id}/${fileName}` `:23`), `getFileUrl:46`, `deleteFile:61` (storage delete inside tx), `listFiles:83` (limit 200, cached). Table **`files` lives in `@minion-stack/db/pg`** (meta `packages/db/src/pg/schema/files.ts`: `id` **text** `:8`, `tenant_id` **uuid** `:9`, `uploaded_by` → `profiles.id` set-null `:10`, `b2_file_key:11`, `size_bytes:14`, `category:15` default `general`, `content_type`, `file_name`, `tenant_id`), not in hub schema — a hub-side `attachment_links.file_id` must be a soft ref (precedent: `meta_post_media.file_id`, `20260705120000_meta_post_media.sql:13`).

### 4.2 Upload endpoints today
| Endpoint | Size cap | MIME | Gate | Storage |
|---|---|---|---|---|
| `POST /api/files` (`src/routes/api/files/+server.ts:15`) | **none** | **none** (`:28` octet-stream fallback) | `getCoreCtx` only; `/api/files` **not in `API_WRITE_PREFIXES`** | `files` row + blob |
| `GET /api/files/[id]/raw` (`:22`) | — | — | `getCoreCtx` | 302 → signed URL 86 400 s, `Cache-Control: private` `:29` |
| `POST /api/finances/statement-imports` (`:24`) | `MAX_CSV_BYTES` 10 MB `:11`, 413 `:37` | `ALLOWED_CSV_MIME` `:13` + `.csv` | module + personal org + hook | via `uploadFile` |
| `POST /api/notes/transcribe` (`:22`) | 25 MB `:8` | — | `requireAuth` | not stored |
| `POST /api/brains/[id]/documents` (`:53`) | 1 MB `:16` (JSON text) | `.md/.txt/.csv` `:17` | hook `/api/brains` | `brain_documents.source_ref` |
| `POST /api/bugs/report` | — | forced png `:44` | `getCoreCtx` | direct key, bypasses `files` |
Client upload sites: `users/avatar/AvatarEditorModal.svelte:81`, `workshop/InboxOverlay.svelte:149`, `state/features/agent-notes.svelte.ts:712`, `brains/AddSourceDialog.svelte:78`. **No shared file-drop component**; each rolls its own `<input type="file">`.

### 4.3 Limits and body size
`svelte.config.js:36` `adapter-vercel({ runtime:'nodejs22.x', maxDuration:300 })`; **no `BODY_SIZE_LIMIT`/`bodySizeLimit` anywhere**; `hooks.server.ts` has no content-length check. Vercel's ~4.5 MB serverless request cap is undocumented in the repo and already contradicts the 10 MB CSV cap. ⇒ browser-direct presigned PUT is required for anything beyond ~4 MB; server-proxied upload is fine below it.

### 4.4 Audit / actor precedent
`src/server/db/pg-activity-schema.ts`: `doc_audit_log:39` (`org_id`, polymorphic `ref_type`/`ref_id`, `actor_id`, `actor_name`, `op`, `changes` jsonb) and `doc_comments:14`; `src/server/services/activity.service.ts` `recordAudit:127`, `recordAuditInTx:123`, `listEntityTimeline:133`; coverage test `audit-coverage.test.ts`. Reuse for attach/unlink audit instead of a new table.

### 4.5 RBAC registration points
`rbac.service.ts:1074 API_WRITE_PREFIXES` (crm `:1079`, finance `:1083`, scheduling `:1085`, stock `:1089`, pos `:1091`), `apiWriteCapability:1113` (longest prefix; `/api/scheduling/public/` excluded `:1119`), `OWNER_SCOPABLE_MODULES:414` = crm/sales/support only, `FIELD_LEVEL_MODULES` (`src/lib/permissions.ts:122`) = crm/finance/scheduling. Route view prefixes `src/lib/routes/route-access-registry.ts:113` (`/crm`, `/finances`, `/scheduling`, `/stock:122`, `/pos`); `MODULE_SUBRESOURCES:29` has **no `stock` entry**. `hooks.server.ts:376-391` central write guard.

---

## 5. Interconnection map (current link mechanism, master)

Legend: FK = real constraint · soft = uuid/text column, no FK · meta = jsonb · tag = `tag_links`/`crm_contact_tags` · none.

| from \ to | CRM contact | Booking | Service (`sched_event_types`) | Product (`fin_products`) | Stock item | Invoice (`fin_invoices`) | POS ticket | Tag | File |
|---|---|---|---|---|---|---|---|---|---|
| **CRM contact** | — | none (only via booking.crm_contact_id reverse) | none | none | none | soft-by-value (`clientDocNumber` = DNI/RUC) | reverse soft `pos_tickets.crm_contact_id` | `crm_contact_tags` FK | none |
| **Booking** | soft `crm_contact_id` + `party_id` | `rescheduled_from_id` | FK `event_type_id` | soft `product_id` | accrual `stk_accruals(source='booking')` | **none** | reverse `pos_ticket_lines.booking_id`; `sales_orders.source_booking_id` | `tag_links('booking')` | none |
| **Service** | none | reverse | — | soft `product_id` | via product → `stk_consumption` | none | none | `tag_links('event_type')` | none |
| **Product** | none | reverse | reverse | — | soft `stk_items.fin_product_id` (partial uniq) + `stk_consumption` | `fin_invoice_items.product_id` | ticket lines | `tag_links('product')` | none |
| **Stock item** | none | none | none | soft `fin_product_id` | `stk_item_components` DAG | via `stk_entries.metadata.invoiceId` (issue) | via `stk_entries.metadata{source:'pos'}` | **none** (out of scope in #244) | none |
| **Invoice** | by value (doc number) | none | none | items FK | issue entry (meta) | — | `pos_tickets.invoice_provider_ref` | none | none |
| **File** | none | none | none | none | none | none | none | none | `meta_post_media.file_id` soft only |

Colour today: booking chip = kind colour ?? resource colour; tag colours = dots only. Invoice ↔ booking has no path at all; contact ↔ booking exists in data but is not surfaced on the contact page.

---

## 6. Gaps vs the brief and proposed slice order

### 6.1 Gap list
**A. Scheduling**
- A1 No edit/delete for existing bookings: no `updateBooking`, no `DELETE`, no edit form (§1.2, §1.3). Move/resize + status only.
- A2 Event → invoice link does not exist in schema or UI (§1.4, §5). Event → contact/service/product exist as columns but only contact/service are settable in `BookingCreateForm`; product comes from the service.
- A3 Colour from the event's own tags: not implemented — colour = kind (`SchedulingCalendar.svelte:106`); tag dots merged without origin (`:77-91`); no per-user toggle; preference mechanism exists but unused (§1.8).
- A4 Drag/drop/resize has unit coverage (`scheduling-bookings-reschedule.test.ts`, `calendar.svelte.test.ts`) and a mobile Playwright spec, but no interaction fixtures at 768/1280 and no e2e for move/resize/409-revert (§1.6).
- A5 Rendering correctness edges open: `load-calendar-events.ts:76` (events starting before window), `SchedulingCalendar.svelte:98` (fold), org tz derived from first resource.
- A6 Contact page shows no bookings list and no link to the calendar (§2.5).
**B. CRM** — B1 tag rendering split across 4 idioms, no shared chip/dot (§2.2); B2 no attachments (§2.6); B3 ownerFilter/masking applied per-loader, not in services (verify every list path); B4 three handoffs (§2.6).
**C. Stock** — C1 `EmptyState` missing on 4 list pages + catalog (§3.1); C2 archived warehouses accepted on submit (`stock.service.ts:752`); C3 no `MODULE_SUBRESOURCES.stock` (route-level view perms only); C4 no attachments; C5 handoffs §3.4.
**D. Attachments** — D1 no `attachments`/`attachment_links` tables; `files` table is in `@minion-stack/db` (soft ref required); D2 no presigned PUT in the driver; D3 `/api/files` has no size cap, no MIME allowlist, not under `apiWriteCapability`; D4 no body-size handling and Vercel ~4.5 MB cap; D5 no shared upload/list component; D6 per-org quota needs a `sum(size_bytes)` over `files` by tenant (no column today); D7 audit → reuse `doc_audit_log`.

### 6.2 Slice order (each ≤ ~10 files, independently shippable off `origin/master`)
Every slice: focused `bunx vitest run <paths>`, `bun run check`, `lint:design`/`lint:tokens`; slices marked **routes** touch `src/routes` ⇒ re-pin `tests/ui-audit/current-baseline.json` and route-contract counts. **mig** = new `supabase/migrations/*.sql` applied with `FORCE_DB_MIGRATE=1 bun run db:migrate` before merge.

| # | Slice | Files (approx) | mig | routes |
|---|---|---|---|---|
| S1 | **Attachments schema + service**: `attachments` view over `files` is unnecessary — add `attachment_links(org_id, file_id text soft → files.id, object_type text check in ('crm_contact','booking','event_type','product','stk_item','fin_invoice'), object_id uuid, linked_by, linked_at, pk(object_type,object_id,file_id))` copying `20260908000000…sql:28-60` verbatim; `attachments.service.ts` (`link`, `unlink`, `listByObject` bulk, `deleteIfUnlinked`) + `recordAuditInTx`; unit test with mocked-db pattern | migration, `pg-attachments-schema.ts`, service, test, `rbac.service.ts` (`/api/attachments` prefix) | yes | no |
| S2 | **Hardened upload path**: per-file cap + MIME allowlist + org quota (`sum(size_bytes)` per tenant) in `file.service.ts`/`/api/files`; add `presignPut` to `blob.ts`/`s3.ts`; `POST /api/attachments/intent` (presigned PUT, returns key+file id) and `POST /api/attachments/finalize`; keep server-proxied `POST /api/files` for ≤4 MB; 413 in one place | `blob.ts`, `s3.ts`, `file.service.ts`, `api/files/+server.ts`, 2 new api routes, tests | no | yes |
| S3 | **`AttachmentButton` + `AttachmentList`** (`src/lib/components/attachments/`): shared `<input type="file">` + list with presigned download and unlink; mounted on CRM contact detail and booking (BookingsView row / hover card) | 2 components, `crm/[contactId]/+page.{svelte,server.ts}`, `BookingsView.svelte`, `load-bookings-view.ts`, i18n | no | yes |
| S4 | **Attachments on services, stock items, invoices** (same component, three loaders) | `event-types/+page*`, `stock/items/[id]/+page*`, `finances/invoices/[id]/+page*`, i18n | no | yes |
| S5 | **Booking edit + delete**: `updateBooking` (title/notes/contact/service/product/kind) + `deleteBooking` (hard delete only when no ticket line/order/accrual references, else 409 → cancel) in `scheduling-bookings.service.ts`; `PATCH` zod extension + `DELETE` handler; `BookingEditForm` reusing `BookingCreateForm` pieces; hover-card "Edit" | service + test, `bookings/[id]/+server.ts`, form, hover card, `BookingsView`, i18n | no | yes |
| S6 | **Booking ↔ invoice link**: additive `sched_bookings.invoice_id uuid` (soft → `fin_invoices`) + reverse lookup by `pos_tickets.invoice_provider_ref` via ticket lines; Picker field on the edit form; invoice detail shows linked bookings | migration, schema, service, edit form, `finances/invoices/[id]/+page*`, `load-calendar-events.ts` | yes | yes |
| S7 | **Tag-driven event colour + inherited artifacts + per-user toggle**: colour resolution order `first booking tag with colour → kind → resource` in `SchedulingCalendar.svelte:106`; chip dots grouped by origin (own / contact / product) with a `title`; toggle persisted via `upsertUserPreference('calendar.artifacts')`, read in `calendar/+page.server.ts`; hover card shows "VIP"-style contact tags first | `SchedulingCalendar.svelte`, `calendar.svelte.ts`, `EventHoverCard.svelte`, `CalendarToolbar.svelte`, `calendar/+page.server.ts`, `types.ts`, test, i18n | no | yes |
| S8 | **Shared `TagChip`/`TagDot`** replacing the four idioms (§2.2) + tag chip column on `/crm/customers` | `tags/TagChip.svelte`, 4 call sites, customers page | no | yes |
| S9 | **Calendar correctness + e2e**: window overlap fix (`load-calendar-events.ts:76`), stale TODO removal, Playwright move/resize/409-revert at 390/768/1280 on `CalendarFixture` | loader + test, `calendar/+page.svelte`, e2e spec, fixture | no | yes |
| S10 | **CRM ↔ scheduling surfacing**: bookings card on contact detail (`listBookings` by `crmContactId`) with links to `/scheduling/calendar?date=`; journey milestones link | `crm/[contactId]/+page*`, `listBookings` opts, i18n | no | yes |
| S11 | **Stock/CRM readiness pass**: `EmptyState` on 5 list pages, archived-warehouse guard (`stock.service.ts:752`) + test, `MODULE_SUBRESOURCES.stock`, ownerFilter audit of CRM list paths | 5 pages, service + test, `route-access-registry.ts` | no | yes |

Dependencies: S3 ← S1+S2; S4 ← S3; S6 ← S5; S7 independent of S1–S6; S8 can precede S7 (S7 then uses `TagDot`). S1, S2, S5, S7, S8, S9, S11 can start in parallel off master.

### 6.3 Notes for the implementer
- `tag_links` migration `20260908000000` is the RLS/grant template (`app_ledger`, `enable`+`force` RLS, `*_org_guc` policy); `files.id` is **text** and `files.tenant_id` is **uuid** (ERP tables use `org_id text`) — `attachment_links.file_id` must be `text`, `org_id text` like `tag_links`.
- Never `db:push`; hub schema is not reproducible from the repo — verify the prod catalog (`hub_migrations`, 79 applied as of 2026-09-11) before adding a migration.
- Vercel body cap makes S2's presigned PUT the only path for PDFs/images >4 MB; the per-file limit should default below that for the proxied path.
- Owner brief says links are "not mandatory": every FK/soft column above stays nullable; `attachment_links` uses the polymorphic no-FK shape so one file can attach to a contact, an event and an invoice at once (three rows).
