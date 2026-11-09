---
description: "Task list for POS shift-scoped edits"
---

# Tasks: POS shift-scoped edits — tender correction, receipt issuing on close, accounting period locks

**Input**: Design documents from `/specs/101-retro-pos-shift-scoped-edits/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED here, not optional — the workspace constitution (Principle II) makes every
DELTA transition name the test that proves it, and this is money and a refusal control.

**Organization**: by user story. Delivery is three PRs: **S1 = US1 + US2** (they share one
service entry point and one guard chain, so splitting them would ship a half-guard),
**S2 = US3**, **S3 = US4**. All paths are inside `minion_hub/` and relative to its root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency)
- Package manager is **bun** in this repo; never npm/pnpm here.

---

## Phase 1: Setup

- [ ] T001 Worktree off `master` for S1 (`AGENTS.md` Project Map: hub PR base = `master`), then `bun install`, `bunx svelte-kit sync`, `bun run i18n:compile` — a fresh worktree needs the last two before anything type-checks.
- [ ] T002 [P] Confirm the gates run locally and green on an untouched tree: `bun run check`, `bun run lint:design:ci`, `bun run lint:tokens` (record the design-debt baseline number — it may only decrease).

---

## Phase 2: Foundational (blocks US1/US2)

**Purpose**: the decision layer every mutator will share. Pure functions, no database, so the
guard order is testable before any effect exists.

- [ ] T003 [US1][US2] Create `src/server/services/pos/tender-correction.ts` with the typed refusal enum and `assertTicketMutable()` implementing the contract's order: not found → already void → period locked → reconciled → issued ∧ fiscal → shift closed. Tender is declared non-fiscal. The period-lock branch is a stub with `TODO(handoff): period locks arrive in S3 (<spec>#FR-016); until then this branch never fires — pointer: src/server/services/pos/period-locks.ts`.
- [ ] T004 [US1][US2] In the same file, `planTenderChange()` returning either an in-place update (open shift) or a correction pair for the current open shift, plus `effectiveMethod()` (research.md R2) so repeated corrections never stack.
- [ ] T005 [US1][US2] Make the house audit write usable inside an existing transaction (`src/server/services/activity.service.ts`), so the effect and its audit row commit together (INV-3).
- [ ] T006 [P] Add the refusal codes to `src/routes/api/pos/_errors.ts`: `period_locked` (423), `emitted`, `same_method`, `not_correctable`, `invalid_method`, `manage_required`, `no_open_shift`.

**Checkpoint**: the guard chain and the correction plan are unit-testable with no database.

---

## Phase 3: User Story 1 — cashier corrects an open-shift sale (P1) 🎯 MVP

**Goal**: a mis-tendered sale is fixed from the till in seconds, attributable, with the drawer following.

**Independent Test**: on an open shift, change one sale's tender; the amount is unchanged, the drawer's expected-per-method moves, one audit row exists.

### Tests first

- [ ] T007 [P] [US1] `src/server/services/pos/tender-correction.test.ts`: the guard chain routes a live open-shift sale to the in-place branch; refuses in the documented ORDER (assert the order, not just that each refuses); the lock message is verbatim.
- [ ] T008 [P] [US1] Same file: `planTenderChange` on an open shift corrects the row and records where it came from; a no-op method is refused; a refund or correction row is refused.
- [ ] T009 [P] [US1] Same file: `effectiveMethod` is the row's own method until a pair moves it.

### Implementation

- [ ] T010 [US1] `changePaymentMethod(ctx, ticketId, paymentId, { method, reason })` in `src/server/services/pos.service.ts`, beside `voidTicket`: load, guard (T003), plan (T004), apply in one transaction with the audit row, append `{ changedFrom, by, at, reason }` to the payment's metadata.
- [ ] T011 [US1] Register `changePaymentMethod` in the frozen export inventory `src/server/services/pos-service-boundaries.test.ts` **in this same commit** — adding an export without registering it reddens CI with two cases and nothing else.
- [ ] T012 [US1] `PATCH /api/pos/tickets/[id]/payments/[paymentId]/+server.ts`: zod `{ method, reason }`, `pos:edit` while open, 403 that says the role cannot do this, refusal codes from T006.
- [ ] T013 [US1] Update the route-contract manifest **and all 6 counts** — 2 of them live outside `src/lib/routes/`, so a green `vitest src/lib/routes` is not proof.
- [ ] T014 [US1] Ticket page `src/routes/(app)/pos/tickets/[id]/+page.svelte` + `+page.server.ts`: method labels per payment row, a "Cambiar" action, the correction dialog with the preset reason while the shift is open, a "Método corregido" chip. Semantic design tokens only.
- [ ] T015 [P] [US1] Till `src/routes/(app)/pos/sell/+page.svelte`: the recent-sales list shows how each sale was tendered and the chip opens the sale's page (no second edit surface — research.md R7).
- [ ] T016 [P] [US1] `src/routes/(app)/pos/history/payments-fold.ts` + `.test.ts`: fold a sale's rows per method so a corrected sale reads as its corrected method in history.
- [ ] T017 [P] [US1] Append the new keys to `messages/en.json` and `messages/es.json` (append-only — parallel PRs that insert mid-file conflict at every merge) with the owner's nouns, then `bun run i18n:compile`.

**Checkpoint**: US1 shippable on its own.

---

## Phase 4: User Story 2 — manager corrects a closed-shift sale (P2)

**Goal**: the correction is possible without ever rewriting a counted drawer.

**Independent Test**: correct a closed-shift sale; the pair lands on today's shift, the closed shift's figures are unchanged, the sale's payments still sum to its total.

### Tests first

- [ ] T018 [P] [US2] `tender-correction.test.ts`: a closed shift yields a zero-net pair tagged with the original row (INV-1 and INV-2 asserted as invariants, not as statement counts).
- [ ] T019 [P] [US2] Same file: with no open shift the plan refuses with the "open the till" instruction; a second correction is computed from the effective method (no stacking).

### Implementation

- [ ] T020 [US2] Extend `changePaymentMethod` with the closed-shift branch: write the pair on the **current open** shift (same rule as hub #516's refund rows), require `pos:manage` and a typed reason.
- [ ] T021 [US2] Ticket page: after close the dialog requires typed text, shows a "Corrección" chip, and the till popover / calendar drawer offer no edit.
- [ ] T022 [US2] Run the S1 gate set foreground and open the S1 PR (US1 + US2) against `master`; the PR body names the spec, the slice, the invariants and what is deliberately not in it.

**Checkpoint**: S1 complete.

---

## Phase 5: User Story 3 — issuing the shift's receipts at close (P2)

**Goal**: the close is the declaration; nothing external can block it.

**Independent Test**: close a shift with several live sales → exactly one submission record each, failures visible and retryable, close unaffected.

### Tests first

- [ ] T023 [P] [US3] `src/server/services/pos-emission.service.test.ts`: `foldEmissionStatus` — any non-error row beats errors, newest non-error wins, a sale with no row is absent (so a close or retry picks it up) (INV-5).
- [ ] T024 [P] [US3] `src/server/services/pos.service.emission.test.ts`: a close hands every live, not-yet-issued sale to the issuer and skips non-declared tenders; a retry re-sends only failures and never duplicates; with issuing off nothing is read and nothing is sent.
- [ ] T025 [P] [US3] A failing issuer does not fail the close (assert the close's own result, not just the absence of a throw).

### Implementation

- [ ] T026 [US3] Remove the per-sale issuing from `submitTicket` — this is what makes US1's in-place edit honest.
- [ ] T027 [US3] `emitShiftTickets()` in `pos.service.ts`, run after the close transaction commits: select eligible sales, hand them to the issuer one at a time, record one submission row per sale, tolerate failures. The emission service must **not** import POS settings (service-boundary rule) — assemble settings here and pass them down.
- [ ] T028 [US3] Serialize the beta gateway calls in `src/server/services/pos-emission.service.ts` (a promise chain, not a burst). Leave `TODO(handoff): no timing test for the serialized beta gate — a fake-timers test asserting ≥3 s spacing would close it` at the site.
- [ ] T029 [P] [US3] `POST /api/pos/tickets/[id]/emit/+server.ts` ("Emitir ahora", `pos:edit`) with its refusals from the contract.
- [ ] T030 [P] [US3] `POST /api/pos/shifts/[id]/emit/+server.ts` ("Reintentar", `pos:manage`), selecting exactly what the close selects.
- [ ] T031 [US3] Close dialog (`src/lib/components/pos/ShiftBanner.svelte`) states "Se emitirán N comprobantes a SUNAT" from the shift summary's unissued count.
- [ ] T032 [US3] `/pos/history` shift rows get issued / failed / not-issued counts and the retry action, only while issuing is on.
- [ ] T033 [US3] Delete the never-read per-method document default (`src/server/services/pos/settings.ts`, its type, the API schema, the settings column, the payment-policy revision hash input) and **state in the PR body** that the revision hash changes once, so a sale previewed before the deploy re-previews after it.
- [ ] T034 [US3] Register the new exports in `pos-service-boundaries.test.ts` in the same commit; update the route manifest + 6 counts; append i18n keys in both locales.
- [ ] T035 [US3] Gates foreground; open the S2 PR stacked on S1. **Retarget it to `master` before S1's branch is deleted** — deleting a base branch closes the dependent PR, unrecoverably.

**Checkpoint**: S2 complete.

---

## Phase 6: User Story 4 — the accountant locks a month (P3)

**Goal**: a month the accountant claimed cannot move, and the refusal says so in one sentence.

**Independent Test**: lock a past month, attempt all four mutators on a sale in it, all refuse with 423 and the verbatim copy; unlock restores.

### Tests first

- [ ] T036 [P] [US4] `src/server/services/pos/period-locks.test.ts`: `normalizePeriod` accepts a calendar month and nothing looser.
- [ ] T037 [P] [US4] Same file: the month is resolved through the org's accounting timezone with a Lima fallback, asserted for one instant that falls on opposite sides of the boundary in UTC vs Lima (FR-018) — and for the set-based variant the close batch uses.
- [ ] T038 [P] [US4] `src/server/services/pos.tickets.test.ts`: a void in a locked month throws `period_locked` **before any effect**; one case per mutator (tender correction, void, issue-now, close batch skips).
- [ ] T039 [P] [US4] Add the new table to the hand-built schema in `src/server/services/pos-money.sql.integration.test.ts`'s `beforeAll` — that file builds its own schema, so a new table must be added there or the integration run breaks.

### Implementation

- [ ] T040 [US4] Migration `supabase/migrations/<ts>_pos_period_locks.sql`: the table per data-model.md with RLS matching the other POS tables; label the PR `seed-unaffected` for the migration-pairing gate (new empty table).
- [ ] T041 [US4] `src/server/db/pg-pos-schema.ts`: the Drizzle table.
- [ ] T042 [US4] `src/server/services/pos/period-locks.ts`: `normalizePeriod`, `periodLockExists` (timezone-resolved inside the predicate, and a column variant for the close batch), `listPeriodLocks`, `setPeriodLock`; register both service exports in the boundaries inventory.
- [ ] T043 [US4] `src/lib/time/zoned.ts`: the month-in-timezone helper, shared with the rest of the app rather than inlined in POS.
- [ ] T044 [US4] Replace T003's stub with the real lock check in the shared guard chain, and wire it into void, issue-now and the close/retry batch (the batch *skips* locked months rather than failing them).
- [ ] T045 [US4] `PUT`/`GET /api/finances/period-locks/+server.ts` with `finance:manage`; route manifest + 6 counts.
- [ ] T046 [US4] `/finances/settings`: a "Periodos contables" card — month picker + note to lock, a list with who/when to unlock.
- [ ] T047 [P] [US4] Lock badge on the ticket page with the forbidden actions hidden; lock icon on `/pos/history` shift rows. Known limit to leave as `TODO(handoff)` at the site: the shift-row icon keys on the shift's opening date, so a shift straddling a month boundary can show the icon a day early — the mutators themselves read each sale's own date, so the refusal is always right.
- [ ] T048 [US4] FR-022's second half: give the unlock a trace. The per-sale audit rail does not fit (its `ref_id` is a uuid, a period is not a sale) — pick a synthetic ref or a small lock-events table. If it is not in this slice, it needs the `TODO(handoff)` **and** the `proposals/` entry before stopping.
- [ ] T049 [US4] Gates foreground; open the S3 PR; owner merges (Principle V: data-tagged work keeps the human gate at merge too).

**Checkpoint**: S3 complete.

---

## Phase 7: Polish & cross-cutting

- [ ] T050 FR-020 (open-shift customer/document and note edits) — same guard chain, `fiscal: true` for customer/document, one more field per endpoint. If deferred out of S1, it is a ledger entry, not a silence.
- [ ] T051 Write `proposals/2026-10-15-hub-pos-shift-scoped-edits-followups.md` with every deliberate omission and known limit, each naming its site: the two deferred clarifications (FR-011a, FR-021a), FR-020, the beta-gate timing test, the shift-row icon date, the unlock trace, the revision-hash re-preview, and the credit-note slice.
- [ ] T052 Run `quickstart.md` locally end to end, then hand the owner the prod-proof script — dry-run first, undo in a `finally`, run twice, assert the invariant rather than a statement count. The agent does not mutate production money.
- [ ] T053 Add the top-level board stub `specs/2026-10-15-hub-pos-shift-scoped-edits-and-emission-on-close-spec.md` with `TEMPLATE.md` frontmatter pointing at this directory — the meta board's indexer reads only top-level `specs/*.md` (constitution, "Artifact layout and registration").

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2)** blocks US1 and US2.
- **US1 (P1)** and **US2 (P2)** share T003/T004/T010 and ship as one PR; US2's branch work starts only when US1's service entry point exists.
- **US3 (P2)** depends on US1 only through T026 (removing issuing from submit, which US1's premise requires) — otherwise independent; it is stacked as the second PR.
- **US4 (P3)** depends on T003's stub existing (T044 replaces it) and must be the last PR.
- **Polish (P7)** after S3, except T051 which is written *as* each slice leaves an open end.

Deviation from the template's default: the template says all user stories can proceed in
parallel after Foundational. They cannot here — one repository, one shared service file, one
shared guard chain, and a hub release train that takes one PR at a time. The parallelism that
does exist is **inside** a story (the `[P]` tasks).

### Parallel opportunities

```
S1: T007 T008 T009 (one test file, write together) ; then T015 T016 T017 alongside T014
S2 (US3): T023 T024 T025 ; then T029 T030
S3 (US4): T036 T037 T038 T039 ; then T047 alongside T046
```

## Implementation Strategy

1. **MVP = US1.** The cashier's fix is the owner's complaint; it is deployable alone only if
   the closed-shift path refuses safely, which is why US2 travels with it.
2. **S2 next**, because until issuing moves to the close, an open-shift in-place edit can
   contradict a document already sent.
3. **S3 last**, because the lock is only load-bearing once the tax integration is live; it also
   closes the stub S1 left behind.
4. Stop at any checkpoint; every slice is live-deployable and reversible by itself.
