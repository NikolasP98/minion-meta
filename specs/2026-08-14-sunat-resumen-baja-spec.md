---
id: 2026-08-14-sunat-resumen-baja-spec
title: SUNAT resumen diario + comunicación de baja (beta library)
stage: done
status: shipped
pass: 1
created: 2026-08-14
updated: 2026-08-17
repos: [minion_hub]
type: feature
---

# SUNAT resumen diario + comunicación de baja — beta library slice

## 0. Product

Production boletas are legally reported to SUNAT through the **resumen diario**
(daily summary), and the only way to void an accepted document inside the 7-day
window is a **comunicación de baja** (facturas) or a resumen entry with
estado 3 (boletas). PR #97 shipped the individual `sendBill` path; this slice
completes the document lifecycle library against **beta**: build/sign/send the
two summary document types and poll their asynchronous tickets. Pure library +
live-verification script — no scheduling, no DB, no POS wiring (the cutover
slice composes those).

## 1. Deliverables (extend `src/server/finance/emission/`)

| File | Contract |
|---|---|
| `summary.ts` | `buildResumenXml(opts): string` — UBL `SummaryDocuments` (RC): id `RC-YYYYMMDD-N` (N supplied by caller), `ReferenceDate` (the boletas' emission date), `IssueDate`, one `SummaryDocumentsLine` per boleta: serie-número, estado (`1` add, `2` modify, `3` anular), client doc, per-boleta totals (gravada + IGV + total). Same emitter block and signing slot as `ubl.ts` — extract shared helpers rather than duplicating (`ubl-common.ts` if needed, keep it small). Also `buildBajaXml(opts): string` — `VoidedDocuments` (RA): id `RA-YYYYMMDD-N`, per-doc line: doc type, serie, número, `VoidReasonDescription`. RA covers facturas (01); boletas void via RC estado 3 — encode that rule in types, don't accept boletas in `buildBajaXml`. |
| `soap.ts` (extend) | `sendSummary(fileName, zipBytes, opts): Promise<{ ticket: string }>` and `getStatus(ticket, opts): Promise<{ statusCode: string, cdrZip?: Uint8Array }>` — same envelope/auth conventions as `sendBill`. `getStatus` statusCode: `0` done+CDR, `98` in-process, `99` error-with-CDR. |
| `index.ts` (extend) | `submitResumen(...)` / `submitBaja(...)` orchestrators: build → sign → zip → sendSummary → poll `getStatus` (max 10 polls, 3s apart — beta processes in seconds) → parse CDR via the existing `cdr.ts`. File naming law: `{RUC}-RC-{YYYYMMDD}-{N}` / `{RUC}-RA-{YYYYMMDD}-{N}`. |

Respect the known beta quirks (memory `sunat-direct-billing-recon`): ~3s
spacing between calls (nginx 401 otherwise), `SOAPAction: ''`, RSA-SHA1,
descriptive faultstrings — iterate on them.

## 2. Verification (definition of done)

Live beta script `scripts/summary-beta-test.ts` (manual, bun):
1. Emit two boletas `B998-1`, `B998-2` via the existing `emitToBeta`.
2. `submitResumen` RC with both (estado 1) → DoD: ticket resolves to CDR
   `ResponseCode 0`.
3. `submitResumen` RC with `B998-2` estado 3 (anulación) → accepted.
4. Emit factura `F998-1`, then `submitBaja` RA for it → accepted.
Paste all four CDR descriptions into the PR. Plus unit tests (mocked fetch):
RC/RA XML structure + naming, estado-3 typing rule (boleta in RA rejected at
compile/runtime), getStatus 98→0 polling loop, 99 error surfacing.
`bun run check` 0/0, full `bun run test` green.

## 3. Out of scope

Scheduling (nightly resumen job), DB records, POS wiring, prod endpoint,
retry policy beyond the poll loop, notas de crédito/débito.
