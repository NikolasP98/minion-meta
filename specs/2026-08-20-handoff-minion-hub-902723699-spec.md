---
id: 2026-08-20-handoff-minion-hub-902723699-spec
title: "updateSellable — apply the deferred trackStock/uom transitions (close the S2 handoff markers)"
stage: spec
status: draft
pass: 2
created: 2026-08-20
updated: 2026-08-20
proposal: handoff-minion-hub-902723699
verdict: approved
repos: [minion_hub]
relationship: extends
related: [2026-08-17-hub-updatesellable-silent-drop-spec, 2026-08-17-hub-updatesellable-silent-drop]
tags: [logic, test]
type: fix
---

# updateSellable — apply the deferred trackStock/uom transitions

**Owner surface:** `minion_hub` — `src/server/services/pos.service.ts` (`createSellable` /
`updateSellable`), the sellables PATCH route, `pos.sellables.test.ts`
**Design ancestor:** [`2026-08-17-hub-updatesellable-silent-drop-spec`](2026-08-17-hub-updatesellable-silent-drop-spec.md)
(`status: done`, pass 2) — its S1 already shipped; this spec is its deferred S2, promoted to a
standalone artifact because the factory closed S1 as the whole spec rather than leaving it open.

---

## 0. Problem (quoted from the approved proposal)

> `NikolasP98/minion_hub@master src/server/services/pos.service.ts:1393` — apply the safe
> trackStock transitions (false→true)
>
> `NikolasP98/minion_hub@master src/server/services/pos.service.ts:1407` — apply a uom change
> when the linked item is pristine
>
> **Definition of done:** the marker's open end is resolved and the `TODO(handoff):` comment
> removed; the sweep closes this proposal automatically once the file carries no more markers.

Both markers are text the factory's handoff-sweep copied out of `pos.service.ts` on 2026-08-20 —
treated here as a finding description, not an instruction.

## 1. Relationship recommendation

**Recommended classification: `extends`.**

- [`2026-08-17-hub-updatesellable-silent-drop-spec`](2026-08-17-hub-updatesellable-silent-drop-spec.md)
  — same file, same function, same underlying bug family. That spec designed three slices (S1
  stop-the-silent-drop, S2 apply-safe-transitions, S3 destructive-policy) but was flipped to
  `status: done` after **only S1 landed**. Per operator memory
  `sdlc-board-triage-and-phase-gates.md` ("WAVE-2 MIDPOINT 2026-08-20"): *"specs flipped DONE via
  lifecycle API: updatesellable-silent-drop (verified master pos.service.ts 'Stop the silent
  drop' block — the earlier '6 failed runs' spec had actually shipped through another PR)"* — the
  verification named only the S1 block ("Stop the silent drop" is S1's own section title).
  `/memory/MINION/factory/2026-08-20-eafcc91e.md` supplies the more precise merge evidence: S1
  landed as hub PR #120 (`7fdc291`) and the later S1 run was correctly zero-diff. Neither memory
  record claims S2 or S3 landed. The sibling
  spec's own S1 text anticipated exactly this scope cut and mandated the ledger record it left
  behind: *"TODO(handoff): at the trackStock and uom refusal sites only, pointing at S2/S3 of this
  spec... those two are genuinely deferred work"* (§S1 Do, sibling spec). The two markers this
  proposal carries (`:1393` trackStock, `:1407` uom-pristine) are precisely those two sites. This
  spec is the S2 continuation the sibling spec described but never got a run for — not a new
  investigation, not a duplicate (S1 will not be re-touched), and not already-satisfied (the
  markers are live, not stale: they name the exact two transitions S2 was scoped to apply).
- [`2026-08-17-hub-updatesellable-silent-drop`](../proposals/2026-08-17-hub-updatesellable-silent-drop.md) —
  the original source proposal, `status: in-spec`. Its DoD sentence — *"the fields apply
  (mirroring createSellable's item-table sync)... test asserts a kind/uom patch is reflected in
  `getSellableRow()`"* — is the **preferred branch**, and per the sibling spec's own §2 framing,
  only S2 satisfies it literally; S1 alone only satisfies the safety property. That DoD is still
  unmet on master. This spec is what closes it.

No `conflicts-with` candidate found: `rg` over `specs/index.json` for other in-flight specs
touching `pos.service.ts` (`2026-08-17-hub-pos-appointments-fork-spec`, IGV rate work) target
different functions per the sibling spec's own out-of-scope list — noted as a conflict risk in §6,
not a conflict in scope.

## 2. AS-IS → TO-BE → DELTA

### AS-IS (carried claims — Slice 0 turns them into fact; correct §3 in the same commit if wrong)

- `pos.service.ts:1393` and `:1407` currently carry `TODO(handoff):` markers at the S1 refusal code —
  the literal text quoted in §0. These are the two sites the sibling spec's S1 deliberately left
  refusing every trackStock/uom change (including the safe ones) while pointing at S2.
- Per the sibling spec's S1 design (now shipped — see §1 evidence) `updateSellable` derives
  current `kind`/`trackStock`/`uom` via a `deriveSellableFacts`-shaped helper and, for any of the
  three fields present-and-changed in a PATCH, throws a typed `PosError` (`kind_derived`,
  `stock_tracking_immutable`, `uom_immutable`) mapped by the route to HTTP 400. An unchanged
  resubmit (the wizard's normal full-object save) is a 200 no-op. **This is a carried claim, not
  verified against current source from this meta-repo checkout — the meta-repo `.gitignore`
  excludes `minion_hub/`, exactly as the sibling spec's own §1 noted a month ago.**
- Consequence for the operator today: opening `SellableWizard`, ticking "track stock" on a
  service, or fixing a typo'd unit of measure on an item with no stock history, produces an
  **honest 400** (S1's fix) — but the edit can never succeed. There is no code path by which
  either transition applies. The proposal's preferred branch ("the fields apply") is unimplemented
  for both markers.
- `createSellable` contains the item-sync logic these markers need to reuse (`createItem` when
  `trackStock`; link an existing item via `finProductId`) — carried from the sibling spec's
  assumption 2, unconfirmed against current line numbers.

### TO-BE (target behavior + invariants)

- `trackStock` **false → true**: creates the linked `stk_items` row (`fin_product_id` set) through
  the **same code path** `createSellable` uses. UOM validation/defaulting must be observably
  identical to the equivalent create: a supplied valid UOM is stored; an omitted/blank UOM either
  receives the create path's default or is refused with the same typed error and no writes.
  Derived `kind` becomes `product` as a consequence, and this is reflected in
  `getSellableRow()` — the proposal's literal DoD sentence.
- A coupled full-object PATCH with `kind: 'product'` and `trackStock: true` is accepted when
  `product` matches the state derived **after** the supported transition. `kind` remains derived:
  a submitted `kind` that conflicts with the post-transition state is still `kind_derived`.
- A `uom` change on a **pristine** item applies. Here, pristine has one definition throughout this
  spec: no ledger/movement row, no non-zero bin quantity, and no billed-line reference for that
  item (the authoritative tables/columns are fixed in Slice 0).
- **Invariant — S1's protections are preserved, with the coupled-transition refinement above.** A resubmit with unchanged
  `kind`/`trackStock`/`uom` stays a 200 no-op (no new 400s for ordinary price/name edits).
  `trackStock` **true → false** and any `uom` change on an item for which `itemHasHistory` is true
  remain refused via S1's existing generic codes (`stock_tracking_immutable`, `uom_immutable`).
  This spec narrows only S1's blanket UOM refusal for the newly supported pristine case; giving
  the unsafe cases their own destructive-specific codes
  and an explicit unlink path is the sibling spec's S3, out of scope here (§7).
- **Invariant — no schema change.** Every field involved already has a home in `stk_items`; this
  spec ships zero DDL, identical to the sibling spec's own constraint. Slice 0 must nevertheless
  prove that the partial uniqueness guarantee for `(org_id, fin_product_id)` described by
  `2026-07-19-pos-stock-split-implementation-spec.md` has shipped; if it has not, false→true is not
  concurrency-safe and this slice stops for a schema re-spec.
- **Invariant — exactly one linked item per sellable.** Concurrent false→true PATCHes cannot
  commit duplicate `stk_items` mirrors; the second request may return the same successful
  projection or the repository's mapped conflict error, but it leaves no partial `fin_products`
  write.
- **Invariant — the pristine check and UOM write are concurrency-safe.** A stock movement,
  non-zero bin update, or billed-line reference cannot commit between the history decision and
  the UOM write and thereby turn a permitted rename into a historical reinterpretation. Reuse the
  repository's established transaction/locking pattern; do not rely on an unlocked check-then-write.
- Both `TODO(handoff):` markers are removed once (and only once) their transition is live —
  matching the sibling spec's own removal discipline in its S2 "Do" list.

### DELTA — numbered transitions, each mapped to a slice and its proving test

1. `trackStock` false→true on a service sellable applies (linked `stk_items` row created, `kind`
   flips to `product`) → **Slice 1** → `pos.sellables.test.ts` case in Slice 1's DoD; end-to-end
   curl check §8 step 2.
2. `uom` change on a pristine tracked item applies → **Slice 2** → `pos.sellables.test.ts`
   case in Slice 2's DoD; end-to-end curl check §8 step 3.
3. A full-object `kind:'product'` + `trackStock:true` PATCH succeeds only because the submitted
   kind matches the post-transition derived state; a conflicting submitted kind is refused →
   **Slice 1** → coupled-transition cases in Slice 1's DoD.
4. The target `trackStock` `TODO(handoff):` marker is removed → **Slice 1** → targeted `rg` is
   empty and the total file marker count is the Slice-0 baseline minus one; unrelated markers, if
   any appeared, are not removed.
5. The target `uom` `TODO(handoff):` marker is removed → **Slice 2** → targeted `rg` is empty and
   the total file marker count is the Slice-0 baseline minus two.
6. `createSellable` and `createSellable-then-updateSellable(trackStock:true,...)` yield equal
   `getSellableRow()` projections and equal item rows → **Slice 1** → parity test in Slice 1's DoD
   (the anti-drift property that is the whole point of extracting one shared sync function).
7. Refusal invariants (unchanged resubmit → 200; `trackStock` true→false and history'd `uom` →
   400 via existing S1 codes) are unchanged before/after this spec → **Slice 1 + Slice 2** →
   regression cases preserve those outcomes in `pos.sellables.test.ts` (the UOM fixture must now
   explicitly satisfy `itemHasHistory`); a red run on either
   before the slice's new code lands is a stop-ship signal.

## 3. Slice 0 — recon (≤ 45 min, prepend to Slice 1, not counted as a slice)

Re-run (not re-derive) the sibling spec's own recon, scoped to what changed since S1 shipped:

```bash
cd minion_hub
git branch -r                                                       # confirm live base (master, per sibling spec)
git log --oneline -8 -- src/server/services/pos.service.ts          # memory/factory/eafcc91e: prove S1 is live
HANDOFF_BASELINE=$(rg -c 'TODO\(handoff\)' src/server/services/pos.service.ts || true)
rg -n 'TODO\(handoff\)' src/server/services/pos.service.ts          # record total baseline + exact target lines
rg -n -A40 'function updateSellable' src/server/services/pos.service.ts
rg -n 'deriveSellableFacts|kind_derived|stock_tracking_immutable|uom_immutable' src/server/services/pos.service.ts
rg -n -A30 'function createSellable' src/server/services/pos.service.ts    # confirm item-sync shape to extract
rg -n -m 20 'createItem|updateItem' src/server/services/stock.service.ts
rg -n -m 20 'stk_ledger|stk_bins|ledger|movement' src/server/db/schema/*.ts   # movement tables for itemHasHistory
rg -n 'stk_items|item_id|fin_product_id' src/server/db/schema src/server/services # enumerate references
rg -n -i 'ledger|bin|bill|invoice|movement|stock' src/server/services        # enumerate writers; reconcile with prior command
rg -n 'fin_product.*uniq|unique.*fin_product|fin_product_id' supabase/migrations src/server/db/schema # prove one linked item per org/product
test -f src/server/services/pos.sellables.test.ts && rg -n 'kind_derived|stock_tracking_immutable|uom_immutable' src/server/services/pos.sellables.test.ts
rg -n 'PosError|json\(' src/routes/api -g '**/sellables/**'         # confirm 400 mapping + §8 response envelopes
```

Record actuals in the PR description, including the exact two target marker texts, the complete
history predicate (tables, columns, and all write paths), and the PATCH/GET response envelopes.
This pre-flight is required by `/memory/MINION/factory/2026-08-20-eafcc91e.md`, which records that
a prior S1 run correctly produced zero diff after checking target-file history. If any load-bearing
claim in §2 AS-IS is wrong (S1's shape differs, `createSellable`'s item-sync doesn't exist as
described, movement tables differ), correct §2/§3 of this spec in the same commit rather than
implementing against stale assumptions. If the authoritative history surfaces or a concurrency-safe
locking strategy cannot be identified, stop and re-spec Slice 2; do not ship a partial predicate.
If the linked-item uniqueness guarantee is absent, stop and re-spec Slice 1 because this spec's
zero-DDL boundary cannot safely fix the race.

## 4. Approach — two vertical slices

```
S0 (recon) ─▶ Slice 1 (trackStock false→true, via extracted sync) ─▶ Slice 2 (uom-on-pristine)
```

Sequential — Slice 2 depends on the `syncSellableItem` extraction Slice 1 performs.

### Slice 1 — Extract the item-sync path; apply `trackStock` false→true

**Tags:** `logic`, `test` · **Estimate:** 5–7 h

**Goal:** DELTA #1, #3, #4, #6, #7 (its half).

**Do:**
- Extract from `createSellable` into `syncSellableItem(tx, ctx, finProductId, desired)` where
  `desired = { trackStock, uom, itemId? }`. `createSellable` is refactored to call it — behavior
  must be observably identical (proven by the parity test below). No new item-creation logic is written;
  this is extraction, not reimplementation.
- Wire `updateSellable`: when `trackStock` is present, `true`, and currently `false` (derived),
  call `syncSellableItem` to create the linked `stk_items` row (`fin_product_id` set, `uom` from
  the effective create-parity value, `is_stock_item` per the existing create path). Run inside the existing
  transaction; a failed item insert rolls back the `fin_products` update.
- Evaluate a submitted `kind` against the state that will exist after this supported transition,
  not only the pre-update derived state. Accept matching `kind:'product'` (the wizard's full-object
  shape); reject a conflicting submitted kind with `kind_derived` and no writes.
- Preserve `createSellable`'s existing `itemId`/`item_taken` behavior inside the extraction. This
  slice does **not** add a new `itemId` transition to `updateSellable`; that is not one of the two
  handoff markers.
- Remove the `TODO(handoff):` marker at the (Slice-0-confirmed) former `:1393` site.
- Leave the `uom`-on-pristine and all destructive-transition refusal paths untouched — they are
  Slice 2's and out-of-scope's job respectively.

**Files:** `src/server/services/pos.service.ts`, `src/server/services/stock.service.ts` (only if
`createItem` needs a caller-supplied `uom` parameter it lacks), `src/server/services/pos.sellables.test.ts`.

**Definition of done (machine-checkable):**
```bash
bun run vitest run src/server/services/pos.sellables.test.ts
#   - PATCH { trackStock: true, uom: 'Unidad' } on a service sellable →
#       getSellableRow() reports kind 'product', trackStock true, uom 'Unidad'
#   - full-object PATCH { kind:'product', trackStock:true, uom:'Unidad' } → same success;
#       kind:'service' with trackStock:true → PosError 'kind_derived', no rows changed
#   - a linked stk_items row exists with fin_product_id == the sellable
#   - PARITY: createSellable({...trackStock:true,uom:'Unidad'}) and
#       createSellable(service) + updateSellable({trackStock:true,uom:'Unidad'}) yield
#       equal stable getSellableRow() and item fields (explicitly omit ids/timestamps)
#   - omitted/blank-uom behavior is equal for equivalent create and update requests: same
#       defaulted value, or same typed refusal with no rows changed
#   - forced item-insert failure → fin_products row unchanged (transaction rolled back)
#   - two concurrent false→true PATCHes leave exactly one linked item; one succeeds and the other
#       either returns the same projection or the mapped conflict error, with no partial update
#   - REGRESSION (unchanged from S1): full-object resubmit with unchanged kind/trackStock/uom
#       + changed price → 200, price applied; trackStock true→false still 400
bun run check
: "${HANDOFF_BASELINE:?set to the Slice-0 recorded total}"
! rg -nF 'TODO(handoff): apply the safe trackStock transitions' src/server/services/pos.service.ts
test "$(rg -c 'TODO\(handoff\)' src/server/services/pos.service.ts || true)" -eq "$((HANDOFF_BASELINE - 1))"
```

---

### Slice 2 — Apply `uom` change on a pristine item

**Tags:** `logic`, `test` · **Estimate:** 4–6 h

**Goal:** DELTA #2, #5, #7 (its half).

**Do:**
- Add `itemHasHistory(tx, itemId): Promise<boolean>` using the complete, Slice-0-recorded
  predicate: true if any ledger/movement row, non-zero bin quantity, or billed line references the
  item. Run it and the UOM write in the same transaction under the repository's established lock
  that serializes the relevant history writers. Query/runtime errors propagate and roll back; they
  must not be converted into a fabricated `true` result. An incomplete predicate is a stop/re-spec,
  not a PR-note exception.
- Wire `updateSellable`: when `uom` is present, changed (per S1's existing trim+case-fold
  normalization — reuse it, don't redefine it), and `itemHasHistory` is `false`, apply the change
  via `syncSellableItem` (Slice 1). When `itemHasHistory` is `true`, keep S1's existing
  `uom_immutable` refusal — unchanged behavior, just now gated on history rather than blanket.
- Remove the `TODO(handoff):` marker at the (Slice-0-confirmed) former `:1407` site.

**Files:** `src/server/services/pos.service.ts`,
`src/server/services/pos.sellables.test.ts` (+ movement, bin, and billed-line fixtures).

**Definition of done (machine-checkable):**
```bash
bun run vitest run src/server/services/pos.sellables.test.ts
#   - PATCH { uom: 'mL' } on a pristine tracked item (all predicate branches empty) →
#       getSellableRow().uom == 'mL'
#   - PATCH { uom: 'mL' } on a tracked item WITH a movement → PosError 'uom_immutable' (unchanged
#       from S1); row + ledger untouched
#   - the same refusal is proved independently for a non-zero bin and for a billed-line reference
#   - an injected history-query failure propagates; UOM and history rows remain unchanged
#   - concurrency case: a movement/history writer racing the rename cannot leave a committed
#       movement interpreted under a renamed UOM (deterministic lock/barrier test)
#   - REGRESSION: all Slice 1 cases still green
bun run vitest run                                            # whole hub suite green, no skips added
bun run check
: "${HANDOFF_BASELINE:?set to the Slice-0 recorded total}"
! rg -nF 'TODO(handoff): apply a uom change when the linked item is pristine' src/server/services/pos.service.ts
test "$(rg -c 'TODO\(handoff\)' src/server/services/pos.service.ts || true)" -eq "$((HANDOFF_BASELINE - 2))"
```

## 5. Files touched (consolidated)

| File | Slices | Nature |
|---|---|---|
| `src/server/services/pos.service.ts` | 1, 2 | `syncSellableItem` extraction, `updateSellable` wiring, `itemHasHistory`, marker removal |
| `src/server/services/pos.sellables.test.ts` | 1, 2 | new cases + movement/bin/billed-line fixtures and concurrency coverage |
| `src/server/services/stock.service.ts` | 1 | only if `createItem` cannot take a caller-supplied `uom` |

All paths relative to `minion_hub/`. No `.svelte` file is edited (see §7). No migration — zero DDL.

## 6. Cross-repo impact

Re-checked for this narrower scope:

| Surface | Impact | Mitigation / evidence |
|---|---|---|
| `minion_site` (shared DB) | **None.** Zero DDL | CI guard: `git diff --quiet <base>...HEAD -- src/server/db/schema supabase/migrations` |
| `@minion-stack/db` | **None** | same guard |
| `@minion-stack/shared` / gateway WS frames | **None** — no shared type or WS frame changes | — |
| `paperclip-minion`, `pixel-agents`, `minion_plugins` | **None** | — |
| Hub REST callers (wizard, gateway POS/catalog tools, importers) | **Behavioral change:** two PATCH transitions move from 400 to mutation | inventory in A1 before merge; affected external callers require their own proposal/repo rollout |

**⚠️ A1 — carried from the sibling spec, still open.** Any non-wizard caller that PATCHes a whole
sellable object may have come to depend on S1 refusing a changed `trackStock`/`uom`; this spec now
makes the two safe cases mutate. Before Slice 1 merges, inventory every available checkout of
`minion/`, `minion_hub/`, `paperclip-minion/`, and root `packages/` for
`sellable|/api/pos/sellables`, paste the caller list and paths searched in the PR, and verify each
caller's intent. Missing checkouts are recorded as unavailable, not reported as zero hits. Any
affected caller outside hub gets a separate proposal and coordinated rollout; do not silently
expand this hub-only spec.

**⚠️ A2 — `pos.service.ts` is a contended file.** The sibling spec's own out-of-scope list names
`2026-08-17-hub-pos-appointments-fork` and IGV-rate work as other in-flight work on this file.
Scope commits narrowly to `updateSellable`/`createSellable`/the two new helpers and reconcile any
conflict against the live base using the runner's current merge workflow.

**⚠️ A3 — FACES catalog is live data (carried from sibling spec).** Do all manual probing against
the dev org, never production. Slice 0 must resolve the history predicate and locking strategy;
uncertainty stops Slice 2 rather than being hidden behind a permanent refusal.

## 7. Out of scope (explicit)

- **`trackStock` true→false (untrack) and `uom` changes with history** — the sibling spec's S3.
  These stay refused via S1's existing generic `stock_tracking_immutable`/`uom_immutable` codes,
  which is safe (fail-closed) and not a regression; giving them dedicated codes
  (`stock_untrack_has_history`, `uom_locked_has_history`), an explicit unlink path, and the
  anti-recurrence field-coverage guard is real, separable work. If S3 is still needed after this
  spec ships, it gets filed as its own proposal — do not fold it in here silently.
- **Wizard UX changes** (the original proposal's own exclusion, carried forward). No `.svelte`
  file is touched.
- **UOM conversion semantics, recipes / item-composition graph** — owned by
  `2026-07-19-pos-stock-split-implementation-spec` / `2026-07-19-item-spine-composition-slice1-spec`.
- **Schema changes.** No new table, column or type. If a slice appears to need one, stop and
  re-spec.
- **Backfilling sellables already corrupted by the original silent-drop bug** — unknown count; a
  detection query plus repair plan is its own proposal, same exclusion the sibling spec carried.

## 8. End-to-end verification

Run with both slices merged, on the live hub base branch confirmed in Slice 0, dev org.

```bash
cd minion_hub

# 1. Gates
bun run check
bun run vitest run
bun run vitest run src/server/services/pos.sellables.test.ts
git diff --quiet <base>...HEAD -- '*.svelte' || { echo "FAIL: UI out of scope (or diff failed)"; exit 1; }
git diff --quiet <base>...HEAD -- src/server/db/schema supabase/migrations || { echo "FAIL: no DDL in this spec (or diff failed)"; exit 1; }
# Assert both Slice-0-recorded target marker texts are absent and total marker count is baseline-2.
# Do not remove unrelated TODO(handoff) markers to force a zero count.
: "${HANDOFF_BASELINE:?set to the Slice-0 recorded total}"
! rg -nF 'TODO(handoff): apply the safe trackStock transitions' src/server/services/pos.service.ts
! rg -nF 'TODO(handoff): apply a uom change when the linked item is pristine' src/server/services/pos.service.ts
test "$(rg -c 'TODO\(handoff\)' src/server/services/pos.service.ts || true)" -eq "$((HANDOFF_BASELINE - 2))"

# 2. The proposal's DoD, end to end against a running dev server.
#    Use the PATCH/GET envelope confirmed in Slice 0; the jq below is illustrative until then and
#    must be corrected in this spec in the implementation PR if the route wraps data differently.
#    (S = sellable id of a service-kind sellable with no linked item)
curl -s -X PATCH "$HUB/api/pos/sellables/$S" -H "$AUTH" -H 'content-type: application/json' \
  -d '{"kind":"product","trackStock":true,"uom":"Unidad"}' | jq -e '.ok == true'
curl -s "$HUB/api/pos/sellables/$S" -H "$AUTH" \
  | jq -e '.kind=="product" and .trackStock==true and .uom=="Unidad"'   # the proposal's DoD, literally met

# 3. Pristine uom transition
#    (P = sellable id of a tracked item satisfying the complete pristine predicate)
curl -s -X PATCH "$HUB/api/pos/sellables/$P" -H "$AUTH" -H 'content-type: application/json' \
  -d '{"uom":"mL"}' | jq -e '.ok == true'
curl -s "$HUB/api/pos/sellables/$P" -H "$AUTH" | jq -e '.uom=="mL"'

# 4. S1 invariants unchanged
#    (T = sellable whose linked item has history under any predicate branch)
UOM_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH "$HUB/api/pos/sellables/$T" -H "$AUTH" \
  -H 'content-type: application/json' -d '{"uom":"mL"}')
test "$UOM_STATUS" = 400
UNTRACK_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH "$HUB/api/pos/sellables/$T" -H "$AUTH" \
  -H 'content-type: application/json' -d '{"trackStock":false}')
test "$UNTRACK_STATUS" = 400

# 5. Operator probe (browser-harness skill; no UI edits, verification only)
#    - open the wizard on a service sellable, tick stock tracking, set UOM, save, reopen →
#      value persists (before this spec: honest-but-permanent 400)
#    - open the wizard on a tracked item with no history, fix a typo'd UOM, save, reopen → persists
```

**Ship gate:** §8 all green, both target marker texts absent and the file's marker count reduced by
exactly two from the Slice-0 baseline, A1's consumer inventory pasted into the PR, and Slice 0's
recorded actuals reconciled against §3 (any correction committed to this spec in the same PR).
If no unrelated marker exists, the resulting zero count lets the handoff sweep auto-close the
proposal; if another marker appeared, leave it intact and record that automatic closure will wait
for its owning proposal.
