# Implementation Plan: Auditable stock correction workflow

**Branch**: Not created | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)
**Input**: Proposal F3; existing Hub swap/cancel/repost baseline qualified in [research.md](research.md).

## Summary

Expose eligibility and before/after preview for existing same-price sale variant corrections and stock-only sale repost when the source product is already right, then make eligible corrections one durable database transaction using existing stock math. Add safe standalone receipt reversal/replacement only when no later bin movements exist. Block historical consumption ownership and downstream valuation cases with links to F1/F2 evidence. No generic reopening, financial correction or automatic historical replay.

## Technical Context

**Language/Version**: TypeScript strict, Svelte 5, SvelteKit 2; Bun per Hub registry/package.
**Primary Dependencies**: Drizzle, PostgreSQL, CoreCtx/withOrgCore, existing stock/pos services, existing RBAC, Paraglide.
**Storage**: PostgreSQL append-only stk_ledger, rebuildable stk_bins, proposed org-scoped stk_corrections.
**Testing**: Vitest unit/route/mounted suites and real PostgreSQL SQL integration with synthetic tenants.
**Target Platform / Project Type**: Hub web application; no gateway/site changes.
**Performance Goals**: Preview scans only named source bins and their dependency ranges, not all org history; lock timeout yields retryable conflict without effects. No unsupported latency promise.
**Constraints**: Preserve payment facts; append-only stock; no prod writes in design task. Existing pending repost must resolve before new correction.
**Scale/Scope**: One named source per correction, finite line set, immutable operation identity, no batch repair.

## Constitution Check

Before research: I specify→plan→tasks followed via private F3 driver; II pinned evidence + AS-IS/TO-BE/DELTA; III future slice PRs target registry Hub master and must isolate after user authorization; IV UI/RBAC/i18n/route-manifest gates included; V data spec approval and human merge pending. Phase 1 re-check: design follows all principles; implementation is blocked until owner spec approval. No bypass claimed. Review results are recorded under egm/; owner approval remains pending.

## Project Structure

Docs: this directory contains spec, research, plan, data model, contracts, quickstart, tasks and review bundle.

Existing seams, Hub relative:
- `src/server/services/stock.service.ts`: extract `createEntryInTx`/`submitEntryInTx`/`cancelEntryInTx` with outer wrappers preserving existing semantics; same pure stock math and event behavior.
- `src/server/services/pos.service.ts`: existing `previewTicketRepost`, `planRepost`, `swapTicketLineProduct`, source/stock stamp updates; delegate supported swap to correction service.
- `src/server/services/pos/period-locks.ts`, `pos/tender-correction.ts`: existing period/fiscal readers, reused unchanged. The period-lock writer `setPeriodLock` in `pos.service.ts` joins the shared gate pair.
- `src/server/db/pg-schema/stock.ts`, `supabase/migrations/20261116193000_stock_corrections.sql`: org-scoped correction receipt, RLS and unique identity, QA migration seed.
- New `src/server/services/stock-corrections.service.ts` and `stock-corrections.logic.ts`: eligibility, fingerprint and orchestration.
- Existing `/api/pos/tickets/[id]/lines/[lineId]/swap/+server.ts`; new `/api/stock/corrections/preview/+server.ts`, `/api/stock/corrections/+server.ts`, `/api/stock/corrections/[id]/+server.ts`.
- `src/routes/(app)/pos/tickets/[id]/PageBody.svelte`, `src/routes/(app)/stock/entries/[id]/PageBody.svelte`: existing detail surfaces; no new top-level page.

## Implementation slices and exact behavior

### S1 — Eligibility/preview (US1, US3)

Build pure source resolver with classes `draft_edit`, `sale_variant`, `sale_stock_repost`, `receipt_replace`, `blocked`. Resolve source metadata plus actual linked entry; reject multiple/ambiguous owners. Sale requires `kind=product`, same active catalog price, unchanged charged totals, expected old product, no modifiers/drift, existing submitted issue only for a stock-moving correction; existing void/period/invoice/SUNAT guards remain. Explicit no-stock variant branch: both the original and the replacement product of the swapped line have verified empty stock plans. As in `swapTicketLineProduct` today (`pos.service.ts:1505-1549`), the branch is decided by the swapped line's two plans only; a stock entry that other lines of the same ticket issued neither blocks it nor changes it. Preserve the same-price variant swap without requiring an issue, cancellation, bin lock or replacement entry; atomically update the source product, the linked visit association (see the visit-product rule in [contracts/workflow.md](contracts/workflow.md#visit-product-association)) and the durable correction/audit receipt with null original/replacement entry IDs. A transition from no-stock to stock or vice versa is blocked in this slice, rather than pretending a missing entry is an empty plan. Preview lists full current/replacement per-item stock deltas, currencies, original entry, UOM/conversion, dependency blockers and source fingerprint. Generic booking product edits and completed status are never treated as posted-stock proof. Stock-only sale repost is separately eligible when the ticket/booking product is already correct but original movement item differs. Use exact F1-verified item/UOM ownership mapping, explicit original-return and intended-issue allowed IDs and whole-plan drift check; preserve ticket and visit product columns. Do not call swapTicketLineProduct to fix only stock. A current recipe difference is evidence to review, not authority to apply. Historical booking/invoice-owned issues return blocked F1/F2 action packet.

### S2 — Atomic sale correction (US1)

Refactor existing stock calculations to accept the same CoreTx; do not implement a second ledger writer. Existing public submit/cancel wrappers retain outer audit/event semantics. Use durable `stk_corrections` row keyed `(org,operationKey)` and immutable payload hash. Existing swap route and ticket caller require reason, operation key and preview hash and delegate to this shared engine; no legacy mutation bypass. Read retry receipt first: same key/hash returns verified committed outcome; different payload is 409.

Inside one `withOrgCore` transaction: acquire the per-org stock-write gate (stock-v1), then the existing org authority lock (`hashtextextended(orgId,112)`) before source rows, followed by source, period/authority, entries, accruals and sorted bin rows exactly per transaction-protocol.md, re-read snapshot and financial guards, compare fingerprint, check unique correction identity under the first org gate and source locks, calculate allowed old/new changes with existing `planRepost`, cancel original, create/submit immutable replacement with the source metadata in [contracts/workflow.md](contracts/workflow.md#replacement-entry-metadata), update ticket stock stamp and (variant-swap only) linked visit product, store before/after and `recordAuditInTx`, insert the completed immutable applied correction receipt, commit. The submit helper emits the existing transactional event once per newly submitted replacement entry; controller emits no duplicate. Failure anywhere rolls back all effects including correction evidence. Lost HTTP response is recovered by operation key. Pending preexisting `repost_pending` is surfaced with the established post-stock retry link; it blocks starting a new correction.

The exact first org gate, row hierarchy, participant inventory, typed helpers, same-tx current-rule resolution, retry/timeouts and mapping cutover are authoritative in contracts/transaction-protocol.md. Do not invent source/product/bin advisory namespaces or take an authority row lock before source rows; the existing org authority lock is nevertheless mandatory before all those rows. Shared native qualification is contracts/native-qualification.md.

### S3 — Safe standalone receipt replacement (US2)

Only standalone receipt entries with submitted status, no source owner and complete original ledger/lines qualify. Validate quantities positive/finite, valid same-org active item/warehouse, positive finite receipt rate, explicit normalized UOM. Take source and sorted union-of-bin locks; recheck there is **no later ledger row** on any touched original/replacement bin since source's original posting (stable ledger ID order, not client date), including transfers/adjustments. A foreign replacement bin already carrying movements after source posting blocks eligibility. Policy `receipt_period_v1` in [contracts/workflow.md](contracts/workflow.md#receipt-period-policy-v1) decides the period: an absent `fin_settings` row, a locked original or current month, a changed preview or a later dependency blocks apply.

Use same transaction helpers to reverse and post replacement with the receipt metadata in [contracts/workflow.md](contracts/workflow.md#replacement-entry-metadata), original supplier and correction reason. Value-only correction retains exact stock quantity; quantity-only retains the original stored rate. Rates are in the stored valuation unit; no currency conversion runs. Replacement is current posting with original date retained as evidence; never pretends to revalue history. Negative-stock and invalid-value guards must pass before writes. More complex receipts produce a read-only F2 impact packet, not a compensating arbitrary adjustment.

## Failure, retry and audit invariants

One transaction means no new durable half-applied state; query the committed operation after timeout. Operation key reuse with changed payload refuses. Two keys on same preview/source serialize: one commits and the other returns stale conflict. Existing cancelled entry is not cancellable again. Durable before/after/actor/reason are atomic; best-effort general audit failure cannot erase correction evidence. Undo is a new separately approved inverse correction where eligible, never ledger deletion. A production dry-run remains separate from API eligibility and must name exact source IDs and approval.

## Security and UI contracts

All handlers require getCoreCtx, enabled modules, explicit capability checks, same-org IDs and RLS. Sale correction requires pos:edit plus stock:manage when stock changes; standalone receipt stock:manage. View projections gate pos/stock view and hide sensitive costs using existing field policies. API-only additions use exact central read/write capability and hook/handler tests, not page-design registry entries; existing ticket/stock-entry screen registrations remain unchanged; correction code cannot accept a client org or actor. Existing detail UI shows original/replacement, reason, differences and blockers, uses Svelte 5, Paraglide, semantic tokens, focus management and keyboard access. Read governance skill before UI edits; run i18n/design/token gates. No customer labels beyond authorized source context.

## Validation and gates

Required tests in quickstart: same-price swap and source-product-unchanged stock-only repost retry/concurrency; no-stock and stock variants; drift/modifiers/foreign IDs; fiscal lock races; absent-bin races; receipt quantity/value and later dependency; injected rollback at each write; unchanged money/dates; audit identity and original discoverability. Browser Harness validates existing ticket/entry workflows in synthetic QA, desktop and narrow viewports. Run focused suites then Hub `bun run check`, `bun run test`, `bun run i18n:compile`, `bun run lint:design && bun run lint:tokens`, route/RBAC architecture checks and migration drift checks. Required CI/human merge/deploy/runtime proof remain separate.

## Complexity Tracking

One proposed correction table is justified by durable idempotency, reason and source linkage; existing general audit is separate/best-effort and existing swap lacks operation identity. A generic stock replay/saga framework is rejected. Refactor transaction seams narrowly, preserving existing public wrappers with regression tests.

## Cross-item shared primitive contract

F1 and F2 reuse these transaction exports, not separately committing outer wrappers: createEntryInTx accepts the caller transaction, validated original/frozen lines, preallocated entry UUID, actor and metadata; submitEntryInTx and cancelEntryInTx accept that same transaction, server-controlled correction posting timestamp and the shared locked-bin context; submitEntryInTx also keeps the existing `acceptSubmitted` and `expectedInvoice` semantics that `createIssueFromInvoice` relies on. They preserve existing public wrappers, normal stock-event semantics and pure stock math. Reuse existing activity.service.ts recordAuditInTx (line 131) unchanged for atomic evidence. The single first org stock-write advisory gate and subsequent source/period/entry/accrual/bin row hierarchy is shared with F1/F2 and every inventoried ordinary writer; duplicate advisory protocols/helper extraction are excluded.

For stock_only mode freeze the original submitted issue lines and transform only the approved old-item→new-item quantities. Do not regenerate the whole ticket from current recipes. planRepost compares original to this frozen replacement with explicit allowed return/increase sets; current-recipe preview is diagnostic drift only. Reject mixed/shared target ownership, unexpected extra item/value changes or ambiguous line attribution. The bounded F1 garment invocation requires exactly one original L line and one unambiguous M sale quantity. Preserve other original lines; the already-correct product and booking product never change.

## Exact shared contracts and prerequisite ownership

contracts/workflow.md is the complete discriminated API/schema/capability/hash contract; contracts/transaction-protocol.md is the exact synchronization/helper/principal contract; contracts/native-qualification.md is native manifest/lane/command proof. Where a summary elsewhere differs, these contracts govern; they do not change source behavior. F7 owns scripts/lib/operator-principal.ts and rbac.service.ts nonlocking fresh adapter before F1/F2 preview integration; F3 owns stock primitives, the common first gate and the one shared migration. Include every named participant and native manifest/report test in the implementation inventory.

## Shared authority and module race

The stock gate alone does not serialize existing policy writers or an absent module disable. transaction-protocol.md selects stock-v1, then the existing org authority lock, before all source and business row locks, with both held through commit. setModuleEnabled takes the org authority lock before its upsert; existing role/member/account/section writers already use that coordinator. Fresh uncached capability/module checks occur inside the held scope, preserving absent=enabled and mode-specific POS-only/period behavior without a new stock sensitive tier. Native qualification has thirteen behaviors, including absent-deny and module-disable writer races in both legal arrival orders. implementation-inventory.md distinguishes mandatory local edits from dependency-owned/no-change files. F1/F2 inherit this protocol.

Public/private scope and current-principal admission follow [the garment contract](contracts/garment-envelope.md) and [transaction protocol](contracts/transaction-protocol.md).

Normative details: [private garment](contracts/garment-envelope.md), [recovery and receipts](contracts/recovery-receipts.md), [numeric oracle](contracts/garment-numerics.md), [transaction protocol](contracts/transaction-protocol.md). File actions and scenario checks above remain mandatory.

Public crash/reload recovery is the closed [browser-recovery.md](contracts/browser-recovery.md) contract: an immutable minimal v1 pointer (org, profile, source, operation key, payload hash) is synchronously persisted and read back before POST; unsupported storage blocks confirmation, the server GET supplies the outcome, no write is automatic, account switches clear displayed state and unknown pointers are retained. It qualifies only when all of the following pass: the helper tests, the route tests, the mounted tests for both UI hosts, the native cases and the browser-restart proof. Private CLI manifest recovery is separate.

Stock-changing correction costs require the exact [valuation qualification](contracts/valuation-qualification.md), current real owner and existing capabilities; missing denomination gives a nonexecutable unavailable preview, not a guessed currency. Both-empty POS-only swaps and normal sales/stock/background writers retain their original authority. The [API admission contract](contracts/api-admission.md) owns narrow GET/HEAD and POST delegation without changing unrelated stock routes.
