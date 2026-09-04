---
id: 2026-08-20-hub-finance-provider-source-refs
title: Replace the temporary SUNAT-SUSII overlay with provider-neutral invoice source references
status: draft
created: 2026-08-20
updated: 2026-08-20
repos: [minion_hub]
tags: [finance, data-model, sunat]
value: 8
effort: M
source: sunat-sire-faces-live-rollout
---

# Replace the temporary SUNAT-SUSII overlay with provider-neutral invoice source references

## Problem

FACES has 3,996 SUSII invoices with operational line items. Its first SUNAT SIRE read found
924 official documents, 909 of which matched a SUSII `document_id`. The temporary bridge in
`src/server/services/finance.service.ts` keeps the SUSII invoice as the canonical row and writes
the SIRE identity under `metadata.sourceOverlays.sunat-sire`. This prevents duplicate invoice
rows and preserves line items, but it leaves source identity in untyped metadata and keeps the
canonical row labelled `provider = 'susii'` after SUSII is retired.

## Proposed model

Add `fin_invoice_source_refs` with these minimum fields:

- `org_id`
- `invoice_id`
- `provider`
- `provider_ref`
- `source_metadata`
- `first_seen_at`
- `last_seen_at`

Enforce unique `(org_id, provider, provider_ref)` and `(invoice_id, provider)`. Resolve an import
by source reference first. When the source reference is new, match the canonical invoice by the
issuer-scoped document identity: document type, series, and number. Keep line items and payments
on the canonical invoice; a document-only provider such as SIRE must never replace them with an
empty collection.

Backfill `metadata.sourceOverlays.sunat-sire` into the new table before removing the temporary
overlay code. Preserve each SUSII provider reference during retirement so historical refreshes
remain idempotent.

## Definition of done

- A SUSII invoice and matching SIRE document resolve to one `fin_invoices` row and two source
  references.
- Repeating either provider sync does not create another invoice or delete canonical items and
  payments.
- Ambiguous document identities fail the affected page with a durable job error.
- The FACES overlay metadata is backfilled and checked before the temporary code is removed.
- Tests cover SIRE-first, SUSII-first, repeated sync, unmatched documents, and provider retirement.

## Out of scope

- Deleting historical SUSII-only invoices.
- Changing SUNAT emission or certificate handling.
- Inferring invoice identity from customer name, amount, or approximate dates.
