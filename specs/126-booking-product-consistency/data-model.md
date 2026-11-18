# Data model: Consistent booking product projections

## Terms

This package uses one name per concept:

- **Sold line**: one POS ticket line of kind `product` on a linked sale whose status is neither `void` nor `voided`. Other documents may say "sale" for the POS ticket; "invoice" means only a finance invoice, never a POS ticket.
- **Planned product**: a `sched_booking_products` row on the visit anchor.
- **Ticket overlay**: the POS calendar's whole-ticket timeline rows (historically the `invoices` variable), which are POS tickets, not finance invoices.

## Projections

The planned projection is the existing `VisitProductLine` (`visit.ts`: `productId`, name, qty, with `unitPrice` and `paid` only under independent financial admission); its basic, money-free wire form is `PlannedProductBasic`. No third planned type exists (corrected during implementation; the earlier text named a symbol that is not in the source). A sold line is separate: `ticketId`, `lineId`, nullable `productId` and `bookingId`, recorded description and quantity, `relation` and the server-computed `gift` flag (spec decision 3). Its money (`soldTotals`) is carried only in the payment facet.

Relation is `direct` (the current anchor), `group` (another authorized current-visit member) or `co_ticket_unassigned` (null `bookingId`). Non-null outside, deleted or unauthorized other visits are excluded from both sold rows and `ticketCard.otherLines` without reading that booking. Missing stable IDs make the facet unavailable; an unassigned garment is never distributed across every visit sharing the ticket.

Every planned, sold, payment and stock read facet is `available`, `empty`, `denied` or `unavailable`, independently of persisted accrual `open`, `realized` and `released` states. A missing or denied accrual never proves no consumption. Matching product IDs never prove fulfillment; the source entry and `realizedEntryId` are the stock evidence. No new persisted business table is introduced.

## Validation and lifecycle

Existing validation, enum and permission rules remain binding. No source record is manufactured from display text. Read-only projection tests and no-op or stop outcomes run before any write. Forbidden states are in contracts/behavior.md and real-database proof is in quickstart.md. A proposed shape is not a claim of existing persisted schema.

## Recovery projection and attempt state

`stockRecovery` is an independently authorized read facet, not a new persisted business state. For at most 8 server-owned `{bookingId, status}` authorized visit members, passed in by the scheduling caller (spec decision 5), it contains current accrual counts, at most one active source-entry identity and status, and an eligibility of `retry_saved`, `confirm_open`, `not_needed` or `manual_review`. The decision table and denial semantics are in [contracts/behavior.md](contracts/behavior.md).

A dialog attempt snapshots eligible member IDs in stable order and holds per-member `pending`, `warning`, `resolved`, `error` or `unknown` display results. These are transient UI states only. Persisted source, ledger and accrual facts determine the next attempt after refresh. Saved-source retries send an empty body and preserve the current saved movement; absent-source open-accrual confirmation sends explicit actual lines, or deliberately confirmed empty lines. No response warning or unknown outcome is called posted without an authoritative reread.

`confirm_open` carries the bounded confirmation projection and the server's `expectedOpenCount` and fingerprint from [contracts/admission-recovery.md](contracts/admission-recovery.md). The request body adds the optional `recovery` object only for this branch, never for `retry_saved`. The server compares the full current set under the F3 write gate (see the plan glossary) before any release or post. Every foreign detail and hover money, sale or stock field follows the required handle and policy matrix in that contract.

`BookingStockCostFacet` is the closed non-value union in [wire.md](contracts/wire.md); it is independent of available billing money and quantity facts.
