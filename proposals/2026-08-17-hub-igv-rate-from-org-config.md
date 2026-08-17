---
id: 2026-08-17-hub-igv-rate-from-org-config
title: SUNAT emission hardcodes 18% IGV — read the org's configured tax rate
status: draft
created: 2026-08-17
updated: 2026-08-17
repos: [minion_hub]
tags: [logic, hardcoded]
value: 8
effort: S
source: debt-sweep-2026-08-17
---

# SUNAT emission hardcodes 18% IGV — read the org's configured tax rate

## Problem

src/server/finance/emission/ubl.ts:5 const IGV_RATE = 0.18 while finSettings.taxRate (finance.service.ts:386) is already per-org configurable — emission ignores it. Any org with a different rate emits wrong SUNAT documents.

## Definition of done

computeTotals()/EmissionInvoice thread the org taxRate; unit test asserts a non-0.18 rate changes output; grep confirms no module-level rate constant remains.

## Out of scope

Tax-inclusive/exclusive pricing semantics changes.
