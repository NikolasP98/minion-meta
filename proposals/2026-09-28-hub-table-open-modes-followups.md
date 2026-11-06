---
id: 2026-09-28-hub-table-open-modes-followups
title: Table open modes + bulk bar + stock detail — open ends
status: draft
created: 2026-09-28
repos: [minion_hub]
tags: [ui, ux]
spec: specs/2026-09-28-hub-table-open-modes-bulk-bar-stock-detail-spec.md
---

# Open ends from the open-modes / bulk-bar / stock-detail slice

**Slice 2 status (2026-09-29):** §1 (purchase link + `/finances/purchases/[id]`), §2 (attachment count column), §3 (`listItems` default inverted), §4 (peek labelled by the page heading), §6 (custom-property bulk edit + bulk Tags), §7 (per-user `tableOpenIn`), §8 (OverviewCard on contact/ticket/invoice), §9 (catalog seed) are addressed by hub branch `feat/table-open-gaps`. Remaining: §5 and the new §10–§11 below.

Ledger for hub branch `feat/table-open-modes-bulk-bar` (core + bundles A/B/C).

## 1. Receipts have no purchase-record link
Covered by its own proposal `2026-09-28-hub-stock-receipt-purchase-link.md`
(`metadata.purchaseId` + purchase picker on `/stock/entries/new?type=receipt` +
`/finances/purchases/[id]` route). Until then the Document column shows "—"
with a tooltip pointing at the entry's attachments (`TODO(handoff)` in
`src/routes/(app)/stock/entries/+page.svelte`).

## 2. Receipt attachment count
No batched "count attachments by object ids" helper exists; the entries list
does not show how many supplier documents a receipt carries. Add
`countAttachmentsByObjects(ctx, objectType, ids)` to the attachments service and
an `attachments` column.

## 3. Archived items in historical label resolution
`listItems` now excludes archived items by default. Every caller that resolves
labels for HISTORICAL rows was switched to `includeArchived: true` (item detail,
invoice detail, entry detail, entries list). Callers left at the default are
pickers/dashboards (pos/catalog, stock overview, entries/new, brains,
pos-catalog-form, `GET /api/stock/items`). Any NEW consumer that renders old
rows must pass the flag — consider inverting the default to `includeArchived:
true` and making pickers opt OUT, which is the safer failure mode.

## 4. Peek dialog title
`RecordPeek` labels its dialog with a generic "Record preview" caption; the
embedded page's own `PageHeader` carries the real title. Wire `labelledBy` to
the page heading id (each record page would expose a stable `titleId`) so the
accessible name is the record, not the container.

## 5. View-transition morph from peek to page
The peek body carries `view-transition-name: record-peek` and the record-detail
`PageShell` archetype gets the same name via CSS. Only ONE element may carry a
name during a transition; if a page ever renders two record-detail shells
(nested peeks) the browser skips the transition. Nested peeks are not supported
today — opening a link inside a peek replaces the peek entry.

## 6. Bulk "Edit property" scope
Bulk edit covers columns with a primitive `type` (`text|number|boolean|date|select`)
that the row-save controller already persists. Custom properties (`custom: true`
columns) and relation-shaped fields (tags, supplier) are not bulk-editable yet;
tags should get a "Add/remove tag" bulk action on the floating bar.

## 7. Quick "Open in" switch permission
The column-menu segmented switch PUTs the org's `app_table_config`, gated on the
same capability as `/settings/tables`. A per-USER override (a viewer who prefers
trays) is not modelled; if requested, add `openIn` to the `recordOverview`-style
preferences section and resolve user > org > page.

## 8. Overview visibility for other record pages
`recordOverview` preferences are keyed by table id and implemented only on
`/stock/items/[id]`. The CRM contact, POS ticket and invoice pages keep their
fixed fact lists; port the `overview-prefs.ts` helper + Configure popover when
those pages are next touched.

## 9. QA seed: `/pos/catalog` 500 on master (`loadFormulaCatalog`)
On the seeded QA stack `/pos/catalog` throws `Cannot read properties of undefined (reading 'some')` at `formula-properties.service.ts:180` (`dependencyIds(formula)` undefined for a seeded formula definition). Not touched by this branch — reproduced on the untouched master server; the T3 e2e `table-interactions.spec.ts` catalog cases fail for the same reason. Fix the seed (or guard `dependencyIds` for legacy rule shapes) so the catalog e2e runs.

## 10. Purchase detail has no attachments card
`fin_purchase` is not an `AttachmentObjectType`, so `/finances/purchases/[id]`
cannot list supplier PDFs the way stock entries do. Add the object type to
`attachment-access.ts` (+ module mapping `finances`) and render the shared
attachments card on the purchase page; then the receipt form can show the
linked purchase's documents.

## 11. CRM bulk tags fan out per contact
Contacts store tags in `crm_contact_tags`, not the polymorphic `tag_links`,
so the bulk-bar "Tags" action on `/crm/customers` issues one request per
(row × tag) through the existing per-contact endpoint. Fine at bulk-bar
selection sizes; add a `POST /api/crm/contacts/tags/bulk` if selections grow.


## 12. OverviewCard adoption edges (slice 2, Bundle F)
- CRM contact: tags stay in their dedicated grid cell (auto-tag / funnel integration), not folded into the Overview — fold once the auto-tag ribbon has a home in the card.
- CRM "additional" custom fields render as plain text inside the Overview (the previous mailto link is gone) — give `OverviewCard` facts an optional `href`.
- Invoice page: the Overview `.card` reads as a seam in an otherwise continuous document — either restyle the invoice page onto the card recipe everywhere or give `OverviewCard` a `variant="flush"`.
- `listItems` default is now `includeArchived: true`; every list-style consumer that should hide archived items must opt out (dashboards `/stock`, pickers) — audited in slice 2, but a NEW consumer defaults to "show archived".
