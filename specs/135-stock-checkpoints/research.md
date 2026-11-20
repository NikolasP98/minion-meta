# Research: spec 135

All code facts were read on hub `origin/master` `63c4313b` (2026-11-20, read-only clone `~/.cache/claude-tmp/hub-till`). No production access was used. FACES facts about the 18/11 count come from the operator notes of 2026-11-19 (session memory). They are not re-queried here.

## R1 — Where quantity changes happen

- **Decision**: put the lock rule in the two ledger writers only: `submitEntryInTx` and `cancelEntryInTx`. Callers pass a physical time; the writers decide per leg.
- **Evidence**:
  - The schema header says `stk_ledger` is written only by submit/cancel (`src/server/db/pg-schema/stock.ts:7-9`).
  - Every quantity path reaches one of them:

  | Path | Call | Physical time it must pass |
  |---|---|---|
  | Appointment completion | `realizeAccrualsInTx` → `submitEntryInTx` (`stock-accruals.service.ts:435`) | booking `start_time` |
  | Sale at the till, and its retry | `postTicketStockInTx` → `submitEntryInTx` (`pos.service.ts:1203`, `:1279`) | ticket `submitted_at` |
  | Void of a sale | `voidTicket` → `cancelEntry` (`pos.service.ts:2645`, and the race re-check at `:2857`) | the original entry's physical time |
  | Manual entry cancel | `POST /api/stock/entries/[id]/cancel` → `cancelEntry` | the original entry's physical time |
  | Variant swap (spec 124) | `applySaleVariantPlanInTx`: cancel `:1763` + replacement submit `:1793` | the live entry's physical time, for both |
  | Receipt replacement (spec 124) | `applyStockCorrection`: cancel `stock-corrections.service.ts:769` + submit `:805` | see R7 |
  | Backdated posting | `options.postedAt` → `assertPostedAtAdmissible` (`stock.service.ts:794`) | refused, not skipped |
  | Everything else (manual submit, invoice issue, service issue, count adjustment) | `submitEntryInTx` without a physical time | now: never skipped |

- **Rationale**: one rule in one place. A future repair script is covered too, because it can only move stock through these two functions.
- **Alternatives rejected**:
  - Filtering lines in each caller before it builds the entry. That means six call sites and six chances to forget one. Cancels could not be covered that way, because they replay stored ledger rows.

## R2 — How a leg is skipped and how the skip is recorded

- **Decision**:
  - In the leg loop of `submitEntryInTx` (`stock.service.ts:1104`) and the row loop of `cancelEntryInTx`, a leg whose bin has a covering checkpoint gets no ledger row. It gets one `stk_checkpoint_skips` row instead: count line, entry, entry line, item, warehouse, the signed quantity that did not move, phase `submit`/`cancel`, physical time.
  - The entry line itself is kept. The entry shows what the source asked for, the ledger shows what moved, and the skip row says why they differ.
- **Consequences**:
  - An entry whose legs are all skipped is submitted with **zero** ledger rows. It keeps its STE number, so the skip is visible on a movement (spec invariant 4). The two `insert(stkLedger).values(...)` calls (`:1136`, `:1231`) need a non-empty guard. `cancelEntryInTx` must accept zero ledger rows when skips exist (today it throws `no_ledger`, `:1198`).
  - Completion releases the counted item's reservation through the existing branch "accrued but not consumed in the final issue → released" (`stock-accruals.service.ts:480`). No new release code is needed.
  - The negative-stock check is not run for a skipped leg, because the skip comes first.
  - A cancel never reverses a skipped submit leg, because that leg has no ledger row. This is consistent by construction.
  - In a transfer whose out-leg is skipped, the in-leg has no carried rate and uses the destination bin's rate (`computeLegValue`, `stock.logic.ts:68`). This is acceptable for a rare case.
- **Alternatives rejected**:
  - A zero-delta ledger row with a `checkpoint_id` column. It changes the append-only ledger's meaning and every reader of `qty_delta`.
  - Skip data in `stk_entries.metadata`. A JSON blob is not queryable for the drift analysis the owner wants later, and it cannot carry the count line as a foreign key.

## R3 — System quantity at a past time

- **Decision**:

  ```text
  systemQtyAt(item, warehouse, T) =
    Σ l.qty_delta  over stk_ledger l join stk_entries e on e.id = l.entry_id
    where coalesce(e.physical_at, e.posted_at) <= T
  ```

  - `physical_at` is a new nullable column on `stk_entries`. `submitEntryInTx` stamps it when it gets a physical time.
  - The count's own adjustment is stamped with the counted time.
  - For a reversal row, the entry's time is the **original** posting time: cancel does not change `stk_entries.posted_at` (`stock.service.ts:1174` doc comment; `:1233-1237` updates status only).
- **Why not `qty_after`**:
  - `qty_after` is a running snapshot in `id` order (`stock.ts` ledger comment).
  - Reading "the last row with `posted_at <= T`" counts a row by when it was **posted**.
  - The case that breaks it is FACES's own: reception completes a 24/10 appointment at 10:00 on 20/11 while a count taken at 08:00 on 20/11 is still a draft. With posted time, the issue lands after the count. Locking then posts `counted − system(08:00)`, and the 24/10 supplies are deducted twice: once on the shelf, once by the issue.
  - With physical time, the issue counts at 24/10, so it is inside "system at 08:00", and the adjustment absorbs it.
  - The same holds for a void of an old sale posted during the draft. Its reversal rows count at the sale's time, so the count neutralizes the return. That matches the owner rule "voids do not return counted items".
- **Ordering facts**:
  - `assertPostedAtAdmissible` picks each bin's newest row by `id desc` (`stock.service.ts:811`).
  - The item ledger reads by `(posted_at desc, id desc)` (`stock-entries-read.service.ts:715`).
  - `posted_at` defaults to `now()`, the transaction start, while the ledger is serialized by the stock gate (`lockStockWrite`, `:716`). So `posted_at` is close to, but not strictly, monotone in `id`.
  - A sum with a filter does not depend on any ordering, which is one more reason to prefer it.
- **Index**: the sum scans the item's rows via `stk_ledger_org_item_posted_idx (org_id, item_id, posted_at)` and joins `stk_entries` by primary key. That is fine at FACES scale (hundreds of rows per item). Later: a covering index if an org has millions of rows.
- **Alternatives rejected**:
  - "Counted time must be after the previous count's lock time" plus plain `posted_at`. It is simpler, but it does not fix the draft window above, which is the main FACES risk while 57 to 101 old appointments get closed.

## R4 — The checkpoint lookup (contract with spec 134)

- **Decision**:
  - `checkpointFor(tx, orgId, itemId, warehouseId, physicalTime) → { countId, countedAt } | null`, in `src/server/services/stock-checkpoints.ts`.
  - It returns the latest locked checkpoint of the item in the warehouse when its `countedAt >= physicalTime`, else `null`.
  - The posting path uses the batched form `checkpointsForBins(tx, orgId, binKeys, physicalTime)`. It runs one query for all bins of an entry and also returns the count line id for the skip row.
  - Spec 134 calls only `checkpointFor`.
- **Rationale**: "at or before the item's latest checkpoint" (spec §3) is the same as "the latest checkpoint's counted time ≥ physical time", because counted times only grow per item and warehouse (R5).
- **Note**: the latest checkpoint is credited with the skip, as the spec says. For drift analysis, the first checkpoint after the physical time is the one that physically saw the movement. That checkpoint can be derived later from `physical_at` and the checkpoint chain (`prev_line_id`), so nothing is lost.

## R5 — Count rules

- **Decision**:
  - A count belongs to one warehouse and one counted time.
  - Drafts can be created, edited and deleted by `stock:create` holders.
  - Lock is refused when:
    - the counted time is in the future;
    - the counted time is not strictly after the previous checkpoint of any counted item (`count_superseded`, "ya hay un conteo más reciente");
    - a line has no counted quantity;
    - an item is not a stock item (`is_stock_item = false`) or the warehouse is archived.
- **Lock steps** (one transaction, after `lockStockWrite`):
  1. authority check (R6);
  2. lock the count row;
  3. lock the bins;
  4. compute `systemQtyAt(countedAt)` per item;
  5. post one `adjustment` (`createEntryInTx` + `submitEntryInTx` with `physicalAt = countedAt`, `ignoreCheckpoints: true`, shared bins) for the non-zero lines;
  6. fill `system_qty` and `prev_line_id` on every line;
  7. flip the count to `locked` with `locked_by`, `locked_at` and `adjustment_entry_id`.
  - Audit (`recordAudit`) runs after commit, as for submit.
- **Rate**:
  - A positive line (found stock) uses the bin's valuation rate.
  - When that rate is 0 (no cost history), lock refuses `rate_required` and accepts a per-item `rates` map on retry (`validateEntryLine`, `stock.logic.ts:106`).
- **"Strictly after"**: it keeps every older checkpoint's counted time below a new adjustment's physical time. `ignoreCheckpoints` on the adjustment is a second guard.
- **Counted quantities**: `numeric`, so decimals and approximations ("aprox 641") are allowed. Each line has an optional note.

## R6 — Owner/admin check on the server

- **Decision**:
  - Inside the lock transaction, read the actor's authority with `resolveFreshOperatorCapabilitiesForWriteInTransaction(tx, orgId, profileId)` (`rbac.service.ts` ~1190). This is the bridge spec 124 uses.
  - Allow when `membershipRole ∈ {owner, admin}` or, in the legacy role model, when an assigned role key is `owner` or `admin`.
  - While a role simulation is active (`roles` ≠ `realRoles`), only the simulated roles count, so an owner previewing as staff is refused.
  - Helper: `isOwnerOrAdmin(caps)` in `stock-counts.service.ts`.
- **Evidence**:
  - System role keys: `owner, admin, manager, staff, viewer` (`rbac.service.ts:538`).
  - In the organization role model, assigned roles are only `custom-*` keys (`resolveMemberRoleKeys`, `rbac.service.ts:347`). So `organization_members.role` is the only place "owner/admin" survives.
  - Spec 124's value-correction gate uses `caps.membershipRole !== 'owner'` (`stock-corrections.service.ts:172`, `:633`).
  - The FACES operator script picked the owner the same way (`organization_members.role = 'owner'`).
  - Other owner/admin checks in the hub use the legacy role list (`brain-access-grants.service.ts:30`).
- **Central gate**: `apiWriteCapability` (`rbac.service.ts:1003`) maps `POST /api/stock/counts/<uuid>/lock` to `stock:create`. Anyone who can draft a count reaches the service and gets the spec's own message (`owner_or_admin_required`), not a generic "stock: edit required".
- **Alternatives rejected**:
  - A new capability `stock:lock`. The owner asked for owner/admin, not a configurable permission. It would also need RBAC catalog, UI and migration work.

## R7 — Corrections and FR-007 (rate corrections stay allowed)

- **Decision**:
  - **Variant swap**: per-leg skip, with the live entry's physical time for both the cancel and the replacement. A counted old item is not returned, and a counted new item is not issued. That is the rule as written.
  - **Receipt replacement**: it is cancel + re-post with a new qty and rate per line (`stock-corrections.service.ts:769-805`).
    - When a counted bin's qty is unchanged (rate-only), run both legs with `ignoreCheckpoints`. The net quantity is zero and the value fix applies (FR-007).
    - When a counted bin's qty changes, refuse with `before_checkpoint` and the next step: "corrige solo el costo, o registra la diferencia con un nuevo conteo".
- **Rationale**: one receipt line has one qty and one rate. Skipping the qty part while keeping the rate part cannot be expressed as one ledger leg.
- **Alternatives rejected**: a "partial skip" leg (post the old qty, skip the difference). It adds a third leg shape to the core writer for a case FACES has not had.

## R8 — FACES backfill script

- **Decision**: `scripts/backfill-stock-count-1118.ts --org <org id> --entry STE-2026-00694 [--apply] [--accept-mismatch]`.
- **Pattern copied from** `scripts/repair-service-sale-stock.ts:1-20`:
  - Preview by default, on ONE connection the script itself sets `default_transaction_read_only = on`. Use the session port 5432: the pooler drops read-only startup options.
  - Apply loads the hub service through `vite.ssrLoadModule`, like the 11-18 operator script.
  - Run it twice. The second run must plan nothing.
- **What it does**:
  1. Read STE-2026-00694. Require: submitted `adjustment`, one warehouse, and `metadata.countedAt`.
     - It was posted by the 11-19 operator script with `countedAt: '2026-11-18T16:00:00-05:00'` and lines Dysport −690, Saypha Volume Plus −3, Saypha Filler −1, INIBO +16.
  2. Resolve the six items by name in that org: Toxina Botulinica Dysport, Toxina Botulinica INIBO, HA Saypha Filler, HA Saypha Volume Plus, HA Saypha Volume, Acido Desoxicolico.
  3. Counted quantities are fixed in the script: 1500, 641 (note "aprox"), 33, 78, 31, 302.
  4. Per item, compute `systemQtyAt(16:00)` **excluding** STE-2026-00694. Print counted, system, counted − system, and the STE delta.
  5. Abort if any `counted − system ≠ STE delta`, unless `--accept-mismatch`. A mismatch means a movement's physical time is not what the count assumed, and the owner should read it first.
  6. Apply, in one transaction, under the stock gate:
     - insert the count as `draft` with the six lines;
     - stamp `stk_entries.physical_at = countedAt` on STE-2026-00694;
     - lock it: `system_qty` and `prev_line_id` (null) on each line; `locked_by` = the org's owner (membership role), `locked_at` = STE-2026-00694's `posted_at`, `adjustment_entry_id` = its id, `metadata.backfillOf` = its id.
     - It writes no ledger row.
- **Invariants checked after apply** (and by the second preview):
  - exactly one count with `metadata.backfillOf` = the STE id;
  - status `locked` with 6 lines whose counted values match;
  - `checkpointFor(item, wh, 2026-11-18 15:59 Lima)` is not null for all six;
  - the ledger sum equals `stk_bins.qty` for the six bins.
- **Reversibility**: the script prints the undo SQL (delete the count and lines as the table owner, reset `physical_at` to null). The immutability trigger blocks deletion through the app role, so this is an operator action with its own record (spec Assumptions).
- **Public repo**: no ids of the org, warehouse or people in the script. The org id comes from `--org`, the warehouse from the entry, the owner from the membership table.

## R9 — Reminders

- **Decision**:
  - Two rules on the existing inbox evaluator (`/api/jobs/tick`, every 30 min, `system-automations.ts:73-80`), pattern `inbox/rules/stock-low.ts`.
  - **`stock.count_due`**: per warehouse, count the active stock items with a non-zero bin whose latest checkpoint is older than the interval, or that have none.
    - Role scope `stock:create`; owners and admins hold it.
    - Title: "Conteo pendiente · Almacén Principal · 12 ítems".
    - Link: `/stock/counts?nuevo=1&almacen=<id>&pendientes=1`, which opens the dialog pre-filled.
    - Resolved when the number reaches 0 or the interval is off.
  - **`stock.count_unlocked`**: a draft created more than 24 h ago.
    - One user-scoped notification per owner/admin (membership role, R6), because no capability is exclusive to owner/admin.
    - Resolved when the count is locked or deleted.
  - Interval: `stk_settings.count_interval_days`. No row means 30; null means off.
- **Note**: never-counted items are due at once. At release FACES will see one "Conteo pendiente" listing almost all items. That matches SC-003 ("every item with movement has a checkpoint within two months"). Open question 2.
- **Alternatives rejected**:
  - The org-wide legacy `notif_rules` engine (`registerNotifCandidateSource`). The inbox rules are the current pattern.

## R10 — Category scope in a new count

- **Decision**: S2 offers "all items with stock in this warehouse" and "a selection" through `StockItemPicker`. No separate "category" option.
- **Evidence**: `stk_items.item_group` is deprecated and read-only. Categories moved to custom-property columns on 2026-09-30 (`pg-schema/stock.ts:38-43` TODO).
- **Rationale**: the picker searches by name and code, which covers "the injectables" in practice. A category filter on a custom property is a separate picker feature.

## Spec corrections

1. **"A backdated posting is possible through `postedAt`"**. It is possible only for server callers.
   - `StockPostingOptions.postedAt` is documented "Server/approved manifest only" (`stock.service.ts:701`).
   - No API route passes it (grep of `src/routes`: none).
   - Only `scripts/seed-stock-faces.ts` uses it.
   - So FR-006's refusal is a service guard that no user sees today. It still ships (S3), to protect scripts.
2. **"Repair scripts"**. The spec-120 repair script `scripts/repair-service-sale-stock.ts` calls `pos.repostTicketStock` (line 210). Spec 124 deleted it (hub `95f6c7a9`), so the script is dead on master. The checkpoint rule protects future repairs because they can only write through submit/cancel (R1).
3. **FR-007 (rate corrections not blocked)**. It holds only within spec 124's existing limit: a receipt correction is already refused when any later movement exists on the bin (`dependent_history`, `stock-corrections.service.ts:445`). A count with a difference writes such a later row, so that receipt cannot be corrected, but that refusal is not caused by the checkpoint rule. The checkpoint itself adds no refusal for rate-only corrections. A **quantity** change on a counted receipt line is refused, not skipped (R7). The DELTA row "quantity effect … skipped" holds for the variant swap and for cancels, not for receipt replacement.
4. **Physical time of a reversal**. The spec says "the original movement's posting time". The plan uses the original movement's **physical** time, `coalesce(physical_at, posted_at)`. It is the same value except for entries that recorded a physical time (completions, till sales, count adjustments). For those it is more accurate, for example cancelling a completion issue uses the appointment's start.
5. **Counted time "before the item's previous checkpoint"**. The plan refuses "not strictly after" it (R5). Equal times would make the new adjustment's legs look covered by the old checkpoint.
