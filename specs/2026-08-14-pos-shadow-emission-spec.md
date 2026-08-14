---
id: 2026-08-14-pos-shadow-emission-spec
title: POS shadow emission — serie allocation + ticket→SUNAT-beta wiring
stage: dev
status: approved
pass: 1
created: 2026-08-14
updated: 2026-08-14
repos: [minion_hub]
type: feature
---

# POS shadow emission — serie allocation + ticket→SUNAT-beta wiring

## 0. Product

The emission library (PR #97, merged) proved minion's XML passes SUNAT's
validator — with synthetic payloads. Before any production cutover we need the
same pipeline exercised by **real sales**: every POS ticket, with real client
names, discounts, split tenders and odd céntimos. Shadow mode does exactly
that: when a ticket is closed, minion emits the corresponding document to
SUNAT's **beta** sandbox (zero legal effect) and records the outcome. A week of
green shadow emissions = evidence the payload mapping is production-ready.
SUSII keeps doing the real emission throughout; shadow is invisible to the
cashier.

This slice also builds the **serie/correlativo allocator** — the mechanism that
will assign real document numbers at cutover — and exercises it in shadow.

## 1. Data model (additive migration, RLS org-scoped like the other pos_ tables; see memory `hub-org-scoping-rls`, `hub-supabase-schema-not-reproducible` — DROP nothing)

`pos_series` — document number allocator:

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid | RLS + fk |
| doc_type | text | `'01'` factura / `'03'` boleta |
| serie | text | e.g. `B999` (shadow), later `B101` (prod). 4 chars, letter-prefixed |
| next_number | integer | next correlativo to hand out, starts 1 |
| environment | text | `'beta'` \| `'prod'` — a prod serie must never be consumed by shadow |
| active | boolean | one active serie per (org, doc_type, environment) — enforce with a partial unique index |
| created_at / updated_at | timestamptz | |

Unique `(org_id, doc_type, serie)`.

`pos_emissions` — one row per emission attempt:

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| org_id | uuid | RLS |
| ticket_id | uuid | fk → pos_tickets |
| doc_type / serie / correlativo | text/text/int | unique `(org_id, doc_type, serie, correlativo)` |
| environment | text | `'beta'` now; `'prod'` later |
| status | text | `'pending'` → `'accepted'` \| `'rejected'` \| `'error'` |
| response_code / response_description | text | from the CDR (or fault) |
| xml_hash | text | sha256 of the signed XML (audit trail; do NOT store the XML) |
| total / client_doc_type / client_doc_number | numeric/text/text | denormalised for quick inspection |
| created_at / updated_at | timestamptz | |

`pos_settings` gains `emission` jsonb: `{ mode: 'off' | 'shadow', docTypeDefault: '03' }`.
Default `mode: 'off'`. `'prod'` is REJECTED by validation in this slice — the
value doesn't exist yet, by design.

## 2. Serie allocation (`src/server/services/pos-emission.service.ts`)

`allocateNumber(tx, orgId, docType, environment): { serie, correlativo }` — a
single atomic statement, no read-modify-write:

```sql
update pos_series set next_number = next_number + 1, updated_at = now()
where org_id = $1 and doc_type = $2 and environment = $3 and active
returning serie, next_number - 1 as correlativo;
```

Zero rows → throw `PosError('no active serie', 'no_serie')`. Runs inside the
caller's transaction so a failed insert of the `pos_emissions` row rolls the
number back (gaps are legally tolerable but pointless to create on purpose).
Concurrency test required: two parallel allocations must never return the same
correlativo (drive both through real the DB test harness used by existing
pos.service tests).

Seeding: enabling shadow mode auto-seeds `B999`/`03` and `F999`/`01`
(environment `beta`) for the org if absent — inside `updatePosSettings`, same
transaction.

## 3. Ticket → EmissionInvoice mapping (`pos-emission.service.ts`)

`ticketToEmission(ticket, lines, customer, settings): EmissionInvoice`:

- docType: `'01'` iff the ticket's customer has docType RUC, else
  `settings.emission.docTypeDefault` (`'03'`).
- Lines: POS lines map 1:1 (description, quantity, unitPriceInclTax = the POS
  line price, which is IGV-inclusive). Ticket-level discounts: apply
  proportionally across lines (POS already computes line totals — reuse them;
  the emission library derives IGV from inclusive prices).
- Client: from the ticket's customer (docType `'1'` DNI / `'6'` RUC). No
  customer → boleta with the anonymous-consumer convention (docType `'1'`,
  docNumber `'00000000'`, name `'CLIENTE VARIOS'`) — legally valid **below**
  S/ 700. At or above S/ 700 with no document: still emit in shadow, but mark
  the `pos_emissions` row `response_description` prefix `[DOC-REQUIRED]` when
  it succeeds — this is exactly the real-world data we want shadow to surface.
  Never block checkout.
- Split tender does not affect the document (payment methods are not part of
  the UBL we emit in this slice).
- Emitter data (RUC 20611172967, razón social) from a new
  `POS_EMISSION_EMITTER` env/config — read from `fin_settings` if present,
  else env; keep it simple, one org in practice.

## 4. Wiring (the only touch on existing flow)

In `submitTicket` (pos.service.ts), after the ticket transaction commits and
only when `settings.emission.mode === 'shadow'`:

1. Synchronously (same request): allocate number + insert `pos_emissions` row
   `status='pending'` in a SECOND small transaction (so checkout latency gains
   only ~one insert).
2. Fire the actual beta emission post-response via Vercel `waitUntil`
   (`@vercel/functions`); fall back to a detached void promise when unavailable
   (local dev). The task: build → sign → send → parse → update the row to
   accepted/rejected/error. Space calls: the beta gateway 401s back-to-back
   requests (memory: ~3s spacing) — a per-process last-call timestamp gate is
   enough; if inside the window, sleep the difference first.
3. Rows stuck `'pending'` (frozen runtime, crash) are the loss measure —
   surface them: `GET /api/pos/tickets/[id]` already returns the ticket; extend
   it to include its `pos_emissions` rows. No retry machinery this slice.

Signing cert for shadow: self-signed PEM via env (`POS_EMISSION_BETA_CERT`,
`POS_EMISSION_BETA_KEY`) — generated once with the existing
`scripts/gen-beta-cert.sh`, stored only in env/Vercel, never committed.

## 5. Settings UI (one small addition, not a page)

`/pos/settings` (shipped in PR #98) gains an "Emission" card: mode toggle
off/shadow + read-only list of the org's series with next numbers. Same
`pos`/`manage` gate, same PUT. i18n keys `pos_settings_emission_*` (en+es,
append-only), design tokens only, `DESIGN_LINT_BASE_REF=origin/master
bun run lint:design && bun run lint:tokens` must pass.

## 6. Verification

1. Unit: allocator concurrency (no duplicate correlativo), mapping (discounted
   ticket, no-customer boleta, RUC customer → factura, ≥S/700 no-doc flag),
   settings validation rejects `mode:'prod'`, shadow seeding idempotent.
2. Live: `scripts/shadow-emit-test.ts` — build a synthetic ticket through
   `ticketToEmission` + real beta emission; DoD = `pos_emissions`-shaped result
   `accepted` with `ResponseCode 0`.
3. `bun run check` 0/0, full `bun run test` green, design lints clean.
4. Route-contract counts: extending an existing page/endpoint should not change
   them, but if any file in `route-design-*` complains, bump per its error.

## 7. Out of scope

Production mode (`'prod'` value rejected), real certificate management, resumen
diario / bajas (separate spec), retry/queue infrastructure, emission UI beyond
the settings card and ticket-detail field, notas de crédito.
