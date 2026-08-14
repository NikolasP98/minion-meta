---
id: 2026-08-14-pos-payment-methods-config-spec
title: POS configurable payment methods + settings UI
stage: dev
status: approved
pass: 1
created: 2026-08-14
updated: 2026-08-14
repos: [minion_hub]
type: feature
---

# POS configurable payment methods + settings UI

## 0. Product

The POS payment methods (cash / card / yape / plin / transfer) are a hardcoded
default with no UI to change them, and the `pos_settings.surcharges` column
provisioned for per-method fees was never wired up. This slice gives FACES a
**settings page to manage payment methods** — add/rename/remove a method, set
its fee (the card-processor surcharges they already track: Culqi 2.56%, MP
7.19%), mark whether it takes cash-style tendered/change, and set its default
document behavior — and replaces the `'cash'`-as-magic-string logic with a
per-method flag.

**Explicitly NOT in scope, by decision:** any "submit to SUNAT only if paid by
card/only these methods" filter. Every sale legally requires a comprobante
regardless of tender; we do not build a switch whose function is to route sales
away from SUNAT. `documentDefault` below chooses boleta-vs-factura and DNI
capture, never whether a sale is declared.

## 1. Data model

Promote `pos_settings.methods` from `string[]` to `PaymentMethod[]`, folding in
the dead `surcharges` column's intent:

```ts
interface PaymentMethod {
  id: string;          // lowercase slug, stable key (e.g. 'card'), unique
  label: string;       // display name, es-PE (e.g. 'Tarjeta')
  enabled: boolean;
  takesTendered: boolean;   // replaces the `method === 'cash'` special-case
  surcharge?: { type: 'percent' | 'fixed'; amount: number };  // fee, optional
  documentDefault?: '03' | '01' | null;  // boleta / factura / no default
}
```

Migration `supabase/migrations/<ts>_pos_methods_objects.sql`: additive — leave
`methods` jsonb, change nothing at the DB level (jsonb holds objects fine), and
DROP nothing. Instead handle the shape change in the service (§2) so old rows
(`["cash","card",…]`) keep working. Follow the memory rule
`hub-supabase-schema-not-reproducible` — no destructive DDL.

## 2. Service (`src/server/services/pos.service.ts`)

- `normalizeMethods(raw)`: accept either `string[]` (legacy) or `PaymentMethod[]`;
  upgrade a bare string `s` to `{ id: s, label: capitalize(s), enabled: true,
  takesTendered: s === 'cash', documentDefault: null }`. This is the ONLY place
  `'cash'` may appear as a literal — it is the one-time legacy migration guess.
- `DEFAULT_POS_SETTINGS.methods` becomes the object form; keep the same 5 methods
  with `takesTendered` true only for cash.
- `getPosSettings` / `updatePosSettings` / the PUT zod schema
  (`src/routes/api/pos/settings/+server.ts`) carry the new shape AND `surcharges`
  is removed from mind — it is folded into each method's `surcharge`. Validate:
  ids unique + non-empty lowercase, at least one enabled method, surcharge.amount
  >= 0.
- Tender validation (`pos.service.ts:614-621`) and `computeExpected` (`:159`)
  key off `method.takesTendered`, not `method === 'cash'`, resolved via the
  settings lookup. `computeExpected` still sums opening float into whichever
  method(s) are `takesTendered` (cash stays the float method in practice).

Update the 9 `'cash'` literal sites the recon listed (PaymentPanel.svelte,
sell/+page.svelte, pos.service.ts ×3, ShiftBanner.svelte) to resolve the flag
from settings. `pos_payments.method` keeps storing the method **id** (unchanged
storage; back-compat with historical tickets intact).

## 3. UI — new settings page

`src/routes/(app)/pos/settings/+page.server.ts` + `+page.svelte`:
- Load via `getPosSettings`; gate the page and the save with `pos`/`manage`
  (same pair the settings PUT already uses).
- Editable methods list — copy the add-row pattern from
  `src/lib/components/brains/BrainAccessPanel.svelte:52-80` (`addRow`/`removeRow(i)`/
  `save()` PUTs the whole array then `invalidate`). One row per method: label,
  enabled toggle, takes-tendered toggle, surcharge type+amount, documentDefault
  select. An **"Add payment method"** button appends a blank row (id auto-slugged
  from label on save; reject dup ids with the API error).
- Wire-up required (per hub CLAUDE.md RBAC/i18n build steps):
  - `MODULE_SUBRESOURCES.pos` entry for `/pos/settings` in
    `src/lib/routes/route-access-registry.ts:47-50` (auto-wires route guard +
    role-manager row).
  - `PosNav.svelte` item (nav is `canViewPath`-filtered already).
  - All new strings as `pos_settings_*` keys in `messages/en.json` + `messages/es.json`,
    then `bun run i18n:compile`. Method labels come from config, not message keys.
- Design governance: semantic tokens only; run `bun run lint:design && bun run
  lint:tokens` after (debt may only decrease). Read the ui-design-governance skill
  before writing markup.

## 4. Verification

1. Vitest: `normalizeMethods` upgrades legacy `string[]`; tender validation
   rejects tendered on a non-takesTendered method and accepts it on one that is;
   surcharge validation rejects negative; dup-id rejected.
2. `bun run check` 0/0, full `bun run test` green, `lint:design`+`lint:tokens` clean.
3. Manual: load `/pos/settings`, add a "Culqi" method with 2.56% surcharge, save,
   reload → persists; it appears in the sell PaymentPanel; a cash-style method
   still shows tendered/change and a card-style one does not.

## 5. Out of scope

SUNAT declaration filtering (see §0), applying the surcharge to ticket totals at
checkout (config only stores it this slice; charging it is a follow-up), and any
emission wiring — that rides the separate emission spec.
