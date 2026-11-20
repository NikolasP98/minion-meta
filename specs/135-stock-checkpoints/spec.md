---
id: 135-stock-checkpoints
title: Stock checkpoints — staff count the shelf, an owner/admin locks it, nothing from before the count moves that stock again
stage: spec
status: draft
verdict: approved
pass: 1
created: 2026-11-20
updated: 2026-11-20
repos: [minion_hub]
tags: [ui, data]
related: [134-booking-closure, 120-till-corrections, 122-faces-stock-reconciliation, 124-stock-correction-workflow]
---

# Feature Specification: Stock checkpoints

**Feature Branch**: `feat/135-stock-checkpoints` (hub, base `master`)

**Created**: 2026-11-20

**Status**: Draft

**Input**: Owner, 2026-11-20: "We can go a step further and implement CHECKPOINT stock counts, where staff physically validates counts and locks those values in, so if anything impacting stock counts are "completed" before the mentioned checkpoint dates, stock won't move."

Owner decisions, 2026-11-20: "yes, start spec 135, owner/admin only, include reminders." Locking a count is limited to owner and admin. Count reminders are in scope.

Approval, 2026-11-20: "approved, confirmed — go ahead with the plan." The confirmation covers the void rule: voiding a pre-count sale does not return counted items, and a physical return is a new receipt.

Owner amendments, 2026-11-20 (verbatim):

- "One general reminder for "counting day", but it should be a light tap on the shoulder (unless the org configures it as mandatory)."
- "I also want to set per-item count reminders or obligations. So if an org has a mandatory count date/frequency, it doesnt have to apply to ALL items, but maybe to a select core items."
- "The staff should be able to correct the qty of any past purchase. It should always be audit logged, though so that we know how qtys changed over time. The org can set this: lock after X days, lock after a webhook is run, after SUNAT is locked, etc." The org lock policy is specified separately (spec 139).

Owner note, same message: "I think this might help with implementing ML models that track displacement to find recommendations or patterns for the moving data". Out of scope here. The data model keeps what such a model needs (see Assumptions).

## AS-IS (observed 2026-11-19/20, prod read-only, hub `origin/master` `63c4313b`)

### No count concept

- Stock movements are entries of type `receipt`, `issue`, `transfer` or `adjustment` (`src/lib/stock/entry-legs.ts:8`). There is no "count" record and no lock.
- A movement is dated when it is posted. A backdated posting is possible through `postedAt` and is only refused when it precedes the newest ledger row of the same item and warehouse, or lies in the future (`assertPostedAtAdmissible`, `src/server/services/stock.service.ts` ~794).
- Several paths move stock **now** for something that happened **earlier**:
  - completing an appointment (issues its supplies at completion time, whatever the appointment's date);
  - voiding a sale and cancelling an entry (reversal rows dated now);
  - repair scripts and stock corrections (spec 120, spec 124).
- Existing locks are about money, not quantities: monthly `pos_period_locks` and the receipt-period policy of spec 124 (`stock-corrections.logic.ts:249`).

### How FACES squares stock today (by hand)

| When | How | Evidence |
|---|---|---|
| 2026-10-01 | 9 manual issues noted "Ajuste Minion-Flowww" (e.g. Saypha Volume Plus −41) | STE-2026-00336…00344 |
| 2026-10-05 | Manual issue "Ajuste minion 29/09", Dysport −1,926 | STE-2026-00365 |
| 2026-10-29 | 6 manual issues with no note (Ácido −16, Saypha Volume −2, Filler −1, …) | STE-2026-00549…00558 |
| 2026-11-12 | A purchase receipt typed so Dysport lands on exactly 1,500 | STE-2026-00635 (44 → 1,500) |
| 2026-11-19 | Count of 2026-11-18 16:00 applied by an operator script (6 items) | STE-2026-00694, `metadata.reconciliation`, `metadata.countedAt` |

None of these is recognizable as a count by the system. Nothing stops a later posting from undoing them.

### What that cost (2026-11-18)

The spec-120 repair returned supplies of 13 old sales. Three items had been squared by hand **after** those sales, so the repair returned stock the count already reflected:

| Item | Returned twice |
|---|---|
| Dysport | +690 U |
| Saypha Volume Plus | +2 |
| Saypha Filler | +1 |

It was fixed by a second count (STE-2026-00694). 57 to 101 old open appointments still wait to be closed (spec 134), and completing any of them today would issue supplies that the 18/11 count already accounted for.

### Reminders

`stock.low` exists (`src/server/services/inbox/rules/stock-low.ts`). Nothing reminds anyone to count.

## TO-BE

### 1. A count (Conteo físico)

- Anyone who may create stock entries (`stock:create`) can start a count:
  - choose a warehouse and the items to count (all, a category, or a selection);
  - set the time the shelf was counted (default: now);
  - type what is on the shelf.
- The count shows, per item, the system quantity **at the counted time** and the difference. Movements posted after the counted time do not distort it.
- A count is saved as a draft and can be edited until it is locked.

### 2. Locking a count creates checkpoints (owner/admin only)

- Only an **owner or admin** can lock ("Validar y bloquear"). Others see the button disabled with "Solo el dueño o un administrador puede bloquear un conteo."
- Locking does two things in one transaction:
  - posts **one adjustment** for the items whose difference is not zero;
  - records **one checkpoint per counted item and warehouse**: counted time, counted quantity, system quantity at that time, the adjustment, and who locked it and when.
- Items counted with no difference still get a checkpoint.
- A locked count and its checkpoints **cannot be edited or deleted**. A wrong count is fixed by a newer count.

### 3. The lock rule

- A movement of a checkpointed item in that warehouse whose **physical time** is at or before the item's latest checkpoint does **not** move that item's quantity.
- The movement still happens for every other item. It records "No mueve stock: contado el 18/11 16:00 (Conteo C-…)" on the skipped line.
- Physical time, per source:

  | Source | Physical time |
  |---|---|
  | Completing an appointment | the appointment's start |
  | Sale issued at the till | the sale's submit time |
  | Reversal: void of a sale, cancel of an entry | the original movement's posting time |
  | Backdated posting (`postedAt`) | the given time; refused, not skipped, for checkpointed items: "Esta fecha es anterior al conteo del …" |
  | Stock correction or repair with a quantity effect (incl. a purchase quantity correction, §3b) | the corrected movement's posting time |
  | Any other new posting | now, so it moves stock as today |

- A product physically handed back today after a pre-count sale is voided is recorded as a new receipt. The void screen says so.
- The lock is on **stock quantities only**. Rate and value corrections (for example a wrong unit cost) still apply.
- Reserved supplies of appointments from before a checkpoint are released, not issued, when the appointment closes. This is what spec 134 FR-012 reads.

### 3b. Correcting the quantity of a past purchase

- Staff may correct the quantity of any past purchase (receipt) line, unless the organization's lock policy (spec 139) has locked that record.
- Every correction is audit-logged: who, when, the line, quantity before → after, and a required reason. The purchase shows its correction history.
- Stock effect:
  - If no checkpoint covers the item after the purchase, the difference moves stock as today.
  - If a later count covers it, the record and the log change, but stock does **not** move: the count already reflects the shelf. The correction shows "No mueve stock: contado el …". The drift analysis (proposal `2026-11-20-stock-drift-patterns`) can then attribute the difference to the purchase.

### 4. Count schedules and reminders

- A **count schedule** says which items must be counted, how often, and how firmly. It has:
  - a name (e.g. "Día de conteo", "Inyectables semanales");
  - the items it covers: all stock items, or a hand-picked list of core items;
  - the warehouse it applies to (all, or one);
  - a rhythm: every N days, a weekday each week, or a day of the month;
  - a mode: **light** (default) or **mandatory**.
- Every organization starts with one schedule, **"Día de conteo"**: all items, monthly, light. The organization can change it, switch it off, or add stricter schedules for core items (for example, weekly and mandatory for injectables).
- An item covered by several schedules follows the strictest one: mandatory beats light, and the shortest rhythm wins.
- When a schedule is due:
  - **Light**: one dismissible inbox nudge, "Hoy es día de conteo · 12 ítems". It links to a new count pre-filled with the due items. Dismissing it hides it until the next due date.
  - **Mandatory**: the same notice, which cannot be dismissed, plus a banner on the stock screens listing the overdue items. It stays until those items are counted and locked. A partial count that covers them is enough.
- An item is due when its latest checkpoint is older than the schedule's last due date. Items never counted become due on the schedule's first due date after release, not immediately.
- Editing schedules requires `stock:manage`.
- **"Conteo por validar"**: notifies owners and admins when a draft count has waited more than 24 hours to be locked.

### 5. Seeing checkpoints

- The item's movement list shows each checkpoint as a row: "Contado · 302 ml · 18/11 16:00 · bloqueado por …".
- A skipped line in any movement shows the "No mueve stock" note above.
- The stock page lists counts: draft or locked, date, warehouse, items, total difference.

### 6. First checkpoint (backfill)

- The count of 2026-11-18 16:00 (STE-2026-00694) becomes the first locked count for its six items in Almacén Principal:

  | Item | Counted |
  |---|---|
  | Dysport | 1,500 |
  | INIBO | 641 (approximate) |
  | Saypha Filler | 33 |
  | Saypha Volume Plus | 78 |
  | Saypha Volume | 31 |
  | Ácido Desoxicólico | 302 |

- It is locked by the owner, with no new adjustment.

### Invariants

- After a checkpoint, an item's quantity changes only through movements whose physical time is after the checkpoint.
- A checkpoint never changes once locked; the latest checkpoint per item and warehouse is the one that applies.
- Only an owner or admin can create a checkpoint.
- Every skipped quantity is visible on the movement that skipped it.

## DELTA

| Transition | Proof (test to add) |
|---|---|
| No count record → draft count with lines (system qty at counted time, counted qty, difference) | service: system qty at time T from the ledger, with movements after T ignored |
| Lock: n/a → one adjustment (non-zero lines) + one checkpoint per counted item, one transaction | service: both or neither; zero-difference items get a checkpoint and no ledger row |
| Lock by staff or manager → refused (403, "solo dueño o administrador") | route test |
| Edit or delete a locked count → refused | service test |
| Completing an appointment dated before a checkpoint: issues all supplies → issues only uncounted ones, releases the counted ones' reservation, notes the skip | `stock-accruals` test, mixed recipe |
| Void of a pre-checkpoint sale: returns all items → skips counted items, notes it, points to "registrar devolución" | `pos.tickets` void test |
| Cancel of a pre-checkpoint entry: reverses all → skips counted items | stock.service cancel test |
| Backdated posting at/before a checkpoint for a counted item: allowed if after newest row → refused `before_checkpoint` | `assertPostedAtAdmissible` test |
| Quantity effect of a correction or repair on a pre-checkpoint movement: applied → skipped; rate-only correction still applied | stock-corrections test |
| Purchase quantity correction: only via the spec-124 receipt replacement (refused on a counted line in the first plan) → allowed for any unlocked purchase, reason required, audit row written; stock moves only if no later checkpoint covers the item | stock-corrections + audit test |
| Reminders: nothing → count schedules (default "Día de conteo", all items, monthly, light; extra schedules for core items); light = dismissible nudge, mandatory = undismissable notice + stock banner until counted; "Conteo por validar" after 24 h | rule tests (pattern: `stock-low`): strictest schedule wins, never-counted items due at the first due date, partial count resolves |
| FACES backfill: none → locked count 2026-11-18 16:00, 6 checkpoints, linked to STE-2026-00694 | one-off script with dry-run, run twice (second run plans nothing) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Count the shelf and lock it (Priority: P1)

At month end, the stock assistant opens "Conteo físico", picks the injectables, counts the shelf and types the numbers. The screen shows Dysport 1,480 counted vs 1,500 in the system (−20). She saves the draft. The owner reviews it and presses "Validar y bloquear". Stock now reads 1,480, and the count is locked.

**Why this priority**: it replaces hand-made adjustments and receipts typed to land on a number, which the system cannot recognize or protect.

**Independent Test**: create a draft for 3 items (one with no difference), lock it as admin, and check the system quantities, one adjustment with 2 lines, and 3 checkpoints.

**Acceptance Scenarios**:

1. **Given** a draft count, **When** a staff user presses "Validar y bloquear", **Then** it is refused with "Solo el dueño o un administrador puede bloquear un conteo."
2. **Given** a draft counted at 16:00 and a sale at 17:00 of one counted item, **When** the owner locks at 18:00, **Then** the difference is computed against the 16:00 quantity and the 17:00 sale stays applied.
3. **Given** a locked count, **When** anyone tries to edit it, **Then** it is refused and a "Nuevo conteo" action is offered.

### User Story 2 — Closing an old appointment after a count (Priority: P1)

After the 18/11 count, the receptionist marks an Afinamiento of 24/10 as completed. The appointment closes. Ácido is not deducted, and the completion screen says "Contado el 18/11 16:00: no descuenta Ácido Desoxicólico". An uncounted supply in the same recipe is deducted as usual.

**Independent Test**: an appointment dated before a checkpoint with a recipe of one counted and one uncounted item. Completing it issues only the uncounted item and releases the counted one's reservation.

### User Story 3 — A late correction cannot undo a count (Priority: P1)

A repair or a void reverses a sale from October for an item counted on 18/11. The counted item does not move; the movement shows why.

**Independent Test**: reproduce the 2026-11-18 incident with a checkpoint in place. The repair leaves Dysport at the counted quantity.

### User Story 4 — Counting day and core items (Priority: P2)

The clinic keeps the monthly "Día de conteo" as a light nudge for everything. It adds a mandatory weekly schedule for its six injectables. On Monday the stock screens show a banner, "Conteo obligatorio pendiente: 6 ítems", until someone counts those six and the owner locks it. The monthly nudge for the rest can be dismissed.

**Acceptance Scenarios**:

1. **Given** the default schedule and an item last counted before its due date, **Then** one dismissible "Hoy es día de conteo" nudge exists.
2. **Given** a mandatory weekly schedule for 6 core items that are due, **Then** the stock screens show the banner and the notice cannot be dismissed.
3. **Given** a count covering only those 6 items is locked, **Then** the mandatory notice and banner are resolved while the monthly nudge for other items stays.
4. **Given** an item in both schedules, **Then** it follows the mandatory weekly one.
5. **Given** a schedule switched off, **Then** it raises nothing.

### User Story 5 — Correct a purchase quantity (Priority: P2)

The assistant typed 89 syringes on a purchase that brought 87. She opens the purchase, corrects the line to 87, and writes why. The purchase shows the change in its history. If the item was counted after that purchase, stock does not move and the line says why.

**Acceptance Scenarios**:

1. **Given** an unlocked past purchase, **When** its quantity is corrected with a reason, **Then** the record changes and an audit row stores before, after, who, when and why.
2. **Given** no later count of the item, **Then** stock moves by the difference.
3. **Given** a later count, **Then** stock does not move and the line shows "No mueve stock: contado el …".
4. **Given** the purchase is locked by the org's policy (spec 139), **Then** the correction is refused with the reason and who can unlock it.

### Edge Cases

- Counting the same item twice in one day: the later counted time wins; the earlier stays in history.
- Counted time in the future: refused. A counted time before the item's previous checkpoint: refused ("ya hay un conteo más reciente").
- An item with no stock tracking cannot be counted.
- A count across warehouses: one count is per warehouse; a transfer whose two legs fall on either side of a checkpoint skips only the checkpointed leg.
- The approximate count (INIBO "aprox 641"): counts accept decimals and an optional note per line; no special state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users with `stock:create` MUST be able to create, edit and save a draft count for one warehouse: items, counted time and counted quantities.
- **FR-002**: The draft MUST show, per item, the system quantity at the counted time and the difference.
- **FR-003**: Only owners and admins MUST be able to lock a count. Locking MUST post one adjustment for non-zero differences and record one checkpoint per counted item, atomically.
- **FR-004**: Locked counts and checkpoints MUST be immutable.
- **FR-005**: A movement of a checkpointed item and warehouse whose physical time is at or before the latest checkpoint MUST NOT change that item's quantity. The movement MUST record the skip.
- **FR-006**: A backdated posting at or before a checkpoint for a checkpointed item MUST be refused with a message naming the count.
- **FR-007**: Rate and value corrections MUST NOT be blocked by checkpoints.
- **FR-007b**: Staff MUST be able to correct the quantity of any past purchase line not locked by the org's lock policy (spec 139), with a required reason. Every correction MUST be audit-logged (who, when, line, before, after, reason). Its stock effect MUST follow FR-005.
- **FR-008**: Completing an appointment MUST apply FR-005 using the appointment's start as the physical time, releasing the reservation of skipped items.
- **FR-009**: The system MUST support count schedules (items: all or a list; warehouse; rhythm; mode light or mandatory), editable with `stock:manage`. Every organization MUST start with "Día de conteo" (all items, monthly, light). An item MUST follow its strictest schedule.
- **FR-009b**: A due light schedule MUST raise one dismissible nudge for owners, admins and `stock:create` holders. A due mandatory schedule MUST raise an undismissable notice and show a banner on the stock screens until its due items are counted and locked. Never-counted items MUST become due at the schedule's first due date after release.
- **FR-010**: The system MUST raise "Conteo por validar" to owners and admins for drafts older than 24 hours.
- **FR-011**: Item movement views MUST show checkpoints and skipped lines.
- **FR-012**: FACES' count of 2026-11-18 16:00 MUST be recorded as the first locked count, linked to STE-2026-00694, without a new adjustment.

### Key Entities

- **Count**: warehouse, counted time, status (draft, locked), created by, locked by, locked at, adjustment entry.
- **Count line / checkpoint**: count, item, counted quantity, system quantity at the counted time, difference, optional note. A locked line is a checkpoint.
- **Skip record**: on the movement line, the checkpoint that absorbed it.
- **Count schedule**: name, items (all or a list), warehouse (all or one), rhythm, mode (light, mandatory), active.
- **Purchase correction log**: entry line, quantity before and after, reason, actor, time, stock effect (moved or absorbed by a checkpoint).

## Success Criteria *(mandatory)*

- **SC-001**: The 2026-11-18 incident cannot recur. Replaying the spec-120 repair against a checkpointed item leaves its quantity at the counted value (test).
- **SC-002**: FACES closes its backlog of old appointments (spec 134) without any counted item drifting from its count.
- **SC-003**: Within two months, every FACES item in a mandatory schedule is never overdue by more than one rhythm period, and every other item with movement has been counted at least once.
- **SC-004**: No new stock adjustment without a count record appears for squaring purposes (the "Ajuste…" and "land on 1,500" patterns stop).

## Assumptions

- A product physically returned after a pre-count sale is recorded as a new receipt; voids do not return counted items (owner confirmed 2026-11-20).
- Counts are kept as analysable data. Each checkpoint keeps the counted quantity, the system quantity at the counted time and a link to the previous checkpoint of the same item and warehouse. The drift between two counts can therefore be broken down by movement source (appointments per treatment, sales, receipts). That breakdown is the input for later pattern or recommendation work, which needs its own spec and is a premium AI feature.
- Locked counts are never undone in the product; a database correction would be an operator action with its own record.
- Cost of goods is not recomputed for skipped lines; the count adjustment carries the loss or gain.
- UI follows the FigCraft demo-first rule; the as-is/to-be demo is linked from the plan.
