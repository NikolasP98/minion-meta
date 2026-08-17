---
id: 2026-08-14-sunat-emission-beta-spec
title: SUNAT emission module — beta slice (UBL 2.1 + sign + sendBill)
stage: done
status: shipped
pass: 1
created: 2026-08-14
updated: 2026-08-17
repos: [minion_hub]
type: feature
---

# SUNAT emission module — beta slice

## 0. Product

FACES is replacing SUSII with a direct SUNAT integration. The read side (SIRE
RVIE connector) shipped as minion_hub PR #95. This spec is the first slice of
the **write side**: given an invoice-shaped input, produce a signed UBL 2.1
XML, submit it to **SUNAT's beta environment** via SOAP `sendBill`, and parse
the CDR response. Beta only — nothing legally binding, no production switches.
When this slice is done we know our XML generation + signing + transport work
end-to-end against SUNAT's real validator, which de-risks everything after.

Context (verified live 2026-08-14, see memory `sunat-direct-billing-recon`):
- Beta endpoint `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService`,
  WS-Security UsernameToken `20611172967MODDATOS` / `MODDATOS`, no registered
  certificate required (self-signed OK in beta).
- FACES reality: boletas (tipo 03) serie BE01, IGV 18%, prices are tax-inclusive,
  clients identified by DNI. Facturas (01) needed for empresa clients.

## 1. Deliverables

New directory `src/server/finance/emission/` in minion_hub:

| File | Contract |
|---|---|
| `types.ts` | `EmissionInvoice`: `{ docType: '01'\|'03', serie, correlativo, issueDate (YYYY-MM-DD), currency ('PEN'), emitter: { ruc, razonSocial, ubigeo?, address? }, client: { docType: '1'\|'6', docNumber, name }, lines: [{ description, quantity, unitPriceInclTax }], }` — totals/IGV are DERIVED (18%, inclusive prices), never passed in. |
| `ubl.ts` | `buildInvoiceXml(inv: EmissionInvoice): string` — UBL 2.1 `Invoice` document valid for SUNAT: UBLExtensions placeholder for the signature, ID `SERIE-CORRELATIVO`, InvoiceTypeCode with listID `0101`, AccountingSupplierParty (RUC, tipo 6), AccountingCustomerParty, per-line `InvoiceLine` (PriceAmount = value WITHOUT IGV, `TaxTotal` per line, PricingReference 01 = price WITH IGV), document `TaxTotal` (IGV, scheme 1000/VAT/IGV), `LegalMonetaryTotal`, legend 1000 (amount in words, simple es-PE number-to-words helper is in scope — cap at millions). Round half-up to 2 decimals; totals must be consistent (sum of lines == totals) or SUNAT rejects. |
| `sign.ts` | `signXml(xml: string, key: pem, cert: pem): string` — enveloped XML-DSig placed inside `ext:UBLExtensions/ext:UBLExtension/ext:ExtensionContent`, Id="SignatureSP". Use the `xml-crypto` npm package for canonicalization + signing (do NOT hand-roll C14N). Start with RSA-SHA1 digest/signature (SUNAT's documented default); if beta rejects, try SHA256 and record which won in the PR description. |
| `soap.ts` | `sendBill(fileName, zipBytes, opts): Promise<{ cdrZip: Uint8Array }>` — hand-built SOAP 1.1 envelope (no soap library; we validated the envelope shape with curl already), WS-Security UsernameToken, base64 zip in `contenido`. Throws with SUNAT's `faultcode`/`faultstring` on SOAP faults. 30s timeout, no retries in this slice. |
| `zip.ts` | zip/unzip helpers. Check installed deps first (`fflate`, `jszip`, `adm-zip`); if none present, add `fflate` (smallest). File naming law: `{RUC}-{docType}-{SERIE}-{CORRELATIVO}.xml` inside `{same}.zip`. |
| `cdr.ts` | `parseCdr(cdrZip): { responseCode: string, description: string, notes: string[] }` — unzip `R-*.xml`, read `cbc:ResponseCode` + `cbc:Description`. `responseCode === '0'` = accepted. |
| `index.ts` | `emitToBeta(inv: EmissionInvoice, certPem, keyPem): Promise<CdrResult>` — orchestrates build→sign→zip→send→parse. Beta creds hardcoded as documented constants (they are public: `MODDATOS`). |

Test cert: `scripts/gen-beta-cert.sh` (openssl one-liner, self-signed, output
gitignored — NEVER commit key material; add the output path to .gitignore).

## 2. Verification (definition of done)

1. Unit tests (vitest, mocked fetch): XML totals consistency (3 lines with odd
   céntimos), file naming, CDR parse of a fixture, SOAP fault surfacing.
2. **Live beta run** (script `scripts/emit-beta-test.ts`, run manually with bun):
   emits one boleta `B999-1` (2 lines, DNI client) and one factura `F999-1`
   (RUC client) to the beta endpoint and prints the CDR. DoD = both return
   `ResponseCode 0` ("aceptada") — paste both CDR descriptions into the PR.
3. If beta rejects boleta via `sendBill` (boletas officially travel by resumen
   diario), record the exact error code in the PR and land the factura path —
   the resumen is the next slice either way; do not build it now.
4. `bun run check` 0/0 and full `bun run test` green.

## 3. Out of scope (explicitly)

Production endpoint & real certificate, serie/correlativo allocation (DB),
resumen diario / comunicación de baja, POS wiring, any DB writes, retry/queue
infrastructure, credential UI. No new API routes — pure server library + one
manual script.
