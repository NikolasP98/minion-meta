---
id: 2026-10-03-readiness-finance-summary-spec
title: Finance summary cache and population correctness
stage: dev
status: implementing
pass: 2
created: 2026-10-03
updated: 2026-10-03
repos: [minion_hub]
tags: [data, logic, test]
type: fix
proposal: 2026-10-02-hub-gateway-production-readiness-recon
verdict: approved
---

# Finance summary cache and population correctness

## 0. Product

Repair HS-006, HS-026 and HS-027 so toggling stock visibility changes costs immediately, losses remain negative, and void rates represent all issued documents. User selected all 97 findings; this slice is part of that approved data scope.

## 1. AS-IS

Hub master 7ac3bfd: `src/server/services/finance.service.ts` computes stockEnabled outside the summary/series cache but omits it from both keys. The summary clamps net minus tax minus COGS to zero; voids divide by nonvoid invoices. Client counts include void-only clients, and series gross/invoice counts include voids while revenue excludes them. New clients use the first invoice even if void. `clientRevenueRows`, `topProducts`, `topClients` and `crm-finance.service.ts:rankCustomers` also admit void invoices (including its nested top-product query). Shared `contactInvoiceClassSql` also feeds void invoices into CRM purchase/funnel classification; `contactFinanceSummary` has a separate detail aggregate. The chart independently clamps net bands to zero.

## 2. TO-BE

- Summary and revenue-series cache keys include the effective stock-enabled boolean. Both false→true and true→false cache reads recompute under otherwise identical tenant/period inputs.
- Net revenue = billed nonvoid revenue minus tax minus realized COGS, including negative results. Margin remains signed when billed revenue is positive; zero or negative billed revenue has a defined zero rate (absolute loss remains visible).
- `invoiceCount`, `avgTicket`, `uniqueClients`, `newClients`, series invoice counts and gross totals share the nonvoid population. `voidCount` remains separate. `voidRate` = voidCount/(invoiceCount+voidCount), zero on no documents.
- Economic customer/product rankings and clientRevenueRows exclude void invoices, including nested top-product selection. Void-only customers/products cannot rank as sales. Shared CRM invoice classification and contact-detail economic aggregates exclude voids so every purchase/funnel consumer uses the same population. Contact-detail recentInvoices retains void history. Chart net bands use the shared signed deduction helper, including cumulative mode and legend toggles.
- Existing monetary values and tenant/time boundaries stay unchanged. Mixed-currency correction is a separate HS-025 slice; this slice does not claim currency-safe aggregation.

## 3. DELTA

### Slice 1: Summary semantics and cache identity

**Topics:** `data`, `logic`, `test`

1. Add stockEnabled to the two cache identities, retaining tenant/domain invalidation.
2. Extract a small typed summary-math model for signed amounts and explicitly named populations; update SQL populations at their source.
3. Add behavioral tests covering loss, zero activity, all void, mixed void/live, void-only clients and first-void/later-live new clients. Real SQL fixtures prove void-only customers/products are excluded from all three finance ranking functions and CRM rankCustomers, including its nested top-product, and the shared contactInvoiceClassSql purchase/funnel input. Cache tests change the module gate in each direction and require cost queries/results to change.

## 4. Out-of-scope

Currency conversion/mixed-currency aggregates (HS-025), monetary rounding (HS-028), inventory valuation (MR-OP-003), production data/backfill, deploy and unrelated finance synchronization.

## 5. Verification

Run focused finance unit tests with actual cache backend plus native PostgreSQL fixture tests where query populations matter. Assert deterministic expected values from seeded inputs, not query-string equivalence. Run Hub check and independent diff review after integration. Root owns finance.service.ts, crm-finance.service.ts, a focused summary-math helper and new behavioral fixtures. Root implements; a Sol peer reviews the spec and final behavior.
