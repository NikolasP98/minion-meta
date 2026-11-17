# Feature Specification: Auditable stock correction workflow

**Feature Branch**: Not created; docs-only planning. Future slice branches target Hub `master`.
**Created**: 2026-11-16
**Status**: Draft — owner data-spec approval pending; independent review results under egm/
**Input**: Proposal F3: support corrections to submitted receipts and past consumption without hiding originals, duplicating stock, or changing payment facts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct a wrong variant safely (Priority: P1)

An authorized operator uses the operator-facing workflow to correct a same-price garment variant on a submitted sale, give a reason, inspect stock effects and recover interruption. When the recorded product is already right, stock-only repair instead uses the owner-approved private command defined in the garment contract.

**Why this priority**: An M/L mistake needs a traceable correction, not a second sale or another delivery.
**Independent Test**: A synthetic sale for one M is corrected to one L; original payment/date remain identical and the ledger nets to one L issue.
**Acceptance Scenarios**:

1. **Given** a mutable sale with a linked M issue, **When** the operator previews and confirms L with a reason, **Then** M is returned, L is issued once, booking product display follows the corrected sale and original history remains available.
2. **Given** an identical retry or two concurrent confirmations, **When** they execute, **Then** one correction wins and its result is returned or the stale request is rejected; no second reversal/replacement occurs.
3. **Given** a sale already records intended M but its linked issue contains L, **When** the actual owner applies the approved private garment manifest through the qualified command, **Then** sale/booking product, original payments and ticket totals remain unchanged, while the approved stock quantity, value and cost effects are recorded.
4. **Given** a period lock, fiscal document, reconciled sale, recipe drift or insufficient L, **When** correction is requested, **Then** it is refused with a specific reason before misleading success is shown.

### User Story 2 - Correct a submitted receipt without erasing history (Priority: P2)

An authorized stock manager previews a quantity-only or value-only receipt mistake and sees whether safe cancellation/replacement is possible or historical valuation review is required.

**Why this priority**: Receipts determine both stock and later costs.
**Independent Test**: An unconsumed receipt is corrected by one linked cancellation/replacement; a consumed or historically dependent receipt is blocked and routed to the separately approved valuation repair.
**Acceptance Scenarios**:

1. **Given** a submitted receipt with no later dependent movements, **When** quantity or unit cost is corrected, **Then** original and replacement remain linked with reason, author, timestamps and net quantity/value difference.
2. **Given** later consumption or a locked accounting period, **When** a receipt correction is previewed, **Then** the impact and blocking policy are explicit; a current adjustment cannot be presented as repaired historical costs.
3. **Given** replacement posting fails after cancellation ran inside the new correction transaction, **When** the failure is injected, **Then** the entire transaction rolls back and the original submitted receipt remains unchanged; retry uses the same immutable operation intent without duplicate cancellation or draft effects. Preexisting legacy pending POS reposts use their separate recovery path.

### User Story 3 - Resolve a past consumption correction with evidence (Priority: P2)

A manager identifies the owning sale, booking or invoice before choosing a supported correction path.

**Why this priority**: Displayed products, reservations and posted stock are different facts.
**Independent Test**: A completed booking with only an expected product and one with a posted issue produce different eligibility results; neither is reopened or charged again.
**Acceptance Scenarios**:

1. **Given** a posted consumption owned by a correctable sale, **When** a supported variant change is made, **Then** the existing sale correction is used.
2. **Given** booking/invoice-owned historical consumption or ambiguous ownership, **When** correction is requested, **Then** no generic issue or booking status rewrite occurs; the evidence packet links to F1/F2 repair review with an explicit blocked reason.

### Edge Cases

- Receipt already cancelled; draft edited after preview; archived/foreign variant or warehouse; missing UOM conversion; source points at a cancelled entry.
- Two corrections to one source; correction racing sale void, completion, receipt issue or period close; crash after every durable transition.
- Recipe or UOM changed since original posting; same target repeated with a different reason; amount differs from current catalog price.
- Existing negative-stock refusal remains visible; backdated valuation cannot silently become a current-stock adjustment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Classify every request as draft edit, existing sale variant correction or stock-only repost, safe receipt replacement, or blocked historical repair; show the original record and linked movements.
- **FR-002**: Reuse existing draft editing, reversal and sale reposting capabilities, including stock-only repost when the source product is already correct; never delete or edit submitted ledger history.
- **FR-003**: Require an authenticated same-organization actor, relevant stock and sale authority, nonblank reason and an unchanged preview before a correction is applied.
- **FR-004**: Preserve payment amounts, methods, dates, ticket totals and appointment dates; differing-price changes require a separate financial process.
- **FR-005**: Persist one durable correction identity and immutable proposed payload so retry/resume cannot repeat a reversal or create a different replacement.
- **FR-006**: Show before/after item, variant, quantity, UOM and value impacts, immutable source links, outcome, failure and recovery state.
- **FR-007**: Support quantity-only and value-only receipt corrections only when downstream dependency and accounting policy permit; otherwise produce a blocked impact report for F2.
- **FR-008**: Treat a warning or pending repost as incomplete; the UI cannot announce a fully applied correction before stock is verified.
- **FR-009**: Keep historical booking status and original stock references discoverable. Generic product edits cannot stand in for posted-stock correction.
- **FR-010**: Use existing accounting period locks for sale eligibility. For standalone receipt corrections, any affected locked period or unverified period policy blocks apply; no date cutoff is invented.
- **FR-011**: Added UI must respect existing capabilities, sensitive cost masking, translations, keyboard operation and design-token standards.
- **FR-012**: Tests must prove retry, concurrency, organization isolation, capability denial, unchanged sale-payment facts and exact approved inventory-value/cost effects, with synthetic data only before approval.

### Key Entities

- **Correction request**: Original source, immutable intended change, reason, actor, preview evidence, status and linked result.
- **Stock movement**: Original submitted entry, reversing ledger and replacement entry; the historical source of stock quantity/value.
- **Source owner**: Sale, booking, invoice or independent receipt that determines the eligible correction path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All synthetic M→L retries and concurrent requests produce exactly one net L issue and zero remaining M issue for the corrected unit.
- **SC-002**: All correction scenarios preserve the original payment facts and expose original/replacement links with author and reason.
- **SC-003**: Every blocked historical receipt in the validation matrix leaves both stock and financial facts unchanged and names the unresolved dependency.
- **SC-004**: Every injected interruption can be inspected and either resumed to one verified outcome or left explicitly blocked without an unreported partial effect.

## Assumptions

- This is a supported workflow specification, not authorization to alter FACES records. Unknown production IDs, physical M/L counts, period state and deployed version remain unknown.
- F1 establishes fulfillment ownership; F2 handles downstream valuation/COGS repairs. The first release deliberately blocks those repairs rather than implementing a generic replay engine.
- The sanitized [live-read summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json) observed on November 16 also shows a sale already recording M with a linked L issue; F1 owns exact mapping correction and historical candidate approval. F3 therefore includes stock-only repost without changing the sale product. Physical intended mapping and balances still require approval/evidence.
- Existing same-price sale swap is a capability to qualify, not proof the reported case is already solved.

## AS-IS → TO-BE → DELTA

AS-IS, pinned Hub `c6c2d5739572356239c4048c0f564f40b0768adc`: draft-only `updateEntry` at `src/server/services/stock.service.ts:679`; append-only cancellation at `:950`; sale preview/repost at `src/server/services/pos.service.ts:1235,1314`; submitted sale same-price product swap at `:1407` with booking synchronization and fiscal guards. Generic visit product edits at `scheduling-bookings.service.ts:2882` edit planned associations; they do not call stock reversal. Final booking statuses are not reopened (`:1041`). Detailed evidence is in [research.md](research.md).

TO-BE: one discoverable correction workflow chooses these existing paths and records durable reason, eligibility, recovery and linkage.

DELTA: qualify existing swap before extending it; add correction orchestration and safe receipt eligibility; block ambiguous/downstream historical cases with evidence. US1/SC-001 prove variant correction; US2/SC-003 prove receipt boundaries; US3 proves source ownership handling. No broad cleanup, forced balance, new payment or calendar reopening.

## Alternatives Considered

Reject inventing a second ledger correction kind or independently committing cancellation and replacement: these either expand valuation semantics or expose partial correction. Reuse existing append-only cancellation/submission inside one shared transaction and durable correction receipt. The per-org stock gate deliberately trades concurrent stock-write throughput for an auditable lock order across existing writers. Detailed alternatives are in [research.md](research.md) and [contracts/transaction-protocol.md](contracts/transaction-protocol.md).

## Approval and release gates

Data-tagged: owner spec approval is pending before product implementation; human merge required. Review results are recorded under egm/; owner approval remains pending. No product implementation, migration, production execution, deployment or runtime verification has occurred in this planning task.


Authority changes are part of correction admission: a previously absent deny or module-disable row cannot appear between the fresh check and correction commit through the participating application writers. If authority changes first, correction refuses without effects; if correction is admitted first, that authority change waits and applies afterward. Existing POS-only empty swaps and period-only bookkeeping retain their own access/module requirements; stock cost access uses the existing finance tier, with no new stock permission tier.

The proposed public preview and apply endpoints will reject stock_only with HTTP 422 owner_evidence_required; private garment authority/evidence are defined in [garment-envelope.md](contracts/garment-envelope.md). Active actor and mutable-input synchronization follow [transaction-protocol.md](contracts/transaction-protocol.md). Require every named behavior in [native-qualification.md](contracts/native-qualification.md), without treating these proposed changes as current production proof.

Authority prerequisite: [F7 bridge](../128-faces-receivables-audit/contracts/authority-bridge.md), qualified before this slice. The transaction protocol selects its operator adapter; legacy callers retain their existing adapter.
Public interruption recovery persists a minimal scoped operation identity before submission and restores the recorded server outcome after reload/crash; unavailable site persistence blocks confirmation. Unknown results never trigger an automatic new write. The exact public/private boundary is [browser recovery](contracts/browser-recovery.md).

## Stock-cost denomination and owner qualification

Stock-changing corrections require an explicit current real-owner attestation of the common stock valuation currency, bound to the complete affected inventory boundaries and approval. The generic preview can expose safe boundary identifiers to an admitted owner for that explicit input, then must re-preview before confirmation. Missing/unverified denomination yields unavailable costs and no executable correction; billing currency and current display settings cannot qualify it. Qualified effects and historical receipts retain their attested currency after display settings or the original actor change. Both-empty POS-only swaps retain their existing authority, and normal sales/stock/background writers gain no owner requirement. The exact types, limits and disclosure rules are [valuation-qualification.md](contracts/valuation-qualification.md).

## Decisions made during review (owner to confirm)

- Standalone receipt corrections use one fixed period rule, `receipt_period_v1`: the original and the current posting month must both be open. Approving this specification approves that rule; there is no setting to switch it on. A locked month is refused with `period_locked`.
- A receipt correction is refused with `policy_unverified` when the organization has no finance settings row. Sale corrections keep the existing `America/Lima` timezone fallback in that case.
- An owner-approved posting time (private garment command, F2 receipt chain) is refused if it is earlier than the latest posted movement on the affected stock or later than the moment of apply. The owner then needs a new approved manifest.
- A receipt replacement keeps its purchase link. When the correction changes a rate, the replacement does not copy the original foreign-currency conversion details; the original entry keeps them.

## Detailed Implementation Plan

This boundary separates the stakeholder specification from the complete technical companion artifacts. Source is pinned; tests and implementation are proposed unless an explicit evidence receipt says otherwise. Independent EGM records live under egm/. Owner data/security approval and owner merge remain pending.

### Review artifact: research.md

### Research: F3 stock correction capabilities

#### Evidence boundary and source reading list

Inspected immutable source at `.local/faces-followups-2026-11-16/hub-source`, pinned `c6c2d5739572356239c4048c0f564f40b0768adc` (proposal source baseline). These findings describe that source, not deployment or actual physical balances. No customer records or credentials were needed. Production period state and original mistake remain unestablished by this artifact.

| Evidence | What it establishes | Design consequence |
|---|---|---|
| [stock.service.ts:679](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock.service.ts#L679) | Draft-only locked edits; submitted entries cannot be edited/deleted. | Reuse draft edit; preserve submitted originals. |
| [stock.service.ts:777](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock.service.ts#L777) | Submit locks entry/bins, appends ledger, updates bins; audit is a separate transaction. | Extract transaction-accepting primitives; correction reason/result cannot depend only on best-effort audit. |
| [stock.service.ts:950](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock.service.ts#L950) | Cancel appends original signed quantity/value inverse and negative-stock guards. | Cancellation is already available; does not recompute intervening issue costs. |
| [stock.logic.ts:32](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/stock.logic.ts#L32) | Moving-average apply/inverse; issues consume current rate and negative derived rate is clamped. | Current reversal/replacement is not proof of corrected historical COGS; exclude downstream receipts from self-service. |
| [pos.service.ts:1235](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos.service.ts#L1235) | Existing preview resolves live entry and current recipe/UOM; planRepost permits only named item differences. | Freeze preview, compare all recipe/UOM/stock source versions and preserve drift guard. |
| [pos.service.ts:1314](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos.service.ts#L1314) | Repost claims ticket stamp, cancels, posts; `repost_pending` is recoverable by existing post-stock retry. | Qualify existing recovery; new workflow must not claim atomicity from these separate transactions. |
| [pos.service.ts:1407](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos.service.ts#L1407) | Submitted product swap already exists, same catalog price, retains charged money, updates visit product, rejects recipe drift, guards fiscal/period state. | Main M/L capability exists; extend reason/idempotency/atomic orchestration rather than create another swap. |
| [swap route](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/api/pos/tickets/%5Bid%5D/lines/%5BlineId%5D/swap/%2Bserver.ts) and [ticket PageBody:188](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/routes/%28app%29/pos/tickets/%5Bid%5D/PageBody.svelte#L188) | Existing pos:edit endpoint takes only productId/expectedProductId; UI calls it. | Add reason, operation identity and preview across both callers; do not leave a weaker bypass. |
| [scheduling-bookings.service.ts:2813](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/scheduling-bookings.service.ts#L2813) | Visit products resolve anchor; add/remove/quantity writes planned associations. | Do not use generic product edit as posted-stock repair. |
| [scheduling-bookings.service.ts:1041](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/scheduling-bookings.service.ts#L1041) | Terminal booking transitions are refused; closed appointments corrected with a new booking. | Never reopen completed booking merely to edit consumption. |
| [period-locks.ts](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos/period-locks.ts) and [tender-correction.ts:35](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/pos/tender-correction.ts#L35) | Accounting months use `fin_settings.timezone`; when no `fin_settings` row exists, `periodLockExists` falls back to `America/Lima` (`period-locks.ts:31`). Void, period lock, invoice reconciliation and fiscal emission block edits. The file holds pure readers only; the period-lock writer is `setPeriodLock` in `pos.service.ts`. | Reuse authoritative guards, not an invented age cutoff. |
| [pg-schema/stock.ts](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/db/pg-schema/stock.ts), [rbac.service.ts:879](https://github.com/NikolasP98/minion_hub/blob/c6c2d5739572356239c4048c0f564f40b0768adc/src/server/services/rbac.service.ts#L879) | Stock append-only source and org scope; write prefix is stock, sale prefix pos. | Add per-route explicit edit/manage checks and existing RLS conventions. |

#### Decisions

1. **Decision**: Extend existing sale swap; ship preview/readability first, then atomic correction transaction and receipt support as separate PR slices. **Rationale**: Existing behavior already covers important M/L semantics. **Alternative**: generic stock adjustment rejected: bypasses source ownership and may hide wrong visit product.
2. **Decision**: Extract existing entry submit/cancel calculations into `CoreTx` helpers and use one transaction for new eligible correction operations, including correction receipt and audit. **Rationale**: Current multi-transaction path can leave pending recovery; one correction must not strand a cancelled receipt if replacement fails. **Alternative**: a general durable saga is unnecessary for same-DB safe cases. Existing pending historical POS operations remain handled by their established retry before new correction is allowed.
3. **Decision**: Safe receipt means no later ledger movement on any affected original or replacement bin and no invoice/booking/POS owner. **Rationale**: Inverting original values does not fix later costs. **Alternative**: automatic chronological revaluation rejected; belongs to F2 with its own approved report.
4. **Decision**: Standalone receipt replacement uses one fixed release policy, `receipt_period_v1`, defined in [contracts/workflow.md](contracts/workflow.md#receipt-period-policy-v1). It has no runtime switch or setting: owner approval of this specification is the approval of the policy, and `receipt_replace` does not ship before that approval (T001). The policy checks the original and the current posting month in the accounting timezone against existing period locks. An absent `fin_settings` row returns `policy_unverified`, unlike sale guards, which keep the existing `America/Lima` fallback. **Rationale**: Existing POS locks do not establish a universal stock closing policy, so a receipt correction must not guess a timezone. **Alternative**: an owner-attested per-operation policy proof was rejected because it would add a second attestation object without adding a checkable fact.
5. **Decision**: Require `pos:edit` for sale correction and `stock:manage` whenever stock changes; independent receipt correction requires `stock:manage`. Preview/detail require relevant view and field masking. **Rationale**: A POS-only editor must not get a general stock correction writer. **Alternative**: bare auth/central prefix alone rejected.

#### Bounded live-read correction case

The coordinator's [sanitized read summary](../../audits/2026-11-16-faces-followups/evidence/meeting-case-read-summary.json), observed `2026-11-16T19:20:30.051Z` in repeatable-read READ ONLY under `app_ledger`, establishes a concrete source-versus-stock mismatch: Faja M currently consumes FAJA-L at quantity 1 with no direct stock bridge; POS-2026-00098 already records Faja M, while linked submitted STE-2026-00578 issues FAJA-L quantity 1. The garment line charged zero, which does not itself remove its physical-stock consequence. Customer details are omitted. Private raw evidence hash is `9f028bd6c26af39deb6383a2f12cdbe07799bb2b150549b1f987c6bf332277a7`.

This proves a current mapping mismatch and a linked recorded mismatch; it does not prove physical balances, the exact intended target mapping, all historical affected rows or approved repair. F1 owns mapping correction and historical candidate preparation. F3 must allow source-product-unchanged stock-only repost after that exact mapping is approved, using existing `previewTicketRepost`/`planRepost`/`repostTicketStock` semantics with explicitly allowed old/new item IDs. Swapping the ticket product would change an already-intended M source and is not this case's repair.

#### Remaining operational facts

No unresolved technical choice is delegated to implementation. Exact affected source IDs, period policy approval, production stock dependencies, installed version and downstream physical truth require evidence and human gates. They are execution prerequisites, not invented spec facts. F1/F2 remain separate owners for cross-source consumption and historical revaluation.

#### Selected implementation decisions

Use the single first per-org write gate in contracts/transaction-protocol.md and explicit same-tx current-rule resolution/cutover, typed helpers and fixed retries; reject unspecified competing advisory keys and operational quiescence alternatives. One org serialization trades throughput for a verifiable same-database boundary; no global stock lock or generic framework is introduced. API source IDs/canonical hashes/body bounds and no-stock capability preservation are exact in workflow.md. F7 owns shared verified operator/nonlocking snapshot admission; FOR SHARE remains write-only. Native SQL is manifest-owned qa-native with full commands and semantic assertions in native-qualification.md. Tasks and one five-kind migration must match these contracts.

#### Existing field-tier source boundary

Pinned `src/lib/permissions.ts:128` restricts FIELD_LEVEL_MODULES to crm/finance/scheduling; `src/server/services/rbac.service.ts:217` defaults stock to 0 and its role-override path also keeps stock field tier 0. Cost-bearing operational reports/corrections use the existing finance:view and finance sensitive tier, with enabled finances and the existing stock/POS gates; quantity-only stock evidence does not invent a stock tier. Qualify ordinary-owner and custom-role admission and finance denial cases before delivery.

Authority-race source finding: `modules.service.ts:26–42` treats a missing `app_modules` row as enabled and inserts or upserts without the org authority lock (`hashtextextended(orgId,112)`, defined in [contracts/transaction-protocol.md](contracts/transaction-protocol.md#terms)). Section-access writers take that lock, not stock-v1, so a newly inserted deny is not prevented by the stock gate or by `FOR SHARE` of existing rule rows. Existing org-role, account, join and bootstrap callers already take the org authority lock; user deletion takes it before the profile write. The selected fix reuses that lock after stock-v1 and before all source rows, makes the module upsert take it, and checks uncached authority and module state while both are held. No universal exclusion of privileged/out-of-band writers is claimed; no new sensitive tier for stock is invented.

### Review artifact: plan.md

### Implementation Plan: Auditable stock correction workflow

**Branch**: Not created | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)
**Input**: Proposal F3; existing Hub swap/cancel/repost baseline qualified in [research.md](research.md).

#### Summary

Expose eligibility and before/after preview for existing same-price sale variant corrections and stock-only sale repost when the source product is already right, then make eligible corrections one durable database transaction using existing stock math. Add safe standalone receipt reversal/replacement only when no later bin movements exist. Block historical consumption ownership and downstream valuation cases with links to F1/F2 evidence. No generic reopening, financial correction or automatic historical replay.

#### Technical Context

**Language/Version**: TypeScript strict, Svelte 5, SvelteKit 2; Bun per Hub registry/package.
**Primary Dependencies**: Drizzle, PostgreSQL, CoreCtx/withOrgCore, existing stock/pos services, existing RBAC, Paraglide.
**Storage**: PostgreSQL append-only stk_ledger, rebuildable stk_bins, proposed org-scoped stk_corrections.
**Testing**: Vitest unit/route/mounted suites and real PostgreSQL SQL integration with synthetic tenants.
**Target Platform / Project Type**: Hub web application; no gateway/site changes.
**Performance Goals**: Preview scans only named source bins and their dependency ranges, not all org history; lock timeout yields retryable conflict without effects. No unsupported latency promise.
**Constraints**: Preserve payment facts; append-only stock; no prod writes in design task. Existing pending repost must resolve before new correction.
**Scale/Scope**: One named source per correction, finite line set, immutable operation identity, no batch repair.

#### Constitution Check

Before research: I specify→plan→tasks followed via private F3 driver; II pinned evidence + AS-IS/TO-BE/DELTA; III future slice PRs target registry Hub master and must isolate after user authorization; IV UI/RBAC/i18n/route-manifest gates included; V data spec approval and human merge pending. Phase 1 re-check: design follows all principles; implementation is blocked until owner spec approval. No bypass claimed. Review results are recorded under egm/; owner approval remains pending.

#### Project Structure

Docs: this directory contains spec, research, plan, data model, contracts, quickstart, tasks and review bundle.

Existing seams, Hub relative:
- `src/server/services/stock.service.ts`: extract `createEntryInTx`/`submitEntryInTx`/`cancelEntryInTx` with outer wrappers preserving existing semantics; same pure stock math and event behavior.
- `src/server/services/pos.service.ts`: existing `previewTicketRepost`, `planRepost`, `swapTicketLineProduct`, source/stock stamp updates; delegate supported swap to correction service.
- `src/server/services/pos/period-locks.ts`, `pos/tender-correction.ts`: existing period/fiscal readers, reused unchanged. The period-lock writer `setPeriodLock` in `pos.service.ts` joins the shared gate pair.
- `src/server/db/pg-schema/stock.ts`, `supabase/migrations/20261116193000_stock_corrections.sql`: org-scoped correction receipt, RLS and unique identity, QA migration seed.
- New `src/server/services/stock-corrections.service.ts` and `stock-corrections.logic.ts`: eligibility, fingerprint and orchestration.
- Existing `/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts`; new `/api/stock/corrections/preview/+server.ts`, `/api/stock/corrections/+server.ts`, `/api/stock/corrections/[id]/+server.ts`.
- `src/routes/(app)/pos/tickets/[id]/PageBody.svelte`, `src/routes/(app)/stock/entries/[id]/PageBody.svelte`: existing detail surfaces; no new top-level page.

#### Implementation slices and exact behavior

##### S1 — Eligibility/preview (US1, US3)

Build pure source resolver with classes `draft_edit`, `sale_variant`, `sale_stock_repost`, `receipt_replace`, `blocked`. Resolve source metadata plus actual linked entry; reject multiple/ambiguous owners. Sale requires `kind=product`, same active catalog price, unchanged charged totals, expected old product, no modifiers/drift, existing submitted issue only for a stock-moving correction; existing void/period/invoice/SUNAT guards remain. Explicit no-stock variant branch: both the original and the replacement product of the swapped line have verified empty stock plans. As in `swapTicketLineProduct` today (`pos.service.ts:1505-1549`), the branch is decided by the swapped line's two plans only; a stock entry that other lines of the same ticket issued neither blocks it nor changes it. Preserve the same-price variant swap without requiring an issue, cancellation, bin lock or replacement entry; atomically update the source product, the linked visit association (see the visit-product rule in [contracts/workflow.md](contracts/workflow.md#visit-product-association)) and the durable correction/audit receipt with null original/replacement entry IDs. A transition from no-stock to stock or vice versa is blocked in this slice, rather than pretending a missing entry is an empty plan. Preview lists full current/replacement per-item stock deltas, currencies, original entry, UOM/conversion, dependency blockers and source fingerprint. Generic booking product edits and completed status are never treated as posted-stock proof. Stock-only sale repost is separately eligible when the ticket/booking product is already correct but original movement item differs. Use exact F1-verified item/UOM ownership mapping, explicit original-return and intended-issue allowed IDs and whole-plan drift check; preserve ticket and visit product columns. Do not call swapTicketLineProduct to fix only stock. A current recipe difference is evidence to review, not authority to apply. Historical booking/invoice-owned issues return blocked F1/F2 action packet.

##### S2 — Atomic sale correction (US1)

Refactor existing stock calculations to accept the same CoreTx; do not implement a second ledger writer. Existing public submit/cancel wrappers retain outer audit/event semantics. Use durable `stk_corrections` row keyed `(org,operationKey)` and immutable payload hash. Existing swap route and ticket caller require reason, operation key and preview hash and delegate to this shared engine; no legacy mutation bypass. Read retry receipt first: same key/hash returns verified committed outcome; different payload is 409.

Inside one `withOrgCore` transaction: acquire the per-org stock-write gate (stock-v1), then the existing org authority lock (`hashtextextended(orgId,112)`) before source rows, followed by source, period/authority, entries, accruals and sorted bin rows exactly per transaction-protocol.md, re-read snapshot and financial guards, compare fingerprint, check unique correction identity under the first org gate and source locks, calculate allowed old/new changes with existing `planRepost`, cancel original, create/submit immutable replacement with the source metadata in [contracts/workflow.md](contracts/workflow.md#replacement-entry-metadata), update ticket stock stamp and (variant-swap only) linked visit product, store before/after and `recordAuditInTx`, insert the completed immutable applied correction receipt, commit. The submit helper emits the existing transactional event once per newly submitted replacement entry; controller emits no duplicate. Failure anywhere rolls back all effects including correction evidence. Lost HTTP response is recovered by operation key. Pending preexisting `repost_pending` is surfaced with the established post-stock retry link; it blocks starting a new correction.

The exact first org gate, row hierarchy, participant inventory, typed helpers, same-tx current-rule resolution, retry/timeouts and mapping cutover are authoritative in contracts/transaction-protocol.md. Do not invent source/product/bin advisory namespaces or take an authority row lock before source rows; the existing org authority lock is nevertheless mandatory before all those rows. Shared native qualification is contracts/native-qualification.md.

##### S3 — Safe standalone receipt replacement (US2)

Only standalone receipt entries with submitted status, no source owner and complete original ledger/lines qualify. Validate quantities positive/finite, valid same-org active item/warehouse, positive finite receipt rate, explicit normalized UOM. Take source and sorted union-of-bin locks; recheck there is **no later ledger row** on any touched original/replacement bin since source's original posting (stable ledger ID order, not client date), including transfers/adjustments. A foreign replacement bin already carrying movements after source posting blocks eligibility. Policy `receipt_period_v1` in [contracts/workflow.md](contracts/workflow.md#receipt-period-policy-v1) decides the period: an absent `fin_settings` row, a locked original or current month, a changed preview or a later dependency blocks apply.

Use same transaction helpers to reverse and post replacement with the receipt metadata in [contracts/workflow.md](contracts/workflow.md#replacement-entry-metadata), original supplier and correction reason. Value-only correction retains exact stock quantity; quantity-only retains the original stored rate. Rates are in the stored valuation unit; no currency conversion runs. Replacement is current posting with original date retained as evidence; never pretends to revalue history. Negative-stock and invalid-value guards must pass before writes. More complex receipts produce a read-only F2 impact packet, not a compensating arbitrary adjustment.

#### Failure, retry and audit invariants

One transaction means no new durable half-applied state; query the committed operation after timeout. Operation key reuse with changed payload refuses. Two keys on same preview/source serialize: one commits and the other returns stale conflict. Existing cancelled entry is not cancellable again. Durable before/after/actor/reason are atomic; best-effort general audit failure cannot erase correction evidence. Undo is a new separately approved inverse correction where eligible, never ledger deletion. A production dry-run remains separate from API eligibility and must name exact source IDs and approval.

#### Security and UI contracts

All handlers require getCoreCtx, enabled modules, explicit capability checks, same-org IDs and RLS. Sale correction requires pos:edit plus stock:manage when stock changes; standalone receipt stock:manage. View projections gate pos/stock view and hide sensitive costs using existing field policies. API-only additions use exact central read/write capability and hook/handler tests, not page-design registry entries; existing ticket/stock-entry screen registrations remain unchanged; correction code cannot accept a client org or actor. Existing detail UI shows original/replacement, reason, differences and blockers, uses Svelte 5, Paraglide, semantic tokens, focus management and keyboard access. Read governance skill before UI edits; run i18n/design/token gates. No customer labels beyond authorized source context.

#### Validation and gates

Required tests in quickstart: same-price swap and source-product-unchanged stock-only repost retry/concurrency; no-stock and stock variants; drift/modifiers/foreign IDs; fiscal lock races; absent-bin races; receipt quantity/value and later dependency; injected rollback at each write; unchanged money/dates; audit identity and original discoverability. Browser Harness validates existing ticket/entry workflows in synthetic QA, desktop and narrow viewports. Run focused suites then Hub `bun run check`, `bun run test`, `bun run i18n:compile`, `bun run lint:design && bun run lint:tokens`, route/RBAC architecture checks and migration drift checks. Required CI/human merge/deploy/runtime proof remain separate.

#### Complexity Tracking

One proposed correction table is justified by durable idempotency, reason and source linkage; existing general audit is separate/best-effort and existing swap lacks operation identity. A generic stock replay/saga framework is rejected. Refactor transaction seams narrowly, preserving existing public wrappers with regression tests.

#### Cross-item shared primitive contract

F1 and F2 reuse these transaction exports, not separately committing outer wrappers: createEntryInTx accepts the caller transaction, validated original/frozen lines, preallocated entry UUID, actor and metadata; submitEntryInTx and cancelEntryInTx accept that same transaction, server-controlled correction posting timestamp and the shared locked-bin context; submitEntryInTx also keeps the existing `acceptSubmitted` and `expectedInvoice` semantics that `createIssueFromInvoice` relies on. They preserve existing public wrappers, normal stock-event semantics and pure stock math. Reuse existing activity.service.ts recordAuditInTx (line 131) unchanged for atomic evidence. The single first org stock-write advisory gate and subsequent source/period/entry/accrual/bin row hierarchy is shared with F1/F2 and every inventoried ordinary writer; duplicate advisory protocols/helper extraction are excluded.

For stock_only mode freeze the original submitted issue lines and transform only the approved old-item→new-item quantities. Do not regenerate the whole ticket from current recipes. planRepost compares original to this frozen replacement with explicit allowed return/increase sets; current-recipe preview is diagnostic drift only. Reject mixed/shared target ownership, unexpected extra item/value changes or ambiguous line attribution. The bounded F1 garment invocation requires exactly one original L line and one unambiguous M sale quantity. Preserve other original lines; the already-correct product and booking product never change.

#### Exact shared contracts and prerequisite ownership

contracts/workflow.md is the complete discriminated API/schema/capability/hash contract; contracts/transaction-protocol.md is the exact synchronization/helper/principal contract; contracts/native-qualification.md is native manifest/lane/command proof. Where a summary elsewhere differs, these contracts govern; they do not change source behavior. F7 owns scripts/lib/operator-principal.ts and rbac.service.ts nonlocking fresh adapter before F1/F2 preview integration; F3 owns stock primitives, the common first gate and the one shared migration. Include every named participant and native manifest/report test in the implementation inventory.

#### Shared authority and module race

The stock gate alone does not serialize existing policy writers or an absent module disable. transaction-protocol.md selects stock-v1, then the existing org authority lock, before all source and business row locks, with both held through commit. setModuleEnabled takes the org authority lock before its upsert; existing role/member/account/section writers already use that coordinator. Fresh uncached capability/module checks occur inside the held scope, preserving absent=enabled and mode-specific POS-only/period behavior without a new stock sensitive tier. Native qualification has thirteen behaviors, including absent-deny and module-disable writer races in both legal arrival orders. implementation-inventory.md distinguishes mandatory local edits from dependency-owned/no-change files. F1/F2 inherit this protocol.

Public/private scope and current-principal admission follow [the garment contract](contracts/garment-envelope.md) and [transaction protocol](contracts/transaction-protocol.md).

Normative details: [private garment](contracts/garment-envelope.md), [recovery and receipts](contracts/recovery-receipts.md), [numeric oracle](contracts/garment-numerics.md), [transaction protocol](contracts/transaction-protocol.md). File actions and scenario checks above remain mandatory.

Public crash/reload recovery is the closed [browser-recovery.md](contracts/browser-recovery.md) contract: an immutable minimal v1 pointer (org, profile, source, operation key, payload hash) is synchronously persisted and read back before POST; unsupported storage blocks confirmation, the server GET supplies the outcome, no write is automatic, account switches clear displayed state and unknown pointers are retained. It qualifies only when all of the following pass: the helper tests, the route tests, the mounted tests for both UI hosts, the native cases and the browser-restart proof. Private CLI manifest recovery is separate.

Stock-changing correction costs require the exact [valuation qualification](contracts/valuation-qualification.md), current real owner and existing capabilities; missing denomination gives a nonexecutable unavailable preview, not a guessed currency. Both-empty POS-only swaps and normal sales/stock/background writers retain their original authority. The [API admission contract](contracts/api-admission.md) owns narrow GET/HEAD and POST delegation without changing unrelated stock routes.

### Review artifact: data-model.md

### Data model: correction identity and immutable history

#### Existing records

`stk_entries`/`stk_entry_lines` preserve original supplier, quantities, UOM-resolved stock quantities and rate. `stk_ledger` remains append-only; `stk_bins` remains derived. `pos_ticket_lines`, `pos_tickets.stockEntryId` and anchor `sched_booking_products` change together only for supported sale variant correction. The visit-product change reuses `moveVisitProduct` (`pos.service.ts:1367`): it updates the row's product, or deletes the old row when the booking already has a row for the replacement product (one row per booking and product); the [visit-product rule](contracts/workflow.md#visit-product-association) records either case. Stock-only sale repost preserves both ticket line and booking product. `pos_payments`, financial ledger, booking dates/status and ticket monetary columns are prohibited mutation targets.

#### Proposed stk_corrections

- `id`: UUID primary key; `org_id`: non-null authenticated organization; forced RLS matching stock conventions.
- `operation_key`: UUID, non-null; unique `(org_id,operation_key)`.
- `kind`: non-null enum `sale_variant|sale_stock_repost|receipt_replace|product_mapping|receipt_chain`.
- `source_type`, `source_id`: non-null resolved source identity; `source_entry_id` is nullable only for product_mapping or an explicitly verified no-stock sale_variant. Every non-null entry reference resolves same org. product_mapping uses source_type=fin_product/source_id=product UUID; receipt_chain uses source_type=stock_receipt/source_id=original receipt UUID.
- `payload_hash`, `preview_hash`: lowercase SHA-256 hex, non-null; canonical serialization uses sorted IDs and normalized decimal strings.
- `reason`: trimmed nonblank text, 1–1000 characters; immutable after insert.
- `actor_id`: non-null authenticated profile identity; `created_at`, `applied_at`: server timestamptz.
- `before`, `intended`, `after`: immutable structured snapshots containing IDs, per-line qty/rate/UOM, recipes/conversions, expected source versions, stock ledger boundary, policy evidence and financial invariant digest. Sensitive values are masked on reads.
- `replacement_entry_id`: non-null for applied stock changes, nullable only for no-stock product swaps or product_mapping; `status`: `applied` for committed eligible correction. Validation failure rolls back insertion; failed attempts belong in normal security/operational logs without claiming effects.

Storage is shared by F1/F2/F3: F1 owns product_mapping domain logic and sale_stock_repost invocation, F2 owns receipt_chain domain logic, F3 owns the one migration/schema/primitive implementation. No generic dispatcher or broader UI mode is added: API routes accept only their F3 kinds and domain validators own other kinds. product_mapping has null entry IDs and before/intended/after mapping snapshots plus approval reference; receipt_chain has original/replacement receipt IDs and its finite original→replacement map/consumer/policy/approval evidence inside snapshots. Add a partial unique index `(org_id,source_entry_id) WHERE kind='receipt_chain'` to forbid double valuation correction of the same source; later compensating operation targets the replacement receipt. One global `(org_id,operation_key)` namespace prevents cross-kind collisions: mismatched kind/payload refuses. Same-org composite entry references use supporting unique `(org_id,id)` index on stk_entries. Grant operation INSERT/SELECT only, no UPDATE/DELETE; write the completed immutable operation row at transaction end, rather than inserting an applied reservation then updating it.

One source may receive later corrections, but expected source version permits only one winner for a given preview. Unique operation identity prevents duplicate response-loss retries; source row locking prevents competing operation keys. No new pending saga state is introduced; preexisting POS repost_pending state is explicitly separate and blocks correction.

#### Validation and transitions

Preview is read-only; `eligible → applied` is one transaction. Stale/blocked/refused preview leaves no correction or stock effect. Same operation/hash returns original result; differing payload is conflict. Receipt original moves `submitted → cancelled`; one replacement moves `draft → submitted` in the same commit, linked through correction metadata. Financial digest must compare identical before and after. Receipt eligibility requires no later ledger rows on any affected bin, unambiguous standalone ownership and a passing `receipt_period_v1` evaluation, recorded in `before.policySnapshot.receiptPeriodPolicy` as defined in [contracts/workflow.md](contracts/workflow.md#receipt-period-policy-v1).

#### Migration/rollback

The single migration `supabase/migrations/20261116193000_stock_corrections.sql` is owned by F3 and includes all five explicitly validated kinds/nullability/partial indexes above, paired stock QA seed/matrix and forced org RLS. F1/F2 consume it, not parallel migrations or tables. Migration adds only correction storage and scoped RLS/indexes; no historical row backfill. Include synthetic QA seed and policy tests. Schema rollback before use drops empty table; after use retain/export correction evidence and roll back code instead of deleting audit history. Production business undo is a new approved inverse movement, never a migration down or ledger deletion.

#### Executable contract references

Source identity and canonical numeric/hash fields are fixed in contracts/workflow.md. `source_id` is UUID, source_type text in the declared closed source set; pos_ticket_line source_id is the sale-line UUID and ticket is resolved from it. The opaque transaction guard/bin context, exact first gate/row order/participant inventory and snapshot-authority interfaces are contracts/transaction-protocol.md; no alternative advisory-key ordering is allowed. Shared migration filename remains exactly 20261116193000_stock_corrections.sql and has all five kinds. Native ownership is contracts/native-qualification.md.

#### Exact SQL column and check contract

`id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `org_id text NOT NULL`, `operation_key uuid NOT NULL`, `kind text NOT NULL`, `source_type text NOT NULL`, `source_id uuid NOT NULL`, nullable `source_entry_id uuid`, nullable `replacement_entry_id uuid`, `payload_hash text NOT NULL`, `preview_hash text NOT NULL`, `reason text NOT NULL`, `actor_id uuid NOT NULL`, `before jsonb NOT NULL`, `intended jsonb NOT NULL`, `after jsonb NOT NULL`, `status text NOT NULL DEFAULT 'applied'`, `created_at timestamptz NOT NULL DEFAULT now()`, `applied_at timestamptz NOT NULL`. SHA fields CHECK `^[0-9a-f]{64}$`; reason CHECK length(btrim(reason)) between 1 and 1000; status CHECK applied only. Kind CHECK is the five declared values, source_type CHECK `pos_ticket_line|stock_receipt|fin_product`.

Kind/source/entry CHECK matrix: product_mapping→fin_product/both entry IDs null; sale_variant→pos_ticket_line/both null or both nonnull; sale_stock_repost→pos_ticket_line/both nonnull; receipt_replace and receipt_chain→stock_receipt/both nonnull. Reject one-null sale pair. Source UUID is resolved by its typed service; no polymorphic FK is invented. Composite `(org_id,source_entry_id)` and replacement equivalents reference supporting UNIQUE `(org_id,id)` on stk_entries. actor_id is an immutable historical UUID SOFT reference with no profile/auth-user FK; current guarded insert admission and actor_id=app.current_profile_id INSERT RLS enforce the actual active principal. Canonical auth/profile deletion must preserve this nonnull historical identity, as recovery-receipts.md specifies. Aggregate UTF-8 bytes of before/intended/after JSON are ≤ 4194304; privacy/shape validators serialize only named source facts and cost evidence, never contact PII or credentials. All rows FORCE org RLS; grant SELECT/INSERT to app_ledger only, no anon/authenticated direct table grant and no UPDATE/DELETE. Grant-policy/foreign-reference/size/kind/nullability/unique-source failures are native migration tests.

StockWriteGuard owns stock-v1 and the existing org authority lock (`hashtextextended(orgId,112)`) on the same transaction and org, before source row locks. Fresh mutation authority/module state is read under that pair; absent app_modules means enabled without placeholder insert. Authority-only writers take the org authority lock but not stock-v1. This adds no table/permission/state column; F3's five-kind immutable schema remains the only migration. Module/authority races and both-empty/period-only non-stock behavior are mandatory native qualification, not numeric field-tier invention.

StockValuationQualificationV1 and public/private placement are defined in [valuation-qualification.md](contracts/valuation-qualification.md). Ordinary intended stores normalized valuation:null|proof; private full manifest requires it. Available costs carry currency/valuationQualificationSha256, unknown denomination is unavailable, denied costs omit all monetary/qualification metadata. No new schema column, currency conversion or normal-writer policy is added.

### Review artifact: contracts/api-admission.md

### Exact correction API admission

These API-only additions create no filesystem page or page-design registry entry. Keep existing ticket and stock-entry registrations in src/lib/routes/route-design-manifest.ts unchanged; that registry accepts pages/redirects, not +server endpoints. API coverage belongs to the existing rbac.service.ts routing functions and actual hook/handler tests. No new registry or broad stock-prefix exemption is selected.

#### Central routing and authoritative service checks

Preserve canonical authentication, selected organization and active-principal checks. In apiWriteCapability, only POST /api/stock/corrections/preview and POST /api/stock/corrections delegate effect-sensitive capability admission to the correction controller/service. The existing POS swap keeps its existing pos:edit gate and delegates additional stock effects. Every other path/method retains its existing capability result.

In apiReadCapability, return null before the generic /api/stock prefix only for the canonical collection pathname /api/stock/corrections and canonical by-id pathname matching ^/api/stock/corrections/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$. Existing hooks apply that function to GET and HEAD. Null means central delegation, not an access grant: both selected handlers must invoke the owning current-principal/source/effect/field admission before returning any receipt. Near-prefix, nested, malformed-ID and other stock endpoints gain no exemption. Query fields do not affect pathname matching and remain strictly decoded by the handler.

The service first admits the current active same-org principal with POS-view or stock-view authority. It may read only the org-scoped correction identity/header (id, kind, source_type/source_id, source_entry_id/replacement_entry_id and required operation/payload identity), without before/intended/after, costs or proof references, to choose its existing source/effect matrix. Resolve the actual same-org source/record admission next. Only an admitted result may load/project full immutable evidence:

- sale_variant with both entry references null: actual POS-only stockless matrix; no stock:view, finance or owner requirement is added.
- sale_variant with both references present: existing POS plus stock effect/read matrix and independent cost disclosure.
- receipt_replace: existing stock/source matrix and independent cost disclosure.
- private sale_stock_repost: current real-owner/private POS/stock/finance matrix before full garment evidence.
- product_mapping and receipt_chain: unsupported here; their own typed private services remain authoritative. No generic domain dispatcher is introduced.

Inconsistent references fail closed. Payload hashes, client flags, saved local pointers and source IDs are never authority. All reads own the selected nonlocking snapshot and use the existing RLS/qualified injected target; no broader app_ledger grant, extra global pool or writer lock is selected.

#### GET, HEAD and opacity

GET collection requires the exact operationKey/payloadHash query and existing CorrectionStatus input. A missing, foreign, unsupported or currently undisclosable operation produces the same outcome:unknown/receipt:null without existence details; a wrong hash conflicts only after that matching operation is independently authorized. This status never proves rollback or permission to write. GET by-id retains identical generic 404 for missing/foreign/unsupported/currently denied records. Known committed receipts are acknowledged independently of later source changes or deletion of the historical actor.

Both route modules export explicit HEAD wrappers that execute their authorized GET lookup/projection and preserve its status/headers but return no body. HEAD cannot become an existence or private-cost probe. Every response uses Cache-Control:private,no-store. No opaque before/intended/after or protected valuation reference is spread into a response; cost denial strips amount, currency and qualification metadata together.

#### Required proof

Extend existing rbac.service tests and actual hook-through-handler correction route tests: a POS-view/edit actor with no stock:view completes a both-empty swap, loses its response, then recovers the same receipt through collection GET and by-id GET/HEAD with no second POST. Include stock-disabled/POS-enabled, wrong/foreign source, stock-changing denial, private nonowner denial, missing/wrong hash, malformed/near-prefix paths and unrelated stock read/write gates. Test denied and missing collection responses are indistinguishable, by-id/HEAD denial has no body/details, and current cost denial exposes no nested proof or currency. Keep native thirteen behavior names; extend the existing reuse/authority cases rather than adding a fourteenth.

### Review artifact: contracts/browser-recovery.md

### Public UI pending identity survives reload and process loss

The selected public POS-ticket and standalone-receipt clients save ONE immutable minimal identity before POST; server outcome/receipt always comes from the independently authorized GET in recovery-receipts.md. Private F1 CLI uses its original protected manifest/preview/output files and does not depend on this browser mechanism. No new generic persistence framework, database pending row or source-history endpoint is selected.

#### Exact pointer and helper boundary

Create src/lib/components/stock/correction-pending.ts and correction-pending.test.ts, stock-specific pure schema/key helpers plus explicit browser Storage adapter. No server runtime/Node/env import. The two actual PageBody owners import it; the server remains authority.

```ts
export type PendingCorrectionV1={schemaVersion:1,orgId:string,profileId:string,
  sourceType:'pos_ticket_line'|'stock_receipt',sourceId:string,
  operationKey:string,previewHash:string,payloadHash:string};
export type PendingCorrectionScope={orgId:string,profileId:string,
  sourceType:'pos_ticket_line'|'stock_receipt',sourceId:string};
export function decodePendingCorrectionV1(value:unknown):PendingCorrectionV1;
export function pendingCorrectionKey(value:PendingCorrectionV1):string;
export function persistPendingCorrection(storage:Storage,value:PendingCorrectionV1):void;
export function readPendingCorrections(storage:Storage,scope:PendingCorrectionScope):PendingCorrectionV1[];
export function dismissAppliedPendingCorrection(storage:Storage,value:PendingCorrectionV1,
  status:CorrectionStatus):void;
```

All IDs are canonical lowercase UUID; hashes of 64 lowercase hexadecimal characters, exact keys only. Scope org/profile are the current authenticated server-layout identity, source is the actual authorized line UUID for ticket variant or original stock entry UUID for receipt replacement (not ticket UUID for a line). Key is exact `minion:stock-correction:pending:v1:<orgId>:<profileId>:<sourceType>:<sourceId>:<operationKey>:<payloadHash>`. Canonical compact JSON with those fixed fields is deterministic; no createdAt/attempt/outcome field, reason, command, price/rate, customer data, token, cookie or connection value is persisted. Distinct payloads cannot overwrite a same-operation pointer; identical identity produces identical bytes. No mutable local outcome/CAS/last-writer-wins success is promised.

Each UTF-8 record is at most 1,024 bytes, at most 20 records totaling 20,480 UTF-8 bytes per org/profile, and inspect at most 4,096 origin storage keys. Exceeding any bound, unavailable Storage, SecurityError/quota, malformed matching-prefix key/record, unknown v1 field/version or conflicting existing bytes throws a FIXED safe recovery-storage-unavailable refusal. Do not truncate, overwrite/delete a corrupt pointer, evict unknown outcomes or silently use component/session memory instead. No expiry/timer automatically removes unresolved pointers. The owner may inspect their copied reference through existing authorized support; an unknown local record is not proof of a pending database row.

persistPendingCorrection synchronously reads the exact key; identical bytes are reusable, different bytes refuse. For a new record setItem then getItem and strict-decode/byte-compare before any mutation fetch is invoked. Storage errors/readback mismatch mean zero POST. Independent keys preserve two tabs' distinct operation identities without an array read-modify-write or fictitious localStorage transaction. These are ordinary same-profile persistent site-storage semantics; this does not promise survival after a user clears site data, a different browser profile, device/storage loss or storage disabled by policy. Unsupported persistence blocks new confirmation instead of pretending crash recovery is available.

#### Actual host transitions

After an eligible preview has supplied both hashes and the operator confirms that unchanged reason/request, each POS ticket/stock-entry PageBody checks current authenticated scope and existing pending identities for that source. Any unresolved pointer blocks a new operation; show Check result and the safe copyable operation reference. Before the first POST, persist/read back the new pointer and set an in-memory sent guard for that identity; double callback/cross-tab notification never becomes another automatic POST. Existing per-org server gate, fresh source fingerprint and unique key remain the concurrency authority; storage is not a write lock.

On initial mount/reload/reopen and native storage events, read only the current org/profile/source prefix, decode and call exact GET `/api/stock/corrections?operationKey=...&payloadHash=...` with cache:no-store. Do not re-create an approval or submit merely because a pointer exists. Applied matching receipt restores the original outcome/original/replacement links and reloads current source data without POST; its key/hash/source must match. unknown stays unconfirmed/blocked, no automatic retry/new key, no fabricated failure/rollback. Current scope denied/query/decode failure also remains blocked with safe unavailable text; it never clears the pointer. A current policy change does not make old stored identity an authority grant.

An applied pointer stays until explicit operator Dismiss after a freshly authorized matching applied receipt; dismissAppliedPendingCorrection verifies current scope, operation key and payload hash then removes only that exact deterministic key. Dismiss never changes stock or the durable receipt. A stale tab cannot reinterpret another tab's removal as rollback or permission to resubmit; it retains its sent/blocked identity until its own authorized status check and fresh current-source read. No local outcome is overwritten from another tab. Each mounted owner has a scope-generation counter; org/profile/source switch aborts read requests, clears displayed facts/callbacks and ignores late responses/generations. Keep the old scoped minimal pointer for later SAME-principal recovery; never show another profile's record or receipt. Logout clears rendered state, not a hidden server operation. Canceling fetch does not undo a possibly committed write.

An unknown pointer cannot be silently discarded to create another operation. Offer read-only Check result and Copy reference; persistent unknown requires authorized owner/support reconciliation of the original operation, not a generic browser reset described as rollback. The UI need not persist a sensitive command to retry it. The existing separately authorized private/operator recovery remains available with its full exact intent; no public blind replay is added.

#### Definite refusal is separate from unknown

A public handler may return exact `{outcome:'not_applied',operationKey,payloadHash,code}` only for a typed CorrectionPreflightRefusal raised by the owned service before its first possible BUSINESS DML. The service owns a private writesStarted marker set before any create/cancel/submit/stamp/receipt/audit helper can execute; all prior source/authority/module/period/bin admission is qualified read/lock-only with no placeholder writes. Only an actual typed domain refusal with writesStarted:false can create this response. No caller flag, HTTP status, raw error text, failed COMMIT or failed rollback proves it. After writesStarted:true, any uncertain exception uses the existing unknown boundary and never emits not_applied, even if a rollback seems likely. Private CLI error semantics remain separately defined.

Export CorrectionRefusalCode exact union 'capability_denied'|'source_unavailable'|'stale_preview'|'policy_unverified'|'period_locked'|'negative_stock'|'stock_scope_required'|'price_differs'|'invalid_request' and CorrectionNotApplied={outcome:'not_applied',operationKey:string,payloadHash:string,code:CorrectionRefusalCode} from stock-corrections.logic.ts. Required identity fields use the same UUID/SHA decoders as CorrectionCommand. Map current capability/source/stale/period/quantity/scope/price/body preflight categories to those literals with existing HTTP `403`, `404`, `409`, `422` and `400` semantics; never raw service text. The private service-only constructor records the original validated key/hash; no user-controlled proof flag is accepted. Parser/early central denials that cannot validate the identity return their existing safe error without this marker. The selected route and service tests prove every marked branch has zero business DML and rejects a forged client not_applied/writesStarted field. No new transaction-outcome framework or permission bypass is created.

The browser may clear an exact pointer after this marker only in the still-live original POST callback created by this mount, with exact key/payload and unchanged authenticated scope-generation, and only when that pointer was newly persisted for that request (not a resumed unknown). This is an in-memory nonserializable callback context, never a trusted property loaded from Storage. It shows the refusal and requires a new explicit preview/confirmation; it never auto-retries. An old-tab/late/mismatched denial or a resumed pointer's denied status GET cannot clear identity. All arbitrary errors/5xx/transport/output loss/malformed responses retain unknown. Test this distinction rather than dropping a pointer for every non-OK response.

#### Required proof and selected files

Add both helper paths to the exact F3 inventory/focused command. Modify the already selected POS ticket PageBody.svelte/page.swap.mounted.test.ts and stock/entries/[id]/PageBody.svelte/page.correction.mounted.test.ts for pre-POST persistence, scope generations, status-only restoration, explicit applied dismissal and storage events. stock-corrections.logic.ts owns the exact not_applied DTO/decoder; stock-corrections.service.ts owns the private preflight refusal marker and no-DML boundary; collection/swap handlers serialize that class only. Extend their already selected ordinary route/service suites and existing native fault/reuse behavior, no fourteenth semantic name or extra lane.

Mounted tests for both hosts cover reload/memory destruction after a committed POST whose response is lost, restoration from the same stored pointer and zero second POST; wrong account/org/source/generation; two tabs with independent keys and same-identity bytes; applied dismissal/late tab; fresh typed preflight refusal versus resumed/unknown denial; malformed/quota/disabled/full storage before submission (zero POST); and no reason/money/customer/token in persisted bytes. Native route tests bind marked refusals to actual zero DML, and after-first-write/commit-response-loss cannot claim not_applied.

Real Browser Harness qualification uses a persistent synthetic local browser profile: save pointer, allow actual local-QA commit while suppressing the response, destroy the tab/client process state, reopen the same authorized source/profile and recover the original receipt from server GET with no new write. Repeat actual browser restart with that persistent profile, then storage-disabled admission refusal. Page-context recreation alone is labeled mounted/context evidence, not full browser-restart proof. Account-switch/denied-access and keyboard Check/Dismiss actions must qualify. No production identity/data or raw private manifest is stored.

### Review artifact: contracts/garment-envelope.md

### Private F1 garment command and atomic evidence envelope

This is the concrete F1→F3 service boundary. Public correction endpoints accept variant_swap or receipt_replace only. A stock_only body receives `422` owner_evidence_required, zero effects; a user-supplied evidenceSha256 or approvedItemMapping is never an attestation. The ticket UI can explain the blocker and produce an inert F1 packet, not submit private intent. F1 CLI executes only after target verification, GoTrue principal verification, explicit owner spec/operation approval and deployed foundation qualification.

#### Typed complete manifest and digest

Export GarmentManifestV1 and its strict decoder from stock-corrections.logic.ts, so server code does not import an executing CLI module. F1 imports that type/decoder after shared bootstrap. Required exact fields (unknown keys rejected):

```ts
type Digest = string; // exactly 64 lowercase hex
interface GarmentBinFingerprint {
  itemId: string; warehouseId: string; exists: boolean;
  rowSha256: Digest | null; latestLedgerId: string | null;
  latestLedgerRowSha256: Digest | null;
}
interface GarmentEffect {
  itemId: string; warehouseId: string;
  qtyBefore: string; qtyAfter: string;
  valueBefore: string; valueAfter: string; cogsDelta: string;
}
export interface GarmentManifestV1 {
  schemaVersion: 1; kind: 'garment_stock_only';
  valuation: StockValuationQualificationV1;
  action: 'correct' | 'compensate'; inverseOfOperationId: string | null;
  target: QualifiedOperatorTarget; sourceCodeSha: string;
  operationKey: string; orgId: string; actorProfileId: string;
  ticketId: string; lineId: string; originalEntryId: string;
  replacementEntryId: string; originalLedgerIds: string[];
  oldItemId: string; newItemId: string; qty: string; stockUom: string;
  warehouseId: string; mappingCorrectionId: string;
  sourceFingerprint: Digest; mappingFingerprint: Digest;
  binFingerprints: GarmentBinFingerprint[]; periodFingerprint: Digest;
  sourceEvidence: { reference: string; sha256: Digest }[];
  trueUpCoverage: { status: 'not_covered'; reference: string; sha256: Digest };
  postedAt: string; accountingTimezone: string;
  reason: string; ownerApprovalReference: string;
  beforeEffects: GarmentEffect[]; intendedEffects: GarmentEffect[];
}
export interface GarmentCorrectionCommand {
  manifest: GarmentManifestV1;
  approvedPlanSha256: Digest;
  previewHash: Digest;
}
```

UUID fields use canonical lowercase UUID; originalLedgerIds are sorted unique positive bigint decimal strings, never Number. Bin fingerprints/effects sorted itemId/warehouseId, exactly the old/new pair in this one admitted warehouse, no extra keys. The old/new IDs differ; replacementEntryId differs from source and resolves unused or the exact prior applied operation. Fixed qty and finite values follow F1's exact stock quantity/independent value-effect qualification, never diagnostic epsilon in approval hashes. sourceCodeSha is the exact qualified 40-hex candidate; source evidence references/reason/owner reference are trimmed bounded nonempty strings (1–1000 characters each); 1–20 evidence refs, no raw customers/credentials, no arbitrary inline attachments. Maximum manifest serialized UTF-8 size is 262144 bytes. postedAt is canonical UTC ISO with exactly 3 fractional digits and Z, roundtrips through Date unchanged; accountingTimezone is an actual IANA zone matched to fresh finance settings. No original historical posting time, server-now substitution or silent millisecond truncation. Dates not in the currently approved open correction period refuse. Apply also enforces the posting-time order rule for `StockPostingOptions.postedAt` in [transaction-protocol.md](contracts/transaction-protocol.md#typed-stock-seams): a postedAt earlier than the latest affected ledger row or later than admission time refuses `posted_at_out_of_order` (CLI exit 4) with zero effects, and needs a new approved manifest. sourceFingerprint/mappingFingerprint/periodFingerprint use the exact row-hash structures in workflow.md/F1 repair contract. A not_covered string is not sufficient evidence: recompute actual receipt/true-up coverage under the stock gate; unknown, incomplete or covered refuses.

Canonical manifestSha256 hashes every normalized field above, including target, actor, source/evidence/coverage refs, posting time, timezone, owner reference, allocated replacement UUID and before/intended effects, using workflow.md sorted UTF-8 JSON. It does NOT include the external approvedPlanSha256 or previewHash, avoiding circular hashing. F1's --approved-plan-sha256 supplies this exact digest; decode and recompute in the server, never trust CLI parsing alone. A changed timestamp/evidence/reference/source/value/target needs a new explicit owner approval. File mode `0600` is a local protection, not service authority.

#### Exact owning entrypoints and current-state binding

stock-corrections.service.ts exports:

```ts
export function previewGarmentStockCorrection(ctx: CoreCtx,
  manifest: GarmentManifestV1): Promise<GarmentCorrectionPreview>;
export function applyGarmentStockCorrection(ctx: CoreCtx,
  command: GarmentCorrectionCommand, actor: Actor): Promise<GarmentCorrectionResult>;
```

Both own their one transaction; caller must not nest a CoreTx or perform an outer stamp/audit patch. Preview uses actual active principal/org and the shared nonlocking REPEATABLE READ READ ONLY admission. It may create a reviewable preview without an approvedPlanSha256; it never marks owner approval satisfied. Apply requires actor.id=ctx.profileId=manifest.actorProfileId, same qualified target/org, fresh actual membershipRole==='owner' (not a custom role key or platform-admin bypass), plus F3's stock-changing POS capability/cost/module matrix and effective-authority narrowing. A stock-managing nonowner cannot use this private path. Existing-session verification occurs before import/business reads; current profile.deletion_pending and org.status checks occur again inside the business snapshot/admission, as defined in transaction-protocol.md.

Apply verifies approvedPlanSha256==manifestSha256, then takes stock-v1 and the org authority lock before source rows. Under the same guarded transaction, validate the complete F1 known-garment eligibility for action correct (inverseOfOperationId must be null): exact ticket/line product M, one frozen original L1 source-owned issue, exact original ledger IDs, mappingCorrectionId is an applied same-org product_mapping receipt whose recorded after-state matches current M mapping, source/mapping/bin/latest-boundary/period fingerprints, no true-up coverage, exact current cost/value effects and posting period/timezone. Validate evidence digest references against this evidence-bound operation; missing/external physical intent remains an owner approval prerequisite, never manufactured from source price. Known cases are evidence candidates, not a standing allowlist. Second shared-bin repair requires fresh preview/manifest/approval. No source guard can be waived by an opaque hash that the service never compares.

The private previewHash binds {schemaVersion:1,domain:'garment_stock_only',manifestSha256,sourceSnapshot,stockSnapshot,policySnapshot}. Private payloadHash binds {schemaVersion:1,domain:'garment_stock_only',orgId,actorProfileId,manifestSha256,previewHash}; do not replace it with the generic public payload hash. Recompute and compare all fresh snapshots before effects. Operation key is manifest.operationKey; changing any manifest intent with the same key yields `409` key_reuse even when visible item/qty is unchanged. Source stale yields `409` stale_preview. Current policy/profile/org/owner failure yields `403` with zero effects.

Pass postedAt=new Date(manifest.postedAt) to both cancelEntryInTx and replacement create/submit StockPostingOptions, and entryId=manifest.replacementEntryId to replacement creation. The replacement carries the sale metadata in [workflow.md](contracts/workflow.md#replacement-entry-metadata), for both actions. The same timestamp governs reversal/replacement and their current open accounting period. It does not restate original dates. Immutable stk_corrections kind sale_stock_repost records the full bounded normalized manifest, manifestSha256, previewHash, qualified actor/target, approval reference, original/replacement/ledger/map refs, approved posting time/timezone and actual before/intended/after effects; reuse existing before/intended/after JSON fields, no second migration/sidecar mutable row. Insert that receipt and recordAuditInTx in the same transaction as cancellation, new issue, source stamp and audit. The audit records digest/refs rather than raw private evidence. No post-commit CLI receipt augmentation is permitted.

Same key/actor/manifest/previewHash returns the original authoritative receipt with no new event/ledger/audit. Status uses exact same-org operation plus digest and current authorization; missing/conflicting receipt remains unknown/conflict, never proof of rollback. An approved timestamp has changed only when a new approved manifest does, never during retry. F2 uses its own receipt-chain command, not this garment method; generic variant/receipt paths remain independent.

#### Required executable counterexamples

Within existing stock-corrections native cases for frozen lines and operation reuse, assert public stock_only cannot write even for owner; missing/wrong digest or nonowner private call refuses; altered true-up/evidence/target/replacement UUID/posting time/owner ref with the same key conflicts; stale mapping/bin/period/profile refuses. Applied receipt must contain the exact approved manifest/time, every reversal/replacement has that timestamp, and lost-response status returns the same durable envelope. F1's own native suite invokes these actual entrypoints, not a mocked generic command. Inject fault at receipt/audit and assert all business effects roll back. No raw financial changes or second posting engine.

beforeEffects has exactly the two frozen bin states: qtyBefore=qtyAfter and valueBefore=valueAfter=current recorded snapshot, cogsDelta='0'. intendedEffects repeats those same before values and carries the independently qualified planned after values/current-period COGS delta. The receipt after records actual post-correction effects and checks equality under the reviewed exact-source posting/numeric oracle; it never silently changes approved effects to fit the current state. The generic previewHash exclusion of wall clock does not exclude this private command's approved postedAt: it is deliberate immutable owner intent, bound via manifestSha256.

getStockCorrection recognizes a garment-domain sale_stock_repost receipt by its validated stored domain discriminator; its full domain receipt/status requires the same current real-owner/finance/capability/profile/org checks as this private method. Nonowner gets `404` without a manifest leak, even if generic stock detail would otherwise allow quantity fields. Ordinary stock entry/history visibility is unchanged. The decoded manifest is stored under intended.domainManifest and its digest under intended.manifestSha256; before keeps the frozen source/bin/policy snapshot, after keeps actual resulting entry/ledger/time/value refs. This exact field placement avoids a new table or mutable sidecar.

#### Explicit bounded garment compensation

The same strict GarmentManifestV1/decoder, previewGarmentStockCorrection/applyGarmentStockCorrection owning functions and private F1 CLI support action='correct' with inverseOfOperationId:null, OR action='compensate' with one canonical prior correction UUID. Both action/reference fields are required and bound by manifestSha256, private previewHash and payloadHash. No undo option bag, public stock_only bypass, third engine or rate override is introduced. Unknown keys/mixed action/reference shapes refuse.

Compensate admits only a same-org applied sale_stock_repost whose stored domainManifest.kind='garment_stock_only', action='correct' and source ticket/line match. Require that forward receipt's replacement issue is the current single live submitted source-owned M issue, actual ticket stamp points to it, original M sale product/qty/warehouse is unchanged, mapping still matches the qualified M mapping receipt, current bin/latest-ledger/period/source/payment/fiscal/coverage fingerprints match a FRESH approved inverse manifest, and no intervening affected-key movement, conflicting correction or source reference exists. The original L issue is now cancelled and remains immutable evidence. Neither missing/foreign/unknown receipt, inverse-of-inverse nor previously compensated/no-longer-live forward map can enter. Lock and validate the actual receipt, source, entries and bins under the common pair/order before mutation; action never substitutes authority.

For this inverse oldItemId=M/newItemId=L; originalEntryId is the forward receipt's replacement M issue, not the already cancelled historical L issue. Copy that current issue's frozen single quantity/warehouse and replace only M with the original forward manifest's L item. Check exact forward-before ownership/units against retained original lines/ledger. Use a new manifest.replacementEntryId and current open manifest.postedAt for both cancellation reversal and new L issue. It restores prior source quantity attribution while preserving the correct M sale product and every payment/date. Update the same source stock stamp to the new compensating issue; never reactivate a cancelled entry/ledger or rewrite current recipe. Explicit planRepost uses allowedItemIds={M}, allowIncreaseItemIds={L}. Ordinary moving-average computeLegValue/applyLedgerDelta and negative-stock guards remain authoritative; no historical-rate override.

The inverse preview/manifest must show its actual complete bin/value/current-period COGS impact. With unequal rates, a moving-average inverse can restore quantities without restoring the prior economic values. Do not promise a zero-cost rollback, before-value equality or use diagnostic tolerance to hide that difference. The owner approves this new exact impact; unsupported/missing evidence or unapproved values refuse. QA's equal-rate synthetic fixture verifies quantity/value/COGS restoration within the selected engine oracle; a separate unequal-rate fixture asserts the disclosed actual inverse effect and explicit residual versus the original before-state. This selects a compensation policy, not frozen-rate replay or a production valuation rewrite.

Write a new immutable sale_stock_repost receipt/audit with intended.action='compensate', intended.inverseOfOperationId, full domainManifest/digests/approved time and before/intended/actual after facts, plus actual source/current/new issue map. Existing same-key replay and source-entry uniqueness make repeated inverse zero-effect or conflict; a second key cannot compensate the no-longer-live forward replacement. getStockCorrection keeps the real-owner/finance/current-principal gate and returns both operation references without leaking them to nonowners. Forward and inverse have separate owner approvals; status never manufactures one from the other.

F1 disposable QA finally invokes this actual compensated command only after authoritative forward receipt lookup; a proven rolled-back forward gets no inverse, an unknown forward is reconciled first, and an inverse failure fails the rehearsal. Drop only the owned child after recording failure; never reset rows to disguise incomplete compensation. Production finally never performs undo. Production compensation requires separate current exact approval, like every other write. Add forward/inverse/repeat/lost-response, wrong-kind/foreign/inverse-of-inverse, concurrent/new source/bin state, unequal-rate disclosure and fault rollback cases within existing F3 frozen-line/reuse native behaviors and F1's eight behaviors, keeping their exact names/counts. Both directions use actual private owning functions, not mocks or direct repair SQL.

Exact full private preview/result/status and F1 CLI flags are [recovery-receipts.md](contracts/recovery-receipts.md); exact value field normalization/formulas/approval equality/independent oracle are [garment-numerics.md](contracts/garment-numerics.md). Effect values are source Number/String outputs, not generic fixed 4-decimal fields; both actions use this contract.

The required valuation object and its exact decoder/hash/admission are [valuation-qualification.md](contracts/valuation-qualification.md). Every private effect is denominated by manifest.valuation.currency; available preview/receipt carries that currency and valuationQualificationSha256. This adds no rate conversion. Inverse requires a fresh current-owner qualification with the forward receipt currency; historical status preserves original proof without requiring that historical attester still be active.

### Review artifact: contracts/garment-numerics.md

### Source-compatible garment value and COGS oracle

This is the exact value/effect qualification for both private garment actions. It reuses existing stock.logic computeLegValue/applyLedgerDelta and stock.service cancellation/persistence; it does not introduce four-decimal valuation rounding or another posting engine.

#### Field normalization and bounds

GarmentManifestV1.qty is a positive canonical fixed 4-decimal string with at most 9 integer digits; compare its rational quantity to the frozen single original line/ledger. stockUom is exact admitted common stock unit. Row fingerprints bind RAW original PostgreSQL numeric strings unchanged. Every GarmentEffect qtyBefore/qtyAfter/valueBefore/valueAfter/cogsDelta is instead the exact canonical ECMAScript String of its finite selected Number calculation, length ≤ 128 bytes, and must satisfy String(Number(text))===text. This permits canonical exponent spelling for small values; reject NaN/Infinity/noncanonical spelling and negative zero. Quantity/value/rate intermediates must be finite and absolute ≤ 1000000000. Bin before/after quantities and values are nonnegative; cogsDelta may be signed. Do not feed these effect fields through the generic new-line fixed 4-decimal decoder. Original strings that differ only by stored decimal scale still have different row fingerprints; display/effect normalization does not weaken approval state.

A beforeEffects row uses nQty=Number(actualBin.qty), nRate=Number(actualBin.valuationRate): qtyBefore=qtyAfter=String(nQty), valueBefore=valueAfter=String(nQty*nRate), cogsDelta='0'. A missing admitted bin is exact EMPTY_BIN{qty:0,rate:0} plus missing-row fingerprint; no placeholder write. intendedEffects repeats those before values and the fully simulated after result. afterEffects is computed from actual newly inserted ledger and bin rows under the same transaction, with the exact same String formulas. All effect arrays contain exactly old/new item keys in the one approved warehouse, sorted itemId/warehouseId.

#### Exact engine sequence

1. Load both raw bin qty/rate and the source original ISSUE ledger row. Let dQ=-Number(original.qty_delta), dV=-Number(original.value_delta); cancellation reverses original stored signed effects, never originalQty times a current rate. Call actual applyLedgerDelta on that old-item bin with dQ,dV.
2. For the new issue on the new item, dQ=-Number(manifest.qty); call actual computeLegValue(currentNewBin,dQ,null), so dV=dQ*currentNewBin.rate. Issue line rate input cannot override this outgoing valuation. Call actual applyLedgerDelta.
3. applyLedgerDelta computes newQty=qty+dQ, newValue=qty*rate+dV, and derived rate=abs(newQty)>1e-9?newValue/newQty:0 (the actual source EPS). Detect negative/nonfinite raw derived rate/value/quantity and REFUSE this private command instead of silently relying on the ordinary helper's carry-last-good-rate fallback. Keep exact source arithmetic order; no decimal/currency/four-place quantization at each movement.
4. Persist qty_delta/qty_after/valuation_rate/value_delta with actual existing String(Number) serialization. For each key valueAfter=String(finalQty*finalRate); cogsDelta=String(-sum(value_delta of all newly appended ISSUE-header rows for that key, ordered original ledger sequence then replacement line order)). This includes the positive cancellation row (negative COGS) and negative new issue row (positive COGS). No abs or sign inference from displayed quantity. All appended rows keep the approved current timestamp. Sum keys in sorted order for any displayed net COGS, without inventing a payment or pos_client_ledger change.

For action compensate, the original source in this algorithm is the forward replacement M issue, and the new issue is L; pricing remains normal current moving average. The same formulas independently show whether quantities and economic values return to the earlier state. Unequal-rate compensation may have a nonzero cost delta/residual and is approved as such; no economic rollback claim or frozen-rate override.

#### Independent oracle versus exact approval

Implement the independent BigInt rational oracle in stock-corrections.logic.test.ts/selected native test support, not by re-calling computeLegValue/applyLedgerDelta. Parse original finite decimal strings and canonical exponent strings as exact sign×integer/10^scale; cap input length at 128 and exponent magnitude at ≤ 324 before constructing bounded integers. Use exact rational q*r+dV, newQty and division for rates; reproduce only the declared abs(q)>1e-9 branch. Check each leg's quantity difference ≤ 1e-9 and currency-value/rate difference ≤ 1e-8; a larger discrepancy or a fallback branch makes the operation ineligible. These are chosen engine-compatibility bounds, not invoice rounding allowances. No Math.abs workaround admits a negative bin/value.

Approval comparison is STRICT: recompute actual source-compatible expected effect strings and require byte equality to the manifest's before/intended effects, plus exact original row/state hashes. After posting canonicalize each newly generated PostgreSQL numeric TEXT as String(Number(actualText)) with the same finite/bounds/oracle checks, then require those canonical generated strings and recomputed afterEffects equal the approved source-engine strings. PostgreSQL may expand an inserted exponent (1e-8) to plain decimal text (0.00000001); do NOT falsely require PostgreSQL TEXT to preserve the engine lexical spelling. Raw original/fresh row fingerprints still bind unmodified PostgreSQL TEXT exactly. Require inserted helper payload strings to equal the source-engine plan, and separately satisfy the independent oracle tolerances. Tolerances never compare approval hashes or permit a changed manifest effect to reuse a key. No post-write adjustment rewrites the manifest to fit observed values; any mismatch rolls back all ledger/bin/stamp/receipt/audit effects.

Mandatory fixtures in existing frozen-lines/reuse native behaviors and ordinary pure tests: fractional qty 0.1000 with nonterminating moving-average rate from mixed incoming values; different original-L cancellation cost and current-L average; fractional new-M rate with more than 4 fraction digits; both action directions; exact-zero terminal bin; tiny canonical exponent effect; tampered effect rounded to 4 places (reject even if a display looks equal); nonfinite/negative/fallback/magnitude overflow; and unequal-rate inverse versus qualified equal-rate restoration. Assert original raw spellings in row hashes, exact planned/actual String fields, independently computed rational bounds, signed key COGS, preserved payment facts and full immutable receipt. No new native behavior name or production arithmetic change is selected.

All monetary stock effects use the common denomination bound by manifest.valuation in [valuation-qualification.md](contracts/valuation-qualification.md); the numeric engine performs no FX or new rounding. Source raw scalars do not acquire denomination from a ticket or current display setting.

### Review artifact: contracts/native-qualification.md

### Exact native qualification ownership

Ordinary Vitest excludes every `*.sql.integration.test.ts`; `bun run test` and a plain focused SQL filename do not prove these behaviors. Add `src/server/services/stock-corrections.sql.integration.test.ts` exactly once to `NATIVE_POSTGRES_MANIFEST['qa-native']` in `scripts/qc/native-postgres-manifest.ts`. Register it with `exactAssertions: true`, `minimumAssertions: 13` and `requiredBehaviors` set to these thirteen full test names. This is the one canonical registration; every other mention refers here. `exactAssertions` is the F7-owned flag from [native-exact-count.md](../128-faces-receivables-audit/contracts/native-exact-count.md); this feature registers its file only after that flag qualifies, and the pinned report's minimum-only check is not exact-count evidence.

- `stock corrections against PostgreSQL preserves POS only no stock swap and rejects unauthorized stock effects`
- `stock corrections against PostgreSQL freezes approved stock only lines and preserves financial facts`
- `stock corrections against PostgreSQL rolls back every intermediate write and records one immutable outcome`
- `stock corrections against PostgreSQL reconciles lost response and rejects changed intent operation reuse`
- `stock corrections against PostgreSQL serializes absent bins normal posting correction and rebuild under the first org gate`
- `stock corrections against PostgreSQL serializes period fiscal and void guards before correction`
- `stock corrections against PostgreSQL drains old mapping posters and refuses persisted old mapping pending sources`
- `stock corrections against PostgreSQL enforces tenant scoped five kind schema immutable grants and private source ownership`
- `stock corrections against PostgreSQL repeated concurrent booking completion reuses frozen draft and submitted source once`
- `stock corrections against PostgreSQL absent permission deny insertion serializes with correction in both authority lock orders`
- `stock corrections against PostgreSQL absent enabled module can be disabled only before or after the guarded correction`
- `stock corrections against PostgreSQL serializes warehouse timezone and bundle eligibility writers in both arrival orders`
- `stock corrections against PostgreSQL rejects deleting principals and inactive organizations before correction admission`

Use describe(`stock corrections against PostgreSQL`) and the corresponding remaining it titles, not merely comments matching them. Update native-postgres-manifest.test.ts and native-postgres-report.test.ts for unique ownership, required-name/count and missing/failed/skipped/todo rejection. Lane count remains 9. The correction file requires the thirteen behaviors above. Existing qa-native config automatically includes admitted files; no new glob or CI bypass. Pure/API/mounted tests remain in ordinary/focused gates, and build remains mandatory.

The actual authority source includes public-qualified tables, so SELECT an owned disposable database, not a search-path-only schema. Follow the exact controller identity/privilege/marker/child-database creation and cleanup recipe in [F7 quickstart](../128-faces-receivables-audit/quickstart.md), using unique child name minion_qc_faces_correction_<32hex> (validate ^minion_qc_faces_correction_[a-f0-9]{32}$). The admitted loopback minion_qc controller must have actual marker minion-360-disposable:v1 and existing CREATEDB or superuser privilege; no ALTER ROLE/escalation. Verify existing app_ledger is non-bypass/non-superuser and SET ROLE is admitted. Missing privileges fail before DDL, never skip or use another target. Create only that owned child database, set its marker, derive its private URL by changing only the controller URL database path, and requalify actual child identity before schema/migration setup. Seed canonical public org/profile/member/authority/module/settings/POS/source/booking/stock tables and apply the real shared five-kind migration there with forced org RLS and existing app_ledger role. No rewriting public-qualified SQL or copying predicates to mocks. Inject real child Drizzle handles into actual helpers; test account deletion's local transaction with injected fixture clients and only external admin network teardown stubbed. No application-pool fallback or real auth-account deletion.

Use independent owned child connections and actual source locks/observed wait barriers. In finally release blockers, close/rollback all child handles, DROP only the recorded validated owned child database via controller, assert it absent, then close controller. Never drop controller/shared QA or touch its business public tables. The target is selected now; future fixture failure is failed qualification, not a new implementation choice.

Full qa-native also requires the existing owned full-schema QA URL/guards for its other admitted suites. Provision both targets using docs/qa-stack.md and the existing CI qa-native provisioning recipe (`.github/workflows/ci.yml:652–684`); verify their actual markers before setting private shell variables. From the isolated exact Hub candidate, after implementation:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$FACES_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$FACES_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-stock-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-stock-qa-native.json
bun run check
bun run test
bun run build
```

The first invocation is the whole admitted lane, not a file-filtered run. Completeness guard requires every admitted file/semantic test, zero failures/skips/todos and exact counts. A filtered development run is labeled focused only and cannot be submitted as full-lane evidence. Missing/invalid marker, role, target or fixture readiness fails the test and lane before writes; no skipped 'optional native' success. Separate migration/seed-pairing, route/RBAC, i18n/design/token and browser gates in quickstart remain required.

The authority cases use the real section-access and module writers and the existing org authority lock after stock-v1, before source rows. If denial/disable commits first, correction must refuse with zero effects; if correction holds the org authority lock first, authority mutation waits and applies after correction commit. Seed ABSENT rows initially to expose the phantom-insert counterexample. Assert no deadlock against the existing account/profile/member order, no stock-module requirement for verified POS-only swaps or period-only bookkeeping, and no invented stock sensitive tier (finance is the existing cost tier). A stock gate or FOR SHARE alone is not proof of policy/module exclusion.

Behaviors 12 and 13 run the writer, profile and org matrix in transaction-protocol.md. Behaviors 5 and 6 also run `submitTicket` and `voidTicket`, which take POS advisory locks, against a correction in both arrival orders, and assert no deadlock and the lock order in [transaction-protocol.md](contracts/transaction-protocol.md#first-stock-gate-existing-authority-gate-and-exact-order). Behavior 1 includes a mixed ticket whose other line issued stock while the swapped line's two plans are empty, and a booking that already holds the replacement product. The private full garment manifest/time/replay/public-path-refusal matrix runs within the existing frozen-lines and operation-reuse behaviors, as garment-envelope.md specifies. Thirteen names are mandatory, not unregistered comments.

The complete child auth schema/users/uid owner+ACL/JWT/profile-FK prerequisite and full-lane controller are F7 contracts/native-auth-prerequisites.md, applied before public policy/FK fixtures. This is test setup only; native proofs preserve actual denied baseline rights and source role placement. It grants no business or browser authority.

Before canonical child auth ACL setup, consume [F7 auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md): the PG18 minion_qc-initialized cluster has no builtin postgres role, so the admitted owned controller creates/verifies the restricted NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS postgres ACL sentinel with no membership edges before GRANT USAGE ON SCHEMA auth TO postgres. A preexisting incompatible role fails admission; never elevate minion_qc or repair shared roles. The F7 helper owns exact catalog/mutant proof.

Mandatory recovery/value contracts are recovery-receipts.md and garment-numerics.md in this feature contracts/: exact ordinary/private result union, collection GET known-key lookup plus private getGarmentCorrectionStatus/current-reader CLI flags, no status writer locks; actor historical UUID without profile FK with active/current-principal INSERT admission and real post-correction auth-user/profile cascade-delete retention test. Garment effects use source-compatible Number/String formulas, independent rational limits and exact approval/actual strings for fractional correct/compensate; no 4-decimal cost rounding. Extend the existing 13 native case names and selected route/mounted tests, no new test lane.

### Review artifact: contracts/recovery-receipts.md

### Known-key recovery and exact F3 receipt union

This contract selects authoritative commit acknowledgement without repeating an uncertain write. It supplements workflow.md/garment-envelope.md. F1 product_mapping and F2 receipt_chain retain their own typed owning status services; F3 does not import those future modules or add a generic domain dispatcher.

#### Exact neutral public/private result types

Export these from stock-corrections.logic.ts with strict response decoders shared by the scoped server/UI. UUID/Digest use the established formats; source decimal strings remain strings, never coerced through a missing-value zero.

```ts
type QuantityEffect = {itemId:UUID,warehouseId:UUID,qtyBefore:string,qtyAfter:string};
type CostEffect = {itemId:UUID,warehouseId:UUID,valueBefore:string,valueAfter:string,
  valuationRateBefore:string,valuationRateAfter:string,cogsDelta:string};
type CorrectionCost = {state:'available',currency:string,
    valuationQualificationSha256:Digest,rows:CostEffect[]}
  | {state:'unavailable',reason:'valuation_currency_unverified'}
  | {state:'denied'} | {state:'not_applicable'};
type OrdinaryCorrectionReceipt = {
  domain:'ordinary',schemaVersion:1,correctionId:UUID,operationKey:UUID,
  kind:'sale_variant'|'receipt_replace',sourceType:'pos_ticket_line'|'stock_receipt',sourceId:UUID,
  sourceEntryId:UUID|null,replacementEntryId:UUID|null,
  actorId:UUID,appliedAt:string,reason:string,previewHash:Digest,payloadHash:Digest,
  productChange:{fromProductId:UUID,toProductId:UUID}|null,
  quantityEffects:QuantityEffect[],cost:CorrectionCost
};
type GarmentCorrectionReceipt = {
  domain:'garment_stock_only',schemaVersion:1,correctionId:UUID,operationKey:UUID,
  kind:'sale_stock_repost',action:'correct'|'compensate',inverseOfOperationId:UUID|null,
  sourceType:'pos_ticket_line',sourceId:UUID,sourceEntryId:UUID,replacementEntryId:UUID,
  actorId:UUID,appliedAt:string,manifest:GarmentManifestV1,
  currency:string,valuationQualificationSha256:Digest,
  manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,
  reversalLedgerIds:string[],replacementLedgerIds:string[],
  beforeEffects:GarmentEffect[],intendedEffects:GarmentEffect[],afterEffects:GarmentEffect[]
};
export type CorrectionReceipt = OrdinaryCorrectionReceipt | GarmentCorrectionReceipt;
export type CorrectionResult = {schemaVersion:1,outcome:'applied',replayed:boolean,
  receipt:CorrectionReceipt};
export type CorrectionPreviewCommand = {request:PreviewRequest,reason:string,
  valuation?:StockValuationQualificationV1};
export type GarmentCorrectionResult = Omit<CorrectionResult,'receipt'> & {receipt:GarmentCorrectionReceipt};
export type GarmentCorrectionStatus =
  | {schemaVersion:1,outcome:'applied',receipt:GarmentCorrectionReceipt,currentState:'matches'|'changed'|'compensated'|'unavailable'}
  | {schemaVersion:1,outcome:'unknown',receipt:null};
export type CorrectionStatusInput = {operationKey:UUID,expectedPayloadHash:Digest};
export type CorrectionStatus =
  | {schemaVersion:1,outcome:'applied',receipt:CorrectionReceipt,
      currentState:'matches'|'changed'|'compensated'|'unavailable'}
  | {schemaVersion:1,outcome:'unknown',receipt:null};
```

Ordinary both-empty sale has sourceEntryId/replacementEntryId null, quantityEffects:[], cost:not_applicable and actual productChange. Stock-moving ordinary receipts have complete admitted quantity effects; cost is available only with current finance authority, otherwise denied and no monetary keys/rows. No normalized request containing hidden receipt rates or raw stored before/intended JSON is spread into a denied response. Receipt replacement productChange is null. kind/source/entry nullability follows the exact storage matrix. All availability is decided by current source/record/module authority, never by payloadHash possession.

Garment receipt is the full bounded immutable approved manifest plus actual authoritative generated ledger/entry/effect evidence, available only to a current real membership owner with the private finance/stock/POS/effective/source matrix. No quantity-only garment-manifest variant is selected; nonowner or denied current private scope gets `404` and no existence/details. Historical actorId remains an immutable UUID; it need not still have a live profile. The current authorized reader may differ from the historical actor. Current reader authority is not inferred from stored actor/name/reference. getStockCorrection(ctx,id) returns CorrectionResult with replayed:true using this exact union; the HTTP by-id handler projects the same authority-bound receipt. A later compensated/changed state does not erase the original receipt or turn a committed operation into unknown.

Ordinary CorrectionPreview is exactly `{schemaVersion:1,domain:'ordinary',mode:'variant_swap'|'receipt_replace',sourceType:'pos_ticket_line'|'stock_receipt',sourceId:UUID,eligible:boolean,previewHash:Digest|null,payloadHash:Digest|null,blockers:string[],productChange:{fromProductId:UUID,toProductId:UUID}|null,quantityEffects:QuantityEffect[],cost:CorrectionCost,valuationScope:StockValuationQualificationV1['keys']|null}`. blockers use only the documented fixed workflow error/blocker codes (no server text); nonexecutable previewHash:null and eligible:false cannot reach apply. Same valid stockless preview is eligible with cost:not_applicable. Complete admitted cost preview has the same effect definitions/normalization as the private numeric contract where applicable, preserving the ordinary source posting formulas. No raw source JSON or hidden monetary field is exposed by a preview.

Private previewGarmentStockCorrection instead returns GarmentCorrectionPreview exact `{schemaVersion:1,domain:'garment_stock_only',eligible:true,manifestSha256:Digest,previewHash:Digest,payloadHash:Digest,currency:string,valuationQualificationSha256:Digest,beforeEffects:GarmentEffect[],intendedEffects:GarmentEffect[]}`; ineligible input throws documented typed refusal with zero effects, not a partially executable private object. applyGarmentStockCorrection returns CorrectionResult with a narrowed GarmentCorrectionReceipt; its direct owning status API is below. No public body can supply this private preview discriminator/manifest to generic apply.

#### Lookup by known operation key

Add getStockCorrectionByOperationKey(ctx:CoreCtx,input:CorrectionStatusInput):Promise<CorrectionStatus> to the same owning stock-corrections.service.ts. It owns a technically REPEATABLE READ READ ONLY transaction with current principal/org/capability/source checks first; it never acquires stock-v1, the org authority lock or `FOR SHARE`, and never calls preview/apply. Query exact `(ctx.tenantId,operation_key)`, not an unscoped operation ID search. Matching row payload_hash acknowledges that immutable committed result, even if current source later changed; decode its stored typed owned-domain envelope and return currentState separately. A matching hash is identity binding, not permission. Wrong known-key payload yields `409` key_reuse with no receipt. A missing/foreign/unavailable row is unknown with receipt:null, not proof of rollback or permission for a new key. No already-applied fingerprint must equal current bins just to acknowledge a historical commit. Actual state diagnostics may say changed/compensated; failure to qualify the current diagnostic does not negate a decoded matching committed receipt (use unavailable rather than inventing a changed fact).

The F3 lookup handles only ordinary sale_variant/receipt_replace and its private garment-domain sale_stock_repost. Other stored domains/kinds, invalid discriminators or malformed stored envelopes yield generic unavailable/unsupported with no raw JSON. Product mapping and receipt-chain callers use their owning services, not this handler. Do not import missing future F1/F2 code into F3.

Expose GET `/api/stock/corrections?operationKey=<uuid>&payloadHash=<64hex>` in the already selected collection +server.ts (same path as POST apply). Require exactly those two query keys and no actor/org/source body; reject malformed, duplicate or unknown query keys with `400`. Use the same effect-sensitive current read admission as by-id detail, including POS-only stockless receipts; the handler derives ctx/reader from locals and service resolves kind before disclosure. Central registry/RBAC adds only this exact GET method/path alongside existing correction contracts, preserving unrelated stock-prefix rules. Return `200` CorrectionStatus for authorized applied or unknown outcomes; `403`, `404`, `409` and `400` follow the documented current-authority and conflict semantics. No special cache of private receipts: private,no-store successful response and client fetch cache:no-store. The existing by-id route remains for a known correction UUID.

Public POST apply and existing swap wrapper responses are `200` CorrectionResult. Update the selected POS ticket/stock-entry UI and mounted route tests to strict-decode this union. A public UI never treats a private manifest as an ordinary diff; unknown discriminator is unavailable. Before POST persist the stable operationKey+expectedPayloadHash (the payloadHash returned by the successful preview) for the same intent in its existing owned request state. On transport/output uncertainty, perform an explicit known-key GET; applied receipt→success without POST; unknown→show unconfirmed, no automatic new-key write. A manual retry may repeat only the exact same key/payload through actual guarded server admission, never a regenerated preview/time/reason. Lost response therefore does not require a correction UUID the client never received. Same-intent manual retry remains subject to current actual authority; known-rollback transients follow the existing maximum-three-attempt policy, not unknown-commit retries.

#### Exact private garment CLI status

Add getGarmentCorrectionStatus(ctx:CoreCtx,input:{operationKey:UUID,expectedPayloadHash:Digest,manifest:GarmentManifestV1,previewHash:Digest}):Promise<GarmentCorrectionStatus> to the same F3 service. Require the private current-reader real-owner matrix, decode the original manifest, verify key/target/org and recompute its historical manifest/payload digest using the original manifest actor/previewHash. This status never requires the original actor still exists or the current reader equals that historical actor. The current reader is verified independently before business reads. Return only a narrowed garment receipt, or unknown; another owned domain under the key conflicts/refuses. No fresh stock write/census/reapproval occurs.

F1 `faces:stock:repair` default preview takes --org UUID --actor-user UUID --manifest PATH --output PATH. Preview/apply actor must equal manifest.actorProfileId; apply additionally requires --apply --approved-plan-sha256 DIGEST --preview-hash DIGEST. Status is mutually exclusive --status with --operation-key UUID --payload-sha256 DIGEST --preview-hash DIGEST, retains --org/--actor-user/--manifest/--output. For status only, actor-user is the current authorized reader and may differ from manifest actor; the original manifest, key, previewHash and payload digest must all still match. Any missing required flag, or a wrong scope, action or target, is rejected before the loader or business graph runs. No token/DB credential flags, automatic key change or ad-hoc hidden option.

CLI output is the exact GarmentCorrectionPreview, CorrectionResult or narrowed CorrectionStatus union, written atomically with mode `0600`. Exit codes:

| Exit code | Meaning |
| --- | --- |
| `0` | valid preview, applied or replayed |
| `2` | malformed input, authentication, target or current-reader denial |
| `3` | read, schema or timeout failure |
| `4` | stale, blocked (including `posted_at_out_of_order`) or key conflict |
| `5` | unknown status, COMMIT or post-commit output uncertainty |
 A known stored applied receipt is never lost because a later source changed. An unknown result carries operationKey+expectedPayloadHash only, no leaked internal error or invented success. F1 wrapper invokes these actual F3 owning functions after shared admission; local tests/native fixtures never fake status with a CLI-only query.

#### Proof and immutable historical actor

Within existing thirteen native behaviors, extend operation reuse/lost response and account-deletion cases: known-key lookup after deliberately lost response with no correction UUID; exact full ordinary/cost-denied/private receipt serialization; unknown key zero writes; wrong hash/cross-kind/foreign/current-reader denial; private current owner different from deleted historical actor; compensation retains both receipts. Route/mounted tests drive actual GET collection/header/cache/decoder/unknown-no-auto-POST behavior. Native status statement receipts prove REPEATABLE READ READ ONLY and zero advisory/row writer locks.

actor_id is a nonnull historical UUID soft reference, with no FK to profiles or auth.users and no ON DELETE CASCADE/SET NULL behavior. Insert admission requires actor_id equals the verified current principal/GUC and F7 actual active membership/profile/org under the existing pair; an INSERT RLS check also binds actor_id to app.current_profile_id. After commit retain UUID without joining/exporting profile PII. This preserves correction/audit evidence when canonical auth.users→profiles deletion later cascades. Native catalog must assert actor_id NOTNULL and absence of an actor FK. Create a real secondary synthetic auth user/profile with admitted roles (a different surviving owner owns the organization, avoiding unrelated organization-owner FK blockers), execute the actual admitted correction, then perform actual owned-fixture auth.users deletion after blockers release; assert profile removed and correction UUID/actor/evidence unchanged, and a different currently authorized owner can read its protected receipt. Also retain deletion-first admission refusal/correction-first ordering tests. Existing doc_audit_log.actor_id is already a soft UUID in pg-activity-schema.ts; do not add an audit FK that recreates this blocker.


To make that expected digest available before a potentially lost apply response, the public POST /api/stock/corrections/preview accepts exactly `{request:PreviewRequest,reason:string,valuation?:StockValuationQualificationV1}` (CorrectionPreviewCommand). previewStockCorrection(ctx,request,reason,valuation?) has required reason and the optional top-level qualification and returns payloadHash computed from the actual qualified org/actor, normalized request, normalized valuation:null|proof, freshly computed previewHash and normalized reason using workflow.md's exact payload preimage. Ineligible outputs have both hashes null. Apply CorrectionCommand/HTTP body additionally requires payloadHash; recompute server-side and reject a mismatch with `409` before effects. No payload identity relies on a client computing hidden authority facts. The UI obtains reason before preview, retains operation key+both returned hashes for that same intent, and invalidates the executable preview if reason/request changes. Existing selected swap wrapper also requires this payloadHash with reason/key/previewHash; old missing-field tabs refresh_required/no effects. Private garment preview likewise returns its fully computed payloadHash for known-key recovery; F1 CLI carries that exact hash, with no invented proof from file names or after-the-fact response IDs. This is a new correction protocol, not a change to legacy stock submit bodies.

Optional current-state diagnostics do not weaken receipt acknowledgement: after actual current reader/source admission and exact immutable receipt decoding, a failed optional diagnostic returns currentState unavailable. A SQL error must rollback/release the owned read transaction before returning that already-authorized decoded historical receipt; no query continues in an aborted transaction, no global fallback or cached pre-admission receipt is used. Auth/hash/schema failure cannot use this fallback. Test rollback/cleanup and currentState unavailable separately from applied versus unknown commit outcome.


#### Exact ordinary/private immutable JSON placement

For ordinary domains, before is `{domain:'ordinary',sourceSnapshot,stockSnapshot,policySnapshot}` using workflow.md's complete safe hash structures. intended is `{domain:'ordinary',request:PreviewRequest,valuation:StockValuationQualificationV1|null,reason,previewHash,payloadHash,productChange,quantityEffects,costEffects:CostEffect[]}`; no stock costs for both-empty, which has costEffects:[]. after is `{domain:'ordinary',receipt:OrdinaryCorrectionReceipt,actualLedgerRows:{id:string,rowSha256:Digest}[],financialInvariantSha256:Digest,visitProduct}`, where `visitProduct` is the record defined in [workflow.md](contracts/workflow.md#visit-product-association) (`null` for receipts and for lines without a booking). The stored receipt's cost is available with all actual approved rows for a stock-moving apply or not_applicable for both-empty; current-reader cost denial is a READ projection, never a mutation of stored evidence. Assert actual quantity/cost effects equal the admitted plan under the selected numeric oracle before inserting this single completed row.

For private garment, before is `{domain:'garment_stock_only',sourceSnapshot,stockSnapshot,policySnapshot,beforeEffects}`. intended retains `{domain:'garment_stock_only',action,inverseOfOperationId,domainManifest:GarmentManifestV1,manifestSha256,previewHash,payloadHash}`. after is `{domain:'garment_stock_only',receipt:GarmentCorrectionReceipt}` with the actual generated reversal/replacement ledger IDs and actual afterEffects. The manifest in that full receipt is an exact immutable copy of intended.domainManifest, not a postcommit sidecar or re-created from current mappings. Status decoder verifies matching discriminator/action/IDs/digests between all three JSON fields before exposing the typed receipt. All JSON together remains ≤ 4194304 bytes; overflow fails before commit, no truncated receipt. One operation INSERT plus one audit participates in the same stock/stamp transaction; no receipt UPDATE, later augmentation or mutable pending row. Native fault injection at envelope validation/size/insert/audit proves complete rollback and read-only projections preserve stored bytes.

The public operation identity is durably saved before POST via [browser-recovery.md](contracts/browser-recovery.md), not merely component state. Reload/crash restores only that scoped pointer and authorized GET outcome. The typed not_applied preflight marker is the sole current-original-attempt no-DML clearing exception; unknown pointers remain blocked. Private CLI retains its protected manifest-file recovery.

Qualified currency, owner-only valuationScope/re-preview input, immutable proof binding and denial stripping are exact in [valuation-qualification.md](contracts/valuation-qualification.md). All CostEffect monetary fields inherit the enclosing available cost.currency; no row is formatted in isolation or with a default/ticket currency. Private receipt/preview currency and valuationQualificationSha256 must match manifest.valuation exactly. Public cost denial omits qualification/reference/currency as well as amounts. API GET/HEAD delegation and masked collection lookup are exact in [api-admission.md](contracts/api-admission.md).

### Review artifact: contracts/transaction-protocol.md

### Shared stock transaction and authority protocol

This is the selected F1/F2/F3 contract, proposed for owner approval. No implementation is present. F3 owns the stock transaction/locking/migration implementation; F7 owns the shared operator authentication and read-only capability adapter. Dependent slices cannot ship until these exact prerequisites are qualified.

#### Terms

These names are used across this feature's contracts.

| Term | Meaning |
| --- | --- |
| stock-v1 | The per-org stock write gate `pg_advisory_xact_lock(hashtextextended('minion:stock-write:v1:' \|\| orgId, 0))` selected below. |
| org authority lock | The existing exclusive transaction lock `hashtextextended(orgId,112)` taken by `lockNavigationPolicy` (`nav-policy-lock.ts:5`) and the existing authority writers. "112" in other text means this lock. |
| profile lock | The existing exclusive transaction lock `hashtextextended(profileId,114)` taken by account and profile lifecycle writers (`user.service.ts:255,364,389`). "114" means this lock. |
| POS advisory locks | The existing `pos_advisory_key_v1(kind,org,subject,currency)` family in `pos/lock-key.ts`: `settings` (shared/exclusive), `identity` (shared/exclusive), `wallet` (exclusive) and `grant-source` (exclusive). |
| read-only authority bridge | F7's `minion_operator_authority_v1(p_org,p_profile,p_lock_rows=false)` snapshot mode, which takes no locks. |
| guarded-write authority bridge | The same function with `p_lock_rows=true`, used inside a write transaction that already holds stock-v1 and the org authority lock. |
| REPEATABLE READ READ ONLY | A transaction opened with `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`. |

#### Principal and snapshot admission

Planned `scripts/lib/operator-principal.ts` exports `QualifiedOperatorTarget = Readonly<{databaseIdentity:string;authProject:string;authUrl:string}>` and `verifyOperatorPrincipal(input: Readonly<{accessToken:string;authUrl:string;anonKey:string;expectedProfileId:string;targetFingerprint:QualifiedOperatorTarget}>): Promise<Readonly<{profileId:string;authProject:string;verifiedAt:string}>>`. It calls the qualified target's existing GoTrue `auth.getUser` with the private existing-session token, checks authUrl/authProject against that qualified target record and compares returned canonical user ID to the approved actor, and never refreshes, persists or serializes that token. Invalid/expired/unavailable/foreign-target identity refuses before business reads. No admin key, gateway token, AUTH_DISABLED or first-member fallback. F7 owns its source and tests; F1/F2 import it, not duplicate authentication. The caller separately verifies databaseIdentity in its owned business snapshot; authentication alone does not qualify a database.

`src/server/services/rbac.service.ts` exports `FreshCapabilitySnapshot = {capabilities:Capabilities;roles:string[];membershipRole:string|null;realCapabilities:Capabilities;realRoles:string[]}`. Existing `resolveFreshCapabilitiesInTransaction(tx:CoreTx,orgId:string,profileId:string):Promise<FreshCapabilitySnapshot>` retains its locking default. New `resolveFreshCapabilitiesReadOnlyInTransaction(tx:CoreTx,orgId:string,profileId:string):Promise<FreshCapabilitySnapshot>` shares exactly the same internal role-model, union, override and effective-authority narrowing logic, but reads every row without FOR SHARE/UPDATE and without a cache in the caller-owned snapshot. CLI invocation has no simulated request locals; HTTP effective-authority narrowing remains intact. F7 owns extraction and native policy-parity/READ ONLY qualification. F1/F2 diagnostics, preview and status use the nonlocking API after verified principal admission; new F1/F2/F3 mutation uses resolveFreshOperatorCapabilitiesForWriteInTransaction from the F7 authority bridge in the guarded write transaction (the legacy adapter is unchanged for unrelated callers). A nonlocking preview is advisory, never authority to apply stale state.

#### First stock gate, existing authority gate and exact order

Choose a coarse transaction advisory write gate per organization, rather than several unspecified source/mapping advisory namespaces. A stock mutation transaction's first business-lock SQL is:

```sql
select pg_advisory_xact_lock(hashtextextended('minion:stock-write:v1:' || $1::text, 0));
```

`$1` is the authenticated canonical organization UUID in lowercase, not an untrusted payload. Every participant computes the key in PostgreSQL; no JavaScript bigint narrowing. Mode is exclusive and transaction-scoped. Hash collisions only cause additional serialization, never grant cross-org authority. Organizations remain independent except such a collision. Per-org serialization is an explicit throughput tradeoff for a simple verifiable correction/cutover boundary; no throughput SLA is claimed. Do not add a second per-product or per-bin advisory protocol.

Immediately after the first stock gate and before any source, ticket, product, period, profile, entry or bin row lock, acquire the org authority lock through the existing `lockNavigationPolicy(tx,ctx.tenantId)` in nav-policy-lock.ts. `lockStockWrite` acquires both in that order and returns its opaque guard only after both succeed; both remain held until commit/rollback. This is reuse of the existing authority lock, not a second invented stock/product/bin namespace. Acquiring the org authority lock before source rows also preserves the current account and role lifecycle order (org authority lock before the profile write). Authority-only writers take the org authority lock only and never attempt the stock gate while holding it.

After both advisory gates, acquire row locks in this order: (1) operation lookup and source ticket/product row locks, each entity family ordered by UUID; (2) existing period-policy rows in ascending YYYY-MM and fresh locking authority rows; (3) original stock entry rows in UUID order; (4) accrual rows in UUID order; (5) existing bin rows in lexicographic `(item_id,warehouse_id)` order. Resolve all required IDs before these row locks; re-read their actual values after locking. The first stock gate serializes participating stock/period/bin writes, while the existing org authority lock serializes participating policy/module authority writes, including absent permission/module rows; row absence does not authorize an unlocked insert race. Source authorization is always checked before disclosure and rechecked after the gate. A missing bin is represented as EMPTY_BIN while holding the gate and created only when the qualified posting writes it; a rejected plan must leave no placeholder bin.

No participating stock writer may take a ticket, product, period, profile, entry, accrual or bin row lock and then enter either gate. It takes stock-v1, then the org authority lock, before those rows; authority-only writers never take stock-v1 in reverse order.

POS advisory locks sit after both gates. A participant that already takes them (`submitTicket`: settings, wallet and grant-source before the shift row; `voidTicket`: ticket row `FOR UPDATE`, then identity shared, then wallets) takes stock-v1 and the org authority lock first and then keeps its existing POS advisory and row order unchanged. No holder of a POS advisory lock may then request stock-v1 or the org authority lock. Writers that take only POS advisory locks (`updatePosSettings`, `pos/wallet-identity.ts`, `pos/accounts/*`) never take either gate, so they cannot close a cycle with a gate holder. Correction preview and apply and the stock helpers in this contract take no POS advisory lock. Native behaviors 5 and 6 cover `submitTicket` and `voidTicket` against a correction in both arrival orders. Helpers join the passed transaction and never open another withOrgCore transaction. General read-only pages/previews do not take the write gate. No remote authentication, gateway/model/provider request, filesystem write or other network work occurs while the gate is held.

#### Typed stock seams

Proposed exports below are in `src/server/services/stock.service.ts`; `CoreTx`, `CoreCtx`, `Actor`, `NewEntryInput`, `StkEntry`, `BinState` and existing source error types are reused. `StockWriteGuard` is opaque, constructed only by `lockStockWrite`; its implementation uses a private unique-symbol brand and records the exact transaction/organization, so it cannot be serialized or supplied by API callers.

```ts
export interface BinIdentity { itemId: string; warehouseId: string }
export interface LockedBins {
  readonly orgId: string;
  readonly keys: readonly BinIdentity[];
  readonly states: Map<string, BinState>; // existing binKey spelling
}
export interface StockPostingOptions {
  readonly entryId?: string; // preallocated replacement UUID, validated before insert
  readonly postedAt?: Date; // server/approved manifest only; normal callers use now
  readonly bins?: LockedBins;
}
export interface SubmitEntryOptions extends StockPostingOptions {
  readonly acceptSubmitted?: boolean; // default false
  readonly expectedInvoice?: { invoiceId: string; lines: string[] };
}
export function lockStockWrite(tx: CoreTx, ctx: CoreCtx): Promise<StockWriteGuard>;
export function assertStockModulesEnabledInTx(tx: CoreTx, ctx: CoreCtx, guard: StockWriteGuard,
  moduleIds: readonly ('stock' | 'pos' | 'finances')[]): Promise<void>;
export function lockBinsInTx(tx: CoreTx, ctx: CoreCtx, guard: StockWriteGuard,
  keys: readonly BinIdentity[]): Promise<LockedBins>;
export function createEntryInTx(tx: CoreTx, ctx: CoreCtx, guard: StockWriteGuard,
  input: NewEntryInput, actor: Actor, options?: StockPostingOptions): Promise<StkEntry>;
export function submitEntryInTx(tx: CoreTx, ctx: CoreCtx, guard: StockWriteGuard,
  entryId: string, actor: Actor, options?: SubmitEntryOptions): Promise<{entry: StkEntry; transitioned: boolean}>;
export function cancelEntryInTx(tx: CoreTx, ctx: CoreCtx, guard: StockWriteGuard,
  entryId: string, actor: Actor, options?: StockPostingOptions): Promise<StkEntry>;
```

Every helper verifies guard transaction/org identity and ownership of both coordinated gates. Bin key input is deduplicated/sorted before SQL; the context is reused by sequential cancellation/replacement legs. Existing moving-average/negative-stock/line validation remains authoritative. Submit validates the complete leg plan and negative/value guards before its first ledger insert; domain rejection has zero ledger/bin effects. Original line/ledger rows are never updated/deleted. Replacement postedAt is server-controlled and all F2 rows use its one approved correction timestamp. Existing `activity.service.ts:131` `recordAuditInTx(tx,ctx,input)` is reused unchanged. `submitEntryInTx` alone emits the existing `stock.entry_submitted` event `{type,orgId,entryId,entryType}` once per newly submitted replacement entry through `emitHubEvent`; cancel emits none. No correctionId field, controller duplicate or suppression option is added. F2 emits one receipt plus its issueCount events at the same commit; their entry IDs join the immutable correction after.entryMap. Mapping/no-stock emits no stock entry event. This is transactional pg_notify, not remote network work. Helpers do not call best-effort general audit; existing public submit wrapper unwraps `{entry,transitioned}`, audits only transitioned=true and returns entry. Correction controllers call recordAuditInTx once for durable operation evidence.

`SubmitEntryOptions` keeps the semantics of the existing `submitEntryInternal(ctx,id,actor,acceptSubmitted,expectedInvoice)` (`stock.service.ts:787-830`). `acceptSubmitted` defaults to `false`: a non-draft entry refuses `not_draft`, which public `submitEntry` and every correction replacement use. With `acceptSubmitted:true`, an already-submitted entry returns `{entry,transitioned:false}` and emits no event; only `createIssueFromInvoice` (`stock.service.ts:1943`) passes it. When `expectedInvoice` is set, the helper rechecks under the entry lock that the entry is an issue whose `metadata.invoiceId` and line identity equal the expected values, and refuses `duplicate_invoice` otherwise; only `createIssueFromInvoice` passes it. `stock.service.test.ts` keeps regression tests for both callers.

`StockPostingOptions.postedAt` sets these columns, and only these: `submitEntryInTx` writes it to the submitted entry's `stk_entries.posted_at` and to every `stk_ledger.posted_at` it appends; `cancelEntryInTx` writes it to every reversal `stk_ledger.posted_at` and leaves the cancelled entry's `stk_entries.posted_at` unchanged, as `cancelEntry` does today; `createEntryInTx` ignores it, because a draft has no posting time. Omitted, the existing behavior stays: `new Date()` on the entry and the column default `now()` on ledger rows. An explicit `postedAt` is admitted only if it is not earlier than the greatest `stk_ledger.posted_at` among the latest ledger rows of the locked affected bins and not later than `clock_timestamp()` at admission; otherwise the helper refuses `posted_at_out_of_order` before any write. Reason: movement history readers order by `posted_at DESC, id DESC` (`stock.service.ts:1047,1076`) while `rebuildBins` and `qty_after` follow ledger id order, so an earlier timestamp would show balances out of sequence, and a future one would date a movement that has not happened.

#### Complete participant inventory and cutover ownership

| Source boundary | Required local transaction participation |
| --- | --- |
| stock.service.ts `createEntry`, `updateEntry`, `deleteEntry`, `submitEntry`, `cancelEntry`, `rebuildBins` | Gate first, then source entry/bin locks; public wrappers call same-tx helpers. Rebuild takes gate before reading/deleting/replacing cache and cannot race correction. |
| stock.service.ts `updateWarehouse` | Acquire stock-v1, then the org authority lock, before archived/default/parent validation or writes, including stock-bin sum and clearing prior default. Same transaction through validation+update; no archive check outside gate. |
| finance.service.ts `updateFinSettings` | Acquire stock-v1, then the org authority lock, before settings-row read/UPSERT, including first absent-row insertion. All patches join this path so timezone cannot change after period admission; validation of pure input outside is allowed, authoritative settings under gate. Cache invalidation only after commit. |
| pos.service.ts `setBundleComponent`, `deleteBundleComponent` | Gate pair first; move current separate validation and edge upsert into ONE passed transaction; re-read both product ownership and bundle/nesting guards after gate. Delete likewise before source-edge query. Cache bust after commit. |
| stock.service.ts `setConsumption`, `deleteConsumption`, `setComponent`, `removeComponent`, `updateItem` when mapping/bridge/UOM changes, `archiveItems` | Gate first, then sorted product/item/recipe rows; compare approved before-state. Ordinary no-stock display edits need no gate unless they change these rules. |
| stock.service.ts `createServiceIssue`, `createSourcedIssue`, `createIssueFromInvoice` | Extract transaction-accepting resolution/posting paths; gate retained through current-rule reads, draft creation/submission and source binding. No previously cached rule plan may cross gate entry. `createIssueFromInvoice` submits through `submitEntryInTx` with `acceptSubmitted:true` and its `expectedInvoice`. |
| pos.service.ts `postTicketStock`, `repostTicketStock`, `swapTicketLineProduct` | Gate before ticket/source locks; rule resolution through entry posting and stock stamp uses ONE passed transaction. Existing pending draft retry posts its stored lines, never silently regenerates recipes. |
| pos.service.ts `submitTicket`, `voidTicket`, `changePaymentMethod`, `setPeriodLock`; local `emitTicketNow`/`emitShiftTickets` fiscal state writes | Gate before relevant local ticket/period guard mutations and before the POS advisory locks these functions already take (settings, identity, wallet, grant-source), whose order after the gates is unchanged. `setPeriodLock` is the only period-lock writer; `pos/period-locks.ts` holds readers only and does not change. Preserve separately committed payment/lifecycle boundaries; do not hold a transaction during remote emission. Persist/check pending emission guard before releasing for remote work; correction refuses non-error production fiscal emission (environment other than beta), including pending production emission, under existing guards. Reacquire gate for result persistence and compare source version. |
| stock-accruals.service.ts `accrueConsumption`, `releaseAccruals`, `realizeAccruals` | Gate around local expectation/rule snapshot and realization/source references, reusing same-tx stock helpers. Booking lifecycle commit remains before its separate stock attempt; this change does not reopen a booking or undo collected money. |
| New stock-corrections.service.ts, F1 mapping/garment writers, F2 receipt-chain writer | Use same first gate and order. No alternate ledger writer or post-commit audit as durable outcome. |

Code search is an implementation gate: enumerate every direct INSERT/UPDATE/DELETE of stk_ledger, stk_bins, stk_entries/lines, consumption/component and realized-entry/value columns. A newly found local writer must be incorporated into this same order before the shared primitive qualifies; it cannot be waived as an untested caller. External maintenance scripts are prohibited during the approved correction window and are not granted an implicit bypass.

F1 mapping cutover selects this serialization boundary: POS/new-source current-mapping resolution must start only after obtaining the org gate and retain it through posting/stamping. Mapping preview is a read-only snapshot. Apply takes the same gate, drains all prior participating posters by lock acquisition, and performs a fresh exact source/draft/accrual census. Any persisted draft or open expectation for the target M product still stamped to the old L mapping yields `cutover_pending_sources`, zero mapping/stock effects, and an inert review packet; do not rewrite that snapshot on retry. Once this census is empty and approved fingerprints match, replace the recipe and insert its durable product_mapping receipt/audit in one transaction. Later new rule resolutions observe M. No operator-chosen quiescence alternative remains; existing historical issue repairs stay separate, and unknown/out-of-band writer activity blocks apply. Test a poster admitted before mapping, one waiting after it, and an old persisted draft that refuses cutover.

#### Timeouts and retry

Each write transaction sets local lock_timeout to 1000 ms, statement_timeout to 12000 ms, and an overall 60000 ms deadline that aborts and rolls back its transaction. Maximum THREE total attempts (initial plus two retries), delays 40 ms then 80 ms, only for SQLSTATE 40001, 40P01 or 55P03 after a confirmed rollback. Re-read original approved fingerprints and authority on every attempt; never regenerate approval intent or operation key. Domain validation/stale/policy errors and statement timeout 57014 are returned, not automatically retried. A connection lost around COMMIT is unknown and must query the immutable operation receipt before any replay. No retry loop includes remote work or a previously committed lifecycle/payment mutation. Normal callers retain their existing honest warning/pending outcomes on exhausted stock retries; correction returns typed conflict/unavailable without claimed apply.

#### Required common proof

F3 native suite proves both lock arrival orders for sale correction versus normal post, mapping cutover versus current-rule resolution, F2-like multi-entry correction versus new issue, rebuild versus issue, absent-bin first writers, period close versus correction, and source fiscal/void versus correction. Prove SQLSTATE retry count/delays/original fingerprint, rolled-back intermediate fault points, unknown commit status, one durable receipt and only the existing per-new-entry events and no duplicate money/lifecycle effect. All tests use actual source helpers with independent PostgreSQL backends and deterministic lock barriers; a mocked lock call or one connection is not concurrency evidence. Native ownership/commands are specified in native-qualification.md, not ordinary excluded Vitest invocation.

#### Source retry seams required by F5

Also export `postTicketStockInTx(tx:CoreTx,ctx:CoreCtx,guard:StockWriteGuard,ticketId:string,actor:Actor):Promise<{entryId:string|null;stockWarning:StockWarning|null}>` from pos.service.ts and `realizeAccrualsInTx(tx:CoreTx,ctx:CoreCtx,guard:StockWriteGuard,input:RealizeInput):Promise<RealizeResult>` from stock-accruals.service.ts. Public wrappers own withOrgCore/retry/gate once. Existing context types are exported as needed rather than duplicated. Every source, open-accrual and existing draft/submitted entry lookup is re-read after the gate in that same transaction; no cached open-row array or pre-gate current-rule plan is authoritative.

For an existing submitted source entry, return it and reconcile only still-open actual references from its stored signed ledger; no extra entry. Existing draft retry submits its immutable stored lines, ignoring changed consumption input as current source semantics require. For a genuinely absent source, use only explicitly confirmed endpoint input/open accrued snapshot under existing rules. A domain negative-stock rejection is computed before ledger writes and may commit the established draft+warning outcome; no partial ledger/bin state is committed. SQL/transport failure rolls back that local attempt, never repeats lifecycle/payment. Two repeated/concurrent individual booking /complete retries must serialize on this source gate and converge on one entry. This is required before F5 grouped recover_stock can qualify, and does not invent a second posting engine.

#### Shared standalone bootstrap prerequisite

F7 owns [the exact shared operator service loader](../128-faces-receivables-audit/contracts/operator-bootstrap.md): createOperatorServiceLoader({principal:VerifiedOperatorPrincipal,target:QualifiedOperatorTarget}) returns typed closed-key load() and idempotent close(). It uses installed Vite SSR and standalone Svelte compiler with configFile:false/envDir:false, no project config/full Kit plugin/listener/watch, fixed aliases, three closed empty framework env/app modules and actual lucide-svelte SSR compilation. Existing Bun shim remains unchanged and is NOT preloaded by new commands. The source-backed contract explains independent Kit env loading and the actual Vite8 envDir:false behavior; no copied assumption of generic Bun alias support.

All CLI package entrypoints are `bun --no-env-file <CLI>`. Validate target and authenticate principal before dynamically importing even the loader, then load only admitted real service roots and use the injected qualified database. F7 owns standalone package-process canary/config/import/pool/connection proof with global app DB/auth/LLM credentials absent. F3 adds stockCorrections closed registry key/type and its real source root/smoke in the same slice as implementing that new module; no F7 type-import of a missing F3 file. F2 similarly owns receiptCorrection registry/type/smoke with its new source. A shared foundation test never prequalifies a future module. No application pool, admin auth, component stub or unrestricted path fallback is permitted.

#### Same-transaction rule resolution

`pos.service.ts` exports the existing, currently module-private `IssueResolution` interface (`pos.service.ts:730`) unchanged, and new `loadIssueResolutionInTx(tx:CoreTx,ctx:CoreCtx,guard:StockWriteGuard,finIds:readonly string[]):Promise<IssueResolution>` plus `resolveIssueLinesInTx(tx:CoreTx,ctx:CoreCtx,guard:StockWriteGuard,lines:readonly PosTicketLine[]):Promise<CreateIssueFromInvoiceLine[]>`. They retain existing product/service/bundle/redemption/modifier semantics, but every recipe/component/bundle/UOM read uses the PASSED transaction after the first gate. Private graph helpers get equivalent passed-tx variants; no nested withOrgCore or request-memo result from before gate entry is reused. Existing read-only availability/preview functions can keep their advisory own-snapshot wrappers and cannot supply an authoritative apply plan. This is transaction extraction, not a new rule engine or reinterpretation of retired bridge fields.

The shared operator target encoding is F7-owned: operatorDatabaseIdentity(connectionUrl,authProject) hashes UTF-8 recursively sorted JSON `{version:1,protocol:'postgresql',host:lowerURLhostname,port:explicitIntegerOr5432,database:percentDecodedPathAfterOneLeadingSlash,transport:'tls-verify-full' for remote|'local-marked-plaintext' ONLY loopback,authProject:exactApprovedString}` with SHA256; no credentials/user/querysecrets. The full exact auth/database/transport verification contract is [F7 audit CLI](../128-faces-receivables-audit/contracts/audit-cli.md). Both helper and caller perform their own explicit checks; the digest alone never proves actual DB identity.

#### Owning versus passed transactions

New HTTP correction preview/detail cannot use an ambient request transaction or the default locking resolver and call it READ ONLY. Their owning service method opens `ctx.db.transaction`, executes `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY` as its first transaction statement, then scopes that same handle through existing `withOrgCoreTransaction(ctx,tx,fn)`. Set LOCAL TIME ZONE UTC and explicit timeouts there, verify transaction_read_only/current role/org/profile, and call only nonlocking resolver/passed-tx readers. It never calls an independently owning withOrgCore reader within that snapshot. The context DB handle is injected/qualified; no getCoreDb fallback is permitted by operator paths.

Write owning methods likewise open their one transaction, scope through withOrgCoreTransaction, and take the first gate before business row locks. Passed InTx helpers do not BEGIN, COMMIT or call owning wrappers. HTTP stock mutations must not join the request-wide READ ambient transaction. If a mutating public wrapper is invoked with an unrelated active ambient handle, refuse `ambient_write_not_allowed` before effects; do not silently release or commit somebody else's transaction. Existing hooks' read-group behavior remains unchanged. Native tests cover owning preview READ ONLY and rejected nesting, normal write admission and explicit passed-handle reuse.


#### Fresh module state and actual authority writer participation

`FOR SHARE` on existing membership/rule rows does not lock an absent deny or absent app_modules row. The org authority lock is therefore mandatory, not an optional row-lock optimization. Retain fresh real/effective capability checks after both gates in mutation admission; READ ONLY previews remain advisory/nonlocking and do not acquire these write gates.

`assertStockModulesEnabledInTx` reads the specified module IDs directly through the passed CoreTx with exact org equality, no cached listModuleStates/isModuleEnabled/bothEnabled or separate pool. Absent row means enabled, exactly as current modules.service.ts:26–33; it never inserts a placeholder. A present false row refuses before effects. All stock-data posting/mapping/bin/entry/accrual mutations invoke it for stock (and their existing parent source module where applicable: POS-source operations also pos; finance-invoice source operations also finances). Correction effect mode determines constants server-side: verified both-empty POS-only swap checks pos only, never demands stock/cost access; stock-changing POS corrections check stock+pos and existing finance cost authority/module requirements; standalone receipt/mapping/receipt-chain cost operations check their reviewed stock/finances requirements. Period/fiscal-only bookkeeping takes the pair for serialization but retains its own module/authority rule and is NOT blocked solely by stock being disabled. Normal trusted background-source authority is preserved; the lock helper itself does not impose a new human-owner requirement on every ordinary writer.

Modify `modules.service.ts:setModuleEnabled` (sole current application writer of app_modules; only production caller POST/api/modules) so its existing withOrgCore callback awaits lockNavigationPolicy before insert/upsert and holds the org authority lock through commit. Preserve existing route actor authorization and default-enabled/cache behavior; invalidate module cache after commit as today, never a network invalidation while holding the org authority lock. No stock gate is taken by this authority-only writer. It cannot race an absent-row disable past a correction's fresh check. No new permission row or module default is created.

Verified current authority participants already take the org authority lock: section-access writeSectionAccess/resetRegisteredRolePolicies/deleteRoleAccessCatalog; organization-role-admin createOrganizationRole/renameOrganizationRole/setDefaultOrganizationRole/mutateOrganizationMemberRoles; organization-bootstrap; join/organization-admission; brain-access grants; user.service org/member/account mutations (214/259/395). Account deletion takes the org authority lock before writing the profile; preserve its existing ordered multi-org/profile lifecycle. Those callers need no stock gate and no new lock API; source-audit their current order rather than wrap their public service in a nested transaction. The new module writer joins this existing coordinator. Legacy rbac.setRoleOverride/clearRoleOverride do not take the org authority lock and have no current production callers; they and external privileged SQL/scripts are not silently covered. Re-run the direct membership/rule/catalog/module-writer search before qualification; any newly live bypass must adopt the same authority gate before these guarantees ship. Out-of-band maintenance during a real correction window blocks apply.

Linearization is exact: if a deny/module-disable writer commits before stock acquires the org authority lock, fresh admission observes it and refuses with zero correction effects. If stock holds the org authority lock first and its fresh state is allowed, correction may commit before the authority writer; that writer waits and applies afterward. Do not assert that both legal arrival orders must fail. Record the actual lock ordering with independent backends, not sleep timing or mocked resolver return. Missing module/default-deny rows are the essential counterexample, not only updates to already locked rows.

Native proof runs the two authority-race behaviors listed in native-qualification.md in the same admitted file (thirteen behaviors in total, including the two eligibility/principal behaviors below). Use actual writeSectionAccess and setModuleEnabled in both orders, including INSERT of a previously absent deny and INSERT of disabled app_modules from absence=enabled. Include revoked real/effective authority, ordinary owner/custom-role with stock field level 0 with correct existing finance tier, and a POS-only empty swap when stock is unavailable. Fault/timeout on acquiring the org authority lock rolls back without source/bin/receipt rows and follows only the existing confirmed-rollback retry policy.


#### Active principal and organization admission

F3 exports assertActiveCorrectionPrincipalInTx(tx,ctx,guard) for mutation and the existing nonlocking counterpart for preview/status. Validate that the guard holds stock-v1 and the org authority lock before calling F7 readOperatorAuthorityForWriteInTx; that bounded definer function re-enters the same ordered pair and performs principal/org/member/role row locks with actual trusted-owner rights. It requires exact active org, existing not-deletion-pending profile and membership. The service itself does NOT SELECT profiles/organizations or FOR SHARE organization_members as app_ledger, because actual baseline ACL/RLS does not allow those reads/locks. No UPDATE or broad SELECT grant is added. The read-only counterpart delegates to F7 assertActiveOperatorPrincipalReadOnlyInTx using the read-only authority bridge in the same REPEATABLE READ READ ONLY snapshot. Generic inactive failure maps to `403` and returns no private source data; policySnapshot includes actual row digests from the bounded projection. Both methods remain transaction-accepting; no second connection/cache/JWT-sub impersonation.

F7 owns the shared fresh capability composer, whose existing returned shape need not change. F3 owns this explicit state assertion in addition to it, not a silent role-model rewrite. Dependent F1/F2 writers and correction preview/status call these exact checks; F7 audit/diagnostic counterpart must make equivalent plain snapshot checks before business reads as its dependency contract is aligned. A token authenticated before deleteUser can remain valid while membership survives: deleteUser's profile flag write takes the org authority lock after the profile lock. If deletion commits first, correction observes deletion_pending and refuses; if correction holds the org authority lock first, deletion waits and may mark/delete only after correction commit. Correction never takes the profile lock while holding the org authority lock, so no reversed lock-order cycle is introduced. Existing user/profile lifecycle remains unchanged. For org deactivation, FOR SHARE also protects the admitted row from direct UPDATE until correction commit; a previously inactive org refuses even if all role rows remain.

These two native behavior names belong to the same stock-corrections suite (13 in total):

- stock corrections against PostgreSQL serializes warehouse timezone and bundle eligibility writers in both arrival orders
- stock corrections against PostgreSQL rejects deleting principals and inactive organizations before correction admission

The first calls actual updateWarehouse (archive and default branches), updateFinSettings (including absent settings upsert/timezone), setBundleComponent and deleteBundleComponent, with independent connections and observed lock-wait barriers. Mutation-first makes a held approved preview stale/refused or applies current valid rules only through fresh approval; correction-first may commit while the writer waits then changes rules. Assert no write slips between validation and posting, and validation+upsert share the same backend transaction. Preserve native archive-stock/default/nested-bundle checks and zero-correction effects on failure. The second invokes actual deleteUser's local flag/admission transaction with a stub only for subsequent external admin deletion, stops between flag COMMIT and membership removal while the old verified token/membership remain, then requires private/public correction and dependent admission to refuse. Test the inverse arrival order and that no profile lock is acquired after the org authority lock. Also missing profile, deleting profile, inactive/missing org, and org deactivate UPDATE versus held FOR SHARE in both orders. Real permission composition/role/GUC checks remain active, not a mocked deletion boolean.

#### Additive F5 confirmation dependency

F3 initially qualifies RealizeInput and its passed-transaction source engine without requiring future F5 files. After that qualification, F5 owns the additive optional recovery precondition `{mode:'confirm_open',expectedOpenCount:number,expectedOpenFingerprint:string}` and a separate server-derived `recoveryHost:'pos'|'scheduling'` in RealizeInput when recovery is present. The trusted handler supplies the host, never the HTTP body. F5 contracts/admission-recovery.md selects the exact bounded same-tx row/conversion census, completed-source/host authority checks and typed HTTP 409 before effects, inside this existing guard. Omitted recovery preserves ordinary completion and saved-source retry semantics. F5 modifies the dependency-created source/native file after F3; it does not create another engine, migration, transaction owner or native behavior name. The existing booking-completion native behavior expands with its cap/fingerprint/both-arrival-order cases, keeping the thirteen-name full lane.


#### Qualified authority adapter dependency

F7 owns the exact security-definer projection/migration/pure composer and baseline access proof in [authority-bridge.md](../128-faces-receivables-audit/contracts/authority-bridge.md). Every new correction/mapping/receipt-chain write calls resolveFreshOperatorCapabilitiesForWriteInTransaction after its guard, not the legacy existing resolveFreshCapabilitiesInTransaction whose direct organizations/member locks lack baseline app_ledger rights. Shared pure policy composition/real-effective narrowing and return shape remain the same. Storage migration `20261116193000` follows the qualified security bridge migration `20261116190000`; no global organization/profile/member grant or RLS change is selected. The 13 F3 native behaviors apply the real bridge plus correction migration on a baseline-faithful owned fixture and proves actual row-lock/authority arrival orders, not a permissive test substitute.

### Review artifact: contracts/valuation-qualification.md

### Explicit stock valuation denomination

This is the common qualification selected for new stock-changing corrections, not a currency migration or a policy change to ordinary sales/receipts/background writers. Stored stock quantities/rates/values lack historical denomination. Receipt intake converts a typed foreign-currency rate into `fin_settings.currency` through `convertEntryRates` (`stock.logic.ts:542`, "Stock is always valued in ONE currency") and records `currency`, `fxRate` and `fxUpdatedAt` only when a conversion happened. That convention fixes the unit at intake time, but rows record no denomination when no conversion ran, and `fin_settings.currency` can change later. A ticket's billing currency, invoice currency by itself or the current `fin_settings.currency` therefore cannot denominate the complete affected historical stock state, and this proof is required.

#### Closed value type and pure exports

Implement this exact value and pure exports in the already selected `src/server/services/stock-corrections.logic.ts` and its existing test, not a new resolver/service/parser engine:

```ts
export type StockValuationQualificationV1 = {
  schemaVersion:1;
  kind:'owner_attested_stock_currency';
  orgId:UUID;
  currency:string;
  attestedByProfileId:UUID;
  attestedAt:string;
  evidenceReference:string;
  evidenceSha256:Digest;
  keys:{itemId:UUID;warehouseId:UUID;latestLedgerId:string|null;
    latestLedgerRowSha256:Digest|null}[];
};
export function decodeStockValuationQualificationV1(
  value:unknown
):StockValuationQualificationV1;
export function stockValuationQualificationSha256(
  value:StockValuationQualificationV1
):Digest;
```

All keys are required. Reject unknown/missing/nested keys and wrong types; no coercion/default/extra dictionary. UUID is lowercase canonical RFC4122 textual shape under the existing manifest validator, Digest exactly 64 lowercase hexadecimal. Currency is exactly three ASCII uppercase letters; it must additionally be explicitly admitted by the actual owner as a real shared denomination, not merely pass this shape check. No implicit PEN. AttestedAt is a real canonical UTC date/time with exactly three fractional digits and Z, roundtripping the same string; admission rejects a future value beyond its actual observation time. EvidenceReference is trimmed NFC, 1–1000 Unicode characters and at most 4000 UTF-8 bytes, with no control characters; it is a protected evidence reference, never fetched as a URL/file or interpreted as code. EvidenceSha256 binds the owner's separately reviewed historical/common-denomination evidence; it is not proof that the server fetched a document.

Keys contains 1–256 distinct item+warehouse pairs, sorted lexicographically by itemId then warehouseId; decoder rejects duplicates or unsorted input rather than silently changing approved bytes. For garment there are exactly two pairs, the affected old/new item in the same approved warehouse. For ordinary correction it is the exact complete affected plan set, including original/replacement legs, with no extra, missing or foreign pair. LatestLedgerId is null paired with null row hash only for an actually absent latest ledger in that manifest boundary; otherwise it is a positive canonical decimal PostgreSQL bigint string in 1–9223372036854775807 and its hash is nonnull. Never narrow through Number. A null boundary with nonzero/unaccounted current bin state does not manufacture opening history; existing stock-integrity admission still applies.

Canonical qualification hashing uses the same selected recursive canonical-object serialization as the parent correction manifest/payload hashes, after exact validation, with the fixed schema version/kind and all fields above. Keys retain their required canonical order; preserve evidence strings and canonical stock identity strings exactly. Hash canonical UTF-8 bytes with SHA256; no observation/run metadata, environment, credentials, live policy recomputation or numeric tolerance enters it. A changed currency/attester/reference/evidence hash/time/key/boundary changes this digest and the enclosing approved intent. No self-digest field is added to the object.

#### Admission and public envelope placement

The exact public preview/apply envelopes add OPTIONAL top-level `valuation:StockValuationQualificationV1` (same value in both). The domain PreviewRequest union itself remains unchanged. Normalize omission to null in the server's approved ordinary intent; reject explicit malformed/unknown proof before any write. Workflow/recovery declarations own the complete envelope and service signatures; all copies must agree with this placement. A changed or omitted proof after a qualified preview is stale/different intent, never silently reused.

An admitted stock-changing preview/apply requires the independently verified current executing real membership owner to equal attestedByProfileId as well as all ordinary stock/POS/finance/module/record/period capabilities. Private garment additionally requires manifest.actorProfileId equal both. Custom role names, platform-admin status, a forged profile ID or the evidence digest alone cannot replace real owner membership. This owner restriction applies to this new evidence-bearing correction path only. Do not add it to ordinary POS sales or normal stock writers.

Preview is the existing qualified REPEATABLE READ READ ONLY owning snapshot: require proof org/affected keys/latest IDs and actual source-row hashes to equal the same snapshot plan, verify current owner/active principal, and keep evidence explicitly owner-attested rather than DB-proven. Apply rechecks all of it under the held stock-v1 and org authority lock before source/period/bin effects, with the current owner/policy locks and original approved hashes. No external document lookup/auth refresh occurs in that write transaction. Existing numeric/source/boundary/period admission remains mandatory; no attestation repairs corrupt stock or permits a mixed-denomination plan.

For a stock-changing preview with absent/unverified/contradictory denomination, return eligible:false, no executable hashes, fixed blocker owner_evidence_required and cost unavailable with reason valuation_currency_unverified when the reader otherwise has cost authority. It cannot apply, including a preview with a fabricated current-settings currency. Invalid syntax/auth can retain existing typed refusal rather than inventing a partial preview. An apply without an admitted matching proof refuses before business DML. A reader without cost authority receives the existing denied projection, not an unverified amount leak.

The ordinary both-empty stockless POS product swap keeps its existing POS-only authority, cost:not_applicable, no stock effects, and no valuation requirement. Valuation is omitted for that shape; reject a superfluous supplied proof instead of pretending that it proves stock effects that do not exist. Public stock_only stays `422` owner_evidence_required regardless of any supplied public proof; only the selected private garment manifest path can use that mode.

#### Immutable evidence and safe read projections

Private GarmentManifestV1 requires valuation with this exact type. The COMPLETE object enters manifestSha256, approved-plan digest, preview/payload hashes and immutable intended.domainManifest/after.receipt, not a postcommit sidecar. Its effects use ordinary moving-average math; owner proof changes no scalar or rate.

For ordinary corrections, normalized intended valuation:null|proof and its digest bind approved preview/payload identity; a stock-moving committed operation retains the complete admitted proof in its immutable intended envelope. The receipt's available cost projection carries required currency plus valuationQualificationSha256 alongside actual CostEffect rows. Private garment's receipt manifest retains the full proof, and its narrowed authorized cost projection carries the same qualified denomination/digest. Receipt decoder checks the cost currency/digest against the immutable proof and the declared domain; mismatches are unavailable/integrity refusal, never reconstructed from current settings.

CorrectionCost available is `{state:'available',currency:string,valuationQualificationSha256:Digest,rows:CostEffect[]}`. Add unavailable `{state:'unavailable',reason:'valuation_currency_unverified'}` with no money rows/currency/digest. Existing denied and not_applicable variants also contain no currency/digest/rows. Current-reader denial removes currency/digest together with amounts, even from raw nested stored evidence; public preview/detail/status uses explicit typed whitelists and never spreads before/intended/after or the owner's protected reference. Private full garment evidence remains under its strict real-owner matrix. No new general/public provenance endpoint is selected.

A known-key historical status read verifies the current authorized reader independently, preserves original proof bytes/hash and acknowledges the committed receipt without requiring the historical attester still exists or is owner. Current source changes can change currentState, not the retained currency. A missing/unavailable status row is still unknown, not proof of rollback.

Compensation is a new approved operation with new current-owner attestation binding fresh complete affected boundaries. Currency must equal its retained forward receipt's immutable currency; it cannot recast or convert history. Retain inverseOfOperationId, original evidence and new proof distinctly. F1 garment inverse uses this rule; F2 receipt-chain owns its separate verified-document/historical-denomination basis and does not silently import a new generic F3 command. Mixed/unknown denomination remains ineligible rather than invoking FX.

#### Qualification inside existing tests

Extend existing pure/route/mounted/native/browser scenarios and the selected thirteen native behaviors; no fourteenth native registration. Strict fixtures cover missing/extra keys, wrong primitive/null pairs, foreign org/item/warehouse, unsorted/duplicate/257 keys, oversized/control/NFC-invalid references, noncanonical UUID/digest/bigint/time, future attestation, wrong actual owner and forged custom-role names. Test decoder/hash determinism and every proof field's approval sensitivity without embedding live private evidence.

Use positive same-owner admitted stock-moving examples, optional omission refusal, contrary USD ticket and changed finance display settings, two-bin garment exact set and ordinary extra/missing plan keys. Assert normal sales/stock writers still work under their original matrix, stockless POS-only swap still succeeds without finance/stock/owner proof, superfluous stockless proof refuses with zero effects, and public stock_only cannot bypass with a proof.

Preview/apply source mutation, latest-ledger/hash race, owner deletion/role change and period/bin drift must refuse or retry only under the existing guarded transaction policy, with zero partial ledger/stamp/audit/receipt writes. Successful ordinary/private receipts retain the full exact proof internally and project correct currency/digest; denied readers expose none. Delete the historical attester after a committed fixture and read as a different current owner: original evidence remains immutable and readable under current policy. Inverse requires the same forward currency plus fresh current-owner boundaries; changed currency refuses. Native counterexamples assert raw database receipts and all stock effects, while mounted/browser tests assert the owner-attested label, unavailable/denied states and no billing/default currency inference.


#### Owner can prepare a proof without inventing stock boundaries

Ordinary CorrectionPreview additionally has required `valuationScope:StockValuationQualificationV1['keys']|null`. The current admitted real owner with complete source/record and cost authority may receive the exact bounded affected keys/latest-ledger IDs+row hashes even when missing denomination proof makes eligible:false. This is a safe boundary projection, not a cost value, executable approval or evidence that currency is known. Nonowners/denied or incomplete source/stock scope receive null. Stockless uses null. The scope is read in the same existing preview snapshot, never a second unscoped query/endpoint; complete-set and 1–256 bounds apply before projection. No partial scope enables attestation.

In the existing two correction hosts, the owner explicitly enters a verified currency plus protected evidence reference/SHA and attestation time; the client builds the closed proof from that exact server scope and current subject, and sends a new preview with the same reason/domain request plus proof. The server independently verifies all identity/keys/time/evidence shape and refuses wrong/future/mixed facts with a fixed field/refusal state. It never infers proof from display settings or silently changes its timestamp/evidence. Only the complete qualified re-preview produces executable hashes; the owner confirms its actual displayed effects before apply. A source/boundary/policy drift resets the displayed approval and requires a fresh scope, explicit owner attestation and re-preview, not a generated new key or silent reapproval.

The proof/reference/amounts are transient protected form/command data, not additional fields in PendingCorrectionV1 or browser storage. Save only the existing bounded known operation/hash pointer before POST. Reload/unknown outcome still uses the actual authorized known-key GET and persistent block; no proof construction flow bypasses that recovery latch. Close/open/new-selection and denied-reader rules remain those of browser-recovery.md. Extend existing mounted/browser cases with scope absent for nonowner/denied, exact owner scope, missing-proof preview nonexecutable, successful explicit proof/re-preview/confirm, changed boundary requiring new attestation, rejected future time and unknown-pointer blocking. Do not add a public provenance endpoint or loosen financial data access to populate the form.

### Review artifact: contracts/workflow.md

### Correction API and observable workflow contract

Proposed Hub paths, not shipped endpoints. Server resolves authenticated org/actor; request bodies never contain them. Shared transaction/authority/normal-writer semantics are exact in [transaction-protocol.md](contracts/transaction-protocol.md).

#### Discriminated preview requests

`POST /api/stock/corrections/preview` accepts the strict `CorrectionPreviewCommand` envelope `{request, reason, valuation?}` declared in [recovery-receipts.md](contracts/recovery-receipts.md): `request` is one shape below, `reason` is required and `valuation` is the optional `StockValuationQualificationV1`. Unknown keys or forbidden combinations are HTTP `400`. `sourceId` for `pos_ticket_line` is always the sale LINE UUID; ticket identity is resolved from that same-org line. There is no separate lineId field or client-selected ticket owner. Existing ticket/line swap route checks both path IDs against that resolved row before delegating.

```ts
type VariantPreview = {
  mode: 'variant_swap'; sourceType: 'pos_ticket_line'; sourceId: string;
  expectedProductId: string; replacement: { productId: string };
};
type FrozenIssueLine = {
  originalLineId: string; itemId: string; qty: string; uom: string;
  fromWarehouseId: string;
};
// PRIVATE F1 intent only, NEVER admitted by an HTTP body parser.
type StockOnlyPreview = {
  mode: 'stock_only'; sourceType: 'pos_ticket_line'; sourceId: string;
  expectedProductId: string;
  replacement: {
    lines: FrozenIssueLine[];
    approvedItemMapping: {
      oldItemId: string; newItemId: string; stockQty: string;
      stockUom: string; evidenceSha256: string;
    };
  };
};
type ReceiptLine = {
  originalLineId: string; itemId: string; qty: string; rate: string;
  uom: string; toWarehouseId: string;
};
type ReceiptPreview = {
  mode: 'receipt_replace'; sourceType: 'stock_receipt'; sourceId: string;
  replacement: { lines: ReceiptLine[] };
};
type PreviewRequest = VariantPreview | ReceiptPreview;
type InternalCorrectionRequest = PreviewRequest | StockOnlyPreview;
```

All IDs are canonical UUIDs; arrays contain 1–200 lines, unique originalLineId, in original lineNo order. Source and every referenced row must resolve same org; missing and foreign rows both return `404`. Decimal inputs use ASCII digits with optional one decimal point, no exponent/plus/NaN/Infinity, positive magnitude, at most 4 fractional places, at most 9 integer digits; normalize to fixed 4 decimals for intent hashing. UOM is trimmed, 1–80 characters, and must exactly equal verified item stock UOM; no implicit conversion is invented. `ReceiptLine.rate` is in the stored valuation unit of `stk_entry_lines.rate`, the same unit as the original line after the intake conversion by `convertEntryRates` (`stock.logic.ts:542`); the correction does not accept a typed foreign currency and runs no conversion. New receipt rates are positive; each resulting absolute line/total stock value must be finite and ≤ 1000000000. Issue lines have no user-selected rate or opposite warehouse. Header/supplier/reason are not smuggled in line fields. Preview body maximum is 262144 UTF-8 bytes. These are chosen admission limits, not measured performance claims.

Variant swap changes only the expected old catalog product to replacement product, under existing same-price/modifier/void/period/invoice/fiscal guards. The resolver determines whether both plans of the swapped line are explicitly empty or stock-moving. The both-empty branch is supported whatever stock entry the ticket's other lines issued: it reads and changes no stock entry, records null entry references and does not consult `pos_tickets.stockEntryId`, matching `swapTicketLineProduct` (`pos.service.ts:1505-1549`). Mixed empty/nonempty is blocked in this slice. An absent, denied or failed read is never an empty plan.

private F1 stock-only leaves the already-correct sale product and visit product unchanged. Freeze all original submitted issue lines; transform only the single approved old→new item pair at the same admitted stock quantity/UOM. Every other line remains byte-identical in relevant stock fields. Compare original/frozen intended plan with `planRepost` using explicit old allowedItemIds and new allowIncreaseItemIds. Current recipe is diagnostic only, never authority to add co-ticket supplies. Mixed/shared target ownership or any unexpected item/value effect blocks. F1's bounded garment wrapper additionally requires its exact one-L-line/one-M-sale-line eligibility and approval manifest.

Receipt replacement is standalone only, submitted original, complete unique original line provenance, no owner/source ambiguity, no later ledger row on any original/replacement bin and a passing [receipt period policy](#receipt-period-policy-v1). Existing supplier and original date remain evidence; new posting is the current transaction time. All sourceType booking/invoice requests, generic historical consumption edits, empty line lists, unsupported conversion and downstream receipt history are blocked with `422`; F1/F2 receive inert review packets, not an alternative writer.

#### Capabilities and central admission

Every route uses canonical identity, `getCoreCtx`, active same-org membership, enabled relevant modules, record-owner filtering and current field policy. Apply rechecks through the locking fresh resolver under the common first gate. Exact mode matrix:

| Verified effect | Preview | Apply (generic and existing swap route) | Detail/history |
| --- | --- | --- | --- |
| Both-empty sale variant | pos:view + pos:edit; no stock fields/cost disclosed | pos:view + pos:edit; no stock:manage requirement; zero ledger/bin effects | Authorized sale view; no stock fields |
| Stock-moving sale variant (private F1 stock_only additionally requires real owner) | pos:view + pos:edit + stock:view | Same plus stock:manage and cost authority defined below | pos:view + stock:view; cost fields require the finance authority below |
| Standalone receipt_replace | stock:view | stock:view + stock:manage and cost authority defined below | stock:view; cost fields require the finance authority below |

Cost authority is exactly enabled finances plus `finance:view` and `capabilities.fieldLevel("finance") >= SENSITIVE_FIELD_LEVEL` from `$lib/permissions`, with current effective-authority narrowing and record checks. Stock has no field tier: FIELD_LEVEL_MODULES covers crm/finance/scheduling, and stock defaults to 0. Do not introduce a stock tier or test stock fieldLevel for costs. For cost-bearing preview/detail, disclose rate/value/COGS only with this finance authority; otherwise omit these fields and return the allowed quantity-only nonexecutable preview. Every stock-moving apply requires this authority in addition to its mode-specific stock/POS capabilities. Both-empty stockless swaps remain independent of finance and stock administration. Include ordinary-owner/custom-role success with stock field level 0 and finance-view/tier/module denial fixtures.

Preview may show a masked nonexecutable difference where stock:view permits it; `eligible:false` and blocker cost_visibility_required prevent approving unseen costs. A POS-only caller may have both-empty eligibility checked internally but gets no recipe/cost/foreign-record details; nonempty intent returns stock_scope_required without details. Do not demand stock:manage unconditionally for an existing stockless POS swap.

The read-only POST preview is the ONE exact central exception in `rbac.service.ts` `apiWriteCapability` for `/api/stock/corrections/preview`: return no mutating stock capability for that exact path/method, while canonical auth and the handler's matrix checks remain mandatory. All other stock writes retain existing prefix gates. Generic apply needs the same precise effect-based treatment: the central guard for exact `/api/stock/corrections` POST admits canonical authentication and delegates required stock capability to the verified effect matrix in the handler/service; it cannot infer stocklessness from a client flag. Existing swap path retains pos:edit centrally and delegates stock effects likewise. Implement the exact GET/HEAD read delegation and method/path regression in api-admission.md; API routes add no entries to the page-only route-design manifest. No broad `/api/stock` bypass.

#### Preview, apply and hash identity

Result shape is the reason-bearing CorrectionPreview with domain/eligible/previewHash/payloadHash/productChange/quantityEffects/cost in [recovery-receipts.md](contracts/recovery-receipts.md).

Canonical JSON is UTF-8 with recursively lexicographically sorted object keys; arrays keep semantic source lineNo or sorted stable identity order. Strings are Unicode NFC only for user reason/UOM, IDs lowercase canonical UUID, new intended decimal strings are fixed 4-decimal; original source numeric evidence retains exact stored spelling. No undefined, nonfinite or negative-zero values. SHA256 is lowercase hex.

`previewHash` hashes exactly `{schemaVersion:1,orgId,actorProfileId,request:normalizedPreviewRequest,valuation:normalizedValuation,sourceSnapshot,stockSnapshot,policySnapshot}`. sourceSnapshot contains original source/entry/line IDs and values, original financial/fiscal digest, direct/visit linkage; stockSnapshot contains complete affected ledger boundary/current bins/mapping/UOM/ownership evidence; policySnapshot contains current applicable membership/role/effective capability/period/field rules. It excludes random replacement UUIDs, wall clock, observation/run IDs and reason. Identical source/policy/valuation qualification produces identical preview; changed authority/source refuses stale apply.

`POST /api/stock/corrections` accepts exact `{request:PreviewRequest,operationKey:UUID,previewHash:SHA256,payloadHash:SHA256,reason:string,valuation?:StockValuationQualificationV1}` CorrectionCommand. Reason is trimmed, NFC, 1–1000 characters. `payloadHash` hashes exactly `{schemaVersion:1,orgId,actorProfileId,request:normalizedPreviewRequest,valuation:normalizedValuation,previewHash,reason}`; operationKey is the separate unique lookup key, not hashed intent. Same key/hash/actor replays the original committed result; changing source, mode, replacement, reason, expected product or actor is `409` key_reuse. Apply regenerates the full preview under locks and compares the supplied hash before any effect. Public API does not accept preallocated replacement IDs or a garment domain manifest. F1 uses the explicit private command/receipt contract in garment-envelope.md, including its approved posting time; F2 uses its separate receipt-chain service and transaction-accepting stock primitives.

Success is the exact `{schemaVersion:1,outcome:"applied",replayed,receipt}` CorrectionResult union in [recovery-receipts.md](contracts/recovery-receipts.md). Both-null entry refs occur only in the documented ordinary stockless receipt; private mapping has its own owning service. The immutable outcome and one audit commit together; a lost response uses known-key status.

Errors:

| HTTP status | Codes |
| --- | --- |
| `400` | invalid request |
| `403` | capability or cost denial |
| `404` | missing, foreign or owner-unavailable |
| `409` | `stale_preview`, `operation_conflict`, `key_reuse` |
| `422` | `source_ambiguous`, `dependent_history`, `policy_unverified`, `period_locked`, `negative_stock`, `stock_drift`, `price_differs`, `stock_scope_required` |
| `503` | exhausted known-rollback transient stock admission |

A lost response is unknown until same-key status lookup; never return applied for existing repost_pending. `GET /api/stock/corrections/:id` reads the same-org operation and applies the detail matrix/owner/field checks before serializing it; missing/foreign/unavailable all return `404`. Existing post-stock retry remains the recovery action for preexisting pending writes and blocks starting a fresh correction.

#### Visit product association

A stock-moving or both-empty variant swap on a line with a `bookingId` reuses `moveVisitProduct` (`pos.service.ts:1367-1393`) unchanged. If the booking has no `sched_booking_products` row for the replacement product, the old row's `product_id` is updated (`action:'moved'`). If the booking already has a row for the replacement product, the old row is deleted, because the table allows one row per booking and product (`action:'merged'`); the surviving row keeps its own quantity. `sourceSnapshot.rows` therefore covers both the old-product row and any existing replacement-product row of that booking. The ordinary `after` JSON records `visitProduct:{bookingId,action:'moved'|'merged',fromRow:{id,productId,qty},toRow:{id,productId,qty}|null}` with the pre-change values of both rows, so a deleted row's id and quantity stay discoverable (FR-009). A line without a booking records `visitProduct:null`. Stock-only repost never calls `moveVisitProduct`.

#### Replacement entry metadata

Every replacement entry is created by `createEntryInTx` after `cancelEntryInTx` has cancelled the original in the same transaction. Its `stk_entries.metadata` is:

- Sale corrections (`sale_variant` stock-moving and both `sale_stock_repost` actions): `{source:'pos', sourceId:<ticketId>, ticketId:<ticketId>, correctionOf:<cancelled entry UUID>, correctionOperationKey:<operationKey>}`. The first three keys equal what `postTicketStock` writes through `createSourcedIssue` (`pos.service.ts:1163-1172`), so `findEntryBySource('pos', ticketId)` and `entryDocument` keep resolving the ticket.
- Receipt corrections (`receipt_replace`): `{correctionOf, correctionOperationKey}` plus the original entry's `purchaseId` and `providerRef` when present, so the purchase link survives. For a quantity-only correction the original `currency`, `fxRate` and `fxUpdatedAt` keys are copied unchanged, because the rate is unchanged. For a correction that changes a rate they are omitted: the new rate is entered in the valuation unit and no conversion produced it. The original entry keeps all its metadata. Receipts carry no `source`/`sourceId` keys.

Replacement creation runs the same non-cancelled duplicate-source check as `insertSourcedIssueEntry` (`stock.service.ts:1675-1690`) for sale corrections. Because the original is cancelled first in the same transaction, the check finds no live entry; a live entry found there refuses with `duplicate_source` and rolls the whole correction back.

#### Receipt period policy v1

`receipt_replace` admits a period under one fixed release policy, `RECEIPT_PERIOD_POLICY_ID = 'receipt_period_v1'`, exported from `stock-corrections.logic.ts`. It has no setting, feature flag or per-operation proof. Owner approval of this specification approves the policy; `receipt_replace` ships only after that approval (T001). A later policy needs a new identifier and a new approval.

Preview and apply evaluate it in their own snapshot; apply evaluates it again under the held gate pair:

1. Read the `fin_settings` row for the org. If it is absent, refuse `422 policy_unverified`. Receipt correction does not use the `America/Lima` fallback of `periodLockExists` (`period-locks.ts:31`); sale guards keep that fallback unchanged.
2. `originalMonth` is the original entry's `posted_at` as `YYYY-MM` in `fin_settings.timezone`. `currentMonth` is the transaction's posting time as `YYYY-MM` in the same timezone.
3. If a period lock exists for either month, refuse `422 period_locked`.

The evaluation is stored in `policySnapshot.receiptPeriodPolicy = {policyId:'receipt_period_v1', accountingTimezone, originalMonth, currentMonth, periodLockRows:[{period,rowHash}]}`. It is part of the preview hash and of the immutable `before.policySnapshot`, which is the evidence record; no new column or table is added. A preview computed under a different `policyId`, timezone or lock rows is `409 stale_preview` at apply.

#### Existing clients and UI

Existing `POST /api/pos/tickets/:id/lines/:lineId/swap` keeps its target-product intent but now requires reason/key/previewHash/payloadHash and delegates to this service; existing UI and route/mounted tests update in the same release. Old tabs receive a typed refresh_required validation response with no write rather than bypassing evidence. Existing UI refreshes source/preview and asks for reason, never silently generates a new approval after stale conflict.

Existing ticket/entry detail offers preview, explicit reason and disabled confirm on blockers. Keep one operation key until authoritative outcome; response loss queries/retries that key, changed intent needs a new preview/key. Keyboard/translated controls expose original/replacement references and honest pending state. Unsupported history links to F1/F2, never mark-completed or additional charge. Stockless sale view remains usable without stock administration.

#### Exact source fingerprint representation

Do not serialize arbitrary contact/customer metadata into snapshots. Each source record is represented by `{table,key,rowHash}`: table from the closed source set below, key is its canonical primary/unique identity tuple as strings, rowHash is SHA256 of UTF-8 PostgreSQL `to_jsonb(row)::text` selected as TEXT (not parsed/re-emitted JSON). Set LOCAL TIME ZONE UTC before fingerprint queries, preserving PostgreSQL timestamp microseconds and exact numeric spellings; do not narrow ledger IDs or convert record dates through JavaScript Date for hashes. Only this digest is persisted for complete financial rows; before/intended/after expose the explicitly named stock/quantity/value/source-ID facts, never names, phones or credentials.

`sourceSnapshot = {sourceType,sourceId,rows,financialDigest}`. rows covers the source sale line and parent ticket/shift/emission rows; expected/replacement product records; the booking's `sched_booking_products` rows for the old and the replacement product; original stock header/lines. Standalone receipt uses its header/lines and empty sale rows. Table set is `pos_ticket_lines,pos_tickets,pos_shifts,pos_emissions,fin_products,sched_booking_products,stk_entries,stk_entry_lines`. Sort by table then key tuple. financialDigest hashes every row of pos_payments and applicable invoice binding for that ticket, sorted by stable key, with no private raw record output.

`stockSnapshot = {entryIds,ledgerRows,bins,ruleRows}`: entryIds sorted UUID; ledgerRows are `{id:string,rowHash}` for every original-entry ledger row plus the complete current latest boundary on every original/intended bin; bins are `{itemId,warehouseId,exists,rowHash:null|string}`; ruleRows are typed table/key/hash records for all visited consumption/component/direct-bridge/item-UOM rows used by the existing rule resolver. Source-resolution warning, missing conversion, cycle/partial graph or unsafe numeric ID makes the preview blocked, not a partial hash. No whole-catalog row dump. `policySnapshot = {authorityRows,periodRows,fieldPolicy,accountingTimezone,receiptPeriodPolicy}` using current membership/assigned-role/org-role/permission-rule rows and applicable period/finance timezone rows, sorted semantic keys, plus normalized effective field policy. `receiptPeriodPolicy` is the [receipt period policy](#receipt-period-policy-v1) evaluation for `receipt_replace` and `null` for sale modes. All raw stock numeric facts remain strings in the readable diff; hashes bind exact stored state, not tolerance comparisons.

The canonical top-level preview/payload JSON then hashes these precise digest structures. Any relevant source/policy row mutation, removal or addition changes the approved preview even if the visible price appears unchanged. Fixture tests mutate each snapshot family independently and require stale_preview; metadata unrelated to source is never silently excluded by implementer choice.

#### Exact shared service entrypoints

`src/server/services/stock-corrections.logic.ts` exports the PreviewRequest discriminated union and CorrectionPreview/CorrectionResult wire types above. `src/server/services/stock-corrections.service.ts` exports:

```ts
export interface CorrectionCommand {
  request: PreviewRequest;
  valuation?: StockValuationQualificationV1;
  operationKey: string;
  previewHash: string;
  payloadHash: string;
  reason: string;
}
// Generic public service has NO private options bag.
// Exact private garment command and owning entrypoints are defined in garment-envelope.md.
export function previewStockCorrection(ctx: CoreCtx,
  request: PreviewRequest, reason: string,
  valuation?: StockValuationQualificationV1): Promise<CorrectionPreview>;
export function applyStockCorrection(ctx: CoreCtx, command: CorrectionCommand,
  actor: Actor): Promise<CorrectionResult>;
export function getStockCorrection(ctx: CoreCtx,
  correctionId: string): Promise<CorrectionResult>;
```

Every entrypoint requires nonempty canonical `ctx.profileId` and same-org authenticated context. HTTP getCoreCtx supplies its resolved Supabase subject; operator wrappers supply only F7-verified subject after target admission. Mutation requires actor.id equal ctx.profileId, not a client-provided or legacy alternate identity. Each method performs its own exact capability/owner/field checks, never assumes a route prefix authorized it. preview owns one read-only snapshot through the shared nonlocking resolver; apply owns one guarded write transaction and fresh locking resolver; detail owns one authorized read snapshot. Never nest these owning methods inside an existing CoreTx. F2 uses the explicitly transaction-accepting stock primitives for its different multi-entry operation, not repeated generic API calls.

Existing swap wrapper converts its validated path binding and product intent to VariantPreview with sourceId=lineId. F1 uses only the owning previewGarmentStockCorrection/applyGarmentStockCorrection entrypoints and complete typed garment manifest in [garment-envelope.md](contracts/garment-envelope.md). No naked replacementEntryId option or client StockOnlyPreview can enter generic apply. The private method calls the same passed-tx frozen-line engine and receipt writer, never a second posting implementation. Public stock_only preview/apply is HTTP `422` owner_evidence_required before source/stock effects, even if supplied evidenceSha256 looks valid; ordinary parsing rejects other unknown/forbidden keys with `400`. The server emits only an inert F1 review packet for this unsupported public action.

The common write boundary is stock-v1, then the org authority lock, before all source and business row locks; the source, period, authority, entry, accrual and bin row order follows. Role and module deny inserts are covered only through the participating authority writers and fresh direct checks from transaction-protocol.md, not by `FOR SHARE` of existing rows. The file-action plan is [implementation-inventory.md](implementation-inventory.md); native qualification has thirteen behaviors, including the two absent-row authority cases.

Private garment forward/compensation uses the same strict typed action/reference union and owning service functions in the private garment-envelope.md contract. The inverse requires actual applied forward receipt/current replacement/stamp/no intervening state and a new approved manifest/time/entry/key; it preserves ordinary moving-average pricing and explicitly discloses any unequal-rate cost delta. Native frozen-line/reuse cases cover both directions, no fourteenth behavior. Consume F7-qualified postgres restricted ACL sentinel and exactAssertions:true native registration/report enforcement; do not implement a second helper/validator or claim old report.ts already enforced exact counts.

[recovery-receipts.md](contracts/recovery-receipts.md) selects the exact ordinary/private receipt union, preview/result wire types, getStockCorrectionByOperationKey(ctx,input), collection GET known-key protocol, current-reader authority and immutable historical actor. The generic get-by-id remains, while lost-response callers do not need an unknown correction UUID. [garment-numerics.md](contracts/garment-numerics.md) fixes source Number/String effects versus fixed 4-decimal input and the independent oracle; no tolerance weakens approval hashes.

The optional public top-level valuation proof, normalized null/hash identity, actual-owner stock-changing admission and typed unavailable/owner-scope flow are [valuation-qualification.md](contracts/valuation-qualification.md). The domain PreviewRequest union is unchanged. The swap adapter and both hosts pass the same optional proof to preview/apply, and invalidate approval when it changes; stockless rejects extra proof. All applicable stock-cost rendering passes the qualified currency explicitly to formatMoney(value,cost.currency), never its PEN default or a billing/display currency.

### Review artifact: quickstart.md

### Validation guide: Auditable stock corrections

The commands below are future implementation qualification. Independent review results and dispositions are recorded under `egm/`; owner data-spec approval, implementation qualification, owner merge and runtime proof remain pending.

#### Preconditions and authoritative contracts

Use an authorized isolated Hub candidate against the registry PR base with Bun. Read Hub AGENTS.md/CLAUDE.md, UI governance and `docs/qa-stack.md`; inspect existing QA ownership before starting or resetting anything. Use synthetic tenants and qualified loopback fixtures, never production credentials or a production-backed development server.

Read these complete contracts before implementing or running proof:

- [API/workflow](contracts/workflow.md): exact discriminated fields/bounds, line-UUID source identity, canonical hashes, capability matrix, precise central exceptions, response loss and legacy-tab behavior.
- [Transaction and authority protocol](contracts/transaction-protocol.md): F7-owned principal/nonlocking snapshot adapter, first per-org gate, exact typed helpers, complete writer inventory, order, timeouts/retry and mapping cutover.
- [Native qualification](contracts/native-qualification.md): exact suite ownership, safe fixture admission and whole-lane completeness guard.
- [Data model](data-model.md): the one `20261116193000_stock_corrections.sql` migration, five-kind CHECK/nullability/foreign-reference contract, immutable RLS/grants and shared F1/F2 storage.

Before F3 preview qualifies, require F7's real READ ONLY capability-parity/denial results. Do not call the existing FOR SHARE resolver from a read-only preview, perform remote token verification while the write gate is held, or duplicate an operator authority implementation. Before dependent F1/F2 writers or F5 recovery qualify, the shared gate/helper and source-retry cases below must pass.

#### Pure, route and mounted checks

After implementing the named files, run the ordinary suites from the exact candidate:

```bash
bunx vitest run src/server/services/stock-corrections.logic.test.ts src/server/services/stock.service.test.ts src/server/services/rbac.service.test.ts src/hooks.tenant.test.ts
bunx vitest run src/routes/api/stock/corrections/server.test.ts 'src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/server.test.ts'
bunx vitest run 'src/routes/(app)/pos/tickets/[id]/page.swap.mounted.test.ts' 'src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts'
bunx vitest run scripts/qc/native-postgres-manifest.test.ts scripts/qc/native-postgres-report.test.ts
bunx vitest run src/lib/routes/route-design-contracts.test.ts src/lib/routes/route-access-authority.test.ts
```

The correction logic/service/routes and receipt mounted companion are proposed additions; create them under the stated paths before these commands. Existing source/route/mounted harnesses are extended rather than replaced by static markup. Ordinary Vitest excludes every `*.sql.integration.test.ts`; passing such a filename to a plain focused command is not native proof.

API oracles include unknown/forbidden field combinations, line UUID versus ticket path ownership, 1–200 ordered lines and exact numeric/UOM/body bounds, reason/source/replacement/mode/actor key reuse, masked/nonexecutable preview and a POS-only both-empty swap. Prove that the exact preview/apply central exceptions cannot affect another path or method or trust a client claim of stocklessness. Old tabs get refresh_required with zero mutation; stale previews never silently approve new intent.

#### The exact thirteen native correction semantics

Register the single stock-corrections.sql.integration.test.ts qa-native owner with `exactAssertions: true`, `minimumAssertions: 13` and the thirteen requiredBehaviors below, as in [contracts/native-qualification.md](contracts/native-qualification.md); use actual describe/it names, update manifest/report tests and reject missing/failed/skipped/todo results. No new lane/discovery bypass.

- `stock corrections against PostgreSQL preserves POS only no stock swap and rejects unauthorized stock effects`
- `stock corrections against PostgreSQL freezes approved stock only lines and preserves financial facts`
- `stock corrections against PostgreSQL rolls back every intermediate write and records one immutable outcome`
- `stock corrections against PostgreSQL reconciles lost response and rejects changed intent operation reuse`
- `stock corrections against PostgreSQL serializes absent bins normal posting correction and rebuild under the first org gate`
- `stock corrections against PostgreSQL serializes period fiscal and void guards before correction`
- `stock corrections against PostgreSQL drains old mapping posters and refuses persisted old mapping pending sources`
- `stock corrections against PostgreSQL enforces tenant scoped five kind schema immutable grants and private source ownership`
- `stock corrections against PostgreSQL repeated concurrent booking completion reuses frozen draft and submitted source once`
- `stock corrections against PostgreSQL absent permission deny insertion serializes with correction in both authority lock orders`
- `stock corrections against PostgreSQL absent enabled module can be disabled only before or after the guarded correction`
- `stock corrections against PostgreSQL serializes warehouse timezone and bundle eligibility writers in both arrival orders`
- `stock corrections against PostgreSQL rejects deleting principals and inactive organizations before correction admission`

The complete fixture/command contract is contracts/native-qualification.md. Expand counterexamples inside these thirteen registered behaviors, not an unadmitted new file.

Case 9 is the common F5 dependency. It calls actual source helpers through independent PostgreSQL backends and proves both a saved draft and already-submitted booking source survive repeated/concurrent individual /complete retry with one source-owned entry. Cached pre-gate open-accrual arrays or current recipe plans cannot supply mutation authority. Preserve separately committed booking lifecycle/payment facts. Negative-stock domain rejection may retain the existing draft/warning outcome only with zero ledger/bin partial effects.

#### Qualified fixture and actual lock proof

Provision both target types from `docs/qa-stack.md` and the existing `.github/workflows/ci.yml:652–684` qa-native recipe: the owned full-schema QA database used by existing lane suites, and the owned marked disposable `minion_qc_*` fixture database. Inspect actual ownership, loopback URLs and markers before assigning private `FACES_FULL_SCHEMA_QA_URL` and `FACES_DISPOSABLE_DATABASE_URL`; names alone do not qualify a target.

The new suite uses the concrete owned child database recipe in contracts/native-qualification.md, required by actual public-qualified authority SQL. Qualify minion_qc controller/marker/CREATEDB first, create only minion_qc_faces_correction_<32hex>, requalify child identity, apply real migration/canonical public fixtures and inject actual child source clients. Do not substitute search_path-only schemas or copied SQL. Independent backends and observed lock barriers prove both arrival orders. Finally close handles and drop only the recorded child database, never controller/shared QA. Missing fixture/privilege fails qualification before effects, never optional skip.

The first business-lock SQL for every participating write is exactly:

```sql
select pg_advisory_xact_lock(hashtextextended('minion:stock-write:v1:' || $1::text, 0));
```

After that gate, verify the shared operation/source-ticket-or-product → period-policy/fresh authority → entry → accrual → sorted-bin order. Verify every named participant and direct writer from contracts/transaction-protocol.md; no business row lock precedes the gate. Absent bins remain EMPTY_BIN under the gate until qualified posting, with no rejected placeholder rows. Mapping cutover drains old admitted posters, then rejects persisted old-mapping drafts/open expectations with cutover_pending_sources and no effects; a newly admitted poster reads the new rule only after a successful mapping commit.

Each local write uses lock timeout 1000 ms, statement timeout 12000 ms and overall deadline 60000 ms. Exactly three total attempts are allowed: initial attempt and two confirmed-rollback retries, delayed 40 ms and 80 ms, only for SQLSTATE 40001, 40P01 or 55P03. Keep the approved fingerprints/key and recheck authority. Statement timeout 57014, domain/stale errors and unknown COMMIT are never blindly retried. Response loss reconciles the immutable receipt; it does not repeat a committed lifecycle/payment transition.

#### Whole native lane and completeness guard

After implementation and target qualification, run the whole admitted lane:

```bash
MINION_QC_DISPOSABLE=1 MINION_QC_DATABASE_URL="$FACES_DISPOSABLE_DATABASE_URL" HUB_TEST_DB_URL="$FACES_FULL_SCHEMA_QA_URL" REQUIRE_QA_NATIVE_POSTGRES=1 REQUIRE_ORG_ROLES_POSTGRES=1 bun --no-env-file run vitest run --config vitest.qa-native-postgres.config.ts --reporter=default --reporter=json --outputFile.json=test-results/faces-stock-qa-native.json
bun --no-env-file scripts/qc/native-postgres-report.ts qa-native test-results/faces-stock-qa-native.json
```

No file filter is present. The report guard requires every admitted lane file/name and the exact correction count, with zero failed/skipped/todo/missing cases. A filtered development invocation is labeled focused only and is never passed off as whole-lane qualification. Retain target/marker admission, exact source hash, raw native JSON and guard exit code privately. Neither ordinary mocked tests nor a prior green candidate substitutes for this result.

#### Required business/failure matrix

- Sale: same-price variant change and already-correct-M/wrong-L stock_only correction; freeze all original issue lines and change only the approved pair. Compare zero payment/ticket-amount/date/visit-product changes for stock_only. Test both-empty without stock administration, mixed empty/nonempty refusal, modifiers, denied/foreign/archived rows, fiscal/reconciled/void/period guards, stale recipe/source and two keys on one preview.
- Standalone receipt: admitted quantity/value replacement, distinct affected bins, immutable original supplier/date evidence and current approved posting time. Later issue/transfer/adjustment on any original or replacement bin, ambiguous owner or unverified period blocks with zero effects; unsupported history produces only an F1/F2 packet.
- Atomicity/recovery: inject fault before/after cancellation, replacement creation, ledger insertion, bin write, source stamp, transactional audit and immutable receipt. A confirmed rollback leaves no partial correction. Lost committed response reuses one operation outcome and emits no additional entry events. Check five-kind nullability/composite foreign refs/JSON-size/unique-source/immutable grants and other-tenant denial.
- Concurrency: absent-bin first writers, normal posting versus correction, rebuild versus issue, mapping cutover versus old/new posters, persisted pending source refusal, period close/fiscal/void versus correction, F2-like multi-entry versus new issue, and repeated/concurrent booking retry. Assert independent invariants and original financial/lifecycle facts; no statement-count-only proof.

#### Full candidate and browser gates

```bash
bun run check
bun run test
bun run build
bun run i18n:compile
bun run lint:design
bun run lint:tokens
bun run qa:check-pairing
```

Require zero check errors/warnings, zero test failures and the clean Hub build outcome subject only to its documented optional-peer notices. The native migration tests and paired synthetic seed cover the shared schema; run the implementation candidate's declared schema/migration contract gates as well, recording the exact current commands rather than inventing a tolerated baseline. Preserve semantic design tokens and current route/RBAC manifests.

Use Browser Harness with synthetic identities for ticket/receipt/no-stock/blocked flows on desktop and narrow viewport, Spanish/English, keyboard focus, reason/preview/conflict and response-loss recovery. Inspect route-data authorization and serialized cost/source fields independently of a 200 document shell or success toast. Owner spec approval precedes code; independent implementation review, CI, owner merge, deployment identity and separately approved F1/F2 exact-record dry-run/apply remain distinct gates. No bulk historical repair is authorized by this workflow spec.

#### Authority insert races and file actions

Use implementation-inventory.md for the exact source/test/QA/catalog changes. Native file remains the same qa-native-owned stock-corrections.sql.integration.test.ts with the thirteen required behaviors from native-qualification.md; no new excluded race file. Acquire stock-v1, then the org authority lock, before source locks, use real writeSectionAccess/setModuleEnabled for initially absent deny/disable rows, and observe both lock arrival orders. Deny/disable first means correction zero-effect refusal; correction first means authority writer waits and then commits afterward. FOR SHARE of existing rows or mocked fresh caps cannot prove this. Verify verified both-empty POS swap/period-only behavior when stock disabled and ordinary owner/custom roles with stock field level 0 plus the existing finance cost tier. Preserve the global account-deletion order (org authority lock before the profile write).

The explicit inventory includes new ordinary `stock-corrections.service.test.ts`, stock detail `page.correction.mounted.test.ts` and staged operator loader-root smoke in addition to the existing logic/API/swap fixtures. Run each created path through the existing ordinary/mounted environment plus the existing manifest/report validator tests; all exact outputs are recorded per slice in validation.md. New mounted files declare happy-dom. Existing dependency-owned authority writer files/helper/event payload remain unchanged unless a documented candidate drift requires an owner-reviewed amendment.

Public stock_only preview/apply is `422` owner_evidence_required and presents an inert F1 packet. The known garment native scenario calls only the private entrypoints/full manifest in contracts/garment-envelope.md, requiring verified real owner/exact approved digest and atomic timestamp/evidence receipt. Include all eligibility-writer and deleting-profile/active-org races in behaviors 12 and 13.

before public baseline profiles/member/org policy or FK DDL, apply F7 [complete test-only native auth prerequisite](../128-faces-receivables-audit/contracts/native-auth-prerequisites.md): exact full-lane controller (image `pgvector/pgvector:0.8.6-pg18-trixie`, `minion_qc_vectors`), owned child auth schema/users/uid STABLE SECURITY INVOKER with canonical owner/ACL/JWT semantics, seed auth user before profile/email/FK. No app_ledger extra grants/policies/JWT subject. The shared test helper/SQL fixture is owned by F7; reuse that qualified recipe. This is a test-only dependency; F3's runtime dependency on F7 is the authority bridge named in spec.md. Bare child PostgreSQL plus public policy text alone is not a runnable fixture.

Qualify [valuation-qualification.md](contracts/valuation-qualification.md) and [api-admission.md](contracts/api-admission.md) through all of the selected pure, HTTP, mounted, browser and native tests: owner scope/proof/re-preview, contrary billing currency/display settings, denied metadata, inverse/historical attester deletion, POS-only GET/HEAD recovery and unchanged unrelated stock gates. Keep thirteen native behavior names.

### Review artifact: tasks.md

### Tasks: Auditable stock correction workflow

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/workflow.md, contracts/transaction-protocol.md, contracts/native-qualification.md and quickstart.md.
**Status**: Documented implementation work only. Every task remains unchecked. Review results and dispositions are recorded under `egm/`; owner data-spec approval and owner merge remain pending. Paths are Hub-relative unless prefixed `specs/`.

#### Phase 1 — Approval and exact candidate

- [ ] T001 Record owner data-spec approval and reviewed scope in `specs/124-stock-correction-workflow/checklists/requirements.md`; inspect independent results under `specs/124-stock-correction-workflow/egm/` and stop before product code while approval is pending.
- [ ] T002 Establish an authorized isolated Hub candidate against the registry PR base, read Hub instructions/UI governance/QA runbook, and record source drift, ownership and synthetic fixture targets in `specs/124-stock-correction-workflow/quickstart.md`; preserve shared WIP.

#### Phase 2 — Shared foundations

These tasks block every stock-changing story and the dependent F1/F2 writers. The F7-owned authority prerequisite also blocks read-only preview qualification.

- [ ] T003 Consume qualified F7-owned `scripts/lib/operator-principal.ts` and `src/server/services/rbac.service.ts` APIs exactly as declared in contracts/transaction-protocol.md: verified qualified GoTrue principal, `resolveFreshCapabilitiesReadOnlyInTransaction` in the caller-owned READ ONLY snapshot, and resolveFreshOperatorCapabilitiesForWriteInTransaction(tx:CoreTx,orgId:string,profileId:string) for these guarded new writes (legacy resolveFreshCapabilitiesInTransaction stays unchanged for unrelated callers and is NOT used by F1/F2/F3 mutation admission). Require F7 native policy-composition parity, READ ONLY success and denial proof; do not duplicate authentication or call FOR SHARE from READ ONLY.
- [ ] T004 Add the exact shared schema to `src/server/db/pg-schema/stock.ts` and `supabase/migrations/20261116193000_stock_corrections.sql`: all five kinds `sale_variant|sale_stock_repost|receipt_replace|product_mapping|receipt_chain`; the authoritative kind/source/entry-nullability CHECK matrix; composite same-org entry references with supporting `(org_id,id)` uniqueness; unique `(org_id,operation_key)` and partial receipt_chain source uniqueness; exact hash/reason/actor/JSON-size/status checks; forced org RLS and immutable SELECT/INSERT-only app_ledger grants from data-model.md. No parallel migration or three-kind substitute.
- [ ] T005 Pair that migration with synthetic `scripts/qa/seed/stock.ts` and `scripts/qa/seed/matrix.ts` entries. Add five-kind/nullability/foreign-reference/hash/size/unique-source/immutable-grant migration cases to `src/server/services/stock-corrections.sql.integration.test.ts`; retain original evidence and verify migration/seed pairing.
- [ ] T006 Add `src/server/services/stock-corrections.sql.integration.test.ts` exactly once to qa-native in `scripts/qc/native-postgres-manifest.ts`, with `exactAssertions: true`, `minimumAssertions: 13` and the thirteen semantic names in contracts/native-qualification.md, after F7's exact-count flag qualifies. Update `scripts/qc/native-postgres-manifest.test.ts` and `scripts/qc/native-postgres-report.test.ts` for single ownership and missing/failed/skipped/todo rejection. Ordinary Vitest exclusion remains; do not add a discovery glob or CI bypass.
- [ ] T007 Prepare the exact owned-child-DATABASE fixture in `src/server/services/stock-corrections.sql.integration.test.ts` before writer implementation. Admit the controller through openDisposablePostgres (actual loopback/name/minion_qc/marker), verify existing controller CREATE database privileges and app_ledger role, then create only `minion_qc_faces_correction_${randomUUID().replaceAll('-', '')}` with its exact marker. Reopen/requalify the child, seed canonical public fixtures/RLS, inject actual source handles and observe independent-backend lock barriers. Finally release blockers, close child handles, drop only the recorded child database, verify absence, then close controller. Follow contracts/native-qualification.md/F7 recipe; no search-path-only substitute, mocks, sleeps or shared business data.
- [ ] T008 Implement the exact opaque `StockWriteGuard`, `LockedBins`, `StockPostingOptions`, `lockStockWrite`, `lockBinsInTx` and create/submit/cancel InTx signatures in `src/server/services/stock.service.ts`. Acquire stock-v1, then the existing org authority lock, before any source/business row lock, validate guard transaction/org identity and ownership of both locks, add the exact direct-module-state helper, deduplicate/sort bin keys, preserve existing math and pre-write domain validation, and reuse existing `activity.service.ts` recordAuditInTx unchanged. Extend `src/server/services/stock.service.test.ts` for wrapper/event compatibility and no double emission.
- [ ] T009 Apply contracts/transaction-protocol.md's first per-org exclusive xact gate and its exact later row-lock order to the complete named inventory in `src/server/services/stock.service.ts`, `src/server/services/pos.service.ts` (including the period-lock writer `setPeriodLock`; `pos/period-locks.ts` holds readers only and does not change), `src/server/services/stock-accruals.service.ts` and `src/server/services/finance.service.ts`. Include updateWarehouse archive/default/parent, updateFinSettings timezone/first upsert, setBundleComponent/deleteBundleComponent validation+write in one transaction, and direct draft/bin/rebuild/mapping/UOM/component writers, source issue creation, POS posting/repost/swap/submit/void/payment/period/fiscal local writes, and accrual accrue/release/realize. Inventory every direct stock/source-value writer by code search before qualification; no caller may take a business row lock before both gates or carry cached rules/module state across admission. Modify `src/server/services/modules.service.ts` to take the org authority lock before its upsert (no stock gate), preserve post-commit cache invalidation and actual API authority, and verify the complete existing authority-writer order from transaction-protocol.md; period/fiscal-only bookkeeping and verified POS-only swaps retain their scoped module requirements.
- [ ] T010 Export the exact `postTicketStockInTx` and `realizeAccrualsInTx` seams in `src/server/services/pos.service.ts` and `src/server/services/stock-accruals.service.ts`. Re-read source/open-accrual/draft/submitted state after the gate, preserve saved draft lines, reconcile submitted sources once, and retain the separately committed booking lifecycle/payment boundary. Prove repeated/concurrent individual booking /complete retries in native semantic case 9 before F5 recover_stock may qualify; do not add another posting engine.
- [ ] T011 Implement fixed timeout/retry/cutover rules in the participating source wrappers named by T009: local lock timeout 1000 ms, statement timeout 12000 ms, overall deadline 60000 ms; exactly three total attempts, delays 40 ms then 80 ms, only confirmed-rollback SQLSTATE 40001/40P01/55P03. Revalidate original intent/authority each time; never retry 57014, domain/stale errors or unknown COMMIT. Mapping cutover uses the same gate and fresh persisted-draft/open-expectation census; `cutover_pending_sources` refuses with zero effects. Add both exact new absent-deny/module-disable real-writer race cases plus before/after poster and pending-source race cases to `src/server/services/stock-corrections.sql.integration.test.ts`.
- [ ] T012 Implement the closed request/result types, validation and canonical hash functions in `src/server/services/stock-corrections.logic.ts` from contracts/workflow.md: pos_ticket_line sourceId is the line UUID; no lineId payload alias; exact mode/source combinations, line/mapping fields, 1–200 lines, numeric/UOM/body bounds, normalized intent and fixed preview/payload hash bodies. Test every forbidden combination and altered-intent reuse; do not invent another stock calculation engine.

#### Phase 3 — US1: Sale variant and stock-only correction

**Goal**: Correct one allowed sale effect once while preserving financial facts and source evidence. Both-empty product swaps retain POS-only access; stock-moving operations require their explicit stock/cost authority.

- [ ] T013 [US1] Add pure mode/eligibility/hash tests in `src/server/services/stock-corrections.logic.test.ts` for both-empty (including a mixed ticket whose other line issued stock), mixed empty/nonempty, same-price/modifier/fiscal/period guards, frozen stock-only lines, unexpected mapping effects, foreign IDs, numeric/body limits and reason/source/mode/actor/key changes.
- [ ] T014 [US1] Implement `src/server/services/stock-corrections.service.ts` using the shared typed seams and first gate: locking authority, source/policy/stock revalidation, atomic cancellation/replacement/stamp, immutable applied receipt plus recordAuditInTx, and the existing helper-owned event once per newly submitted replacement entry (none for both-empty). Both-empty has no entry/bin effects; stock_only never changes the already-correct sale/visit product. Unknown outcome uses authoritative same-key receipt lookup; preexisting repost_pending blocks a fresh correction.
- [ ] T015 [US1] Delegate `swapTicketLineProduct` in `src/server/services/pos.service.ts` to the shared engine. Update `src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts` and its `server.test.ts` so path ticket/line IDs resolve the same authorized source line, reason/key/previewHash/payloadHash are required, old tabs receive typed refresh_required with no write, and existing POS-only stockless behavior remains, including a both-empty swap on a ticket whose other lines issued stock.
- [ ] T016 [US1] Add reason-bearing preview/typed apply/detail and collection GET known-key status handlers under `src/routes/api/stock/corrections/` and tests in `src/routes/api/stock/corrections/server.test.ts` plus actual central hook-through-handler coverage in `src/hooks.tenant.test.ts`. Implement the exact effect capability/detail/cost matrix and the exact POST and canonical GET/HEAD delegation from contracts/api-admission.md in `src/server/services/rbac.service.ts`; preserve all other stock prefix gates. Keep the existing page-only `src/lib/routes/route-design-manifest.ts` unchanged for API-only additions; prove no alternate path/method or client-declared stocklessness bypasses the handlers.
- [ ] T017 [US1] Update `src/routes/(app)/pos/tickets/[id]/PageBody.svelte` and `page.swap.mounted.test.ts` for translated reason/preview, explicit owner valuation proof/safe-scope/re-preview from contracts/valuation-qualification.md, stable key, the exact `src/lib/components/stock/correction-pending.ts` durable pointer and its test, masked/blocked/stale states, saved-outcome recovery, original/replacement links, blocked public stock_only inert handoff and keyboard/focus behavior. Keep the operation key through response loss and require a fresh explicit intent after stale conflict.

#### Phase 4 — US2: Safe standalone receipt replacement

**Goal**: Correct a standalone receipt only when the exact no-downstream contract is satisfied. Complex valuation remains an inert F2 packet.

- [ ] T018 [US2] Add receipt/source/period/bin-boundary tests in `src/server/services/stock-corrections.logic.test.ts`: complete unique original line provenance, valid same-org item/UOM/warehouse, positive admitted rate/quantity/value, original/current period rules, source ambiguity and later movement on any original/replacement bin.
- [ ] T019 [US2] Implement receipt_replace in `src/server/services/stock-corrections.service.ts` with the same gate/helpers/authority and current approved posting time. Preserve original supplier/date evidence, original lines/ledger and immutable correction linkage; refuse downstream or unsupported ownership rather than inventing a value-only writer.
- [ ] T020 [US2] Complete native receipt/atomicity cases within the thirteen admitted tests in `src/server/services/stock-corrections.sql.integration.test.ts`: quantity/value correction, changed preview, initially absent bins, later history, every intermediate cancellation/replacement/stamp/audit fault, response loss and repeated-key no-op. Do not add unregistered native test names.
- [ ] T021 [US2] Update existing `src/routes/(app)/stock/entries/[id]/PageBody.svelte` and new `page.correction.mounted.test.ts` for receipt preview/reason/confirm/history, exact capability/cost denial, F2 blockers, links and keyboard behavior.

#### Phase 5 — US3: Unsupported ownership and repair handoff

**Goal**: Explain blocked historical ownership without reopening appointments, charging again or mutating unrelated sources.

- [ ] T022 [US3] Add booking/invoice/ambiguous/completed/cancelled/zero-price/source fixtures in `src/server/services/stock-corrections.logic.test.ts`, with exact blocked result and no inferred stock authority from planned products.
- [ ] T023 [US3] Implement the inert blocked-evidence/source projection in `src/server/services/stock-corrections.service.ts` and render it on the existing ticket/stock-entry surfaces. Link F1/F2 and original evidence; no generic visit-product edit, lifecycle reopening, extra charge or alternate writer. Assert those forbidden calls are absent in the corresponding mounted tests.

#### Phase 6 — Exact candidate qualification and human delivery

- [ ] T024 Run the whole guarded qa-native lane and `native-postgres-report.ts qa-native` completeness guard exactly as printed in contracts/native-qualification.md and quickstart.md. Both owned targets/markers must be valid; every admitted suite and all thirteen exact correction semantics must pass with zero skipped/missing/failed/todo cases. Save exact source hash, command, target qualification and JSON report; a file-filtered run is focused evidence only.
- [ ] T025 Run the ordinary focused suites, manifest/report validator tests, `bun run check`, `bun run test`, **`bun run build`**, `bun run i18n:compile`, design/token gates, route/RBAC contracts and migration/seed pairing checks listed in quickstart.md. Require zero check errors/warnings, zero test failures and the Hub-allowed clean build outcome; record exact results rather than a baseline waiver.
- [ ] T026 Use Browser Harness on synthetic QA for sale/receipt/no-stock and blocked journeys, desktop/narrow, Spanish/English, keyboard, lost-response and stale recovery. Record actual route-data outcomes, redaction and immutable money/lifecycle evidence in `specs/124-stock-correction-workflow/quickstart.md`'s implementation receipt; a document shell or toast is insufficient.
- [ ] T027 Complete independent implementation review, CI and owner merge, then separately record deployment identity and runtime qualification in `specs/124-stock-correction-workflow/checklists/requirements.md`. Owner approval of this data spec precedes code; exact F1/F2 real-record manifests and production apply approvals are separate and are not granted here.
- [ ] T028 Reconcile actual remaining implementation defects with their exact-site `TODO(handoff)` and the matching meta proposal before a future implementation handoff; record genuine limitations in `specs/124-stock-correction-workflow/quickstart.md`. Never mark planned tasks or blocked historical cases as completed repairs.

#### Phase 7 — Review-selected contract details

- [ ] T029 [US2] Implement `receipt_period_v1` from contracts/workflow.md in `src/server/services/stock-corrections.logic.ts` and `src/server/services/stock-corrections.service.ts`: export `RECEIPT_PERIOD_POLICY_ID`, evaluate original and current month in `fin_settings.timezone`, refuse an absent `fin_settings` row with `policy_unverified` (no `America/Lima` fallback) and a locked month with `period_locked`, and record `policySnapshot.receiptPeriodPolicy`. Add `period_locked` to `CorrectionRefusalCode`. Test in `stock-corrections.logic.test.ts` and `src/routes/api/stock/corrections/server.test.ts`: both months open is eligible; absent settings row; locked original month; locked current month; a preview whose `policyId`, timezone or lock rows changed before apply is `stale_preview`; sale guards still use the Lima fallback. Add the period-lock-versus-receipt-apply case in both arrival orders to native behavior 6.
- [ ] T030 [US1] [US2] Implement replacement entry metadata and the visit-product record from contracts/workflow.md in `src/server/services/stock-corrections.service.ts`: sale replacements carry `source`, `sourceId`, `ticketId`, `correctionOf` and `correctionOperationKey`; receipt replacements carry `correctionOf`, `correctionOperationKey`, the original `purchaseId`/`providerRef`, and the FX keys only when the rate is unchanged. Cancel before create and run the duplicate-source check. Record `after.visitProduct` for the `moved` and `merged` branches of `moveVisitProduct`. Test in `stock-corrections.service.test.ts` that `findEntryBySource('pos', ticketId)` and `entryDocument` resolve the replacement, that a live duplicate refuses `duplicate_source` with zero effects, that a value-only receipt replacement omits FX keys and keeps the purchase link, and that a booking already holding the replacement product records `merged` with the deleted row's id and quantity; add the merged-booking and mixed-ticket fixtures to native behavior 1.
- [ ] T031 Implement `SubmitEntryOptions` and the `postedAt` column and order rules from contracts/transaction-protocol.md in `src/server/services/stock.service.ts`. Test in `src/server/services/stock.service.test.ts`: public `submitEntry` still refuses a submitted entry with `not_draft`; `createIssueFromInvoice` still accepts an already-submitted entry with `transitioned:false` and no event, and still refuses a changed invoice with `duplicate_invoice`; an explicit `postedAt` sets the submitted entry and all appended ledger rows, cancellation sets only reversal ledger rows; a `postedAt` earlier than the latest affected ledger row or later than admission time refuses `posted_at_out_of_order` with zero effects.
- [ ] T032 Place the existing POS advisory locks after both gates in `submitTicket`, `voidTicket` and the other `src/server/services/pos.service.ts` participants, as contracts/transaction-protocol.md specifies, keeping their existing order among themselves and with ticket rows. Confirm by code search that no holder of a POS advisory lock later requests stock-v1 or the org authority lock and that correction code takes none. Add `submitTicket` and `voidTicket` versus correction in both arrival orders to native behaviors 5 and 6, asserting no deadlock.

#### Dependencies and delivery slices

T001 blocks product code. T002–T012 establish one shared contract; T003's F7 authority dependency and T004–T011's shared migration/gate/source-retry qualification must pass before a dependent stock writer ships. T006–T007 admit and construct native proof before its implementation results can count. T013 precedes the sale implementation; T014–T017 form the atomic sale/UI slice. T018–T021 form a later standalone-receipt slice using the same qualified primitives. T022–T023 add only the blocked-source projection. T031–T032 belong to the shared foundations and precede T014. T030 precedes T014 and T019. T029 belongs to the standalone-receipt slice and precedes T019. Each shipped slice receives T024–T027 on its exact candidate; T028 applies whenever an implementation handoff leaves a real defect.

Independent pure/fixture preparation may run after stable contracts and explicit file ownership. Shared source, schema, manifest and UI edits serialize; no task is marked parallel while those files are shared. F3 owns the single five-kind storage and transaction gate consumed by F1/F2. F7 owns operator/nonlocking authority. F5's grouped recovery depends on T010 and native case 9, not a second posting implementation. All 32 tasks remain unchecked.

All cost-bearing admission tasks follow the exact existing finance-field policy in this feature’s contract, never fieldLevel(stock). Include ordinary authorized owner/custom-role success with stock tier 0 and actual finance-view/tier/module denial. No new global field module is part of this slice.

The exact implementation file actions/conditional no-change inventory is implementation-inventory.md. Existing authority writer files are source-audit dependencies, not gratuitous edits; only modules.service.ts needs to start taking the org authority lock unless the candidate inventory proves an actual live bypass. All cost checks use the existing finance tier, never fieldLevel(stock). Pairwise locks and actual absent-row tests are mandatory foundations before any dependent writer ships.

T013–T017 implement the exact public/private separation in contracts/garment-envelope.md: public stock_only refusal/inert UI only, full typed private owner manifest plus approved digest, postedAt propagated to every leg and immutable receipt, replay bound to all domain fields. T014 also enforces active profile/not-deletion-pending and active org under the org authority lock, without changing the fresh resolver role model. T006/T011/T020/T024 include all thirteen behaviors, including the writer, deletion and org races.

T013–T020 implement the exact valuation-qualification.md schema/decoder/hash, top-level public envelopes and required private manifest proof in the already selected files. Preserve no-stock and normal-writer authority; extend existing thirteen native behaviors with currency/privacy/history/hook-recovery vectors, never add a fourteenth name.

### Review artifact: checklists/requirements.md

### Specification quality checklist: Auditable stock correction workflow

**Purpose**: Validate documented requirement and design completeness; this is not implementation qualification or owner approval.
**Created**: 2026-11-16
**Feature**: [spec.md](spec.md)

#### Content quality

- [x] User journeys describe observable outcomes, including POS-only both-empty correction, stock-moving correction and blocked history.
- [x] Stakeholder requirements, pinned AS-IS evidence and technical companion contracts are separated and discoverable.
- [x] Mandatory Spec Kit sections, rationale, alternatives, risks and measurable outcomes are present.

#### Requirement and contract completeness

- [x] Requirements distinguish source evidence, bounded local observations and proposed behavior; operational unknowns have explicit stop/approval gates.
- [x] The API contract closes source identity, discriminated request fields, array/numeric/body bounds, canonical preview/payload hash inputs, responses and per-effect capabilities.
- [x] The shared schema selects one exact five-kind migration, conditional nullability, same-org references, uniqueness, immutable grants/RLS and paired synthetic seed.
- [x] Transaction and authority contracts name F7 prerequisites, typed same-transaction seams, the first org gate, complete writer inventory/order, retry/timeouts and selected mapping cutover.
- [x] Native qualification selects one qa-native owner, thirteen exact semantic names/count, actual guarded multi-backend fixtures and whole-lane JSON completeness validation.
- [x] Tasks are unique, sequential, dependency-ordered and linked to exact files; each implementation checkbox remains unchecked.
- [x] Qualification explicitly includes the required build, pure/API/mounted/native/browser/permission/i18n/design-token and migration/seed evidence.
- [x] Repeated/concurrent booking realization proof is an explicit common prerequisite for F5 recovery, preserving lifecycle/payment boundaries and the existing source posting owner.

#### Evidence and remaining gates

- [x] Review results and dispositions are recorded under `egm/`; this checklist does not assert a passing independent verdict or replace fresh review.
- [x] Real Spec Kit authoring/prerequisite receipts and pinned source references are identified in the feature's companion artifacts.
- [ ] Owner approval of the data spec before product code — pending.
- [ ] Product implementation and exact-candidate local/native/browser checks — pending.
- [ ] Independent implementation review, CI, owner merge, deployment and runtime proof — pending.
- [ ] Any F1/F2 exact production manifest/target/cost/period apply approval — separate and pending; not granted by this workflow spec.

#### Validation notes

This author check verifies that the contracts, tasks and qualification instructions agree. Source baseline is Hub `c6c2d5739572356239c4048c0f564f40b0768adc`. No product code, schema, credentials, Git branches/worktrees or production data were changed by this documentation work. Independent review evidence is retained under `egm/`; no Goldfish pass, completed implementation or runtime success is claimed here. Planning authorization does not bypass constitution V.

Public stock_only remains HTTP 422 owner_evidence_required; private garment authority/evidence are defined in [garment-envelope.md](contracts/garment-envelope.md). Active actor and mutable-input synchronization follow [transaction-protocol.md](contracts/transaction-protocol.md). Require every named behavior in [native-qualification.md](contracts/native-qualification.md), without treating these proposed changes as current production proof.

Qualify the [F7 authority bridge](../128-faces-receivables-audit/contracts/authority-bridge.md) before F3 storage and helpers. New correction admission uses its guarded write adapter; actual baseline ACL/RLS and legacy adapter compatibility remain binding. Qualification and owner approval are pending.

### Review artifact: implementation-inventory.md

### F3 exact shared-foundation and workflow file actions

Hub-relative paths unless explicitly specs/. These are FUTURE changes after owner spec approval. No Delete action, new ledger math engine or permissions grant is selected. Existing APIs/fixtures are reused where stated; a newly discovered live writer is recorded and incorporated into the same protocol before qualification, not hidden as an exception.

| Action | Exact file | Required change / explicit no-change predicate |
|---|---|---|
| Create | src/lib/components/stock/correction-pending.ts | Exact immutable scoped v1 public recovery pointer, bounded Storage persist/readback before POST, status-only reload and applied dismissal helpers. No sensitive command/amount fields. |
| Create | src/lib/components/stock/correction-pending.test.ts | Crash/reload/scope/multi-tab/denial/capacity/schema/storage-failure state matrix; no false CAS or mutable local outcome. |
| Modify | src/server/services/stock.service.ts | Opaque same-tx helpers/guard, `SubmitEntryOptions` (`acceptSubmitted`, `expectedInvoice`) and the `postedAt` column/order rules, stock-v1 then the existing org authority lock before rows, direct admitted module reads, warehouse archive/default/parent and mapping/components/UOM/bins/entry/source/rebuild participation and event/wrapper compatibility. No alternate ledger writer. |
| Modify | src/server/services/pos.service.ts | Same-tx current-rule resolve→post/stamp; named swap/repost/submit/void/payment/fiscal local participants, including the period-lock writer `setPeriodLock`, with their existing POS advisory locks after both gates; export the existing module-private `IssueResolution` interface; one-transaction setBundleComponent/deleteBundleComponent; delegate correction to shared engine, preserve payment/lifecycle boundaries and remote emission outside locks. |
| No change | src/server/services/pos/period-locks.ts | Pure readers (`normalizePeriod`, `periodLockExists`, `isTicketPeriodLocked`) that take the caller's transaction; reused unchanged. Period-write participation is `setPeriodLock` in pos.service.ts. |
| Modify only if required to route actual named fiscal guard | src/server/services/pos/tender-correction.ts | Preserve existing tender/fiscal policy; add shared participation only where its local write bypasses the named pos service seam. Keep unchanged if exact current caller already delegates inside the held transaction; record source proof. |
| Modify | src/server/services/stock-accruals.service.ts | Same-tx accrue/release/realize, frozen draft retry/reconciliation and exported realizeAccrualsInTx. |
| Modify | src/server/services/finance.service.ts | updateFinSettings takes stock-v1 and the org authority lock before authoritative settings read/upsert; timezone/absent-row races, cache after commit. |
| Modify | src/server/services/modules.service.ts | setModuleEnabled takes the existing org authority lock before insert/upsert, no stock gate; retain post-commit cache invalidation and default-enabled behavior. |
| Modify tests | src/server/services/stock.service.test.ts | Public wrapper/math/event compatibility, both-gate guard validation/module constants, no double emission. |
| Modify tests | src/server/services/stock-accruals.service.test.ts | Actual source retry/expectation behavior; preserve lifecycle separation. |
| Create | src/server/services/stock-corrections.logic.ts | Exact public mode/private full GarmentManifestV1 decoder/manifest/result schemas, eligibility/intent hash/fingerprint and pure delta validation. |
| Create | src/server/services/stock-corrections.logic.test.ts | No-stock versus stock, source/modifier/fiscal/period/body/hash/numeric/tenant cases with independent expected effects. |
| Create | src/server/services/stock-corrections.service.ts | Preview/apply/status orchestration using actual guarded helpers, mode-sensitive authority/modules, active profile/org checks, private garment owning entrypoints/full envelope/posting time, atomic receipt/audit and authoritative unknown outcome. |
| Create | src/server/services/stock-corrections.service.test.ts | Preview/authority/error/operation reuse integration contract; real SQL atomic/concurrency proof is the separate native file. |
| Modify | src/server/db/pg-schema/stock.ts | Exact F3-owned five-kind immutable correction schema/types/constraints/indexes from data-model.md. |
| Create | supabase/migrations/20261116193000_stock_corrections.sql | Single shared migration, same-org ENTRY FKs/uniques/kind-nullability/forcedRLS/immutable grants; actor is historical nonnull UUID softref/no profile FK plus active actor-bound INSERT check; no F1/F2 parallel table. |
| Modify | scripts/qa/seed/stock.ts | Paired synthetic correction/ownership fixture, no imported production snapshots. |
| Modify | scripts/qa/seed/matrix.ts | Paired correction role/source/blocked cases. |
| Create | src/server/services/stock-corrections.sql.integration.test.ts | Actual shared migration/helpers/RLS/source/cutover/authority/module/period/fiscal/fault/retry proof; thirteen exact qa-native behaviors. |
| Modify | scripts/qc/native-postgres-manifest.ts | Exactly one qa-native owner for the new SQL file with `exactAssertions: true`, `minimumAssertions: 13` and the thirteen names in contracts/native-qualification.md; lane count unchanged. |
| Modify tests | scripts/qc/native-postgres-manifest.test.ts | New file/count/name ownership and missing/duplicate ratchets. |
| Modify tests | scripts/qc/native-postgres-report.test.ts | Required semantic completeness/no skip/todo/failed acceptance. Report implementation remains unchanged if generic checks already suffice. |
| Modify | src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts | Same-source path binding/reason/key/previewHash/payloadHash/shared engine; typed refresh_required for old tabs, no legacy mutation bypass. |
| Modify | src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/server.test.ts | Exact route/method/identity/capability/stockless/recovery behavior. |
| Create | src/routes/api/stock/corrections/preview/+server.ts | Discriminated read-only preview, server-derived source/effect authority. |
| Create | src/routes/api/stock/corrections/+server.ts | Exact apply plus known-key collection GET operationKey/payloadHash status protocol and no-store; public stock_only `422`, client-declared stocklessness or evidence hash is not authority. |
| Create | src/routes/api/stock/corrections/[id]/+server.ts | Exact scoped detail/status, redaction and unknown-outcome recovery. |
| Create | src/routes/api/stock/corrections/server.test.ts | All exact endpoints/methods/unsupported sources/owner/foreign/field/detail controls and refresh conflicts. |
| Modify | src/server/services/rbac.service.ts | Exact correction POST plus canonical collection/by-id GET/HEAD delegation in contracts/api-admission.md; consume F7's read-only and guarded-write authority bridge resolver APIs (terms in contracts/transaction-protocol.md), do not call the infeasible legacy row adapter or fork their composer or broaden stock prefix gates. |
| Modify tests | src/server/services/rbac.service.test.ts | Exact GET/HEAD/POST corrections exceptions, malformed/near-prefix negatives and unchanged stock-prefix denial matrix. |
| Modify | src/hooks.tenant.test.ts | Actual hook-through-handler GET/HEAD POS-only recovery, stock/private/foreign denial and unchanged near-prefix gates; no dummy resolve success counts as recovery. |
| Modify | src/routes/(app)/pos/tickets/[id]/PageBody.svelte | Reason/preview/stable key/outcome/source links/blocked UI within existing detail. |
| Modify | src/routes/(app)/pos/tickets/[id]/page.swap.mounted.test.ts | Svelte happy-dom translated/keyboard/stale/lost-response/blocked stock-only handoff and stockless controls; real browser proof remains separate. |
| Modify | src/routes/(app)/stock/entries/[id]/PageBody.svelte | Existing receipt correction/detail and inert blocked F1/F2 packet; no new dashboard page. |
| Create | src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts | Receipt eligibility/blocked/redacted/retry/source-link UI counterpart. |
| Modify | messages/en.json | Exact new reason/preview/effect/blocked/recovery/unavailable strings; reuse existing exact labels where possible. |
| Modify | messages/es.json | Same semantic keys/coverage as English. No new catalog entry only when an existing exact message is reused and documented. |
| Generated by i18n:compile | src/lib/paraglide/ | Regenerate, never hand-edit generated modules; no generated diff if compilation proves unchanged catalogs. |
| Modify after F7 foundation exists | scripts/lib/operator-service-loader.ts | Register only new stockCorrections typed root/key once stock-corrections.service.ts exists; initial F7 foundation must not type-import this future file. No arbitrary caller module path. |
| Modify after F7 foundation exists | scripts/lib/operator-service-loader.test.ts | Actual new-root standalone controlled SSR/dotenv-canary smoke; do not substitute old bareBun shim. |
| Create/update | specs/124-stock-correction-workflow/validation.md | Meta-repo exact per-slice candidate/commands/native/build/browser/owner/release receipts and open gates. |
| Create local evidence | specs/124-stock-correction-workflow/evidence/ | Meta-repo synthetic screenshots/native/query/route-data receipts named in validation; exclude raw customers/credentials. |

Dependency-owned/no local edit: F7 operator-principal.ts and its tests, F7 nonlocking snapshot resolver extraction, existing nav-policy-lock.ts org authority lock helper, existing organization-role-admin/section-access/join/bootstrap/user authority writers, activity.service.ts recordAuditInTx and events/emit.ts current stock.entry_submitted payload. Verify their actual current semantics and compatible lock ordering. If source inventory exposes a live bypass, record/review its exact file before qualification. Do not gratuitously edit dependency files or introduce a new policy mutex. Existing public normal-source APIs remain compatible apart from explicitly reviewed synchronization/admission; no shared generic UI primitive redesign.

The ordinary mounted fixtures use the existing `// @vitest-environment happy-dom` and testing-library-Svelte pattern; the existing ticket swap mounted path is extended and only the receipt mounted counterpart is newly created. Existing test files on a newer candidate are extended instead of duplicated. Module/authority races run within the same native file's two authority-race behaviors using actual setModuleEnabled/writeSectionAccess and independent backends; no separate unregistered SQL test is created. Focused/new service/route/mounted tests, manifest/report tests and all new paths must be included in quickstart's eventual focused command/receipt, alongside the exact full qa-native lane/report, actual migration-runner/seed pairing, full check/test/build, i18n/design/token gates and Browser Harness. No skipped or excluded test counts as proof.

After these paths exist on the exact isolated candidate, the ordinary focused invocation is:

```bash
bunx vitest run 'src/server/services/stock.service.test.ts' 'src/server/services/stock-accruals.service.test.ts' 'src/server/services/stock-corrections.logic.test.ts' 'src/server/services/stock-corrections.service.test.ts' 'src/server/services/rbac.service.test.ts' 'src/hooks.tenant.test.ts' 'src/routes/api/pos/tickets/[id]/lines/[lineId]/swap/server.test.ts' 'src/routes/api/stock/corrections/server.test.ts' 'src/routes/(app)/pos/tickets/[id]/page.swap.mounted.test.ts' 'src/routes/(app)/stock/entries/[id]/page.correction.mounted.test.ts' 'scripts/lib/operator-service-loader.test.ts' 'scripts/qc/native-postgres-manifest.test.ts' 'scripts/qc/native-postgres-report.test.ts'
```

The SQL fixture is intentionally separate: only the full qa-native invocation/report in contracts/native-qualification.md qualifies it. Module toggles use the actual service in those two native authority cases; no unregistered new SQL file or superficial mocked-lock test replaces them.

Dependency-owned: F7 supabase/migrations/20261116190000_operator_authority_bridge.sql and active-operator-principal.ts bounded projection/readers/new write adapter. This is F3's runtime dependency on F7. Apply/qualify that real migration with faithful baseline ACL/RLS before F3 storage/native qualification; F3 adds no duplicate privileged function or broad table grant.

Native test-only dependency: F7 src/server/test-utils/operator-native-auth-fixture.ts and fixtures/operator-native-auth.sql install/assert the exact canonical child auth prerequisite before public FK/policy setup. Reuse actual qualified helper/recipe, not a copied permissive policy. No extra app_ledger rights. This is a test-only dependency; F3's runtime F7 dependency is the authority bridge. Whole-lane controller stays the exact CI image `pgvector/pgvector:0.8.6-pg18-trixie` with `minion_qc_vectors`; each test owns only its validated public child database.

Public crash persistence and its explicit unsupported-storage/no-POST behavior follow [browser-recovery.md](contracts/browser-recovery.md). The two actual mounted hosts and known-key backend/refusal suites must exercise it. Add `bunx vitest run src/lib/components/stock/correction-pending.test.ts` to focused qualification; real persistent-profile Browser Harness restart proof remains separately required.

Unchanged page registry: src/lib/routes/route-design-manifest.ts retains existing ticket/stock-entry screens and receives no API-only entries. No generic API registry is introduced. Existing selected logic/service/route/host/pure/mounted/native files also implement valuation-qualification.md, explicit owner proof form/scope/re-preview, unavailable/denied currency projections and same-currency historical/inverse vectors. Read handlers export explicit HEAD through their authorized GET logic; actual hook-through-handler tests prove POS-only stockless receipt recovery without stock:view and continued stock/private/foreign denial.
