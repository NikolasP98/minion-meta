---
id: 2026-08-17-hub-igv-rate-from-org-config
title: SUNAT emission hardcodes 18% IGV — read the org's configured tax rate
status: in-spec
spawned_spec: 2026-08-17-hub-igv-rate-from-org-config-spec
created: 2026-08-17
updated: 2026-08-29
repos: [minion_hub]
tags: [logic, hardcoded]
value: 8
effort: S
source: debt-sweep-2026-08-17
source_trust: trusted-automation
risk_class: low
priority: medium
owner: factory
---

# SUNAT emission hardcodes 18% IGV — read the org's configured tax rate

## Problem

src/server/finance/emission/ubl.ts:5 const IGV_RATE = 0.18 while finSettings.taxRate (finance.service.ts:386) is already per-org configurable — emission ignores it. Any org with a different rate emits wrong SUNAT documents.

## Definition of done

computeTotals()/EmissionInvoice thread the org taxRate; unit test asserts a non-0.18 rate changes output; grep confirms no module-level rate constant remains.

## Out of scope

Tax-inclusive/exclusive pricing semantics changes.

## Open items (S3 pass, 2026-08-29)

S3's code-level DoD is shipped, fail-closed: `src/lib/finance/igv-rates.ts` holds
`SUNAT_VIGENTE_IGV_RATES = [0.18]`; the settings-write boundary and `resolveIgvRate`
(`src/server/finance/tax.ts`) both reject any other rate before it can reach emission; `igvRate`
stays a threaded `EmissionInvoice` input (never a module-level constant) all the way to the XML,
behind a permanent anti-recurrence test.

**§6 step 3 (live SUNAT beta re-verification) ran 2026-08-29 and disproved half of its own
acceptance criterion — it asked for something SUNAT will never do, not something that was merely
deferred.** Live results, `e-beta.sunat.gob.pe`, self-signed cert from `bash
scripts/gen-beta-cert.sh` (beta needs no real signing certificate; nothing here was blocked on
one):

| Rate | `emit-beta-test.ts` (boleta + factura) | `summary-beta-test.ts` (RC + RA) |
|---|---|---|
| 0.18 | `ResponseCode 0` (both) | — |
| 0.10 | fault `soap-env:Client.3462` — "la tasa del IGV ... debe corresponder con una tasa vigente" (both) | `ResponseCode 0` — but meaningless: `submitResumen`/`submitBaja` never re-validate the referenced document's rate, so the resumen/baja for an already-rejected boleta still comes back accepted |

Decision: 0.18 is the only rate SUNAT's own validator currently accepts, so the product **fails
closed** on it (settings-write refusal + emission-time refusal) instead of shipping a config knob
that silently produces rejected documents. This replaces the original "make 10% pass" ask outright
— it cannot pass, and further work toward it would be work toward a rejected document. Full
runtime evidence lives in `minion_hub` `specs/2026-08-17-hub-igv-rate-from-org-config-s3-actuals.md`.

**Follow-ups this pass deliberately left open** (each has a `TODO(handoff)` at its code site in
`minion_hub`):
- **Reduced-rate regimes.** Peru has had eligibility-gated, time-bounded reduced IGV rates (MYPE
  restaurant / hotel / tourist accommodation). `fin_settings` holds one scalar rate with no regime
  or eligibility column, so adding one is a new spec, not an allowlist append — it would otherwise
  be offered to every org. Code pointer: `src/lib/finance/igv-rates.ts`.
- **Exonerada / inafecta operations.** An org that legitimately operates exonerada or inafecta now
  gets `invalid_tax_rate` on every ticket — honest, but not a feature. SUNAT models those with
  different affectation codes (catalog 07, codes 20/30; tax schemes 9997/9998) and separate
  `LegalMonetaryTotal` buckets, needing per-line affectation type and a settings surface to declare
  the operation type. Code pointer: `TODO(handoff)` in `src/server/finance/tax.ts`.
- **Bulk correction of already-persisted non-vigente rates.** Nothing sweeps `fin_settings` for
  rows written before the gate existed. Such an org keeps rendering its stored rate (flagged in the
  settings form) and fails closed at emission until an admin re-saves it; no migration or report
  proactively identifies those orgs.
