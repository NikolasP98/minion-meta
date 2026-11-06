---
id: 2026-09-28-hub-stock-receipt-purchase-link
title: Stock receipts have no purchase-record link — Document column is blind for receipts
status: draft
created: 2026-09-28
repos: [minion_hub]
tags: [ui, ux]
spec: specs/2026-09-28-hub-table-open-modes-bulk-bar-stock-detail-spec.md
---

# Stock receipts have no purchase-record link

Filed while implementing Bundle B of the table-open-modes spec (`/stock/entries`
provenance columns). The owner's ask (spec AS-IS §3) was "the customer invoice
for issues, the provider invoice for receipts, clickable" — issues already have
this (see below); receipts do not, and cannot, today.

## AS-IS

- `stk_entries.metadata` on an `issue` entry always carries a `source` key that
  identifies where the issue came from: `'pos'` (`sourceId`/`ticketId` →
  `pos_tickets.id`, written by `createSourcedIssue` in
  `src/server/services/stock.service.ts`), `'invoice'` (`invoiceId` +
  `providerRef`, written by `createIssueFromInvoice`), or `'service'`/`'booking'`
  (`finProductId`, optional `sourceId`, written by `createServiceIssue` /
  `realizeAccruals` in `src/server/services/stock-accruals.service.ts`).
- A `receipt` entry's `metadata` is never populated with any of these keys —
  `createEntry`/`updateEntry` (plain draft CRUD, `stock.service.ts` ~L594-656)
  accept a free-form `metadata` bag but nothing in the app ever writes a
  purchase/supplier-invoice reference into it. The AS-IS note in the parent spec
  says this explicitly: "Receipts carry NO link to a purchase record (supplier
  invoices are attachments on the entry; `fin_purchases` is a separate SUNAT
  sync)."
- The new `entryDocument()` pure helper
  (`src/lib/components/stock/entry-document.ts`) therefore always returns `null`
  for a receipt — there is no metadata shape to recognize. The `/stock/entries`
  Document column renders "—" with a tooltip explaining the supplier invoice
  lives in the entry's attachments (`stock_document_receipt_hint`), which is
  true today but is a workaround, not the clickable link the owner asked for.
  Marked `TODO(handoff)` at the top of `entry-document.ts` and in the Document
  cell in `src/routes/(app)/stock/entries/+page.svelte`.

## TO-BE

- A receipt created from (or later linked to) a purchase record carries
  `metadata.purchaseId` (a `fin_purchases.id` or equivalent — no such table
  exists yet either; see Out-of-scope) the same way an invoice issue carries
  `metadata.invoiceId`.
- `/stock/entries/new?type=receipt` gets a purchase picker (a `Picker` bound to
  the org's purchase/supplier-invoice roster) that, when a purchase is chosen,
  seeds `metadata.purchaseId` (and any lines the purchase already specifies).
- A `/finances/purchases/[id]` route exists to be the link target (peek-able,
  registered in `src/lib/records/peek-registry.ts` — core, not this proposal).
- `entryDocument()` gains a `source === 'purchase'` branch: `{kind: 'purchase',
  id: metadata.purchaseId, href: '/finances/purchases/{id}', labelFallback}`,
  and the Document column's kind-chip label list gains `stock_document_purchase`.
- Invariant: existing receipts with no `purchaseId` keep rendering the
  attachments-tooltip fallback — this is additive, not a backfill requirement.

## DELTA

1. Data model: decide where "purchase" lives. Two options, needs a call before
   a spec is written:
   - (a) A new `fin_purchases` table (mirrors `fin_invoices` but for money
     going out), with its own detail route.
   - (b) Reuse an existing supplier-facing record if one already models this
     (needs a repo check — `party.service.ts` / `finance.service.ts` scope).
2. `POST`/`PATCH` on `/api/stock/entries` (or a new `/api/stock/entries/from-purchase`
   mirroring `from-invoice`) accepts `purchaseId` and stamps
   `metadata.purchaseId` the way `createIssueFromInvoice` stamps `invoiceId`.
3. Purchase picker UI on `/stock/entries/new?type=receipt`.
4. `entryDocument()` + Document column + i18n key, as above.
5. Tests: `entryDocument` gains a `source: 'purchase'` case; a dup-guard test
   mirroring `createIssueFromInvoice`'s if the insert path reuses that pattern.

## Out of scope here

- Backfilling `purchaseId` onto historical receipts (attachments remain the
  record of truth for anything already posted).
- SUNAT-side purchase-document ingestion — this is only about linking an
  *existing* purchase record to the stock receipt it produced, not sourcing
  purchase documents themselves.
