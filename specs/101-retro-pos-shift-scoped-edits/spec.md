# Feature Specification: POS shift-scoped edits — tender correction, receipt issuing on close, accounting period locks

**Feature Branch**: `101-retro-pos-shift-scoped-edits`

**Created**: 2026-10-15

**Status**: Draft (retrospective reconstruction — written as it would have been written before hub #534/#535/#536)

**Input**: User description: "I need you to figure out a hardened way to change an invoice's payment method. The users might get it wrong the first time and go through the whole process without noticing." / "I like quick edits for open shifts. Lets give shifts more purpose: SUNAT submission on shift close (allows for more permissive edits on shift items while its still open). For post-closed shift items, the user has to nav to the individual invoices and make edits from their details page." / And when SUNAT is live, "block invoices that have already been locked/claimed by the accountant."

## Context: the shift is the unit of trust

1. **Open shift = working draft.** The cashier fixes their own mistakes in place.
2. **Shift close = commit.** Closing issues the shift's receipts to the tax authority and freezes them; later edits happen one sale at a time, by a manager, and never by rewriting what was counted.
3. **Accounting period lock = archive.** Once the accountant claims a month, nothing in it moves.

## Current behavior (AS-IS, with evidence anchors)

Verified on hub `origin/master` 2026-10-15 (anchors are approximate line numbers from the pre-work recon):

- **A payment row is write-once.** Payments are written once when the sale is submitted (`src/server/services/pos.service.ts` ≈ L1512) and never updated or deleted; there is no payment-editing endpoint under `src/routes/api/pos/tickets/`. The only existing mutation is a void (`voidTicket` ≈ L1654, with hub #516's refund counter-rows on the refunding shift). **Consequence:** fixing a wrong tender today costs a void, a refund, a re-sale and a second tax document.
- **A closed shift's money is a snapshot.** `computeExpected` / `paymentsByMethod` (≈ L388–422) sum non-void sales per method; `closeShift` (≈ L475–494) snapshots `expected` and `counted` into the shift row; `shiftSummary` (≈ L510) recomputes live. **Consequence:** any edit to a payment of a closed shift silently makes the snapshot and the live recompute disagree.
- **Receipts are issued per sale at submit time**, fire-and-forget (`pos-emission.service.ts` ≈ L224–318), status `pending → accepted | rejected | error` in the emissions table (`pg-pos-schema.ts` ≈ L226–258). Document type derives from the customer's tax id only (`pos-emission-mapping.ts` ≈ L24–34); the stored per-method `documentDefault` setting is never read. There is no credit-note / cancellation path for an accepted document.
- **There is no lock, claim or accounting-period concept anywhere.** The only "already accounted" signal is the invoice provider reference on a sale, which a void refuses when set (≈ L1659).
- **Surfaces.** Sale detail page `/pos/tickets/[id]` (reached from `/pos/history`); calendar drawer payment block (`BookingDetailDrawer.svelte` ≈ L455–500: status badge and sale id only — no method, no link); till recent-sales popover (`pos/sell/+page.svelte` ≈ L833–975: void only, manager permission).
- **No POS write records anything to the house audit rail** (`pg-activity-schema.ts` ≈ L38–56, `activity.service.ts`), and no POS write requires a reason.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cashier fixes a wrong tender on an open till (Priority: P1)

A cashier charges a sale to "cash" and the customer actually paid by card. The shift is still open. From the till's recent-sales list or the sale's page, the cashier changes how the sale was tendered, picks a one-tap reason ("Error de registro"), and the drawer's expected cash follows immediately. No manager, no void, no second receipt.

**Why this priority**: it is the owner's originating complaint and the only daily-frequency case; it also removes a class of duplicate tax documents.

**Independent Test**: on an open shift, change one sale's tender and confirm the drawer's expected-per-method figures move by that amount and the sale reads as the new method everywhere.

**Acceptance Scenarios**:

1. **Given** a live sale on an open shift, **When** a till-edit user changes its tender and gives a reason, **Then** the sale's amount is unchanged, the sale reads as the new method, the shift's expected-per-method figures reflect the new method, and the change is attributable to that user with that reason.
2. **Given** that same sale, **When** the user picks the method it already has, **Then** the system refuses and nothing is written.
3. **Given** a user without till-edit permission, **When** they open the sale, **Then** no correction action is offered and a direct attempt is refused as a permission problem, stated as such.

---

### User Story 2 - Manager corrects a sale whose shift already closed (Priority: P2)

The mistake surfaces the next morning. The shift is closed and its cash was counted. A manager opens that one sale from history, chooses "correct the payment method", types a reason, and the correction lands on today's open till as two offsetting entries. Yesterday's counted drawer is untouched.

**Why this priority**: the money must stay reconcilable; without it the open-shift freedom of US1 is unsafe to grant.

**Independent Test**: correct a sale belonging to a closed shift and verify (a) the closed shift's expected/counted figures are byte-identical to before, (b) today's shift shows a pair netting to zero, (c) the sale reads as the corrected method.

**Acceptance Scenarios**:

1. **Given** a sale on a closed shift and an open shift today, **When** a till-manager corrects the tender with a typed reason, **Then** two offsetting entries are recorded against today's shift (negative on the old method, positive on the new), the sale's payments still sum to the sale total, and the closed shift's figures do not change.
2. **Given** no open shift, **When** the same correction is attempted, **Then** it is refused and the message tells the user to open the till first.
3. **Given** a sale already corrected once, **When** it is corrected again, **Then** the new pair is computed from the sale's current effective method, and the sale's payments still sum to the sale total.
4. **Given** a till-edit (non-manager) user, **When** they open a closed-shift sale, **Then** no correction action is offered and a direct attempt is refused as a permission problem.

---

### User Story 3 - Closing the shift issues the shift's receipts (Priority: P2)

At close the cashier sees "N receipts will be issued". Closing the shift submits them. One fails; the close still succeeds and the shift's row in history shows 12 issued / 1 failed with a "retry" action. A customer who wants their receipt on the spot gets it from the sale's page during the shift ("issue now"), and that sale is then frozen like a closed one.

**Why this priority**: it is what makes the open shift a legitimate draft — nothing has been declared yet, so US1's in-place edit is honest.

**Independent Test**: close a shift holding several live sales and confirm exactly one submission record per eligible sale, failures visible and retryable, and the close itself unaffected by a failure.

**Acceptance Scenarios**:

1. **Given** an open shift with N live, not-yet-issued sales, **When** the shift is closed, **Then** the close succeeds and each of the N sales has exactly one submission record.
2. **Given** one submission fails, **When** the shift closes, **Then** the close still succeeds, the failure is recorded and shown as a failed count on the shift's row.
3. **Given** a shift with failed submissions, **When** a manager retries from history, **Then** only the failed and never-issued sales are sent, and nothing already accepted or pending is re-sent.
4. **Given** an open shift, **When** a user issues one sale immediately, **Then** that sale has a submission record and is thereafter treated as a closed-shift sale for editing purposes even though the shift is open.
5. **Given** receipt issuing is switched off, **When** a shift closes, **Then** nothing is submitted and the close behaves exactly as today.

---

### User Story 4 - The accountant locks a month (Priority: P3)

The accountant closes September. From then on every attempt to change, void or re-issue a September sale is refused with one sentence the cashier can read, and the lock is visible on the sale page and on September's shift rows. Unlocking restores the old behavior.

**Why this priority**: required before the tax integration goes live for real; until then nothing downstream depends on it.

**Independent Test**: lock a past month, attempt each POS mutation on a sale in it, confirm all four are refused with the same message, then unlock and confirm they succeed.

**Acceptance Scenarios**:

1. **Given** a locked month, **When** any POS mutation (tender correction, void, issue-now, close-time issuing) touches a sale dated in it, **Then** it is refused with the verbatim message "Periodo cerrado por contabilidad" and nothing is written.
2. **Given** a locked month, **When** the accountant unlocks it, **Then** the same mutations succeed again.
3. **Given** a user without the finance-manage permission, **When** they attempt to lock or unlock, **Then** it is refused as a permission problem, stated as such.
4. **Given** a sale timestamped late on the last day of a locked month in the business's own timezone, **When** any mutation touches it, **Then** it is refused — the month is decided in the business's accounting timezone, not UTC.

### Edge Cases

- Correcting a refund entry or a correction entry itself — refused; corrections apply to original payment rows only.
- A sale tendered with a method that is never declared to the tax authority (e.g. internal store credit) — skipped at close, not counted as a failure.
- A sale already rejected by the tax authority — never silently re-sent unchanged by a retry.
- A sale whose fiscal content (customer, items, totals) must change after it was issued — refused, with the reason stated ("requires a credit note"); the credit note itself is out of scope.
- A shift that straddles midnight into a locked month — the refusal follows each sale's own date, not the shift's opening date.
- Two corrections racing on the same payment row — the second reads the first's effect (no stacking), and the sale's payments still sum to its total.
- Receipt issuing switched off, or the tax gateway unreachable for the whole batch — the close still completes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: While the shift that recorded a sale is open, a user with till-edit permission MUST be able to change how that sale was tendered, with its amount unchanged.
- **FR-002**: Every tender change MUST record a reason. On an open shift a one-tap preset reason is acceptable; after the shift closed a typed reason is required.
- **FR-003**: After the shift closed, only a user with till-manage permission MUST be able to change the tender, and only from the sale's own detail page — not from the till popover or the calendar drawer.
- **FR-004**: A tender change on a closed shift MUST NOT alter that shift's recorded or counted figures. It MUST be recorded against the currently open shift as two offsetting entries that net to zero for that sale, each tagged as a correction of the original entry.
- **FR-005**: If no shift is open when a closed-shift correction is attempted, the system MUST refuse it and tell the user to open the till first.
- **FR-006**: A second correction of the same sale MUST be computed from the sale's current effective tender, so corrections never stack.
- **FR-007**: The system MUST refuse a correction that changes nothing, and MUST refuse to correct a refund entry or a correction entry.
- **FR-008**: Every successful POS mutation MUST leave exactly one entry on the house audit rail naming the actor, the reason and the before/after value of the changed field.
- **FR-009**: Closing a shift MUST submit every live, not-yet-issued sale of that shift to the tax authority in the configured environment, one submission record per sale.
- **FR-010**: A submission failure MUST NOT block, delay past the close, or roll back the shift close; it MUST be recorded as a failure and surfaced to the user.
- **FR-011**: Submission MUST be idempotent per sale: a sale with an accepted, pending or rejected submission is never submitted again by a close or a retry; a retry sends only failed and never-issued sales.
- **FR-012**: A user with till-edit permission MUST be able to issue one sale's receipt immediately during the open shift; from then on that sale is treated as a closed-shift sale for editing purposes.
- **FR-013**: The close dialog MUST state how many receipts will be issued, and each shift row in history MUST show its issued / failed / not-issued counts with a retry action for the failures, while issuing is enabled.
- **FR-014**: For a sale that has been issued, fiscal content (customer, document type, items, totals) MUST NOT be editable and the refusal MUST say a credit note is required; the tender MUST stay editable, because the issued document does not carry it.
- **FR-015**: A user with finance-manage permission MUST be able to lock and unlock a calendar month with an optional note, and MUST be able to see which months are locked, by whom and when.
- **FR-016**: Every POS mutation on a sale dated in a locked month MUST be refused before any effect, with the single verbatim message "Periodo cerrado por contabilidad".
- **FR-017**: All POS mutations MUST apply one shared refusal order: not found → already void → period locked → already reconciled/accounted → issued and the field is fiscal → shift closed (correction-pair path) → allowed.
- **FR-018**: The month of a sale MUST be decided in the business's own accounting timezone (configured; Lima default), not UTC, by every mutator and by the lock itself.
- **FR-019**: A sale's page MUST show when its period is locked and hide the actions the lock forbids; shift rows in history MUST show a lock marker for locked periods.
- **FR-020**: While the shift is open, a till-edit user MUST also be able to correct the sale's customer / document (only while the sale has no submission record) and its note, under the same reason and refusal rules.
- **FR-021**: The till's recent-sales list and the calendar's payment block MUST show how each sale was tendered and link to the sale's page.
- **FR-022**: Locking a month MUST record who locked it, when, and the note; unlocking MUST leave a trace of who unlocked it and when (a period is not a sale, so this trace does not have to live on the per-sale audit rail).
- **FR-023**: Every new user-facing string MUST exist in both shipped locales, using the owner's nouns (*turno*, *comprobante*, *corrección*, *periodo cerrado*).

### Invariants (must hold after every mutation)

- **INV-1**: A sale's payment entries sum to the sale's total.
- **INV-2**: A closed shift's expected / counted figures are never rewritten.
- **INV-3**: Every POS mutation leaves exactly one audit entry with actor, reason and field delta.
- **INV-4**: A sale in a locked period has no successful mutation recorded after the lock time.
- **INV-6**: Every lock and unlock of a period is attributable to a user and a time.
- **INV-5**: One sale has at most one non-failed submission record per document type.

### Key Entities

- **Sale (ticket)**: what was sold, its total, its date, the shift that recorded it, whether it is void, whether it has been reconciled/accounted.
- **Payment entry**: one tendered amount on a sale, with a method, and — after a correction — a trace of where it came from or which entry it corrects.
- **Shift**: an open/closed till session owning the sales recorded in it, and, once closed, a frozen expected/counted snapshot.
- **Submission record**: one attempt to issue a sale's receipt to the tax authority, with its status.
- **Period lock**: a calendar month claimed by the accountant, with who locked it, when, and an optional note.
- **Audit entry**: actor, reason, target, field delta, time — on the house audit rail shared with the rest of the app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A cashier corrects a mis-tendered sale on an open till in under 30 seconds, from the till screen, without a manager and without a second receipt — where today the only route is void + refund + re-sale + a second tax document.
- **SC-002**: 100% of tender corrections are attributable: actor, reason and before/after value retrievable for every one of them.
- **SC-003**: Zero closed shifts whose counted figures differ from what was counted at close, after any number of later corrections.
- **SC-004**: After a shift close, every live sale of that shift has exactly one submission record; retrying a shift with failures produces no duplicate submissions.
- **SC-005**: Zero successful mutations on sales dated inside a locked month, measured against the audit rail.
- **SC-006**: A shift close never fails or hangs because of the tax authority: closes succeed with the gateway unreachable, and the failures are visible on the shift row.

## Assumptions

- Receipt issuing runs against the shadow/beta tax environment until the production cutover; the same code path serves both, chosen by an existing setting. (From the originating request: "when SUNAT is live".)
- The accountant uses the existing finance-manage permission; no new role is introduced.
- Corrections change the method only. Amount and item edits remain a void plus re-sale.
- The business operates in a single currency and a single accounting timezone.
- Pre-cutover sales are not retroactively issued.
- The audit rail already used elsewhere in the app is the right place for POS audit entries; no POS-specific audit store is introduced.

## Clarifications

### Session 2026-10-15

(No live owner in the loop: every answer is derived from the originating request, the AS-IS recon,
or an existing house rule. Answers that neither the request nor a house rule decides are tagged.)

- Q: When a sale on an already-closed shift is corrected, which shift's money moves? → A: Only the currently open shift's. Two offsetting entries post there; the closed shift's counted figures are never rewritten. (Request: "never by rewriting the closed shift's numbers"; same rule as hub #516's refund rows belonging to the refunding shift.)
- Q: Can a sale whose receipt was already issued still have its tender corrected? → A: Yes — the issued document does not carry the tender. Customer, document type, items and totals are frozen and need a credit note.
- Q: Does a failed receipt submission block the shift close? → A: No. The close is the cashier's end-of-day act and must not depend on an external gateway; failures are recorded and retried from history.
- Q: Which calendar month does a sale fall in for the accountant's lock? → A: The month of the sale's own timestamp resolved in the business's configured accounting timezone (Lima fallback) — not UTC, not the shift's opening date. **(ASSUMPTION — owner to confirm)**: the request says only "locked/claimed by the accountant"; a Lima sale at 22:00 on the last day of a month would otherwise land in the next month.
- Q: Must locking and unlocking a month themselves be auditable, not just the mutations they refuse? → A: Yes — who locked, when, and the note are part of the lock, and an unlock must leave a trace too; a period is not a sale, so it needs its own trace rather than the per-sale audit rail. **(ASSUMPTION — owner to confirm)**: the request does not mention it, but a control the accountant can silently remove is not a control.

### Deferred (not asked — question quota reached; both are genuinely open)

- **FR-011a**: a submission the tax authority *rejected* (as opposed to a transport failure) — [NEEDS CLARIFICATION: after a rejection, what does the user do? Re-send after editing the sale, or is a rejection terminal until the credit-note slice exists?]
- **FR-021a**: edit surfaces — [NEEDS CLARIFICATION: should the till's recent-sales list carry its own inline tender picker, or only show the tender and link to the sale's page (one edit surface)?]

## Out of scope

- Amount or item edits (that is a void and a re-sale).
- Credit note / cancellation document for an already-accepted receipt — the tax-production cutover's work; until then the refusal copy stands in for it.
- Multi-currency tenders; retroactive issuing of pre-cutover sales; a dedicated accountant role.
