---
id: 2026-09-20-hub-component-service-centralization
title: Centralize Hub components, domain contracts and live entity updates
status: approved
implementation_status: partial
created: 2026-09-20
updated: 2026-09-22
repos: [minion-meta, minion_hub]
tags: [logic, test]
effort: L
source: user-requested-source-audit-2026-09-20
---

# Centralize Hub components, domain contracts and live entity updates

The user requested an index of shared components/services and documentation of Hub implementations that bypass them. They prefer ordinary edits to appear across views immediately, with fewer Save buttons. Extend shared contracts when a drop-in replacement cannot preserve behavior.

## AS-IS

Source snapshot: Hub `master` at `0acd6282df74d18eacd27673fcf238cd16a29e56` plus existing working-tree edits. [Audit and domain matrix](../audits/2026-09-20-hub-centralization/README.md), [full inventory](../audits/2026-09-20-hub-centralization/INDEX.md) and [machine-readable findings](../audits/2026-09-20-hub-centralization/findings.json) are the evidence ledger. No production/runtime behavior was tested in this audit.

- `src/routes/(app)/stock/items/+page.svelte:19` and its detail page `:172` refresh separate SvelteKit dependency keys after mutation. The reusable private org browser channel currently serves CRM message updates, not a general entity-change contract.
- CRM contact tag mutations at `src/routes/(app)/crm/[contactId]/+page.svelte:302` bypass `jsonMutation` and do not check HTTP success before invalidating. Stock writes lack a comparable expected-version check to CRM contact writes.
- Flow editor `saveFlow` at `src/lib/state/features/flow-editor.svelte.ts:588` clears current dirty/draft state after an earlier save completes without a revision guard. This is a source-level race candidate, not a reproduced runtime incident.
- `party.service.ts:53` and `:115` apply different document validation policies. `item-cost.service.ts:111`, `pos.service.ts:664` and `stock-accruals.service.ts:99` repeat parts of recipe/root resolution. Existing pure stock math is already shared.
- Tags share a registry but entity/contact mutations have different DTO, validation and invalidation boundaries. POS casts an undeclared event around `HubEvent` at `pos.service.ts:1538`; the internal handler has no corresponding case.
- The component report documents repeated date controls, generic sparklines, modal/confirmation shells, progress and status renderers. Several callers require new variants before migration.
- Flow route handlers own persistence and invalidation that could form a domain service. They already use scoped transactions; this is not evidence of an org-isolation bypass.

## TO-BE

One owner for each reusable behavior, with explicit domain adapters. A successful reversible property edit reconciles its authoritative value/version into the editing view and refreshes other authorized representations. Pending/error/conflict state remains visible; failed saves do not discard drafts. Reconnect restores consistency after missed events.

Preserve SvelteKit load/RBAC boundaries, gateway push-state ownership, transaction isolation, field masking, contact auto-tag metadata, recipe precedence, unit conversion and existing invoice ingestion/emission distinctions. Generic UI primitives remain in the shared package; Hub-specific compositions remain in Hub.

## DELTA

| Slice | Transition | Proof required |
|---|---|---|
| 1. Safe mutation | Adopt `fetchJson`/`jsonMutation`; atomic expected-version writes; shared revision-aware autosave | 403/409/500 keep edits; older response cannot clear newer draft; one entity serializes writes |
| 2. Committed entity changes | Extend private org channel and shared mapping to load dependencies/query keys/local caches | Same view, second tab and second authorized user converge; no foreign-org payload; reconnect refetch; duplicates coalesce |
| 3. Domain services | Shared party normalization; transaction-aware recipe resolver; tagging facade; flow persistence service | Entry-path parity; same-org validation; caller-owned transaction; recipe/UOM fixtures; existing domain semantics unchanged |
| 4. Components | Drop-in Dialog/ConfirmDialog/range adoption; extend sparkline/progress/status/empty-state/edit APIs where needed | Keyboard/focus/error behavior; chart data semantics; date endpoints; UI design/token gates |
| 5. Enforcement | Adopt per-boundary import rules and contract tests with narrow documented exceptions | New bypass fails targeted check; legitimate illustrations, accessible tables and domain caches remain supported |

Register workflow events and intended consumers together, including an explicit decision on `pos.ticket_submitted`. Do not claim automation `pg_notify` is a durable browser synchronization system. Prefer identifier/version notifications followed by permission-filtered reads; specify missed-signal recovery and organization-switch cleanup.

## Ownership and handoff

Claude is concurrently extending DataTable and migrating tables. Reserve DataTable, raw table migrations, TeamTab and related caller interfaces for that session. The active POS work owns ticket/booking behavior; recipe/event changes touching POS must integrate after that owner’s changes are available. Re-scan rather than assuming the screenshot's unmerged cell-edit work is in this checkout.

This deliverable is a read-only audit plus a draft proposal, not an unfinished implementation. Findings are recorded at exact source anchors in the linked ledger. Source `TODO(handoff)` annotations are deliberately not inserted during this audit to preserve the documented read-only/concurrent-work boundary. When an implementation slice takes ownership, any defect left open must carry the repository-required inline annotation and proposal pointer. No implementation, spec review, approval, merge or deployment stage is claimed complete.

## Out of scope

A second table migration; wholesale conversion of SvelteKit business loads to QueryClient; merging every event stream or cache into one implementation; removing confirmation from financial/destructive operations; replacing specialized statistical/stock diagrams; changing production data; deployment.

## Definition of done

- Every reviewed finding is migrated, explicitly accepted as a specialization, or linked to a separately owned follow-up; refresh the inventory after concurrent changes land.
- Reversible scalar/name/manual-tag edits show pending/saved/error/conflict state and propagate to authorized views; versions prevent lost updates.
- Forms with interdependent validation and financial, stock-posting, deletion or cancellation actions retain explicit submit/confirm semantics.
- Shared service contracts cover representative callers and cross-org negative tests. Cross-view tests include dropped/reordered signals, reconnect and edits while a save is pending.
- Each UI migration passes design/token gates and verifies keyboard/focus behavior and relevant date/chart semantics in the local QA stack.
- Package-level changes are built/versioned and adopted by Hub; changing meta `packages/ui` alone does not update its tarball dependency.
- Follow the normal proposal → reviewed spec → dev/self-test/independent review → merge → deployment lifecycle. Security/data changes retain human approval and merge gates.

## Related work

- [TanStack Query scope](../specs/2026-07-06-hub-tanstack-query.md): source still enforces separate load-driven business pages and out-of-load client queries; this audit does not upgrade the spec's status.
- [Scheduling tags](../specs/2026-09-08-hub-scheduling-calendar-views-tags-spec.md): retain intentional contact/entity storage differences.
- [POS hardening documentation PR](https://github.com/NikolasP98/minion-meta/pull/524): active concurrent ownership, not replaced by this proposal.
- [UI governance](../specs/2026-07-13-hub-ui-coherence-implementation-spec.md): extend semantic contracts rather than adding local exceptions.

## Optimistic interaction specification — 2026-09-21

The user requested a specification of existing async feedback and opportunities for optimistic, animated, Save-less editing. [The draft interaction/motion spec](../specs/2026-09-21-hub-optimistic-interactions-motion-spec.md) defines 43 interaction families, 15 motion patterns, operation/version/recovery contracts, calendar behavior and implementation slices. [Source and catalogue evidence](../audits/2026-09-21-hub-optimistic-interactions/README.md) extends this audit without replacing its wider service-consolidation scope. Two independent review passes completed; human data/security approval remains pending. No Hub implementation changed.

## Implementation and release authorization — 2026-09-21

The user subsequently authorized implementation, merging #352, finishing the
shared service and deployment. #352 merged as `698aaa71` using the explicitly
authorized admin override. Work is isolated on `feat/shared-action-service` in a
clean clone; concurrent POS work remains untouched.

The former read-only follow-ups are now implemented: command/job policies, table
revision ownership and per-row serialization, one action/refresh per fill,
acknowledgement-versus-refresh classification, capacity feedback and persistent
finance job monitoring. Authenticated QA testing is in progress. Current evidence
and remaining release gates are in [the implementation record](../audits/2026-09-21-hub-action-tracking/IMPLEMENTATION.md).

The wider proposal remains open. Backend conditional writes/idempotency,
cross-view realtime reconciliation and adoption across the remaining inventory are
separate slices, not claims made by this release. The Action Service README
records the current adapter boundary. Existing explicit forms and financial or
destructive confirmations remain deliberate controls.
