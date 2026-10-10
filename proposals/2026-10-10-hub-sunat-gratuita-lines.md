---
id: 2026-10-10-hub-sunat-gratuita-lines
title: SUNAT zero-value lines must be emitted as operaciones gratuitas (fault 3105 after hub #459)
status: draft
created: 2026-10-10
updated: 2026-10-10
repos: [minion_hub]
tags: [data, security]
effort: S
---

# SUNAT zero-value lines must be emitted as operaciones gratuitas

## AS-IS

`minion_hub/src/server/finance/emission/ubl.ts` emits every `cac:InvoiceLine`
with `cbc:TaxExemptionReasonCode` 10 ("Gravado - Operación onerosa", catálogo
07), tributo 1000/IGV/VAT, `PriceTypeCode` 01, and TaxableAmount/TaxAmount from
the line's own tax-inclusive total. There is no notion of an operación gratuita
in the emission library (`EmissionLine` carries only `description`, `quantity`,
`unitPriceInclTax`), and `pos-emission-mapping.ts` derives that unit price from
the line's PERSISTED (already discounted) total, so a list price never reaches
the emitter.

Evidence: on 2026-10-10 19:18Z and 19:20Z two SUNAT beta (B999, shadow)
emissions were rejected with fault 3105 "El XML debe contener al menos un
tributo por linea de afectacion por IGV" — POS-2026-00016 (`Faja L` total 0;
`Reserva de Consulta` list 50 with a 100% discount; `Afinamiento de Rostro
(completo)` 1700) and POS-2026-00017 (`Watershield` total 0; `RinoSculpt -
Saypha Volume Plus` 1250). Hub #459, merged the same day, made a zero catalog
price chargeable, so zero-value lines reached the emitter for the first time.
The failure was console-only (`[pos-emission] beta emission failed`, row
degraded to `status='error'`, no alert).

## TO-BE

1. A line whose rounded tax-inclusive total is 0 is emitted as an operación
   gratuita, never as afectación 10 with a zero taxable base.
2. A gratuita line carries `LineExtensionAmount` 0.00, a zero line `TaxTotal`
   under the gratuita tributo, `cac:Price` 0.00, and the value that would have
   been charged in `cac:PricingReference/cac:AlternativeConditionPrice` with
   catálogo 16 code 02.
3. The document declares "Total valor de venta - operaciones gratuitas" as a
   second `cac:TaxSubtotal` (guía numeral 26) whenever any line is gratuita.
4. Gratuitas never enter Sumatoria IGV, `TaxInclusiveAmount` or
   `PayableAmount` (guía numeral 27).
5. Legend 1002 appears only when EVERY line is gratuita (guía, "Leyendas").
6. An all-paid invoice is byte-identical to today's output.
7. An emission failure reaches Sentry, not only the console.

## DELTA (hub PR #466, draft)

- `emission/types.ts`: optional `EmissionLine.referenceUnitPriceInclTax`.
- `emission/ubl.ts` `computeTotals`: `gratuita`, `gratuitaBase`,
  `gratuitaUnitPriceExclTax` per line; `gratuitaAmount`, `allGratuita` per
  document; gratuitas filtered out of the four onerous totals.
- `emission/ubl.ts` `gratuitaLineXml` + `buildInvoiceXml`: afectación **31**
  (Inafecto - Retiro por bonificación), tributo 9998/INAFECTO/FRE,
  `PriceTypeCode` 02, document gratuitas `TaxSubtotal`, legend 1002 gated on
  `allGratuita`. Chosen over 15 (Gravado - Bonificaciones, which declares IGV
  owed on the reference value) because it matches SUNAT's own "Factura con
  bonificación" worked example and is tax-neutral.
- `services/pos-emission-mapping.ts`: optional `TicketEmissionLine.unitPrice`
  → reference value, NOT scaled by the ticket-level discount ratio.
- `services/pos-emission.service.ts`: selects `pos_ticket_lines.unit_price`;
  `Sentry.captureException` beside the existing `console.error`.
- Tests: mixed-invoice classification; onerous totals; gratuita line codes and
  amounts; two document `TaxSubtotal`s; `LegalMonetaryTotal` excludes
  gratuitas; legend 1002 only on an all-gratuita document; the all-paid golden
  fixture byte-identical. No migration, no UI, no SUNAT call made.

## Open ends (ledger)

1. **Accountant's call: 31 (inafecto) vs 15 (gravado, IGV on the reference
   value)** — must be confirmed before the production cutover. `TODO(handoff)`
   at the site.
2. A zero reference value (catalog price 0 with no list price: `Faja L`,
   `Watershield`) may still be rejected; guía numeral 39 wants the valor de
   mercado. Data fix (give the item a price), not code. `TODO(handoff)`.
3. `31` names a retiro de bienes; a free SERVICE arguably wants `37`. One code
   serves both today.
4. The reference value is treated as IGV-exclusive; unverified against a SUNAT
   acceptance. The next real sale with a free line is the shadow test.
5. Resumen diario (RC) declares no gratuitas field; follow-up if required.
6. No official validation-rule annex for fault 3105 was found; the root cause
   is inferred from the fault text plus the guía's gratuitas treatment.
7. Monitoring: no alert fires on `pos_emissions.status='error'` beyond the new
   Sentry capture; a PostHog/Sentry threshold on that status is owed.
