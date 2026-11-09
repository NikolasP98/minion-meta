# Phase 1 data model — POS shift-scoped edits

## New: period lock

`pos_period_locks`

| Field | Type | Notes |
|---|---|---|
| `org_id` | uuid | tenant scope; RLS like every other POS table |
| `period` | text | `YYYY-MM`, validated on write; a calendar month and nothing looser |
| `locked_by` | uuid | the user who locked it |
| `locked_at` | timestamptz | when |
| `note` | text, nullable | the accountant's note |

Primary key `(org_id, period)`. A locked month is a row's presence; unlocking deletes the row.

**Consequence (open):** deleting the row erases the unlock's trace. FR-022 asks for one, and
`doc_audit_log.ref_id` is a uuid while a period is not — so either a synthetic per-org ref or a
`pos_period_lock_events` table is needed. Ledger item, see `research.md` R8.

## Changed: payment entry metadata

No column changes. `pos_payments.metadata` carries the correction trace:

- on an in-place correction (open shift): `{ changedFrom, by, at, reason }`
- on each row of a correction pair (closed shift): `{ correctionOf: <original payment id>, by, at, reason }`

The pair is two rows on the *current open* shift: `−amount` on the old method, `+amount` on the
new one. Per sale they net to zero, so **INV-1** (payments sum to the sale total) holds.

**Effective method** of a payment entry = its own method, unless a correction pair references
it, in which case the newest positive correction row's method. One rule, used by the history
fold, the UI chips and the next correction (so pairs never stack).

## Read-only: submission records

`pos_emissions` is unchanged. One reading per sale is folded from its rows: any non-error row
wins over errors; among non-error rows the newest wins. Eligible for issuing = no row, or only
`error` rows (**INV-5**).

## Removed

The per-method `documentDefault` POS setting — stored, never read (`pos-emission-mapping.ts`
derives the document type from the customer's tax id). Removing it changes the payment-policy
revision hash once, so a sale previewed before the deploy and charged after it re-previews
once. User-visible, therefore PR body + ledger.

## Audit entry

`doc_audit_log` row per POS mutation: actor, `refType: 'pos_ticket'`, `refId` = sale id,
`op: 'update'`, `changes: [{ field: 'payment.method', old, new }]`, reason. Written in the same
transaction as the effect (**INV-3**).
