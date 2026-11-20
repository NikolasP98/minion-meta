# Implementation Plan: Stock checkpoints

**Branch**: `feat/135-stock-checkpoints` (hub, base `master`), one branch per slice | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/135-stock-checkpoints/spec.md` (approved 2026-11-20, meta #1057)

## Summary

Staff count a warehouse shelf. An owner or admin locks the count. Locking posts one adjustment and records one checkpoint per counted item. From then on, a movement whose **physical time** is at or before an item's latest checkpoint does not move that item's quantity. The movement still happens for the other items and records the skip.

The design rests on three changes to the one place that writes stock (`submitEntryInTx` / `cancelEntryInTx`, `src/server/services/stock.service.ts:1006`, `:1175`):

1. Every posting can carry a physical time. It is stored on the entry (`stk_entries.physical_at`, new column).
2. A leg whose bin has a checkpoint at or after that physical time is skipped. The skip is written to `stk_checkpoint_skips`.
3. "System quantity at time T" is the sum of ledger deltas whose entry's physical time is at or before T. This makes a count correct even when an old appointment is completed while the count is still a draft (research R3).

Seven slices, interleaved with spec 134 (order below). The first ships the tables, the rule on appointment completion, and the FACES backfill of the 18/11 count.

Design detail: [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md). Validation guide: [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: TypeScript (strict), Svelte 5 runes, SvelteKit 2 (hub)

**Primary Dependencies**: Drizzle ORM over postgres.js (`withOrgCore`), Paraglide i18n, hub UI kit (`DataTable`, `Picker`, `Modal`, `Button`, `Badge`, `EmptyState`), lucide-svelte

**Storage**: Supabase Postgres.
- New tables: `stk_counts`, `stk_count_lines`, `stk_checkpoint_skips` (S1); `stk_settings` (S4).
- New column: `stk_entries.physical_at` (S1).
- Two hub migrations under `supabase/migrations/`, each with its Drizzle mirror in `src/server/db/pg-schema/stock.ts` (pattern: spec 124's `20261116193000_stock_corrections.sql`).

**Testing**:
- Vitest (bun) with the hub's mocked-DB service tests (`stock.service.test.ts`, `stock-accruals.service.test.ts`, `pos.tickets.test.ts`).
- Pure-helper unit tests.
- One native-Postgres `*.sql.integration.test.ts` on the `qa-native` lane for the triggers and the time queries, registered in `scripts/qc/native-postgres-manifest.ts` (precedent: `stock-corrections.sql.integration.test.ts`).
- `*.mounted.test.ts` component tests.

**Target Platform**: Hub on Vercel; FACES uses desktop Chrome

**Project Type**: Web application (SvelteKit: services, routes and Svelte components in one repo)

**Performance Goals**:
- A posting with a physical time adds one indexed query for all its bins (checkpoint lookup). Postings without a physical time (the common case: "now") add none.
- Lock and draft views run one aggregate per count over the ledger of the counted items. FACES has a few thousand ledger rows, so this is milliseconds.

**Constraints**:
- `stk_ledger` stays append-only and keeps its meaning. A skipped leg writes no ledger row.
- Locked counts and their lines are immutable at the database level (trigger), not only in code.
- Lock authority is checked on the server inside the lock transaction.
- Every user-facing string goes through `m.*()` (es, en). Design tokens only; `lint:design` and `lint:tokens` may not regress.

**Scale/Scope**:
- FACES: 1 active warehouse ("Almacén Principal"), about 40 stock items.
- 57 to 101 old open appointments to close (spec 134).
- About 9 service/route files, 2 new pages, 2 inbox rules, 1 one-off script, about 45 i18n keys over all slices.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|---|---|
| I. Spec before code | ✅ spec.md approved 2026-11-20 (meta #1057); this plan; tasks next; no code yet |
| II. AS-IS → TO-BE → DELTA with evidence | ✅ in spec.md; this plan anchors every code claim to `file:line` and lists five spec corrections (research.md) |
| III. Slice-scoped delivery | ✅ seven hub PRs (four for this spec), each from a fresh clone of hub `origin/master`, base `master`. Foreground gates: `bun run check`, scoped vitest, `lint:design`, `lint:tokens`, `i18n:compile` |
| IV. Required build steps | ✅ S2 adds pages `/stock/counts`, `/stock/counts/[id]`: route-design manifest + the six route-contract counts, `stockRouteShell`, `StockNav`, nav `modules.ts`, `ROUTE_ACCESS_POLICY_OVERRIDES`, sub-resource entry. New API endpoints get their write gate in `apiWriteCapability` (rbac.service.ts:1003). i18n es/en. Design-token contract. |
| V. Data work keeps human gates | ✅ tagged `data`. Two migrations; owner approves this plan and merges every slice. The FACES backfill is dry-run by default, `--apply` to write, run twice (second run plans nothing), asserts invariants, and is reversible (it only inserts rows and stamps one column; undo SQL printed by the script). |
| FigCraft demo first (AGENTS.md) | ⏳ see "FigCraft demo" below; S2 and S3 UI wait for it |

Post-design re-check: ✅. The new column and four tables are justified in research R1–R4. No new dependency.

## Project Structure

### Documentation (this feature)

```text
specs/135-stock-checkpoints/
├── spec.md
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md                # next: /speckit-tasks
```

### Source Code (hub repository, `minion_hub`)

```text
supabase/migrations/
├── 20261120120000_stock_checkpoints.sql      # S1: physical_at, stk_counts, stk_count_lines, stk_checkpoint_skips, triggers, RLS, grants
└── 20261120130000_stock_settings.sql         # S4: stk_settings (count interval)
src/server/db/pg-schema/stock.ts              # S1/S4: Drizzle mirrors

src/server/services/
├── stock-checkpoints.ts                      # S1 NEW: checkpointFor, checkpointsForBins, systemQtyAt, recordSkips (no import of stock.service: avoids a cycle)
├── stock.service.ts                          # S1: StockError details; StockPostingOptions.physicalAt/ignoreCheckpoints; submitEntryInTx skips legs + stamps physical_at; cancelEntryInTx refuses a count's adjustment
│                                             # S3: cancelEntryInTx skip rule; assertPostedAtAdmissible refuses before_checkpoint
├── stock-accruals.service.ts                 # S1: realizeAccrualsInTx passes the booking start as physicalAt; listAccruals adds `checkpoint`
├── stock-counts.service.ts                   # S2 NEW: create/update/delete draft, getCount (live system qty), lockCount, listCounts, isOwnerOrAdmin
├── pos.service.ts                            # S3: postTicketStockInTx + applySaleVariantPlanInTx pass physicalAt; getTicket adds `stockCounted`
├── stock-corrections.service.ts              # S3: receipt_replace: qty change allowed (reason + audit row); counted bins absorbed by FR-005; rate-only → ignoreCheckpoints
├── stock-entries-read.service.ts             # S3: entry lines carry their skip; item checkpoints + skips for the item page
├── rbac.service.ts                           # S2: apiWriteCapability rules for /api/stock/counts (create, draft edit, lock)
└── inbox/rules/
    ├── stock-count-due.ts                    # S4 NEW: "Conteo pendiente"
    ├── stock-count-unlocked.ts               # S4 NEW: "Conteo por validar"
    └── index.ts                              # S4: register both

src/routes/api/stock/
├── _errors.ts                                # S1/S2: new codes + details pass-through
├── accruals/+server.ts                       # S1: rows carry `checkpoint` when source=booking
├── counts/+server.ts                         # S2 NEW: GET list, POST create draft
├── counts/[id]/+server.ts                    # S2 NEW: GET, PATCH draft, DELETE draft
├── counts/[id]/lock/+server.ts               # S2 NEW: POST lock
├── items/[id]/checkpoints/+server.ts         # S3 NEW: checkpoints + skips of one item
└── settings/+server.ts                       # S4 NEW: GET/PATCH count interval
src/routes/api/pos/tickets/[id]/+server.ts    # S3: response gains stockCounted (no code change if getTicket carries it)

src/routes/(app)/stock/
├── counts/{+page.server.ts,+page.svelte,PageBody.svelte}        # S2 NEW: list + "Nuevo conteo" dialog + interval control (S4)
├── counts/[id]/{+page.server.ts,+page.svelte,PageBody.svelte}   # S2 NEW: draft editor, "Validar y bloquear"
├── entries/[id]/PageBody.svelte              # S3: "No mueve stock" per skipped line
└── items/[id]/PageBody.svelte                # S3: checkpoint rows + skip rows in the movement list
src/routes/(app)/pos/tickets/[id]/PageBody.svelte   # S3: void dialog note
src/routes/(app)/pos/appointments/PageBody.svelte   # S3: void dialog note (same snippet)

src/lib/components/stock/
├── StockNav.svelte                           # S2: "Conteos" link
├── count-refusals.ts                         # S2 NEW: code → message with next step (pattern: correction-refusals.ts)
└── CheckpointNote.svelte                     # S1 NEW: one-line "Contado el … : no descuenta …" (dialog, entry lines, void)
src/lib/components/scheduling/ConsumptionConfirmDialog.svelte   # S1: counted supplies shown with the note, not editable
src/lib/inbox/feed.ts                         # S4: kind labels
src/lib/automations/system-automations.ts     # S4: comment lists the two new rules (same /api/jobs/tick)
src/lib/routes/{route-design-manifest.ts,route-design-validation.ts,business-route-shells.ts,route-access-registry.ts}  # S2
src/lib/nav/modules.ts, src/lib/assistant/site-map.ts                                                                  # S2
messages/es.json, messages/en.json

scripts/
├── backfill-stock-count-1118.ts              # S1 NEW: FACES first checkpoint (dry-run default)
└── backfill-stock-count-1118.test.ts         # S1 NEW: pure plan function
scripts/qc/native-postgres-manifest.ts        # S1: register the native test
```

Tests per slice: see "Implementation slices".

**Structure Decision**: the existing hub layout. One new pure-ish module (`stock-checkpoints.ts`) that both `stock.service.ts` and `stock-counts.service.ts` import, so the posting path never imports the count service.

## Implementation slices

Order across specs 134 and 135 (shared decision, both plans say the same):

| # | Slice | Depends on |
|---|---|---|
| 1 | **135-S1** checkpoint tables + lock rule on appointment completion + FACES backfill | — |
| 2 | 134-S1 Por cerrar, Pendientes tray, daily inbox count; completion dialog reads 135-S1 | 135-S1 |
| 3 | **135-S2** Conteo físico UI, draft → owner/admin "Validar y bloquear" | 135-S1 |
| 4 | 134-S2 Archivar + "Más… → Anular cita" | 134-S1 |
| 5 | 134-S3 `unscheduled`, Desagendar everywhere | 134-S2 |
| 6 | **135-S3** lock rule on void, entry cancel, backdated `postedAt`, corrections; skip notes in movement views | 135-S1 |
| 7 | **135-S4** reminders + count interval setting | 135-S2 |

### 135-S1 — tables, completion rule, FACES backfill

Ships:
- Migration `20261120120000_stock_checkpoints.sql` and the Drizzle mirrors (data-model.md).
- `stock-checkpoints.ts`: `checkpointFor` (the contract with spec 134), `checkpointsForBins`, `systemQtyAt`, `recordSkips`.
- `submitEntryInTx`:
  - new options `physicalAt` and `ignoreCheckpoints`;
  - stamps `physical_at`;
  - skips covered legs and writes the skips;
  - guards the two empty inserts.
- `cancelEntryInTx`: refuses to cancel the adjustment of a locked count (`count_adjustment`). The backfilled count adopts STE-2026-00694, so this guard ships with it.
- `realizeAccrualsInTx`: for `source = 'booking'`, reads the booking's `start_time` and passes it as `physicalAt`.
  - All three completion callers are covered without edits: `api/scheduling/bookings/[id]/complete/+server.ts:56`, `_handlers.ts:373`, `api/gateway/actions/booking-complete/+server.ts:72`.
  - The skipped items' accruals are released by the existing "superseded" branch (`stock-accruals.service.ts:480`). That is FR-008 with no new release code.
- `listAccruals` / `GET /api/stock/accruals`: each row gains `checkpoint` when `source=booking&sourceId=…` is given.
- `ConsumptionConfirmDialog.svelte`:
  - a counted supply shows `CheckpointNote` ("Contado el 18/11 16:00: no descuenta Ácido Desoxicólico");
  - the counted supply has no qty input.
  - This is the only UI in S1. 134-S1 reuses it as is.
  - **Owner of this piece (orchestrator decision 2026-11-20)**: 135-S1 builds the `listAccruals` checkpoint field and the dialog note. The 134 plan references them and does not build them.
- **Pulled forward from S3 (orchestrator decision 2026-11-20)**: `cancelEntryInTx` applies the rule with the original entry's physical time (`coalesce(physical_at, posted_at)`). That covers entry cancel, both void cancels and the cancel half of both corrections. FACES has the backfilled checkpoint from day one, so voiding an October sale must not put counted items back between S1 and S3. The void dialog's explanatory note stays in S3. Until then, the skip shows only on the movement.
- `scripts/backfill-stock-count-1118.ts`: the 18/11 count becomes CNT-2026-00001, locked, linked to STE-2026-00694, with no new adjustment.

Tests:
- `stock-checkpoints.test.ts` (new, pure parts): coverage rule `countedAt >= physicalAt`; latest checkpoint wins.
- `stock.service.test.ts`:
  - submit with `physicalAt` skips only covered legs;
  - an entry whose legs are all skipped submits with zero ledger rows;
  - `physical_at` is stamped;
  - cancelling a count's adjustment is refused;
  - cancelling a pre-checkpoint entry skips counted items (moved from S3);
  - void of a pre-checkpoint sale returns only uncounted items (`pos.tickets.test.ts`, moved from S3);
  - SC-001 replay: the spec-120 shape leaves Dysport at the counted quantity (moved from S3).
- `stock-accruals.service.test.ts`: mixed recipe (one counted, one uncounted). Only the uncounted item is issued, the counted one's accrual is `released`, and one skip row is written (spec DELTA row 5).
- `stock-checkpoints.sql.integration.test.ts` (new, `qa-native`):
  - the trigger refuses update/delete of a locked count and its lines;
  - `systemQtyAt` uses physical time;
  - `checkpointFor` against real indexes.
- `consumption-confirm-dialog.mounted.test.ts`: the counted row shows the note and no input.
- `backfill-stock-count-1118.test.ts`: plan function; a second run plans nothing.

### 135-S2 — Conteo físico UI and lock

Ships:
- `stock-counts.service.ts`, routes `/api/stock/counts…`, pages `/stock/counts` and `/stock/counts/[id]`.
- The list page uses `DataTable`: columns status, CNT, counted time, warehouse, items, total difference.
- The "Nuevo conteo" dialog (`Modal`):
  - warehouse;
  - counted time (default now);
  - items: "Todos con stock en este almacén" or a selection through the `Picker` SDK (`StockItemPicker`).
- The draft page:
  - one row per item: system qty at the counted time, counted qty (decimal input), difference, note;
  - "Guardar borrador", "Descartar borrador";
  - "Validar y bloquear": enabled for owner/admin only, disabled with the spec text for others.
- A locked count is read-only and offers "Nuevo conteo".
- Route build steps (Constitution IV).

Tests:
- `stock-counts.service.test.ts` (new):
  - system qty at T ignores movements after T;
  - lock writes one adjustment for the non-zero lines and one checkpoint per line, or nothing on error;
  - a zero-difference item gets a checkpoint and no ledger row;
  - a locked count refuses edit/delete;
  - counted time in the future or not after the previous checkpoint is refused;
  - a non-stock item is refused.
- `src/routes/api/stock/counts/[id]/lock/server.test.ts` (new): staff → 403 `owner_or_admin_required`; owner → 200.
- `src/routes/(app)/stock/counts/[id]/page.mounted.test.ts` (new): button disabled with the message for staff.
- Route-contract test files with bumped counts (quickstart.md).

### 135-S3 — the remaining paths and skip notes

Ships:
- (`cancelEntryInTx` skip rule: moved to S1.)
- `assertPostedAtAdmissible` refuses `before_checkpoint`.
- `postTicketStockInTx` passes the ticket's `submitted_at`.
- `applySaleVariantPlanInTx` passes the live entry's physical time to the replacement issue.
- `receipt_replace` (owner amendment 2026-11-20, FR-007b):
  - a quantity change is **allowed** on any purchase not locked by the org's lock policy (spec 139; until 139 ships, today's spec-124 receipt-period policy is the lock);
  - a reason is required, and one `stk_purchase_corrections` audit row is written (line, before, after, reason, actor, time, effect `moved` | `absorbed`);
  - on a counted bin the replacement's quantity difference is absorbed by FR-005: the record changes, stock does not move, and a skip row names the checkpoint;
  - a rate-only change runs with `ignoreCheckpoints` (net quantity zero).
- UI:
  - `getTicket` gains `stockCounted`; the void dialog shows "No vuelve al stock: … Si el cliente devolvió el producto, regístralo como una entrada nueva" with a link to a new receipt;
  - entry lines show `CheckpointNote` for skipped legs;
  - the item page shows checkpoint rows and skip rows in its movement list.

Tests:
- `stock.service.test.ts`: backdated `postedAt` before a checkpoint → `before_checkpoint`.
- `stock-corrections` tests:
  - qty change on a counted receipt line → allowed, audit row `absorbed`, stock unchanged;
  - qty change on an uncounted line → audit row `moved`, stock moves by the difference;
  - no reason → refused `reason_required`;
  - rate-only change still applies;
  - variant swap of a pre-checkpoint sale skips the counted legs.
- `page.swap.mounted.test.ts` or a new void mounted test: the note appears.

### 135-S4 — count schedules and reminders (owner amendment 2026-11-20)

Ships:
- Migration `20261120130000_stock_count_schedules.sql`:
  - `stk_count_schedules` (org, name, warehouse_id nullable = all, items mode `all` | `list`, rhythm `every_n_days` | `weekly` | `monthly` + value, mode `light` | `mandatory`, active, created_at);
  - `stk_count_schedule_items` (schedule, item) for list mode;
  - a seed per org of "Día de conteo" (all, monthly on day 1, light), run by the migration for existing orgs and by org creation for new ones.
- `stock-count-schedules.ts` (pure):
  - `dueItems(schedules, checkpoints, now)`, where the strictest schedule wins;
  - `firstDueAfter(release)` for never-counted items;
  - `lastDueDate(rhythm, now, tz)`.
- `GET/PUT /api/stock/count-schedules` (needs `stock:manage`). The editor sits on `/stock/counts` as a "Calendario de conteo" panel: list of schedules, item picker (Picker SDK) for core items, rhythm and mode controls.
- Rules on the existing `/api/jobs/tick`:
  - `stock.count_due` (light): one dismissible nudge per due schedule, role scope `stock:create`;
  - `stock.count_mandatory` (mandatory): not dismissible; resolved only when every due item has a newer checkpoint;
  - `stock.count_unlocked`: unchanged (owner/admin, draft older than 24 h).
- Stock layout banner: `/stock` pages read the open mandatory notices and list their overdue items, with a "Contar ahora" link pre-filled with them.

Tests:
- `stock-count-schedules.test.ts`:
  - strictest schedule wins (mandatory over light, shortest rhythm);
  - never-counted items are due at the first due date after release, not on release day;
  - monthly and weekly due dates in the org time zone.
- `stock-count-due.test.ts`: a light nudge is dismissible and returns at the next due date; a mandatory notice survives a dismissal and resolves only after a count covering the due items is locked (a partial count is enough).
- `stock-layout.mounted.test.ts`: the banner shows when a mandatory notice is open, with a link pre-filled with the overdue items.
- `stock-count-unlocked.test.ts`: unchanged.

## Risks

| Risk | Mitigation |
|---|---|
| Between 135-S1 and 135-S3, a void or entry cancel of a pre-count movement would return counted items | Resolved: the `cancelEntryInTx` skip rule moved into S1 (orchestrator decision 2026-11-20) |
| An entry whose legs are all skipped is submitted with zero ledger rows. Code that assumes "submitted ⇒ ledger rows" may break (e.g. `cancelEntryInTx` `no_ledger`, `stock.service.ts:1198`). | `cancelEntryInTx` accepts zero rows when skips exist. S1 tests cover both. Grep `no_ledger` readers in tasks. |
| `stk_entries.physical_at` is null for all history. Time queries fall back to `posted_at`, so old completions count at their completion time. | Correct for every count from now on. History analysis treats null as "unknown, posted time". |
| The count's positive adjustment needs a rate (`validateEntryLine`, `stock.logic.ts:106`). An item with no cost history has none. | Lock takes the bin's valuation rate. When it is 0, it refuses `rate_required` and the dialog asks for a unit cost. |
| Role model: FACES may use custom (organization) roles, where role keys are `custom-*` (`rbac.service.ts:347`). | Owner/admin is `organization_members.role`, read through the operator authority bridge, as spec 124 does for `owner_required` (`stock-corrections.service.ts:172`). Research R6. |
| The skip check runs inside the stock gate (`lockStockWrite`), so a lock and a completion serialize. | Expected. Both are short. |
| Backfill: the stored "system qty at 16:00" may not equal counted − STE-2026-00694's delta if a late movement's physical time is unknown. | The script prints both per item and aborts on a mismatch unless `--accept-mismatch` (research R8). |

## FigCraft demo

FigCraft demo (shared with spec 134): [booking-closure-stock-checkpoints.figcraft](../134-booking-closure/booking-closure-stock-checkpoints.figcraft) on meta #1056, page "Spec 135 · demo". Frames: Conteo físico as-is (hand-made "Ajuste" entry) / to-be for staff (lock disabled) and owner/admin (lock + confirmation), item movements with the count row and a skipped line, void of a pre-count sale, reminders.

## Complexity Tracking

No constitution violations. Four new tables and one column are the minimum (research R1–R4).
