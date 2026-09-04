---
id: 2026-08-17-hub-igv-rate-from-org-config
title: SUNAT emission hardcodes 18% IGV — read the org's configured tax rate
status: in-spec
spawned_spec: 2026-08-17-hub-igv-rate-from-org-config-spec
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

## Open items (S3 pass, 2026-08-20)

S3's code-level DoD is shipped: `summary.ts` already threaded the rate for free (it calls
`computeTotals(inv)` per boleta, and `inv.igvRate` was already required by S1), the rounding
invariant holds by construction and now has a table-driven test across {0.18, 0.10, 0.08, 0.05} ×
4 line sets (`ubl.test.ts`), and an anti-recurrence guard test greps the emission library for a
reintroduced rate literal.

**Deferred:** §6 step 3's live SUNAT beta re-verification (`bun scripts/emit-beta-test.ts --rate
0.10`, `bun scripts/summary-beta-test.ts --rate 0.10`, CDR ResponseCode pasted into the PR) was not
run — no `.beta-cert` (real signing certificate) is available in the implementing environment. A
green unit suite is not the same proof as a SUNAT-accepted document at a non-18% rate; whoever has
the beta cert should run both scripts at 0.18 and 0.10 and confirm `ResponseCode 0` before treating
the org-configurable rate as production-safe. `TODO(handoff)` left at
`scripts/summary-beta-test.ts`.
