# Implementation Plan: FACES fulfillment stock reconciliation

**Branch**: Not created; planned `feat/faces-stock-reconciliation` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: `specs/122-faces-stock-reconciliation/spec.md`, proposal F1, pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc` and sanitized read-only snapshot.

## Summary

Ship a bounded read-only reconciliation report first. Separate overlap candidates, confirmed duplicates, missing realization, verified variant mismatch and display-only cases using stable provenance and signed ledger effects. Preserve valid counter-product timing and payment dates. Existing spec120 service repair is an evaluated tool, not permission or proof of applicability. The verified M mapping correction and bounded garment stock-only historical repair are designed in this packet; the latter depends on F3 atomic correction primitives. Unknown duplicate/missing cases remain diagnostic findings, not invented repair instructions.

## Technical Context

**Language/Version**: Hub TypeScript strict, Bun (registry); no dependency/runtime version change.

**Primary Dependencies**: Existing PostgreSQL client/Drizzle service conventions; `stock.logic.ts`, stock/POS/scheduling schemas; Vitest for synthetic regression and local PostgreSQL for concurrency.

**Storage**: Existing scoped PostgreSQL reads; private mode-0600 diagnostic artifacts. No table/migration required for S1.

**Testing**: Synthetic provenance/classification unit and contract tests; disposable local QA integration; later native concurrent tests for any new writer invariant.

**Target Platform**: Operator-run Bun CLI against explicitly qualified target, then existing Hub fulfillment paths if a defect is proven.

**Project Type**: Read-only operational diagnostic first; subsequent backend changes separately gated.

**Performance Goals**: Bounded case/ID/date scope, per-statement timeout 12s, lock timeout 1s, no unrestricted fleet scan. Capture timings and report incomplete reads; no invented production latency SLA.

**Constraints**: No production writes in S1; one technically read-only connection/transaction; no credentials/PII in committed evidence; no model calls; source SHA and live deployment claims separate; immutable pinned source remains unchanged.

**Scale/Scope**: FACES organization only; reported cases plus deduplicated candidate review. Seven existing overlap rows across five tickets are input candidates, not a complete population or effect total.

## Constitution Check

| Principle | Pre-design | Post-design evidence |
| --- | --- | --- |
| I Spec before code | Pass for drafting | spec/plan/tasks produced; no product implementation started. |
| II AS-IS/TO-BE/DELTA | Pass | Anchored source, timestamped read-only evidence, explicit unknowns and per-transition oracles. |
| III Slice-scoped delivery | Planned | Registry verified Bun/master. Isolated branch/PR creation deferred to implementation; no existing branch/worktree changed. |
| IV Required build steps | Pass for S1 design | No new page/API/nav/UI strings. Any later surface change requires RBAC route manifest, Paraglide, UI skill/token gates in amended design. |
| V Data/security owner gates | BLOCKED for implementation/apply | Owner spec approval pending. Owner merge and exact manifest/target approval pending. Dry-run default, QA undo in finally, repeat invariant and unknown-outcome recovery required. |

Draft planning may finish. The blocked implementation gate does not become a pass because documentation exists. No constitution exception is claimed.

## Project Structure

### Documentation

`specs/122-faces-stock-reconciliation/`: spec, research, plan, data model, implementation-inventory.md, quickstart, tasks, checklists/requirements.md, the generated combined design-review.md, and contracts: [report.md](contracts/report.md), [diagnostic-wire.md](contracts/diagnostic-wire.md), [source-explanation.md](contracts/source-explanation.md), [mapping-correction.md](contracts/mapping-correction.md), [mapping-envelope.md](contracts/mapping-envelope.md), [unchanged-facts.md](contracts/unchanged-facts.md) and [repair.md](contracts/repair.md).

### Source code (proposed Hub paths)

- `scripts/faces-stock-reconcile-2026-11.ts`: orchestration, target/read-only guards, report I/O.
- `scripts/lib/faces-stock-reconciliation.ts`: pure canonicalization, provenance and classification; no database/client import.
- `scripts/lib/faces-stock-reconciliation.test.ts`: synthetic join multiplicity, case and quantity oracle tests.
- `scripts/faces-stock-reconcile-2026-11.test.ts`: CLI guard/read-only/output contract tests.
- Existing `src/server/services/pos.service.ts`, `stock-accruals.service.ts`, `stock.service.ts`, `scheduling-bookings.service.ts`, `src/routes/api/scheduling/bookings/_handlers.ts`, completion handlers and tests: read targets in S1; modification only if S2's reviewed reproducer proves a change necessary.
- Existing `scripts/repair-service-sale-stock.ts` and `scripts/repair-service-sale-stock.test.ts`: inspect coverage before proposed reuse; no blind execution.
- `scripts/faces-garment-repost-2026-11.ts`, `scripts/lib/faces-garment-repost.ts` and their `.test.ts` counterparts: bounded single-ticket frozen-line repair, calling the qualified F3 atomic correction engine. No independent stock writer or correction table.

**Structure Decision**: Keep evidence classification separate from connection orchestration. Reuse current schema/domain logic where it is pure; do not call mutating service functions from a diagnostic.

## Phase 0: Evidence and decisions

Research is in [research.md](research.md). Exact reported identities, source-version linkage, true-up coverage and historical intended consumption remain diagnosis outputs. The design resolves their treatment: fail closed and mark unresolved. It does not fabricate values to make a speculative repair executable.

## Phase 1: Design and contracts

[data-model.md](data-model.md) defines canonical ledger rows plus separate provenance; [contracts/report.md](contracts/report.md) defines a read-only script/file surface and errors. Every relation is org-qualified. Canonicalize ledger rows before joins/aggregation; ledger IDs always follow the data-model.md Ledger identity rule (selected as text, ordered as `BigInt`), whatever their current magnitude. Entry provenance is decoded only by the closed stock entry source decoder in contracts/source-explanation.md; booking visit groups are resource-qualified as `visitMembers` defines them. Compare the full union of latest-ledger and bin keys, not only bins present. Historical signed reversals participate in net totals. Preserve warnings, drafts and prior repair markers. Report current mappings explicitly as current, and refuse inferred historical ownership.

## Delivery slices and dependency gates

### S1 / US1: read-only evidence report

After owner spec approval, create an isolated Hub feature branch and draft PR from the verified registry base. Recheck latest source against this baseline and amend anchors/behavior before coding if drift changes conclusions. Write synthetic tests first. Implement private bounded report; no apply flag. On local QA exercise ambiguous identity, grouped bookings, shared recipe items, partial warnings, cancelled entry reversals, released accruals, UOM conversion and prior true-ups. Rehearse read-only failure/role/scope guards. A new production report may run only after target qualification with a technically read-only transaction; existing snapshot is evidence, not proof a new script is safe.

Output is a reviewed case table with canonical sums, not a remediation count. Cases without complete attribution remain unresolved. The verified mapping is handled by S2a. If no additional ongoing code defect is demonstrated, close that question explicitly without modifying stock timing.

### S2a / US2: verified Faja M recipe correction (owner approval pending)

Use a separate dry-run-default mapping-only script at `scripts/faces-garment-mapping-2026-11.ts`, with pure plan/tests at `scripts/lib/faces-garment-mapping.ts` and `.test.ts`. Exact before scope is FACES product `8ebe2b40-2bd5-4543-b380-dc6ba6cc7ca0`, current recipe L item `f7ea983f-8e32-4688-b3ec-a6baef3bbe2d` quantity 1, no direct item bridge; desired sole recipe M item `941382a8-fbdb-472d-97cc-77407ac2d8fe` quantity 1. Resolve actual mapping row ID from fresh scoped data; no invented ID. Preserve L product mapping and unrelated recipes. Preview reports mapping, source/target/digest, potentially affected sales/open expectations and cutover policy; never changes a ticket/payment/date.

Apply requires separate exact-manifest/target owner approval, a single scoped transaction with row locks and compare-before conditions, validation that items/product remain same-org and current recipe/bridge/component state matches approval, and an atomic unique-key-safe replacement. If an M row already exists unexpectedly, stop; if the whole desired state exactly matches an already-applied receipt, verify no-op. Do not implement two separately committed `setConsumption`/`deleteConsumption` calls: readers must never observe a committed both-item/no-item recipe. Audit before/after and operation receipt transactionally for this repair; do not claim existing best-effort audit is atomic. Rehearse rollback/compensation in finally and repeat invariants in disposable QA.

Cutover, the write gate pair, the old-M draft/open-accrual census, refusal/commit/recovery and deployment qualification are specified once in [contracts/mapping-correction.md](contracts/mapping-correction.md), with the typed command in [contracts/mapping-envelope.md](contracts/mapping-envelope.md). Historical submitted cases stay separate. Preserve valid current service/product timing; the gate is synchronization, not a global payment-time issue policy.

### S2b / US2: any additional proven prevention only

Depend on S1 findings. Add a reviewed design amendment naming the failing transition, exact code writer, transaction/lock invariant, compatibility rules and source ownership key; require owner approval before data-tagged code. Reproduce failure in local QA before editing. Evaluate current ordinary-service skip/spec120, grouped and single completion, gateway action path, package grant/redemption, product-vs-service kind, concurrent retries and any partial-post path. Select the smallest demonstrated fix; do not install a generic ownership table or flatten valid sale-time rules speculatively.

Minimum oracle matrix: ordinary prepaid service D1→D2, package with included service/components, standalone garment delivered at sale, booking garment recipe, split payments, three bookings on one ticket, repeated/concurrent completion, warning/draft retry with changed requested lines, explicit no consumption, cancel/no-show/reschedule/void and prior correction. Assert ledger quantities and source ownership, unchanged payment facts and package rights. If a new unique/lock invariant is introduced, run actual PostgreSQL concurrency tests rather than mocked service calls alone.

### S3 / US3: proven garment historical correction

Implement [contracts/repair.md](contracts/repair.md) after S1 attribution, S2a mapping correction and the F3 atomic correction service are qualified. This is a concrete selected design for the two reported M sale/wrong-L issues, each processed as a separate operation, not a future writer-choice task. Preview a frozen copy of the original single-L issue transformed to M with identical normalized quantity/warehouse; do not add supplies from current co-ticket recipes. Use the existing planRepost decrease/increase guards inside the F3 engine, with the exact frozen-line quantity equality, explicit before/after value/COGS and exact source/mapping/bin/period fingerprints in that contract. Full F3 transaction, durable receipt, authoritative actor/policy, current-open correction-period posting, retry/unknown-outcome and QA inverse rules are specified in that contract. Preserve all sale product, payment, appointment and package facts.

New source files are the narrow single-ticket CLI and pure validator named above; F3 owns the shared server transaction API. No F1 batch framework or independent ledger writer. Cases absorbed by a later true-up, ambiguous historical fulfillment, missing sources or unsupported multi-item ownership are explicit blocked outcomes, never guessed adjustments. The initial mapping and known ticket are verified; applicability of a particular historical apply still requires fresh true-up coverage and owner exact-manifest/target approval. Other duplicate/missing-service cases cannot enter the garment writer and must retain evidence-bound investigation outcomes.


## Validation and commands

Run [quickstart.md](quickstart.md) from the implementation checkout. Required Hub gates: `bun run check` (zero errors/warnings), `bun run test` (zero failures), `bun run build`. Source-only authoring ran registry/SHA checks and Spec Kit script prerequisites, not these product gates. Private source verification checks cannot prove behavior, release or runtime reconciliation.

## Errors, risks and recovery

Connection/schema/timeout failures yield incomplete report and zero repair eligibility. Unexpected tenant links fail closed with redacted error. Missing conversion, ambiguous mapping/history, absorbed true-up, source drift, partial posting or unknown transaction outcome require manual evidence, not guessed quantities. Never rerun a backfill over history already reflected in an adjustment. Any changes to documented stock flow preserve entry→ledger→bin consistency and identify post-commit audit limitations.

## Complexity Tracking

No constitution violation is waived. S1 adds only a pure reporting module and guarded CLI. Known mapping and historical-garment writers are bounded here and reuse F3; additional unproven code defects require evidence before proposing any change.

## Cross-item execution ordering

This is the single statement of F1's ordering against F2 and F3; other files link here. Qualify the F3-owned shared transaction helpers, correction storage migration/RLS/seed and compatible lock protocol before any F1 or F2 writer. For Saypha receipt-chain keys or source entries that appear in an F1 overlap candidate, perform the approved F2 valuation correction first, then regenerate the F1 diagnostic and quantity manifests from fresh authoritative state; never reuse pre-F2 fingerprints or independently repair one source twice. F2 admits only its supported homogeneous envelope (one receipt plus at most 128 ordinary issue entries) under a fresh approved manifest, and any stock movement after a preview invalidates that preview's fingerprints. The garment M/L mapping and stock-only repost involve different item keys and must not change the Saypha chain. Unproven duplicate/missing cases remain ineligible. This ordering is a design contract, not current apply authorization.

## Two-case execution ordering

Use the case table in contracts/repair.md. Produce and approve separate single-ticket manifests; after the first commit, refresh and re-approve the second because shared bins changed. The older POS-00059 candidate stays ineligible until the later manual adjustment coverage is explained. Do not coerce a physical target or start a batch.

## Shared dependencies

F7 owns the single `verifyOperatorPrincipal` + `resolveFreshCapabilitiesReadOnlyInTransaction` API used by every F1 preview and report; signatures, token rule, gate terms and cost authority are in [contracts/report.md](contracts/report.md). F3 owns the write gate, locking resolver, helpers and receipt used by mapping and frozen garment apply ([transaction-protocol.md](../124-stock-correction-workflow/contracts/transaction-protocol.md)). These are prerequisites, not duplicated implementations. The ordered classification table handles mixed discrepancies and partial components; data-model.md fixes exact quantities and diagnostic value/rate tolerances. Native F1 cases are admitted to qa-native as quickstart.md specifies; ordinary test/build does not execute the SQL fixture. Recheck all participant paths and source drift before implementing cutover.

## Selected per-file actions

[implementation-inventory.md](implementation-inventory.md) is the complete selected Create/Modify/no-change boundary, including tests, dependency-created files, conditional S2b test files and the single evidence location. No Delete action is selected.

## Contracts

Each rule is stated once, in its owning contract:

- Diagnostic CLI, admission, gate terms, cost authority, exits and classification: [report.md](contracts/report.md).
- Diagnostic wire, ledger/group identities and run-stable comparison: [diagnostic-wire.md](contracts/diagnostic-wire.md).
- Source facts, timeline, stock entry source decoder, booking groups and projection comparison: [source-explanation.md](contracts/source-explanation.md).
- Mapping cutover and storage: [mapping-correction.md](contracts/mapping-correction.md); typed mapping command, receipt, status, flags and exits: [mapping-envelope.md](contracts/mapping-envelope.md); unchanged-facts digest: [unchanged-facts.md](contracts/unchanged-facts.md).
- Garment correction, its API, manifest, posting time, active-principal checks, atomic receipt and stock-denomination qualification: [repair.md](contracts/repair.md), with F3 [garment-envelope.md](../124-stock-correction-workflow/contracts/garment-envelope.md), [recovery-receipts.md](../124-stock-correction-workflow/contracts/recovery-receipts.md) and [garment-numerics.md](../124-stock-correction-workflow/contracts/garment-numerics.md).


## Implementation record (T001, T002)

- Owner approval, 2026-11-17: "please complete the revisions and proposals and begin implementation". Product implementation unblocked.
- Checkout: `~/.cache/claude-tmp/hub-faces-F1`, branch `feat/122-faces-stock-reconciliation` based on F3 commit `9556acc2` (F7 bridge/principal/loader and F3 stk_corrections/lockStockWrite engine). No push and no PR (orchestrator opens it). Source drift assessment: F3's garment engine and F7's `operator-bootstrap.smoke.ts` are absent at this base; see tasks.md Implementation deviations.
