# Phase 0 research — POS shift-scoped edits

Each item: the question, the options weighed, the decision, and why the others lose.
Evidence anchors are from hub `origin/master` 2026-10-15.

## R1 — How does a closed shift's sale get corrected without lying about the drawer?

`closeShift` snapshots `expected` and `counted` into the shift row (`pos.service.ts` ≈ L475–494)
while `shiftSummary` (≈ L510) recomputes from payments. Editing a closed shift's payment makes
the two disagree.

| Option | Verdict |
|---|---|
| Edit the payment row in place and re-snapshot the closed shift | **Rejected** — the counted figure is physical evidence of cash that was in a drawer; it cannot be amended retroactively. |
| Edit in place and leave the snapshot alone | **Rejected** — the snapshot and the live recompute then disagree silently; the AS-IS bug, formalized. |
| Post a zero-net pair (−old method, +new method) on the current open shift | **Chosen** — the house already does exactly this for a void's refund rows (hub #516: the refund belongs to the *refunding* shift). The closed shift is untouched, today's drawer shows the movement, and the sale's payments still sum to its total. |

Consequence: with no shift open there is nowhere to post, so the mutation must be refused
with an instruction ("open the till"), not queued.

## R2 — Repeated corrections

Once a correction pair exists, a second correction must not be computed from the original row's
method or the pairs will stack and the sale's *effective* method becomes ambiguous. Decision: an
`effectiveMethod(sale)` rule — the original row's method until a correction pair moves it, then
the newest positive correction entry. Every reader (history folding, the UI chips, the next
correction) goes through that one rule. It is a pure function, so it is unit-testable without a
database.

## R3 — Where does receipt issuing run at close?

Today issuing fires per sale at submit, fire-and-forget (`pos-emission.service.ts` ≈ L224–318).

| Option | Verdict |
|---|---|
| Inside the close transaction | **Rejected** — an external gateway inside a money transaction means a slow or dead SUNAT holds or rolls back a cashier's close. |
| A background job / cron | **Rejected for now** — the hub's tick budget is already an incident-prone surface; a close is a human act that should report its own result. One queued batch per close is cheaper than a new scheduled handler. |
| After the close commits, in-request, failure-tolerant | **Chosen** — the close succeeds first, then every eligible sale is handed to the issuer; a failure degrades to a recorded failure and a retry affordance on the shift row. |

The beta gateway is rate-limited, so the batch serializes its calls (a promise chain) instead of
firing N at once. Known limit: a four-line chain with no timing test — ledger item.

## R4 — Idempotency of issuing

`pos_emissions` holds one row per attempt with `pending | accepted | rejected | error`. Rule: a
sale is eligible for a close or a retry only when it has no row, or only `error` rows. A
`rejected` document is a statement from the authority, not a transport failure, so it is never
re-sent unchanged. Folding many rows into one reading per sale is a pure function
(`foldEmissionStatus`): any non-error row wins over errors, newest non-error wins among them.

## R5 — Which month is a sale in?

Nothing in the AS-IS has a period concept. A naive `date_trunc('month', submitted_at)` runs in
UTC; the business is in Lima (UTC−5), so sales after 19:00 local on the last day of a month
would fall into the next month and a locked month would leak. Decision: resolve the month
through the org's configured accounting timezone (`fin_settings.timezone`, Lima fallback)
**inside the predicate**, so every mutator and the lock itself agree. Alternative (store the
period on the sale at submit) rejected: it would need a backfill and a second source of truth.

## R6 — One guard chain or per-mutator checks?

Four mutators (tender correction, void, issue-now, close/retry batch) must refuse for the same
reasons in the same order, and the order is itself a product decision (a void of a locked
period must say "period locked", not "already accounted"). Decision: one pure
`assertTicketMutable()` returning a typed refusal, with the order
`not found → already void → period locked → reconciled → issued ∧ fiscal field → shift closed`.
Tender is declared non-fiscal, so an issued sale still takes a method change (FR-014).
S1 ships the chain with the lock check stubbed (no table yet) and an in-code `TODO(handoff)`
pointing at S3; S3 replaces the stub.

## R7 — How many edit surfaces?

The spec asks for the tender to be visible in the till popover and the calendar drawer. An
editing control in three places means three code paths for one write. Decision: **one** edit
dialog, on the sale's page; the popover and the drawer show the tender and link to it. The
popover already uses that page as its modal target. Deferred question FR-021a records that the
owner may still want the inline picker.

## R8 — Audit rail

POS writes nothing to `doc_audit_log` today (`pg-activity-schema.ts` ≈ L38–56). Decision: reuse
the house rail with `refType: 'pos_ticket'` and a field delta, written in the same transaction
as the effect, so INV-3 cannot drift. Open problem: `doc_audit_log.ref_id` is a uuid and a
*period* is not a sale, so FR-022's unlock trace does not fit the rail — either a synthetic
per-org ref or a small lock-events table. Not resolved here; it is a ledger item and the
smaller half of FR-022.
