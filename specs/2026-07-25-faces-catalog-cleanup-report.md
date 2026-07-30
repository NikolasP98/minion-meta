# FACES catalog cleanup — findings report

**Date:** 2026-07-25 · **Org:** `21e0601b-f632-43fd-8414-d644af4271f4`
**Scope:** `fin_products` (81 rows, 75 active) + `stk_items` (24 rows)
**Status:** ✅ **EXECUTED 2026-07-25** against production, per the user's §9 answers.
Superseded sections are marked. See §10 for what was actually applied and §11 for
what remains open.

Every number below was generated from the live DB, not typed by hand.

---

## 0. Read this first — two findings that change the plan

### 0.1 `fin_products.code` is a live business key, not a label

- `loadProductMap()` builds `Map<fin_products.code → id>`.
- The SUSII sync (`upsertInvoicesBatch`, nightly ~3am Peru) **deletes and
  re-inserts every invoice line** for each synced invoice, resolving
  `product_id: productMap.get(it.code) ?? null` from the code *SUSII sends*.
- `importFromBilling()` (`POST /api/finances/products/import`, a clickable
  button) re-creates a `fin_products` row for **every distinct
  `fin_invoice_items.code` not in the catalog**.

Consequences, and they are all silent:

| Action | What actually happens |
|---|---|
| Delete a duplicate product | One click of "import from billing" **re-creates it** |
| Rename a code | Next sync of any historical invoice sets `product_id → NULL`; revenue-by-product history detaches |
| Rewrite `fin_invoice_items.code` | Pointless — those rows are deleted and re-inserted from the provider payload |

Right now there are **0 orphan invoice codes** — the two tables are perfectly in
sync, which is exactly what makes this fragile.

**Therefore: no merge or recode should DELETE anything.** The safe primitive is
deactivate + alias. See §5.

### 0.2 Root cause of the duplicates — found and fixed

`updateSellable` called `upsertProduct`, whose conflict target is
`(org_id, code)`. With a **changed** code there is no conflict, so it
**INSERTed a second product** and left the original untouched. Editing a code in
the wizard forked the catalog instead of renaming it.

The evidence is unambiguous — all four zero-sales duplicates were created in a
four-minute window, ~70 seconds apart, each a hyphenated twin of a code that
already existed:

```
RS-SVP  created 2026-07-20 04:36:29   twin of RSSVP
RS-O4   created 2026-07-20 04:37:37   twin of RO4
RO-I    created 2026-07-20 04:37:55   twin of RO
CM-SVP  created 2026-07-20 04:40:26   twin of CMSVP
```

Someone sat down to tidy four codes and created four duplicates. **Fixed** — a
code change is now an `UPDATE` by id, and is refused outright when the old code
has billed invoice lines. Regression test: `pos.sellables.test.ts`.

---

## 1. Products — obvious merges

### 1a. Zero-risk: identical name, identical price, **zero references anywhere**

Checked against all 8 referencing tables *and* `fin_invoice_items.code`.

| Retire | Keep | Name | Price |
|---|---|---|---|
| `CM-SVP` | `CMSVP` | Contorno Mandibular (Saypha Volume Plus) | S/1100 |
| `RS-SVP` | `RSSVP` | RinoSculpt - Saypha Volume Plus | S/1350 |
| `RS-O4` | `RO4` | Rino Sculpt (Opera IV) | S/990 |
| `RO-I` | `RO` | Rino Opera | S/1050 |

These are the four artefacts of §0.2. Nothing points at them. **Safe to
deactivate immediately** — I still recommend deactivate over delete, so the
audit trail of the incident survives.

### 1b. Real merges: identical name, both sides referenced

Keeper chosen by **provider-code continuity + usage**, never by price (your
rule) and never by which code looks tidier.

| Name | Keep | Merge away | Why this keeper |
|---|---|---|---|
| Lips (Opera I) | `LIO990` (20 inv) | `LO1` (4), `LIO1` (1) | SUSII sends `LIO990`; all three map to HA Opera I qty 5 |
| Ojeras (Opera I) | `OOI` (64 inv) | `OO1 990` (13) | 5× the history; both map to HA Opera I qty 5 |
| Rino Opera | `RO` (218 inv) | `FACES 6244` (1) | `FACES 6244` is a raw SUSII id, not a code |

⚠️ **`stk_consumption` collides on merge.** All three "Lips (Opera I)" rows map
to *the same* item at *the same* qty, and the table has
`unique (org_id, fin_product_id, item_id)`. Repointing the losers would raise a
unique violation. The loser mappings must be **dropped, not repointed** — they
are exactly equivalent, so nothing is lost. Same for the Ojeras pair.

### 1c. Rename, do NOT merge — the name lost information the code kept

| Code | Current name | Proposed | Note |
|---|---|---|---|
| `MO3` | Mentón (Opera) | Mentón (Opera III) | collides by name with `MO`, but `MO3`/`SO3` sit beside `LMO3`/`OO3` which ARE Opera III |
| `SO3` | Surco (Opera) | Surcos (Opera III) | same pattern |
| `M6` | MALAR | *(needs §2)* | collides by name with `ML`; neither has a recorded insumo |
| `ML` | MALAR | *(needs §2)* | " |
| `OjO` | Ojeras Opera | code → `OJO` | lowercase `j`; `OjO` vs `OJO` vs `O01` vs `OO1` is a keying hazard |

I am **not** asserting the Opera-III reading. A trailing `3` is evidence, not
authority — it needs one word from the clinic.

---

## 2. Products — similar, and how to tell them apart

These need a human decision. I have deliberately **not** guessed.

### 2a. The systematic one: bare-brand vs explicit-variant

For most zones the catalog holds **both** a bare `<ZONE> SAYPHA` SKU (S/660–990)
**and** explicit Saypha Volume / Volume Plus SKUs (S/1250–1350). Same for bare
`<Zone> (Opera)` with no generation number.

| Zone | Bare SKU | Explicit variants |
|---|---|---|
| Labios | `L02` Lips Sculpt SAYPHA (1) | `LSSV` Saypha Volume (163), `SFL` Saypha Filler (22) |
| Ojeras | `O02` Ojeras SAYPHA (2) | `SFO` Saypha Filler (17) |
| Mentón | `M02` Mentón SAYPHA (7) | `MSVP` Saypha Volume Plus (62) |
| Malar | `MS` MALAR SAYPHA (1) | `MASVP` Saypha Volume Plus (16) |
| Surcos | `SS` SURCOS SAYPHA (2) | `SSV` Volume (9), `SSVP` Volume Plus (30) |
| Mandíbula | `J02` Jawline SAYPHA (2) | `CMSVP` Volume Plus (3), `CMO4` Opera IV (4) |
| Labios/Ojeras/Mentón/Surcos/Nariz | `LO`, `OjO`, `MO`, `SO`, `M6` (Opera, no gen) | the Opera I–IV SKUs |

**Reading:** the bare SKUs are pre-split legacy entries; the explicit ones are
the current catalog. Two defensible options:

1. **Merge each bare SKU into its most-used explicit sibling.** Cleanest
   catalog, but rewrites what those historical sales *were*.
2. **Keep, and rename to make the vagueness explicit** — "Labios SAYPHA (variante
   sin especificar)". Honest, keeps history exact, leaves 11 rows of clutter.

I recommend **(2)** for anything with sales and **(1)** only for the 1–2-sale
rows, but this is your call — it is a bookkeeping-fidelity question, not a
technical one.

### 2b. Individually ambiguous pairs

| A | B | The question |
|---|---|---|
| `AF1` Afinamiento de Rostro (S/1600, **440 sales** — top service) | `AF2` Afinamiento Facial (S/500, 16) | Same treatment at two tiers, or two different treatments? Also: **which insumo?** Face slimming is deoxycholic acid in some clinics, masseter toxin in others. Nothing in the data settles it, and `TM Toxina Masetero` already exists separately. |
| `T1Z` Toxina 1 Zona (S/400, 14) | `FACES 4788` BOTOX 1 zona (S/350, 1) | Almost certainly the same offer. `FACES 4788` is a raw SUSII id. Merge into `T1Z`? |
| `LLM` Linea Marioneta (S/1000, 2) | `LM` Lineas de Marioneta (S/737.5, 1) | Same zone, no insumo recorded for either. Same thing, or Opera vs MIFILL? |
| `ML` MALAR (S/745, 21) | `M5` Pomulo MIFILL (S/700, 2) | Pómulo *is* malar anatomically. But that does not prove bare `MALAR` is MIFILL — inferring it from the S/745 price band and then merging would be circular reasoning off a signal you told me to ignore. Needs confirmation. |
| `CM` Contorno Mandibular (S/500, 14) | `J02` Jawline SAYPHA (S/660, 2) | Jawline *is* contorno mandibular. Different insumo (one unknown, one Saypha) → probably keep both, rename `J02` → "Contorno Mandibular SAYPHA". |
| `LDP` LABIOS DEEP (S/800, 9) | `L01` Lips Sculpt MIFILL (S/790, 229) | Distinct technique, or the same thing? S/800 vs S/790 is suggestive but is a price signal. |

### 2c. Genuinely distinct despite sharing a cell

Not duplicates — three separate retail products each:

- **Zona íntima × Cosmético:** `EU` Eudaria, `JIEU` Jabón íntimo Eudaria, `JB` Sensiclean
- **Rostro × Cosmético:** `DQ` Dermaquench, `LB` Lifting B, `WS` Watershield
- **Sin zona × Sin insumo:** `RE` Reserva de Consulta (deposit), `AJ` Ajuste por Método de Pago (fee)
- `T1Z` vs `T2Z` — 1 zone vs 2 zones is a real difference

---

## 3. Products — unique

**46 of 81** have no name twin and are the sole occupant of their
(zone × insumo) cell. These are clean and need no action. The full list is in
the session scratchpad; the top ten by volume:

| Code | Name | Zone | Insumo | Invoices |
|---|---|---|---|---|
| `B01` | Botox Full Face | Rostro | Toxina | 370 |
| `R02` | RinoSculpt SAYPHA | Nariz | Saypha | 254 |
| `R01` | RinoSculpt MIFILL | Nariz | MIFILL | 244 |
| `L01` | Lips Sculpt MIFILL | Labios | MIFILL | 229 |
| `LSSV` | Lip Sculpt - Saypha Volume | Labios | Saypha Volume | 163 |
| `LO` | Lips (Opera) | Labios | Opera (sin gen.) | 143 |
| `O01` | Ojeras MIFILL | Ojeras | MIFILL | 133 |
| `M01` | Mentón MIFILL | Mentón | MIFILL | 67 |
| `MSVP` | Menton - Saypha Volume Plus | Mentón | Saypha VP | 62 |
| `TM` | Toxina Masetero | Masetero | Toxina | 58 |

---

## 4. Stock items — 24 rows, far cleaner than the product catalog

**No name duplicates.** Findings:

| Item | Finding | Recommendation |
|---|---|---|
| `1285 Filler` | Generic placeholder. 0 ledger rows, 0 on hand, 0 consumption mappings, no product link. Superseded by the 8 specific `HA *` items. | **The one clear delete** |
| `1259 HA Opera Corp (ml)` | `uom = 'box'` where its 7 siblings use `'caja'`; 200 ml/box vs 500. 0 ledger. | Normalise uom → `caja` |
| `1250 Lip Defense` | Product is `Lip Defender`, item is `Lip Defense` | Pick one spelling |
| `1266 Bioestimulador de Colágeno` | Product spells it `Colageno` (no accent) | Pick one spelling |
| `1256 Lidocaina`, `1260 Llave de 3 Vias`, `1249 Sensiclean` | 0 ledger — real consumables, just never counted in | Keep |
| **UOM inconsistency** | `Unidad` ×12, `caja` ×7, `box` ×1, `ml` ×1, `units` ×1 | Normalise `box` → `caja` |
| **`item_group`** | Only two groups: `Insumos Internos` (18), `Cosméticos` (6) | Mirror the insumo axis: Rellenos HA / Toxinas / Bioestimuladores / Mesoterapia / Consumibles / Cosméticos / Prendas |
| **FAJA gap** ⚠️ | `FAJA-S`/`FAJA-M`/`FAJA-L` are stocked (ledger 30/50/37) but the **sold** product is `F-G FAJA-G` (10 sales) which links to **none of them** | Selling a faja decrements no stock. Either split the product into 3 sizes or roll the items into one. |

Stock item codes (`1246`–`1286`, SUSII ids) already satisfy the 4-char/no-space
rule. They are opaque but **changing them is riskier than leaving them** —
`fin_products.code = stk_items.code` matching is used by `importFromBilling`.
I did **not** recode them.

---

## 5. Anomalies worth acting on regardless of the merge decisions

1. **🚨 Six products are `active = false` but still being billed.**
   `BC` Bioestimulador (17 sales, last **2026-07-23** — yesterday), `H`
   Hialuronidasa (20, 2026-05-15), `DQ` Dermaquench (9), `WS` Watershield (6),
   `LB` Lifting B (8), `JB` Sensiclean (3). They are hidden from the POS
   (`listSellables` filters `active = true`) yet sold through SUSII. Either the
   flag is wrong or the POS is being bypassed.
2. **`LD` Lip Defender:** active, 38 sales, `unit_price` is NULL → sells at
   price-on-the-fly.
3. **`MSVP` consumption qty = 16.5** where every other Saypha Volume Plus
   product is 5 — a 3.3× outlier. Either a data-entry slip or a real
   difference; it drives stock depletion.
4. **`B01` Botox Full Face consumes 30 units** — identical to a *single* zone
   (`BE`/`BFR`/`BO`). A full face is normally 50–64u. Likely under-consuming.
5. **40 active clinical products have no stock mapping** — those sales
   decrement nothing.
6. **8 products cannot be auto-classified** and need one word from the clinic:
   `AF1`, `AF2`, `CM`, `LDP`, `LLM`, `LM`, `ML`, `M6`. They surface as the
   **"Por clasificar"** column on the new board — that column *is* the worklist.

---

## 6. Code format — what the new rail rejects

Format is now **2–4 chars, uppercase A–Z0–9, no separators**. Enforced in the
wizard (live normalisation + inline error) and server-side in
`createSellable`/`updateSellable`.

No separator is allowed **because the separator *was* the duplicate**:
`CMSVP`/`CM-SVP`, `RSSVP`/`RS-SVP`, `RO`/`RO-I` differed by nothing else.

16 existing codes violate it. **11 of them cannot be safely recoded** because
their old code carries billed invoice lines (§0.1) — the alias table is the
prerequisite:

| Code | Problem | Billed lines | Recodeable today? |
|---|---|---|---|
| `RSSVP` | 5 chars | 231 | ❌ needs alias |
| `LIO990` | 6 chars | 20 | ❌ |
| `H` | 1 char | 20 | ❌ |
| `MASVP` | 5 chars | 16 | ❌ |
| `OO1 990` | space | 13 | ❌ |
| `F-G` | hyphen | 10 | ❌ |
| `LMSVP` | 5 chars | 9 | ❌ |
| `NCTF3` | 5 chars | 7 | ❌ |
| `CMSVP` | 5 chars | 3 | ❌ |
| `FACES 4788` | space | 1 | ❌ |
| `FACES 6244` | space | 1 | ❌ |
| `CM-SVP`, `RS-SVP`, `RS-O4`, `RO-I` | hyphen | **0** | ✅ (but these are being retired anyway) |
| `OjO` | lowercase | 54 | ⚠️ case-only → `OJO`, still needs alias |

**Recommendation:** the 4-char rule binds **new** codes from today. Legacy codes
get corrected only after the alias table lands, in one pass.

---

## 7. The alias table (proposed, NOT built)

```sql
fin_product_aliases (org_id text, code text, product_id uuid,
                     primary key (org_id, code))
```

- `loadProductMap()` returns products **UNION** aliases (a live product code
  wins on conflict).
- `importFromBilling()` skips codes present as aliases.
- Then: retiring a duplicate keeps SUSII resolving through the old code, and a
  recode keeps its billing history. Both become reversible.

This is the one piece of schema the cleanup genuinely needs, and it is ~30 lines.
I did not build it because it changes the sync path and wanted your sign-off
first.

---

## 8. What was built this session

| Area | Change |
|---|---|
| Taxonomy | `$lib/catalog/taxonomy.ts` — 17 zones × 20 insumo lines × 11 categories; classifies **81/81** products |
| Provenance | Per-field `zoneSource`/`lineSource` = `mapped` \| `inferred` \| `manual`. `stk_consumption` is authoritative **only when a product maps to exactly one item** (it records what a sale burns, not which item is therapeutic) |
| Derived, not stored | The taxonomy is computed on every read. Nothing inferred is written to prod, so an inference can never masquerade as a confirmed fact. `metadata.zone`/`metadata.line` are read as **manual overrides only** |
| Code rail | `$lib/catalog/code.ts` — one shared module replacing the drifted client `slugify` / server `slugifyCode` pair |
| **Root-cause fix** | `updateSellable` renames instead of forking; refuses to rename a code with billed history |
| Bundles | `fin_product_components` migration + Drizzle schema + service CRUD; `kind` becomes `product\|service\|bundle`, still derived |
| `/pos/sell` | Group-by **Flat / Body area / Product used / Type**. Grouped gallery sections + nested `DataTable` tree. Defaults to flat (till speed); search forces flat |
| `/pos/catalog` | **Board view**, one column per group, empty columns hidden, axis switchable. Defaults to `Type` (10 buckets) rather than zone/line (17/20) |
| Tests | 76 passing across 4 files |
| Gates | `check` clean (1 pre-existing unrelated brains error), `lint:design` no debt increase, `lint:tokens` 0 violations |

### Deliberately not done

- **No production data mutation.** Every merge, rename, deactivation and uom fix
  in §1–§5 awaits your decisions.
- **Bundle → children expansion at stock-issue time.** The table, constraints
  and read path exist; walking `bundle → children → stk_consumption` at sale
  time touches POS issue, booking accrual, item cost, and void/reversal.
  Notably `D01 Dúo MIFILL` may be a *choose-two-zones* offer rather than a fixed
  pair — if so it needs choice slots plus a selected-children snapshot on the
  ticket line, not `qty = 2`. Worth confirming before building.
- **Bundle editor UI.** Service CRUD is in; the visual editor is not.
- **Nested bundles are rejected** (`bundle_nested`) rather than supported.

---

## 9. Decisions I need from you

1. **§1a** — deactivate the 4 zero-sales duplicates? (lowest risk item here)
2. **§1b** — confirm the 3 keepers (`LIO990`, `OOI`, `RO`), and that dropping
   the losers' equivalent `stk_consumption` mappings is fine
3. **§1c** — are `MO3`/`SO3` Opera III?
4. **§2a** — merge the bare-brand legacy SKUs, or rename them to make the
   vagueness explicit?
5. **§2b** — the six ambiguous pairs, especially `AF1`/`AF2` (440 sales, and
   its insumo is unknown)
6. **§5.1** — are those six inactive-but-selling products a wrong flag, or is
   the POS being bypassed?
7. **§7** — build the alias table? Nothing else in the recode plan is safe
   without it.


---

# 10. APPLIED — what actually changed in production

Executed by `minion_hub/scripts/faces-catalog-cleanup.ts` (idempotent; re-running
is a verified no-op). Snapshot of `fin_products` taken first.

## 10.1 The identity split that made merging safe

`code` was doing two incompatible jobs — human label AND the sync's join key.
Split into three, per the user's directive ("a new SKU ID field … the code(s)
would be references"):

| Field | Role |
|---|---|
| `sku` uuid (NEW) | **Master identity.** Deliberately not unique: a merge repoints losers onto the keeper's sku, so several rows are one logical product without rewriting a single FK. |
| `code` | Short human/import **reference**, now on the 2–4 alnum rail. |
| `metadata.aliases[]` | Every **other** code that must still resolve here — retired duplicates and other import sources' codes. |

`loadProductMap` now returns `products UNION aliases` with a **live code always
beating an alias**, and `importFromBilling` skips codes already claimed as an
alias. That is what makes a merge survive both the nightly sync and the
"import from billing" button.

⚠️ **Nothing was deleted.** Merged losers survive as inactive shells with their
code retired behind a `#` prefix and `metadata.mergedInto` set.

## 10.2 Results

| | Before | After |
|---|---|---|
| products | 81 | 84 (+3 Faja sizes) |
| active | 75 | 73 |
| merged-away shells | — | 10 |
| distinct SKUs | 81 | 74 |
| stock items | 24 | 27 (+Eudaria, +Jabón Íntimo, +Faja G) |
| active codes violating the rail | 16 | **0** |
| historical invoice codes that fail to resolve | 0 | **0** |

Merges applied: `CMSP←CM-SVP` · `RSSP←RS-SVP,RSSVP` · `RO4←RS-O4` ·
`RO←RO-I,FACES 6244` · `LO1←LO1,LIO1,LIO990` · `OOI←OO1 990` ·
`T1Z←FACES 4788` · `LLM←LM`.

Also: 6 inactive-but-billed products reactivated · names standardised
(Malar→Pómulo, Jawline→Contorno Mandibular, Lips→Labios, accents, Title Case) ·
bare-brand SKUs suffixed `(variante)` · retail split out (`Retail`/`Prenda`) ·
`AJ` retired into `pos_settings.surcharges` · Faja S/M/L published as sellables
linked to their stock items.

## 10.3 Nightly sync bounded

The daily cron already passed a 7-day window, but `since` took the **older** of
watermark and window — so a stale watermark still triggered a full sweep,
contradicting the route's own "never does a full history sweep" contract. It now
takes the **newer**, making the window a hard ceiling, and logs the skipped range
loudly rather than swallowing it. Manual sync is unchanged.

## 10.4 Two bugs caught by verification, not by tests

1. **The alias lookup shipped inert.** `lateral jsonb_array_elements_text(…) as
   code` names the *table*; bare `code` then silently resolved to `p.code`, so
   every alias row returned the product's own live code. 393 invoice lines
   failed to resolve. Fix is `as a(code)` — the column alias. Guarded by
   `finance-product-aliases.test.ts`.
2. **Taxonomy overrides keyed off the pre-recode codes**, so `Sensiclean`
   (JB→SENS) fell into "Cargo". Both old and new codes are now mapped, since the
   old ones live on as aliases.

---

# 11. Still open

- **`D01 Dúo MIFILL` is not converted to a bundle.** The table, constraints and
  read path exist, but it is still unclear whether it is a fixed pair or a
  *choose-two-zones* offer; those need different models (fixed children vs
  choice slots + a selected-children snapshot on the ticket line).
- **No MIFILL stock item exists**, so the six MIFILL products — including
  `L01` (229 invoices) and `R01` (244) — still decrement nothing. This is a stock
  gap to fill, not a mapping to guess.
- **28 of 31 unmapped products left alone**, per "leave unknowns alone if you
  can't judge what they consume". Only `MO3`, `SO3` (Opera III, user-confirmed)
  and `SG` (toxin, 30u org convention) were seeded.
- **`AF1`/`AF2` tier names are my invention** — "(completo)" / "(básico)".
  Rename if the clinic calls them something else.
- **`ML` / `M6` are "Pómulo (variante)" and "(variante 2)"** — placeholder
  labels; both lack any recorded insumo.
- **`pos_settings.surcharges` has no UI yet.** The column and the card-fee value
  (fixed S/10, from AJ's price) exist; the POS does not apply it at tender time.
- **`MSVP` consumption qty 16.5** left as-is for manual correction, as instructed.
